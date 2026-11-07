import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ThoughtLine } from '../../components/ThoughtLine';

export interface ReasoningDisclosureProps {
  text: string;
  headerText?: string;
  isStreaming?: boolean;
  durationSec?: number;
  defaultOpen?: boolean;
  isLight?: boolean;
  className?: string;
}

/**
 * OpenCode / DeepSeek-Bot style Monospace Reasoning Disclosure:
 * Uses React Bits ThoughtLine component with live timer, breathing sparkle glyph,
 * and collapsible reasoning trace dropdown.
 */
export const ReasoningDisclosure: React.FC<ReasoningDisclosureProps> = ({
  text,
  headerText,
  isStreaming = false,
  durationSec,
  defaultOpen = false,
  isLight = false,
  className = '',
}) => {
  const cleanText = text?.trim();
  if (!cleanText && !isStreaming) return null;

  const dur = durationSec ? Math.max(1, Math.round(durationSec)) : undefined;

  return (
    <div
      data-testid="monospace-reasoning-disclosure"
      className={`select-none my-1 font-mono ${className}`}
    >
      <ThoughtLine
        working={isStreaming}
        label={headerText || 'Thinking…'}
        doneLabel={dur ? `Worked for ${dur}s ›` : 'Worked ›'}
        glyph="sparkle"
        showTimer={isStreaming}
        elapsed={dur}
        collapsible={Boolean(cleanText)}
        collapseOnSettle={!defaultOpen}
        isLight={isLight}
      >
        {cleanText && (
          <div
            data-testid="reasoning-body"
            className={`pl-2 py-1 text-[11.5px] font-mono leading-relaxed select-text whitespace-pre-wrap ${
              isLight ? 'text-neutral-600' : 'text-neutral-400'
            }`}
          >
            {cleanText}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3.5 bg-blue-500 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}
      </ThoughtLine>
    </div>
  );
};
