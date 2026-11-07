import React, { useRef, useEffect, useMemo } from 'react';
import { Terminal, CheckCircle2, AlertCircle } from 'lucide-react';
import { MAX_TERMINAL_BUFFER_BYTES, safeTailSliceUtf8 } from './streamEventReducer';

export interface AnsiTerminalTailProps {
  rawBuffer: string;
  hasLiveTail?: boolean;
  exitCode?: number;
  durationMs?: number;
  isLight?: boolean;
}

/**
 * Parses ANSI escape sequences into React styled elements
 */
function parseAnsi(text: string): React.ReactNode[] {
  // Regex matching standard ANSI SGR codes: \u001b[...m
  const ANSI_REGEX = /\u001b\[([0-9;]*)m/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let currentColorClass = '';
  let isBold = false;

  const matches = [...text.matchAll(ANSI_REGEX)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!;
    const textChunk = text.slice(lastIndex, match.index);
    if (textChunk) {
      parts.push(
        <span
          key={`chunk-${lastIndex}`}
          className={`${currentColorClass} ${isBold ? 'font-bold' : ''}`}
        >
          {textChunk}
        </span>
      );
    }

    const code = match[1] || '0';
    const codes = code.split(';').map(Number);

    for (const c of codes) {
      if (c === 0) {
        currentColorClass = '';
        isBold = false;
      } else if (c === 1) {
        isBold = true;
      } else if (c === 31) {
        currentColorClass = 'text-rose-500';
      } else if (c === 32) {
        currentColorClass = 'text-emerald-500';
      } else if (c === 33) {
        currentColorClass = 'text-amber-500';
      } else if (c === 34) {
        currentColorClass = 'text-blue-500';
      } else if (c === 35) {
        currentColorClass = 'text-purple-500';
      } else if (c === 36) {
        currentColorClass = 'text-cyan-500';
      } else if (c === 37) {
        currentColorClass = 'text-neutral-300';
      } else if (c >= 90 && c <= 97) {
        currentColorClass = 'opacity-70';
      }
    }

    lastIndex = match.index! + match[0].length;
  }

  const remaining = text.slice(lastIndex);
  if (remaining) {
    parts.push(
      <span key={`chunk-rem`} className={`${currentColorClass} ${isBold ? 'font-bold' : ''}`}>
        {remaining}
      </span>
    );
  }

  return parts;
}

export const AnsiTerminalTail: React.FC<AnsiTerminalTailProps> = ({
  rawBuffer,
  hasLiveTail = false,
  exitCode,
  durationMs,
  isLight = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as tail arrives
  useEffect(() => {
    if (hasLiveTail && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [rawBuffer, hasLiveTail]);

  // Enforce bounded tail slice
  const boundedContent = useMemo(() => {
    if (!rawBuffer) return '';
    return safeTailSliceUtf8(rawBuffer, MAX_TERMINAL_BUFFER_BYTES);
  }, [rawBuffer]);

  const parsedNodes = useMemo(() => parseAnsi(boundedContent), [boundedContent]);

  if (!boundedContent && !hasLiveTail) return null;

  return (
    <div
      data-testid="ansi-terminal-tail"
      className="my-3 font-mono text-[11px] select-text"
    >
      {/* Sleek Terminal Header */}
      <div
        className={`flex items-center justify-between px-2 py-1 text-[10.5px] border-b ${
          isLight
            ? 'border-neutral-200 text-neutral-600 bg-neutral-100/60'
            : 'border-neutral-800 text-neutral-400 bg-neutral-900/60'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3 opacity-60" />
          <span>Terminal Output</span>
        </div>

        <div className="flex items-center gap-2 tabular-nums">
          {durationMs !== undefined && (
            <span className="opacity-60">{(durationMs / 1000).toFixed(2)}s</span>
          )}
          {exitCode !== undefined && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                exitCode === 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {exitCode === 0 ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              exit {exitCode}
            </span>
          )}
        </div>
      </div>

      {/* Terminal Viewport with 64KB bounded tail and single live pulsing tail cursor */}
      <div
        ref={containerRef}
        className={`p-3 max-h-64 overflow-y-auto leading-relaxed whitespace-pre-wrap ${
          isLight ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-950 text-neutral-200'
        }`}
      >
        {parsedNodes}
        {hasLiveTail && (
          <span
            data-testid="terminal-live-tail-indicator"
            className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-0.5 align-middle"
          />
        )}
      </div>
    </div>
  );
};
