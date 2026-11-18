import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export interface HoldButtonProps {
  children?: React.ReactNode;
  doneLabel?: React.ReactNode;
  icon?: React.ReactNode;
  doneIcon?: React.ReactNode;
  backgroundColor?: string;
  fillColor?: string;
  textColor?: string;
  fillTextColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  radius?: number;
  fillDirection?: 'right' | 'up';
  holdTime?: number;
  releaseTime?: number;
  pressScale?: number;
  wave?: boolean;
  waveAmplitude?: number;
  glow?: boolean;
  resetAfter?: number;
  disabled?: boolean;
  mode?: 'hold' | 'auto';
  autoStart?: boolean;
  startedAt?: number;
  fullWidth?: boolean;
  ariaLabel?: string;
  title?: string;
  renderActiveLabel?: (remainingSeconds: number, progress: number) => React.ReactNode;
  onHold?: () => void;
  onTap?: () => void;
  onCancel?: () => void;
  className?: string;
  'data-testid'?: string;
}

const TAP_MS = 250;
const HIT_PAD = 10;
const LINEAR = (t: number) => t;
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

const scheduleFrame = (cb: (now: number) => void): number => {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(cb);
  }
  return setTimeout(() => cb(typeof performance !== 'undefined' ? performance.now() : Date.now()), 16) as unknown as number;
};

const cancelFrame = (id: number): void => {
  if (!id) return;
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
};

const getNow = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export default function HoldButton({
  children = 'Hold to delete',
  doneLabel = 'Deleted',
  icon = null,
  doneIcon = null,
  backgroundColor = '#27272a',
  fillColor = '#dc2626',
  textColor = '#f5f5f5',
  fillTextColor = '#ffffff',
  size = 'md',
  radius = 14,
  fillDirection = 'right',
  holdTime = 2000,
  releaseTime = 200,
  pressScale = 0.97,
  wave = true,
  waveAmplitude = 6,
  glow = true,
  resetAfter = 1200,
  disabled = false,
  mode = 'hold',
  autoStart = false,
  startedAt,
  fullWidth = false,
  ariaLabel,
  title,
  renderActiveLabel,
  onHold,
  onTap,
  onCancel,
  className = '',
  'data-testid': dataTestId,
}: HoldButtonProps) {
  const isAutoMode = mode === 'auto' || autoStart;
  const [phase, setPhase] = useState<'idle' | 'holding' | 'done'>(autoStart ? 'holding' : 'idle');
  const [input, setInput] = useState<'pointer' | 'key' | 'auto' | null>(autoStart ? 'auto' : null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    Math.max(1, Math.ceil(holdTime / 1000))
  );

  const phaseRef = useRef<'idle' | 'holding' | 'done'>(autoStart ? 'holding' : 'idle');
  const inputRef = useRef<'pointer' | 'key' | 'auto' | null>(autoStart ? 'auto' : null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const gesture = useRef<{
    pointerId: number | null;
    start: number;
    expectedDuration: number;
    rect: DOMRect | null;
  }>({
    pointerId: null,
    start: 0,
    expectedDuration: holdTime,
    rect: null,
  });
  const timers = useRef<{ complete: ReturnType<typeof setTimeout> | null; reset: ReturnType<typeof setTimeout> | null }>({
    complete: null,
    reset: null,
  });
  const motion = useRef({ raf: 0, p: 0, from: 0, to: 0, start: 0 });
  const latestCallbacks = useRef({ onHold, onTap, onCancel });
  latestCallbacks.current = { onHold, onTap, onCancel };
  const hintId = useId();

  const go = useCallback((next: 'idle' | 'holding' | 'done', kind: 'pointer' | 'key' | 'auto' | null = null) => {
    phaseRef.current = next;
    inputRef.current = kind;
    setPhase(next);
    setInput(kind);
  }, []);

  const clearTimers = useCallback(() => {
    if (timers.current.complete !== null) {
      clearTimeout(timers.current.complete);
      timers.current.complete = null;
    }
    if (timers.current.reset !== null) {
      clearTimeout(timers.current.reset);
      timers.current.reset = null;
    }
  }, []);

  const driveRef = useRef<(to: number, duration: number, ease: (t: number) => number, fromOverride?: number) => void>(() => {});

  const complete = useCallback(() => {
    if (phaseRef.current !== 'holding') return;
    if (getNow() - gesture.current.start < gesture.current.expectedDuration - 50) return;
    clearTimers();
    cancelFrame(motion.current.raf);
    motion.current.raf = 0;
    motion.current.p = 1;
    buttonRef.current?.style.setProperty('--hb-p', '1.0000');
    setRemainingSeconds(0);
    go('done', inputRef.current);
    latestCallbacks.current.onHold?.();
    if (resetAfter > 0) {
      timers.current.reset = setTimeout(() => {
        go('idle');
        driveRef.current(0, releaseTime, EASE_OUT);
      }, resetAfter);
    }
  }, [clearTimers, go, releaseTime, resetAfter]);

  const drive = useCallback(
    (to: number, duration: number, ease: (t: number) => number, fromOverride?: number) => {
      const m = motion.current;
      cancelFrame(m.raf);
      m.from = typeof fromOverride === 'number' ? fromOverride : m.p;
      m.p = m.from;
      m.to = to;
      m.start = getNow();
      buttonRef.current?.style.setProperty('--hb-p', m.p.toFixed(4));

      const step = (now: number) => {
        const t = duration > 0 ? Math.min(1, Math.max(0, (now - m.start) / duration)) : 1;
        m.p = m.from + (m.to - m.from) * ease(t);
        buttonRef.current?.style.setProperty('--hb-p', m.p.toFixed(4));

        if (m.to === 1 && phaseRef.current === 'holding') {
          const nextRemSec = Math.max(1, Math.ceil(((1 - m.p) * holdTime) / 1000));
          setRemainingSeconds((prev) => (prev === nextRemSec ? prev : nextRemSec));
        }

        if (t < 1) {
          m.raf = scheduleFrame(step);
          return;
        }
        m.raf = 0;
        if (m.to === 1) complete();
      };
      m.raf = scheduleFrame(step);
    },
    [complete, holdTime]
  );

  driveRef.current = drive;

  const begin = useCallback(
    (kind: 'pointer' | 'key' | 'auto', elapsedMs = 0) => {
      if (disabled) return false;
      if (kind !== 'auto' && phaseRef.current !== 'idle') return false;
      const button = buttonRef.current;
      if (!button && kind !== 'auto') return false;

      clearTimers();
      const clampedElapsed = Math.min(holdTime, Math.max(0, elapsedMs));
      const initialP = holdTime > 0 ? clampedElapsed / holdTime : 1;
      const remainingDuration = Math.max(0, holdTime - clampedElapsed);

      gesture.current.start = getNow();
      gesture.current.expectedDuration = remainingDuration;
      gesture.current.rect = button ? button.getBoundingClientRect() : null;

      setRemainingSeconds(Math.max(1, Math.ceil(remainingDuration / 1000)));
      go('holding', kind);
      drive(1, remainingDuration, LINEAR, initialP);
      timers.current.complete = setTimeout(complete, remainingDuration + 60);
      return true;
    },
    [clearTimers, complete, disabled, drive, go, holdTime]
  );

  const cancelAutoRun = useCallback(() => {
    if (phaseRef.current !== 'holding') return;
    clearTimers();
    cancelFrame(motion.current.raf);
    motion.current.raf = 0;
    go('idle');
    drive(0, releaseTime, EASE_OUT);
    latestCallbacks.current.onCancel?.();
  }, [clearTimers, drive, go, releaseTime]);

  const release = useCallback(
    ({ drifted = false }: { drifted?: boolean } = {}) => {
      if (phaseRef.current !== 'holding') return;
      clearTimers();
      const held = getNow() - gesture.current.start;
      go('idle');
      drive(0, releaseTime, EASE_OUT);
      if (!drifted && held < TAP_MS) latestCallbacks.current.onTap?.();
    },
    [clearTimers, drive, go, releaseTime]
  );

  const releaseRef = useRef(release);
  releaseRef.current = release;

  // Automatically trigger smooth liquid animation when autoStart is active
  useEffect(() => {
    if (!autoStart || disabled) return;
    const elapsed = typeof startedAt === 'number' ? Math.max(0, Date.now() - startedAt) : 0;
    begin('auto', elapsed);
  }, [autoStart, begin, disabled, startedAt]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !isAutoMode) return;
    e.stopPropagation();
    if (phaseRef.current === 'holding') {
      cancelAutoRun();
      return;
    }
    if (phaseRef.current === 'idle') {
      begin('auto', 0);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isAutoMode) return;
    if (e.button !== 0 || !e.isPrimary || gesture.current.pointerId !== null) return;
    if (!begin('pointer')) return;
    gesture.current.pointerId = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore pointer capture failures in unsupported environments
    }
  };

  const endPointer = (e: React.PointerEvent<HTMLButtonElement>, options?: { drifted?: boolean }) => {
    if (isAutoMode) return;
    if (e.pointerId !== gesture.current.pointerId) return;
    gesture.current.pointerId = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore pointer release failures
    }
    release(options);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isAutoMode) return;
    if (e.pointerId !== gesture.current.pointerId) return;
    const r = gesture.current.rect;
    if (!r) return;
    const out =
      e.clientX < r.left - HIT_PAD ||
      e.clientX > r.right + HIT_PAD ||
      e.clientY < r.top - HIT_PAD ||
      e.clientY > r.bottom + HIT_PAD;
    if (out) endPointer(e, { drifted: true });
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isAutoMode) return;
    if (e.pointerType !== 'touch') endPointer(e, { drifted: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isAutoMode) {
      if (e.key === 'Escape' && phaseRef.current === 'holding') {
        e.preventDefault();
        e.stopPropagation();
        cancelAutoRun();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (inputRef.current === 'key') release({ drifted: true });
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) begin('key');
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isAutoMode) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (inputRef.current === 'key') release();
    }
  };

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return undefined;
    const measure = () => {
      button.style.setProperty('--hb-w', `${button.offsetWidth || 240}px`);
      button.style.setProperty('--hb-h', `${button.offsetHeight || 34}px`);
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(button);
      return () => ro.disconnect();
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (phase !== 'holding' || isAutoMode) return undefined;
    const cancel = () => releaseRef.current({ drifted: true });
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.hidden) cancel();
    };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase, isAutoMode]);

  useEffect(() => {
    const t = timers.current;
    const m = motion.current;
    return () => {
      if (t.complete !== null) clearTimeout(t.complete);
      if (t.reset !== null) clearTimeout(t.reset);
      cancelFrame(m.raf);
    };
  }, []);

  const direction = fillDirection === 'up' ? 'up' : 'right';
  const activeBody =
    renderActiveLabel && phase !== 'idle'
      ? renderActiveLabel(Math.max(1, remainingSeconds), motion.current.p)
      : children;

  const labels = (
    <>
      <span className="hold-button__idle" aria-hidden={phase === 'done'}>
        {icon ? <span className="hold-button__icon">{icon}</span> : null}
        {activeBody}
      </span>
      <span className="hold-button__done" aria-hidden={phase !== 'done'}>
        {doneIcon ? <span className="hold-button__icon">{doneIcon}</span> : null}
        {doneLabel}
      </span>
    </>
  );

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      data-testid={dataTestId ?? 'hold-button'}
      className={`hold-button hold-button--${size}${className ? ` ${className}` : ''}`}
      data-phase={phase}
      data-input={input ?? undefined}
      data-mode={isAutoMode ? 'auto' : 'hold'}
      data-direction={direction}
      data-glow={glow ? 'true' : undefined}
      data-full-width={fullWidth ? 'true' : undefined}
      aria-label={ariaLabel}
      title={title}
      aria-describedby={hintId}
      style={
        {
          '--hb-radius': `${radius}px`,
          '--hb-bg': backgroundColor,
          '--hb-fill': fillColor,
          '--hb-text': textColor,
          '--hb-fill-text': fillTextColor,
          '--hb-hold': `${holdTime}ms`,
          '--hb-cycles': Math.max(1, holdTime / 1100),
          '--hb-release': `${releaseTime}ms`,
          '--hb-press': pressScale,
          '--hb-wave': `${wave ? waveAmplitude : 0}px`,
        } as React.CSSProperties
      }
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => endPointer(e)}
      onPointerCancel={(e) => endPointer(e, { drifted: true })}
      onLostPointerCapture={(e) => endPointer(e, { drifted: true })}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-button__glow" aria-hidden="true" />
      <span className="hold-button__pulse" aria-hidden="true" />
      <span className="hold-button__label">{labels}</span>
      <span className="hold-button__clip" aria-hidden="true">
        <span className="hold-button__fill">
          <span className="hold-button__label hold-button__label--fill">{labels}</span>
        </span>
        <span className="hold-button__crest" aria-hidden="true">
          <span className="hold-button__label hold-button__label--fill">{labels}</span>
        </span>
      </span>
      <span id={hintId} className="hold-button__sr" role="status" aria-live="polite">
        {isAutoMode
          ? phase === 'done'
            ? `${typeof doneLabel === 'string' ? doneLabel : 'Completed'}`
            : `Deleting in ${remainingSeconds} seconds. Click or press Escape to undo.`
          : `Press and hold for ${Math.round(holdTime / 100) / 10} seconds to confirm`}
      </span>
    </button>
  );
}
