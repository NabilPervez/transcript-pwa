// Whisper expects mono 16 kHz PCM. The mic almost never natively records at
// that rate, so every clip gets resampled through an OfflineAudioContext
// before it's handed to the model.
export const WHISPER_SAMPLE_RATE = 16_000;

export class MicRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(onLevel?: (rms: number) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    if (onLevel) {
      this.attachLevelMeter(this.stream, onLevel);
    }

    const mimeType = MicRecorder.pickMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.start(250);
  }

  private levelMeterCleanup: (() => void) | null = null;

  private attachLevelMeter(stream: MediaStream, onLevel: (rms: number) => void) {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    const data = new Float32Array(analyser.fftSize);
    let raf = 0;

    const tick = () => {
      analyser.getFloatTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) sumSquares += data[i] * data[i];
      const rms = Math.sqrt(sumSquares / data.length);
      onLevel(rms);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    this.levelMeterCleanup = () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void audioCtx.close();
    };
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder was never started'));
        return;
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        this.cleanup();
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    try {
      this.mediaRecorder?.stop();
    } finally {
      this.cleanup();
    }
  }

  private cleanup() {
    this.levelMeterCleanup?.();
    this.levelMeterCleanup = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  private static pickMimeType(): string | undefined {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    return candidates.find((c) => MediaRecorder.isTypeSupported(c));
  }
}

/**
 * Decodes an arbitrary recorded Blob and resamples it to mono 16 kHz,
 * returning the raw PCM samples Whisper's feature extractor expects.
 */
export async function blobToWhisperInput(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  await decodeCtx.close();

  const durationSeconds = decoded.duration;
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(durationSeconds * WHISPER_SAMPLE_RATE), WHISPER_SAMPLE_RATE);

  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;

  // Downmix to mono if the source has more than one channel.
  if (decoded.numberOfChannels > 1) {
    const merger = offlineCtx.createChannelMerger(1);
    const splitter = offlineCtx.createChannelSplitter(decoded.numberOfChannels);
    source.connect(splitter);
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      const gain = offlineCtx.createGain();
      gain.gain.value = 1 / decoded.numberOfChannels;
      splitter.connect(gain, ch);
      gain.connect(merger, 0, 0);
    }
    merger.connect(offlineCtx.destination);
  } else {
    source.connect(offlineCtx.destination);
  }

  source.start(0);
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

export async function estimateDeviceQuota(): Promise<{ usage: number; quota: number; percentUsed: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota, percentUsed: quota > 0 ? (usage / quota) * 100 : 0 };
}
