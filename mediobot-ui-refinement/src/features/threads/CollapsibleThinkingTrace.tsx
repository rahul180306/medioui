import React from 'react';
import { ThoughtLine } from '../../components/ThoughtLine';

export interface CollapsibleThinkingTraceProps {
  thinkingContent: string;
  isRunning?: boolean;
  isLight: boolean;
  durationText?: string;
  defaultOpen?: boolean;
}

export const CollapsibleThinkingTrace: React.FC<CollapsibleThinkingTraceProps> = ({
  thinkingContent,
  isRunning = false,
  isLight,
  durationText,
  defaultOpen,
}) => {
  const cleanContent = thinkingContent?.trim();
  if (!cleanContent && !isRunning) return null;

  // Extract steps if content has bullet or numbered steps
  const steps = cleanContent
    ? cleanContent
        .split(/\n+/)
        .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
        .filter((l) => l.length > 5 && l.length < 120)
        .slice(0, 5)
    : [];

  return (
    <div data-testid="collapsible-thinking-trace" className="my-2 select-none">
      <ThoughtLine
        working={isRunning}
        label="Thinking…"
        doneLabel="Thought for"
        glyph="sparkle"
        steps={steps.length > 1 ? steps : []}
        collapsible={true}
        collapseOnSettle={!defaultOpen}
        showTimer={true}
        durationText={durationText}
        isLight={isLight}
      >
        <div
          data-testid="thinking-content"
          className={`py-1 text-[12px] leading-relaxed select-text whitespace-pre-wrap font-mono ${
            isLight ? 'text-neutral-600' : 'text-neutral-400'
          }`}
        >
          {cleanContent || (
            <span className="italic opacity-60 font-sans">
              Formulating step-by-step strategy and architectural decisions…
            </span>
          )}
        </div>
      </ThoughtLine>
    </div>
  );
};
