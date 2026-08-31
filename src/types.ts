export type Backend = 'webgpu' | 'wasm';

export type PipelineStage = 'idle' | 'downloading' | 'booting' | 'transcribing' | 'done' | 'error';

export interface TranscriptSegment {
  id: string;
  text: string;
  start: number; // seconds
  end: number; // seconds
}

export interface ModelProgressEvent {
  status: 'initiate' | 'download' | 'progress' | 'done' | 'ready';
  file?: string;
  progress?: number; // 0-100
  loaded?: number;
  total?: number;
}

// -- Worker <-> main-thread message contracts -------------------------------

export type WorkerRequest =
  | { type: 'load'; backend: Backend }
  | { type: 'transcribe'; audio: Float32Array; sampleRate: number };

export type WorkerResponse =
  | { type: 'backend-selected'; backend: Backend }
  | { type: 'model-progress'; event: ModelProgressEvent }
  | { type: 'ready' }
  | { type: 'partial'; text: string }
  | { type: 'complete'; segments: TranscriptSegment[]; fullText: string }
  | { type: 'error'; message: string };

export interface RecordingMeta {
  durationSeconds: number;
  createdAt: number;
}
