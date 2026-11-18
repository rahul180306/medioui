import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, SparklesIcon, Tick02Icon } from '@hugeicons/core-free-icons';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
const GLYPH_DONE = 0.55;
const EMPTY_STEPS: string[] = [];

const fmt = (ds: number) =>
  ds < 600 ? `${(ds / 10).toFixed(1)}s` : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`;

const spoken = (ds: number) =>
  ds < 600
    ? `${(ds / 10).toFixed(1)} seconds`
    : `${Math.floor(ds / 600)} minutes ${((ds % 600) / 10).toFixed(1)} seconds`;

export interface ThoughtLineProps {
  label?: string;
  doneLabel?: string;
  renderLabel?: (text: string, working: boolean) => React.ReactNode;
  glyph?: 'sparkle' | 'dot' | 'none' | React.ReactNode;
  steps?: string[];
  collapsible?: boolean;
  collapseOnSettle?: boolean;
  defaultOpen?: boolean;
  color?: string;
  glyphColor?: string;
  fontSize?: number;
  breathPeriod?: number;
  breathDepth?: number;
  shimmer?: boolean;
  shimmerDuration?: number;
  settleDuration?: number;
  settleBlur?: number;
  working?: boolean;
  settleAfter?: number;
  elapsed?: number;
  startedAt?: number;
  showTimer?: boolean;
  onSettle?: (seconds: number) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  rightSlot?: React.ReactNode;

  // Backward-compatibility props:
  active?: boolean;
  isLight?: boolean;
  durationText?: string;
}

export const ThoughtLine: React.FC<ThoughtLineProps> = ({
  label = 'Thinking…',
  doneLabel = '',
  renderLabel,
  glyph = 'sparkle',
  steps = EMPTY_STEPS,
  collapsible = true,
  collapseOnSettle = true,
  defaultOpen,
  color,
  glyphColor = '',
  fontSize = 13.5,
  breathPeriod = 1.6,
  breathDepth = 0.45,
  shimmer = true,
  shimmerDuration = 1.8,
  settleDuration = 350,
  settleBlur = 2,
  working,
  settleAfter = 0,
  elapsed,
  startedAt,
  showTimer = true,
  onSettle,
  className = '',
  style,
  children,
  rightSlot,
  active,
  isLight = false,
  durationText,
}) => {
  const isWorkingControlled = working ?? active ?? true;
  const reduce = useReducedMotion();
  const [autoSettled, setAutoSettled] = useState(false);
  const [open, setOpen] = useState(() => Boolean(defaultOpen ?? isWorkingControlled));
  const isWorking = isWorkingControlled && !autoSettled;
  const doneText = doneLabel || (showTimer ? 'Thought for' : 'Done thinking');
  const hasTrace = steps.length > 0 || Boolean(children);
  const depth = reduce ? Math.min(breathDepth, 0.2) : breathDepth;
  const period = reduce ? breathPeriod * 1.5 : breathPeriod;
  const trough = 1 - depth;
  const sheen = shimmer && !reduce;

  const resolvedColor = color || (isLight ? '#52525b' : '#a1a1aa');
  const resolvedGlyphColor = glyphColor || (isLight ? '#3b82f6' : '#60a5fa');

  const glyphRef = useRef<HTMLSpanElement | null>(null);
  const breathRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<HTMLSpanElement | null>(null);
  const stackRef = useRef<HTMLSpanElement | null>(null);
  const workRef = useRef<HTMLSpanElement | null>(null);
  const doneRef = useRef<HTMLSpanElement | null>(null);

  const initialDs =
    elapsed != null
      ? Math.max(0, Math.round(elapsed * 10))
      : isWorking && startedAt
      ? Math.max(0, Math.floor((Date.now() - startedAt) / 100))
      : 0;
  const dsRef = useRef(initialDs);
  const prevWorking = useRef(isWorking);
  const latest = useRef<{ onSettle?: (seconds: number) => void }>({});
  latest.current = { onSettle };
  const [announce, setAnnounce] = useState(label);

  useEffect(() => {
    if (isWorkingControlled) setAutoSettled(false);
  }, [isWorkingControlled]);

  useEffect(() => {
    if (isWorking) {
      setOpen(true);
    } else if (collapseOnSettle && defaultOpen === undefined) {
      setOpen(false);
    }
  }, [isWorking, collapseOnSettle, defaultOpen]);

  useEffect(() => {
    const glyphEl = glyphRef.current;
    const breathEl = breathRef.current;
    if (!breathEl) return undefined;
    const s = settleDuration / 1000;
    const running: Array<{ stop?: () => void }> = [];
    let cancelled = false;

    const safeAnimate = (
      el: Element,
      keyframes: Record<string, unknown>,
      options: Record<string, unknown>
    ) => {
      try {
        const ctrl = animate(el, keyframes, options as Parameters<typeof animate>[2]);
        running.push(ctrl);
        return ctrl;
      } catch {
        return null;
      }
    };

    const loop = (el: Element, delay: number) =>
      safeAnimate(el, { opacity: [trough, 1, trough] }, { duration: period, ease: EASE_IN_OUT, repeat: Infinity, delay });

    if (isWorking) {
      if (depth > 0) {
        if (sheen) safeAnimate(breathEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT });
        if (glyphEl) {
          const lead = safeAnimate(glyphEl, { opacity: trough }, { duration: 0.2, ease: EASE_OUT });
          if (lead && typeof lead.then === 'function') {
            lead.then(() => {
              if (cancelled) return;
              loop(glyphEl, 0);
              if (!sheen) loop(breathEl, 0.14);
            });
          } else {
            loop(glyphEl, 0);
            if (!sheen) loop(breathEl, 0.14);
          }
        } else if (!sheen) {
          loop(breathEl, 0.14);
        }
      } else {
        if (glyphEl) safeAnimate(glyphEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT });
        safeAnimate(breathEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT });
      }
    } else {
      if (glyphEl) safeAnimate(glyphEl, { opacity: GLYPH_DONE }, { duration: s, ease: EASE_OUT });
      safeAnimate(breathEl, { opacity: 1 }, { duration: s, ease: EASE_OUT });
    }

    return () => {
      cancelled = true;
      running.forEach((a) => a.stop?.());
    };
  }, [isWorking, period, depth, trough, settleDuration, glyph, sheen]);

  const paint = (ds: number) => {
    dsRef.current = ds;
    if (timerRef.current) timerRef.current.textContent = durationText ? durationText : fmt(ds);
  };

  useLayoutEffect(() => {
    if (elapsed != null) {
      paint(Math.max(0, Math.round(elapsed * 10)));
      return undefined;
    }
    if (!isWorking) return undefined;
    const baseOffsetMs = startedAt ? Math.max(0, Date.now() - startedAt) : 0;
    const runStart = performance.now() - baseOffsetMs;
    paint(Math.floor(baseOffsetMs / 100));
    const id = setInterval(() => {
      const ds = Math.floor((performance.now() - runStart) / 100);
      paint(ds);
      if (settleAfter > 0 && ds >= Math.round(settleAfter * 10)) setAutoSettled(true);
    }, 100);
    return () => clearInterval(id);
  }, [isWorking, elapsed, startedAt, settleAfter, durationText]);

  useLayoutEffect(() => {
    const t = timerRef.current;
    const stack = stackRef.current;
    if (!t || !stack) return undefined;
    const place = (glide: boolean) => {
      const activeEl = isWorking ? workRef.current : doneRef.current;
      if (!activeEl) return;
      const shift = activeEl.offsetWidth - stack.offsetWidth;
      if (!glide) t.style.transition = 'none';
      t.style.transform = `translateX(${shift}px)`;
      if (!glide) {
        void t.offsetWidth;
        t.style.transition = '';
      }
    };
    place(prevWorking.current !== isWorking);
    prevWorking.current = isWorking;

    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => place(false));
    if (workRef.current) ro.observe(workRef.current);
    if (doneRef.current) ro.observe(doneRef.current);
    return () => ro.disconnect();
  }, [isWorking, label, doneText, fontSize, showTimer]);

  useEffect(() => {
    if (isWorking) {
      setAnnounce(label);
      return;
    }
    setAnnounce(showTimer ? `${doneText} ${spoken(dsRef.current)}` : doneText);
    latest.current.onSettle?.(dsRef.current / 10);
  }, [isWorking, label, doneText, showTimer]);

  const initialTimerDisplay = durationText || fmt(initialDs);
  const head = (
    <>
      {glyph !== 'none' ? (
        <span ref={glyphRef} className="thought-line__glyph" aria-hidden="true">
          {glyph === 'sparkle' ? (
            <HugeiconsIcon icon={SparklesIcon} size="100%" strokeWidth={2} />
          ) : glyph === 'dot' ? (
            <span className="thought-line__dot" />
          ) : (
            glyph
          )}
        </span>
      ) : null}
      <span ref={stackRef} className="thought-line__label" aria-hidden="true">
        <span ref={workRef} className="thought-line__text" data-active={isWorking ? '' : undefined}>
          <span ref={breathRef} className="thought-line__breath" data-shimmer={sheen ? '' : undefined}>
            {renderLabel ? renderLabel(label, true) : label}
          </span>
        </span>
        <span
          ref={doneRef}
          className="thought-line__text thought-line__text--done"
          data-active={isWorking ? undefined : ''}
        >
          {renderLabel ? renderLabel(doneText, false) : doneText}
        </span>
      </span>
      {showTimer ? (
        <span ref={timerRef} className="thought-line__timer" data-done={isWorking ? undefined : ''} aria-hidden="true">
          {initialTimerDisplay}
        </span>
      ) : null}
      {collapsible && hasTrace ? (
        <span className="thought-line__chevron" data-on="" aria-hidden="true">
          <HugeiconsIcon icon={ArrowDown01Icon} size="1em" strokeWidth={2.2} />
        </span>
      ) : null}
      <span className="thought-line__sr" role="status">
        {announce}
      </span>
    </>
  );

  return (
    <div
      data-testid="thought-line"
      className={`thought-line ${isLight ? 'thought-line--light' : 'thought-line--dark'}${className ? ` ${className}` : ''}`}
      data-working={isWorking ? '' : undefined}
      data-open={open && hasTrace ? '' : undefined}
      style={{
        '--tl-font': `${fontSize}px`,
        '--tl-color': resolvedColor,
        '--tl-glyph': resolvedGlyphColor,
        '--tl-settle': `${settleDuration}ms`,
        '--tl-blur': `${settleBlur}px`,
        '--tl-shimmer': `${shimmerDuration}s`,
        ...style,
      } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-3 w-full min-w-0">
        {collapsible && hasTrace ? (
          <button
            type="button"
            className="thought-line__head min-w-0"
            data-toggle=""
            aria-expanded={open}
            tabIndex={0}
            onClick={() => setOpen((v) => !v)}
          >
            {head}
          </button>
        ) : (
          <div className="thought-line__head min-w-0">{head}</div>
        )}
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>

      {hasTrace ? (
        <div className="thought-line__trace" data-open={open ? '' : undefined} aria-hidden={!open}>
          <div className="thought-line__fold">
            {steps.length > 0 ? (
              <div className="thought-line__steps">
                {steps.map((text, i) => {
                  const done = !isWorking || i < steps.length - 1;
                  return (
                    <div key={`${i}-${text}`} className="thought-line__step" data-done={done ? '' : undefined}>
                      <span className="thought-line__mark" aria-hidden="true">
                        {done ? (
                          <HugeiconsIcon icon={Tick02Icon} size="1em" strokeWidth={2.5} />
                        ) : (
                          <i className="thought-line__pulse" />
                        )}
                      </span>
                      <span className="thought-line__step-text">{text}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {children ? <div className="thought-line__custom-fold">{children}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ThoughtLine;
