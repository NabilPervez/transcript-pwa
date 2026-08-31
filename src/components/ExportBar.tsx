import { useState } from 'react';
import { downloadFile, slugForFilename, toMarkdown, toSrt, toTxt } from '../lib/export';
import type { TranscriptSegment } from '../types';

interface ExportBarProps {
  transcriptText: string;
  segments: TranscriptSegment[];
  createdAt: number;
  onStartOver: () => void;
}

export function ExportBar({ transcriptText, segments, createdAt, onStartOver }: ExportBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcriptText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const base = slugForFilename('murmur-transcript');

  return (
    <div className="flex flex-wrap items-center gap-3 border-t hairline px-1 pt-5">
      <button type="button" onClick={handleCopy} className="btn-primary">
        {copied ? 'Copied' : 'Copy to clipboard'}
      </button>

      <button
        type="button"
        className="btn-ghost"
        onClick={() => downloadFile(`${base}.txt`, toTxt(transcriptText), 'txt')}
      >
        Export .txt
      </button>

      <button
        type="button"
        className="btn-ghost"
        onClick={() => downloadFile(`${base}.md`, toMarkdown('Voice memo transcript', transcriptText, createdAt), 'md')}
      >
        Export .md
      </button>

      <button
        type="button"
        className="btn-ghost disabled:opacity-30"
        disabled={segments.length === 0}
        title={segments.length === 0 ? 'No timestamp data available for this transcript' : undefined}
        onClick={() => downloadFile(`${base}.srt`, toSrt(segments), 'srt')}
      >
        Export .srt
      </button>

      <button type="button" onClick={onStartOver} className="ml-auto font-body text-sm text-ink-400 hover:text-gilt-400">
        New recording
      </button>
    </div>
  );
}
