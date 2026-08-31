import type { TranscriptSegment } from '../types';

function srtTimestamp(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const msRemainder = ms % 1000;
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msRemainder, 3)}`;
}

export function toTxt(fullText: string): string {
  return fullText.trim() + '\n';
}

export function toMarkdown(title: string, fullText: string, createdAt: number): string {
  const date = new Date(createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  return `# ${title}\n\n_Transcribed on-device • ${date}_\n\n${fullText.trim()}\n`;
}

export function toSrt(segments: TranscriptSegment[]): string {
  if (segments.length === 0) return '';
  return segments
    .map((seg, i) => {
      const index = i + 1;
      return `${index}\n${srtTimestamp(seg.start)} --> ${srtTimestamp(seg.end)}\n${seg.text.trim()}\n`;
    })
    .join('\n');
}

const MIME: Record<'txt' | 'md' | 'srt', string> = {
  txt: 'text/plain;charset=utf-8',
  md: 'text/markdown;charset=utf-8',
  srt: 'application/x-subrip;charset=utf-8'
};

export function downloadFile(filename: string, contents: string, kind: 'txt' | 'md' | 'srt'): void {
  const blob = new Blob([contents], { type: MIME[kind] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function slugForFilename(base: string): string {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return `${base}-${stamp}`;
}
