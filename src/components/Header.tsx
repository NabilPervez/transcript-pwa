export function Header() {
  return (
    <header className="flex items-center justify-between border-b hairline px-6 py-5 sm:px-10">
      <div className="flex items-baseline gap-2">
        <h1 className="font-display text-2xl font-semibold text-ink-100">Murmur</h1>
        <span className="hidden font-mono text-[11px] text-ink-500 sm:inline">on-device transcription</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border hairline px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-signal-live" />
        <span className="font-mono text-[11px] text-ink-400">nothing leaves this browser</span>
      </div>
    </header>
  );
}
