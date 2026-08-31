interface RecordButtonProps {
  recording: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RecordButton({ recording, disabled, onToggle, elapsedSeconds }: RecordButtonProps & { elapsedSeconds: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-28 w-28 items-center justify-center">
        {recording && (
          <span className="absolute inset-0 rounded-full bg-signal-rec/40 animate-pulse_ring" aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
          aria-pressed={recording}
          className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 transition-all
            ${recording ? 'border-signal-rec bg-signal-rec/90' : 'border-gilt-500 bg-gilt-500 hover:bg-gilt-400'}
            disabled:cursor-not-allowed disabled:border-ink-700 disabled:bg-ink-800`}
        >
          {recording ? (
            <span className="h-6 w-6 rounded-sm bg-ink-950" />
          ) : (
            <span className="h-7 w-7 rounded-full bg-ink-950" />
          )}
        </button>
      </div>
      <div className="font-mono text-sm tabular-nums text-ink-300" aria-live="polite">
        {recording ? formatDuration(elapsedSeconds) : 'Ready'}
      </div>
    </div>
  );
}
