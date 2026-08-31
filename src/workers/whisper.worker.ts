/// <reference lib="webworker" />
import { pipeline, env, WhisperTextStreamer, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import { IndexedDbModelCache } from '../lib/model-cache';
import type { Backend, ModelProgressEvent, TranscriptSegment, WorkerRequest, WorkerResponse } from '../types';

// Route model weight fetches through IndexedDB instead of the default HTTP
// Cache Storage (see lib/model-cache.ts for why), and keep everything local —
// this worker never phones home beyond the one-time model download.
env.useBrowserCache = false;
env.useCustomCache = true;
// customCache is typed `any` upstream; we only implement the match/put
// subset of the Cache interface that transformers.js actually calls.
env.customCache = new IndexedDbModelCache();
env.allowLocalModels = false;

const MODEL_ID = 'onnx-community/whisper-small';

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let activeBackend: Backend = 'wasm';

function post(message: WorkerResponse) {
  postMessage(message);
}

async function detectBackend(): Promise<Backend> {
  // navigator.gpu is exposed inside dedicated workers on browsers that
  // support WebGPU (Chrome 113+, Edge). Fall back to WASM everywhere else.
  const gpu = (navigator as Navigator & { gpu?: unknown }).gpu;
  if (!gpu) return 'wasm';
  try {
    const adapter = await (gpu as { requestAdapter: () => Promise<unknown> }).requestAdapter();
    return adapter ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

async function loadModel(preferred: Backend) {
  activeBackend = preferred;
  post({ type: 'backend-selected', backend: activeBackend });

  const onProgress = (event: ModelProgressEvent) => post({ type: 'model-progress', event });

  const loadPipeline = pipeline as unknown as (
    task: 'automatic-speech-recognition',
    model: string,
    options: Record<string, unknown>
  ) => Promise<AutomaticSpeechRecognitionPipeline>;

  try {
    transcriber = await loadPipeline('automatic-speech-recognition', MODEL_ID, {
      device: activeBackend,
      dtype: activeBackend === 'webgpu' ? 'fp16' : 'q8',
      progress_callback: onProgress
    });
  } catch (err) {
    // WebGPU can be present but still fail to initialize (driver/OS quirks).
    // Retry once on WASM before surfacing an error to the UI.
    if (activeBackend === 'webgpu') {
      activeBackend = 'wasm';
      post({ type: 'backend-selected', backend: activeBackend });
      transcriber = await loadPipeline('automatic-speech-recognition', MODEL_ID, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: onProgress
      });
    } else {
      throw err;
    }
  }

  post({ type: 'ready' });
}

async function transcribe(audio: Float32Array) {
  if (!transcriber) throw new Error('Model has not finished loading yet');

  let streamedText = '';
  const streamer = new WhisperTextStreamer(transcriber.tokenizer as ConstructorParameters<typeof WhisperTextStreamer>[0], {
    on_finalize: () => {
      streamedText = '';
    },
    callback_function: (partial: string) => {
      streamedText += partial;
      post({ type: 'partial', text: streamedText });
    }
  });

  // 30s sliding-window chunking with 5s stride keeps long recordings from
  // blowing past the model's ~30s attention window while avoiding word
  // boundary artifacts at chunk edges.
  const result = await transcriber(audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
    streamer
  });

  const raw = Array.isArray(result) ? result[0] : result;
  const chunks = (raw as { chunks?: Array<{ text: string; timestamp: [number, number | null] }> }).chunks ?? [];

  const segments: TranscriptSegment[] = chunks.map((c, i) => ({
    id: `seg-${i}`,
    text: c.text.trim(),
    start: c.timestamp[0] ?? 0,
    end: c.timestamp[1] ?? c.timestamp[0] ?? 0
  }));

  const fullText = (raw as { text?: string }).text?.trim() ?? segments.map((s) => s.text).join(' ');

  post({ type: 'complete', segments, fullText });
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  try {
    if (e.data.type === 'load') {
      const backend = await detectBackend();
      await loadModel(backend);
    } else if (e.data.type === 'transcribe') {
      await transcribe(e.data.audio);
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : 'Unknown worker error' });
  }
};
