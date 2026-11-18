import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ComputerTerminal01Icon,
  File01Icon,
  Search01Icon,
  PencilEdit01Icon,
  Tick02Icon,
  RefreshIcon,
} from '@hugeicons/core-free-icons';

export type CallChipStatus = 'idle' | 'running' | 'done' | 'error';
export type CallChipIconKind = 'terminal' | 'file' | 'search' | 'edit' | React.ReactNode;

export interface CallChipProps {
  icon?: CallChipIconKind;
  name?: string;
  argument?: string;
  status?: CallChipStatus;
  expectedMs?: number;
  durationMs?: number;
  startedAt?: number;
  size?: number;
  radius?: number;
  color?: string;
  surfaceColor?: string;
  borderColor?: string;
  progressColor?: string;
  progressOpacity?: number;
  doneColor?: string;
  errorColor?: string;
  washOpacity?: number;
  shake?: number;
  showTimer?: boolean;
  timerTestId?: string;
  onRetry?: () => void;
  className?: string;
  style?: CSSProperties;
}

const formatChipMs = (ms: number | null): string => {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return '—';
  if (ms < 1000) return `${Math.max(1, Math.round(ms))} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
};

const computeProgress = (elapsedMs: number, expectedMs: number): number => {
  const safeExpected = Math.max(250, expectedMs);
  // Smooth asymptotic curve hitting 0.90 at expectedMs, parking below 0.96
  const ratio = elapsedMs / safeExpected;
  return Math.min(0.96, 0.96 * (1 - Math.exp(-2.8 * ratio)));
};

export const CallChip: React.FC<CallChipProps> = ({
  icon = 'terminal',
  name = 'bash',
  argument = 'npm test',
  status = 'running',
  expectedMs = 2500,
  durationMs,
  startedAt,
  size = 34,
  radius = 10,
  color = 'currentColor',
  surfaceColor = '#27272a',
  borderColor = 'rgba(255, 255, 255, 0.08)',
  progressColor = 'currentColor',
  progressOpacity = 0.08,
  doneColor = '#22c55e',
  errorColor = '#ef4444',
  washOpacity = 0.14,
  shake = 6,
  showTimer = true,
  timerTestId,
  onRetry,
  className = '',
  style,
}) => {
  const rootRef = useRef<HTMLElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const progressRef = useRef<number>(status === 'done' ? 1 : 0);
  const runStartPerfRef = useRef<number | null>(null);
  const prevStatusRef = useRef<CallChipStatus>(status);

  const [elapsedMs, setElapsedMs] = useState<number | null>(() => {
    if (status === 'running') {
      return startedAt ? Math.max(1, Date.now() - startedAt) : 0;
    }
    if (typeof durationMs === 'number' && durationMs > 0) {
      return durationMs;
    }
    return null;
  });

  // Live RAF wipe + millisecond ticker while running
  useEffect(() => {
    if (status !== 'running') {
      if (status === 'done') {
        progressRef.current = 1;
        if (rootRef.current) {
          rootRef.current.style.setProperty('--cc-progress', '1');
        }
        if (typeof durationMs === 'number' && durationMs > 0) {
          setElapsedMs(durationMs);
        } else if (runStartPerfRef.current !== null) {
          setElapsedMs(Math.max(1, performance.now() - runStartPerfRef.current));
        }
      } else if (status === 'error') {
        if (typeof durationMs === 'number' && durationMs > 0) {
          setElapsedMs(durationMs);
        } else if (runStartPerfRef.current !== null) {
          setElapsedMs(Math.max(1, performance.now() - runStartPerfRef.current));
        }
        if (rootRef.current && progressRef.current === 0) {
          progressRef.current = 0.42;
          rootRef.current.style.setProperty('--cc-progress', '0.42');
        }
      } else {
        progressRef.current = 0;
        if (rootRef.current) {
          rootRef.current.style.setProperty('--cc-progress', '0');
        }
        setElapsedMs(null);
      }
      runStartPerfRef.current = null;
      return;
    }

    const offsetMs = startedAt ? Math.max(0, Date.now() - startedAt) : 0;
    const startPerf = performance.now() - offsetMs;
    runStartPerfRef.current = startPerf;

    const hasRaf = typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function';
    let rafId = 0;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let lastRenderTick = 0;
    let cancelled = false;

    const frame = (now: number) => {
      if (cancelled) return;
      const elapsed = Math.max(0, now - startPerf);
      const nextProgress = computeProgress(elapsed, expectedMs);
      progressRef.current = nextProgress;

      if (rootRef.current) {
        rootRef.current.style.setProperty('--cc-progress', nextProgress.toFixed(4));
      }

      if (now - lastRenderTick >= 55) {
        lastRenderTick = now;
        setElapsedMs(elapsed);
      }

      if (hasRaf) {
        rafId = requestAnimationFrame(frame);
      } else {
        timerId = setTimeout(() => frame(performance.now()), 60);
      }
    };

    if (hasRaf) {
      rafId = requestAnimationFrame(frame);
    } else {
      timerId = setTimeout(() => frame(performance.now()), 60);
    }

    return () => {
      cancelled = true;
      if (hasRaf) cancelAnimationFrame(rafId);
      if (timerId !== null) clearTimeout(timerId);
    };
  }, [status, expectedMs, startedAt, durationMs]);

  // Shake feedback when entering error state (strictly guarded for JSDOM/SSR/reduced motion)
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === 'error' && prev !== 'error' && shake > 0 && rootRef.current) {
      const prefersReduced =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReduced && typeof rootRef.current.animate === 'function') {
        rootRef.current.animate(
          [
            { transform: 'translateX(0px)' },
            { transform: `translateX(${-shake}px)` },
            { transform: `translateX(${shake * 0.78}px)` },
            { transform: `translateX(${-shake * 0.45}px)` },
            { transform: `translateX(${shake * 0.2}px)` },
            { transform: 'translateX(0px)' },
          ],
          {
            duration: 340,
            easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)',
          }
        );
      }
    }
  }, [status, shake]);

  const iconSize = Math.max(12, Math.round(size * 0.44));

  const renderToolGlyph = () => {
    if (icon === 'terminal') {
      return <HugeiconsIcon icon={ComputerTerminal01Icon} size={iconSize} strokeWidth={1.9} />;
    }
    if (icon === 'file') {
      return <HugeiconsIcon icon={File01Icon} size={iconSize} strokeWidth={1.9} />;
    }
    if (icon === 'search') {
      return <HugeiconsIcon icon={Search01Icon} size={iconSize} strokeWidth={1.9} />;
    }
    if (icon === 'edit') {
      return <HugeiconsIcon icon={PencilEdit01Icon} size={iconSize} strokeWidth={1.9} />;
    }
    return icon;
  };

  const isInteractiveRetry = status === 'error' && typeof onRetry === 'function';
  const showToolSlot = status === 'idle' || status === 'running';
  const showDoneSlot = status === 'done';
  const showErrorSlot = status === 'error';

  const cssVars = {
    '--cc-size': `${size}px`,
    '--cc-radius': `${radius}px`,
    '--cc-color': color,
    '--cc-surface': surfaceColor,
    '--cc-border': borderColor,
    '--cc-progress-color': progressColor,
    '--cc-progress-opacity': progressOpacity,
    '--cc-done': doneColor,
    '--cc-error': errorColor,
    '--cc-wash-opacity': washOpacity,
    '--cc-progress': status === 'done' ? 1 : progressRef.current,
    ...style,
  } as CSSProperties & Record<string, string | number>;

  const statusAnnouncement =
    status === 'running'
      ? `${name} ${argument} running`
      : status === 'done'
      ? `${name} ${argument} completed${elapsedMs ? ` in ${formatChipMs(elapsedMs)}` : ''}`
      : status === 'error'
      ? `${name} ${argument} failed${isInteractiveRetry ? ', click to retry' : ''}`
      : `${name} ${argument}`;

  const content = (
    <>
      <span ref={fillRef} className="call-chip__fill" aria-hidden="true" />
      <span className="call-chip__wash" aria-hidden="true" />

      <span className="call-chip__glyph" aria-hidden="true">
        <span className="call-chip__glyph-slot call-chip__glyph-slot--tool" data-active={showToolSlot}>
          {renderToolGlyph()}
        </span>
        <span className="call-chip__glyph-slot call-chip__glyph-slot--done" data-active={showDoneSlot}>
          <HugeiconsIcon icon={Tick02Icon} size={iconSize} strokeWidth={2.2} />
        </span>
        <span className="call-chip__glyph-slot call-chip__glyph-slot--error" data-active={showErrorSlot}>
          <HugeiconsIcon icon={RefreshIcon} size={iconSize} strokeWidth={2.1} />
        </span>
      </span>

      <span className="call-chip__body">
        {name ? <span className="call-chip__name">{name}</span> : null}
        {argument ? (
          <span className="call-chip__arg" title={argument}>
            {argument}
          </span>
        ) : null}
      </span>

      {isInteractiveRetry && (
        <span className="call-chip__retry-hint" aria-hidden="true">
          Retry
        </span>
      )}

      {showTimer && (
        <span
          className="call-chip__timer"
          data-testid={timerTestId}
          aria-hidden="true"
        >
          {formatChipMs(elapsedMs)}
        </span>
      )}

      <span className="call-chip__sr">{statusAnnouncement}</span>
    </>
  );

  if (isInteractiveRetry) {
    return (
      <button
        ref={(el) => {
          rootRef.current = el;
        }}
        type="button"
        data-testid="call-chip"
        data-status={status}
        className={`call-chip ${className}`.trim()}
        style={cssVars}
        title={`Retry ${name} ${argument}`}
        onClick={(e) => {
          e.stopPropagation();
          onRetry();
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      ref={(el) => {
        rootRef.current = el;
      }}
      role={status === 'running' ? 'status' : undefined}
      aria-live={status === 'running' ? 'polite' : undefined}
      data-testid="call-chip"
      data-status={status}
      className={`call-chip ${className}`.trim()}
      style={cssVars}
      title={`${name} ${argument}`}
    >
      {content}
    </div>
  );
};

export default CallChip;
