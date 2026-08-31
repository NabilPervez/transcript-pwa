import { useEffect, useRef } from 'react';

const BAR_COUNT = 28;

interface LevelMeterProps {
  level: number; // 0-1 rms
  active: boolean;
}

/**
 * A rolling history of RMS samples rendered as bars, similar to a cassette
 * VU meter. Runs its own rAF-independent render (driven by React state
 * updates from useRecorder) so it never blocks the main thread on its own.
 */
export function LevelMeter({ level, active }: LevelMeterProps) {
  const historyRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));

  useEffect(() => {
    const history = historyRef.current;
    history.push(Math.min(1, level * 6));
    history.shift();
  }, [level]);

  const bars = historyRef.current;

  return (
    <div
      className="flex h-16 w-full items-end justify-center gap-1"
      role="img"
      aria-label={active ? 'Live microphone level' : 'Microphone idle'}
    >
      {bars.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-gilt-500 transition-[height] duration-100"
          style={{
            height: `${Math.max(6, v * 100)}%`,
            opacity: active ? 0.5 + v * 0.5 : 0.15
          }}
        />
      ))}
    </div>
  );
}
