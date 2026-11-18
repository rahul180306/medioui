import { useState, useEffect, useRef } from 'react';
import type { ToolExecutionData } from '../../../types';

// ---------------------------------------------------------------------------
// M3: Live Elapsed Duration Hook & Formatter
// ---------------------------------------------------------------------------

/** Formats milliseconds into human-readable monospace string (e.g. 0.4s, 1.4s, 1m 23s) */
export function formatDurationMs(ms: number): string {
  if (ms < 0) ms = 0;
  if (ms < 60_000) {
    const rounded = (Math.round(ms / 100) / 10).toFixed(1);
    return `${rounded}s`;
  }
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

/**
 * High-resolution duration timer that ticks in real time via RAF while running,
 * and freezes permanently upon completion. Never vanishes or blinks.
 */
export function useToolDuration(
  tool: ToolExecutionData,
  isRunning: boolean
): { durationText: string | null; isLive: boolean } {
  const [elapsed, setElapsed] = useState<number | null>(() => {
    if (tool.durationMs !== undefined) return tool.durationMs;
    if (isRunning && tool.startedAt) return Math.max(0, Date.now() - tool.startedAt);
    return null;
  });

  const lastElapsedRef = useRef<number | null>(elapsed);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isRunning) {
      // Freezing on completion: prioritize authoritative durationMs, fallback to last tick, then delta
      if (tool.durationMs !== undefined) {
        setElapsed(tool.durationMs);
      } else if (lastElapsedRef.current !== null) {
        setElapsed(lastElapsedRef.current);
      } else if (tool.startedAt) {
        setElapsed(Math.max(0, Date.now() - tool.startedAt));
      }
      return;
    }

    if (!tool.startedAt) return;

    const hasRaf = typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function';
    let mounted = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (!mounted) return;
      const current = Math.max(0, Date.now() - tool.startedAt!);
      lastElapsedRef.current = current;
      setElapsed(current);
      if (hasRaf) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        timerId = setTimeout(tick, 100);
      }
    };
    if (hasRaf) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      timerId = setTimeout(tick, 100);
    }

    return () => {
      mounted = false;
      if (hasRaf) cancelAnimationFrame(rafRef.current);
      if (timerId !== null) clearTimeout(timerId);
    };
  }, [isRunning, tool.startedAt, tool.durationMs]);

  if (elapsed === null) return { durationText: null, isLive: false };
  return { durationText: formatDurationMs(elapsed), isLive: isRunning };
}
