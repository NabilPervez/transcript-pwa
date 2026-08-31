import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { RecordButton } from './components/RecordButton';
import { LevelMeter } from './components/LevelMeter';
import { PipelineStatus } from './components/PipelineStatus';
import { TranscriptEditor } from './components/TranscriptEditor';
import { ExportBar } from './components/ExportBar';
import { useRecorder } from './hooks/useRecorder';
import { useTranscriber } from './hooks/useTranscriber';
import { blobToWhisperInput, WHISPER_SAMPLE_RATE } from './lib/audio';

type View = 'record' | 'editor';

export default function App() {
  const recorder = useRecorder();
  const transcriber = useTranscriber();
  const [view, setView] = useState<View>('record');
  const [editedText, setEditedText] = useState('');
  const [createdAt, setCreatedAt] = useState(Date.now());
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const recordingUrlRef = useRef<string | null>(null);

  const revokeRecordingUrl = useCallback(() => {
    if (recordingUrlRef.current) {
      URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokeRecordingUrl(), [revokeRecordingUrl]);

  const modelBusy = transcriber.stage === 'downloading' || transcriber.stage === 'booting';

  const handleToggleRecord = useCallback(async () => {
    if (recorder.state === 'recording') {
      const blob = await recorder.stop();
      if (!blob) return;
      revokeRecordingUrl();
      const url = URL.createObjectURL(blob);
      recordingUrlRef.current = url;
      setRecordingUrl(url);
      setCreatedAt(Date.now());
      setView('editor');
      try {
        const pcm = await blobToWhisperInput(blob);
        transcriber.transcribe(pcm, WHISPER_SAMPLE_RATE);
      } catch {
        setDecodeError('Could not read that recording. Please try again.');
      }
    } else {
      setDecodeError(null);
      await recorder.start();
    }
  }, [recorder, transcriber, revokeRecordingUrl]);

  const handleStartOver = useCallback(() => {
    transcriber.reset();
    recorder.discard();
    revokeRecordingUrl();
    setRecordingUrl(null);
    setEditedText('');
    setView('record');
  }, [transcriber, recorder, revokeRecordingUrl]);

  const displayedText = transcriber.stage === 'transcribing' ? transcriber.partialText : editedText || transcriber.fullText;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-12 sm:px-10">
        {view === 'record' && (
          <>
            <div className="text-center">
              <h2 className="font-display text-3xl font-medium text-ink-100">Record a memo</h2>
              <p className="mt-2 max-w-sm font-body text-sm text-ink-400">
                Audio is transcribed right here in your browser. Nothing is uploaded, ever.
              </p>
            </div>

            <PipelineStatus
              stage={transcriber.stage}
              backend={transcriber.backend}
              modelProgress={transcriber.modelProgress}
              lowStorageWarning={transcriber.lowStorageWarning}
            />

            <LevelMeter level={recorder.level} active={recorder.state === 'recording'} />

            <RecordButton
              recording={recorder.state === 'recording'}
              disabled={modelBusy || recorder.state === 'requesting-permission'}
              onToggle={handleToggleRecord}
              elapsedSeconds={recorder.elapsedSeconds}
            />

            {recorder.state === 'denied' && (
              <p className="max-w-sm text-center text-sm text-signal-rec">
                Microphone access was denied. Enable it in your browser's site settings to record a memo.
              </p>
            )}
          </>
        )}

        {view === 'editor' && (
          <div className="flex w-full flex-1 flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-medium text-ink-100">Transcript</h2>
              <span className="font-mono text-[11px] uppercase tracking-wideish text-ink-500">
                {transcriber.stage === 'transcribing' ? 'live' : transcriber.stage === 'done' ? 'complete' : transcriber.stage}
              </span>
            </div>

            <PipelineStatus
              stage={transcriber.stage}
              backend={transcriber.backend}
              modelProgress={transcriber.modelProgress}
              lowStorageWarning={transcriber.lowStorageWarning}
            />

            {recordingUrl && (
              <div className="rounded-xl border hairline bg-ink-900/40 p-3">
                <audio controls src={recordingUrl} className="w-full" aria-label="Playback of your recording" />
              </div>
            )}

            {(decodeError || transcriber.errorMessage) && (
              <p className="text-sm text-signal-rec">{decodeError ?? transcriber.errorMessage}</p>
            )}

            <TranscriptEditor value={displayedText} onChange={setEditedText} />

            {transcriber.stage === 'done' && (
              <ExportBar
                transcriptText={editedText || transcriber.fullText}
                segments={transcriber.segments}
                createdAt={createdAt}
                onStartOver={handleStartOver}
              />
            )}

            {transcriber.stage !== 'done' && (
              <button type="button" onClick={handleStartOver} className="self-start font-body text-sm text-ink-400 hover:text-gilt-400">
                Cancel and re-record
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
