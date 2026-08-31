import { useCallback, useEffect, useRef, useState } from 'react';
import { estimateDeviceQuota } from '../lib/audio';
import type { Backend, ModelProgressEvent, PipelineStage, TranscriptSegment, WorkerResponse } from '../types';

const MIN_FREE_BYTES_FOR_MODEL = 300 * 1024 * 1024; // ~2x the largest model variant, for headroom

export interface TranscriberState {
  stage: PipelineStage;
  backend: Backend | null;
  modelProgress: ModelProgressEvent | null;
  partialText: string;
  segments: TranscriptSegment[];
  fullText: string;
  errorMessage: string | null;
  lowStorageWarning: boolean;
}

export function useTranscriber() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<TranscriberState>({
    stage: 'idle',
    backend: null,
    modelProgress: null,
    partialText: '',
    segments: [],
    fullText: '',
    errorMessage: null,
    lowStorageWarning: false
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const quota = await estimateDeviceQuota();
      const low = !!quota && quota.quota - quota.usage < MIN_FREE_BYTES_FOR_MODEL;
      if (cancelled) return;
      setState((s) => ({ ...s, lowStorageWarning: low }));

      const worker = new Worker(new URL('../workers/whisper.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        switch (msg.type) {
          case 'backend-selected':
            setState((s) => ({ ...s, backend: msg.backend, stage: 'downloading' }));
            break;
          case 'model-progress':
            setState((s) => ({
              ...s,
              modelProgress: msg.event,
              stage: msg.event.status === 'ready' ? 'booting' : 'downloading'
            }));
            break;
          case 'ready':
            setState((s) => ({ ...s, stage: 'idle', modelProgress: null }));
            break;
          case 'partial':
            setState((s) => ({ ...s, stage: 'transcribing', partialText: msg.text }));
            break;
          case 'complete':
            setState((s) => ({
              ...s,
              stage: 'done',
              segments: msg.segments,
              fullText: msg.fullText,
              partialText: ''
            }));
            break;
          case 'error':
            setState((s) => ({ ...s, stage: 'error', errorMessage: msg.message }));
            break;
        }
      };

      setState((s) => ({ ...s, stage: 'downloading' }));
      worker.postMessage({ type: 'load', backend: 'webgpu' });
    })();

    return () => {
      cancelled = true;
      workerRef.current?.terminate();
    };
  }, []);

  const transcribe = useCallback((audio: Float32Array, sampleRate: number) => {
    setState((s) => ({ ...s, stage: 'transcribing', fullText: '', segments: [], partialText: '', errorMessage: null }));
    workerRef.current?.postMessage({ type: 'transcribe', audio, sampleRate }, [audio.buffer]);
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, stage: 'idle', fullText: '', segments: [], partialText: '', errorMessage: null }));
  }, []);

  return { ...state, transcribe, reset };
}
