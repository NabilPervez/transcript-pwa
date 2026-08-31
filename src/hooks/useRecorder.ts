import { useCallback, useEffect, useRef, useState } from 'react';
import { MicRecorder } from '../lib/audio';

export type RecordingState = 'idle' | 'requesting-permission' | 'recording' | 'stopped' | 'denied';

export function useRecorder() {
  const recorderRef = useRef<MicRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const [state, setState] = useState<RecordingState>('idle');
  const [level, setLevel] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);

  const start = useCallback(async () => {
    setState('requesting-permission');
    const recorder = new MicRecorder();
    try {
      await recorder.start((rms) => setLevel(rms));
    } catch {
      setState('denied');
      return;
    }
    recorderRef.current = recorder;
    setElapsedSeconds(0);
    setState('recording');

    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
  }, []);

  const stop = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const blob = await recorderRef.current?.stop();
    setLevel(0);
    setState('stopped');
    if (blob) setLastBlob(blob);
    return blob ?? null;
  }, []);

  const discard = useCallback(() => {
    setLastBlob(null);
    setState('idle');
    setElapsedSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.cancel();
    };
  }, []);

  return { state, level, elapsedSeconds, lastBlob, start, stop, discard };
}
