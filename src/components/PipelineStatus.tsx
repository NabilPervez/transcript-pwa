import type { Backend, ModelProgressEvent, PipelineStage } from '../types';

interface PipelineStatusProps {
  stage: PipelineStage;
  backend: Backend | null;
  modelProgress: ModelProgressEvent | null;
  lowStorageWarning: boolean;
}

const STAGE_COPY: Record<PipelineStage, string> = {
  idle: 'Ready',
  downloading: 'Downloading model weights',
  booting: 'Warming up the model',
  transcribing: 'Transcribing',
  done: 'Done',
  error: 'Something went wrong'
};

export function PipelineStatus({ stage, backend, modelProgress, lowStorageWarning }: PipelineStatusProps) {
  if (stage === 'idle' || stage === 'done') return null;

  const pct = modelProgress?.progress != null ? Math.round(modelProgress.progress) : null;

  return (
    <div className="w-full max-w-md rounded-xl border hairline bg-ink-900/60 px-5 py-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="font-body text-sm text-ink-200">{STAGE_COPY[stage]}</span>
        {backend && (
          <span className="rounded-full border hairline px-2 py-0.5 font-mono text-[10px] uppercase tracking-wideish text-ink-400">
            {backend === 'webgpu' ? 'GPU' : 'CPU · WASM'}
          </span>
        )}
      </div>

      {stage === 'downloading' && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gilt-500 transition-[width] duration-300"
              style={{ width: `${pct ?? 4}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[11px] text-ink-500">
            <span className="truncate">{modelProgress?.file ?? 'Fetching weights'}</span>
            {pct != null && <span>{pct}%</span>}
          </div>
        </div>
      )}

      {stage === 'booting' && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-gilt-500" />
        </div>
      )}

      {stage === 'transcribing' && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-gilt-500" />
        </div>
      )}

      {lowStorageWarning && stage === 'downloading' && (
        <p className="mt-3 text-xs text-signal-rec">
          Your device is low on storage. The model may fail to cache fully — freeing up space first is recommended.
        </p>
      )}
    </div>
  );
}
