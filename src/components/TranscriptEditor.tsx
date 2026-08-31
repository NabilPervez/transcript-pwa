interface TranscriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TranscriptEditor({ value, onChange, placeholder }: TranscriptEditorProps) {
  const wordCount = value.trim().length ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="flex w-full flex-1 flex-col rounded-xl border hairline bg-ink-900/40">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Your transcript will appear here as it is generated…'}
        aria-label="Transcript text, editable"
        spellCheck
        className="min-h-[16rem] flex-1 resize-none rounded-xl bg-transparent p-5 font-body text-[15px] leading-relaxed text-ink-100 placeholder:text-ink-500 focus:outline-none"
      />
      <div className="flex items-center justify-end border-t hairline px-5 py-2">
        <span className="font-mono text-[11px] text-ink-500">{wordCount} words</span>
      </div>
    </div>
  );
}
