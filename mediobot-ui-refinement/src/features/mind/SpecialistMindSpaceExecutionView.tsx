import React, { useReducer, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import {
  streamEventReducer,
  createInitialMindSpaceState,
  type StreamEvent,
} from './streamEventReducer';
import { ReasoningDisclosure } from './ReasoningDisclosure';
import { GroupedToolRuns } from './GroupedToolRuns';
import { SyntaxDiffView } from './SyntaxDiffView';
import { AnsiTerminalTail } from './AnsiTerminalTail';

export interface SpecialistMindSpaceExecutionViewProps {
  turnId: string;
  initialEvents?: StreamEvent[];
  isStreaming?: boolean;
  onPromote?: () => void;
}

/**
 * Specialist Mind Space Execution View (Requirement R2)
 *
 * OpenCode / DeepSeek-Bot style single unboxed canvas:
 * - Collapsed-by-default monospace reasoning disclosure ("Worked for 8s ›")
 * - Grouped inline tool runs without bulky observation cards
 * - Syntax-highlighted code diffs with line-anchored diagnostic ribbons
 * - ANSI-aware terminal view with 64KB bounded tail buffer and single live pulsing tail
 * - Completely unboxed without nested cards, colored boxes, or chatbot suggestion chips
 */
export const SpecialistMindSpaceExecutionView: React.FC<SpecialistMindSpaceExecutionViewProps> = ({
  turnId,
  initialEvents = [],
  isStreaming = false,
  onPromote,
}) => {
  const { theme } = useApp();
  const isLight = theme === 'light';

  // Fold state deterministically via pure streamEventReducer
  const [state, dispatch] = useReducer(
    streamEventReducer,
    createInitialMindSpaceState(turnId)
  );

  useEffect(() => {
    for (const event of initialEvents) {
      dispatch(event);
    }
  }, [initialEvents]);

  return (
    <div
      data-testid="specialist-mind-space-execution-view"
      className="w-full max-w-4xl mx-auto px-4 py-3 md:px-8 space-y-4 select-text"
    >
      {/* 1. Monospace Reasoning Disclosure */}
      {state.reasoning && (
        <ReasoningDisclosure
          text={state.reasoning.text}
          headerText={state.reasoning.headerText}
          isStreaming={state.reasoning.isStreaming || isStreaming}
          durationSec={state.reasoning.durationSec}
          defaultOpen={false}
          isLight={isLight}
        />
      )}

      {/* 2. Grouped Inline Tool Runs */}
      {state.toolRuns.length > 0 && (
        <GroupedToolRuns toolRuns={state.toolRuns} isLight={isLight} />
      )}

      {/* 3. Syntax-Highlighted Diffs with Inline Diagnostics */}
      {state.diffs.map((diff, idx) => (
        <SyntaxDiffView
          key={`${diff.path}-${idx}`}
          filePath={diff.path}
          oldContent={diff.oldContent}
          newContent={diff.newContent}
          diagnostics={diff.diagnostics}
          isLight={isLight}
        />
      ))}

      {/* 4. ANSI Terminal View with 64KB Bounded Tail Buffer */}
      {(state.terminal.rawBuffer || state.terminal.hasLiveTail) && (
        <AnsiTerminalTail
          rawBuffer={state.terminal.rawBuffer}
          hasLiveTail={state.terminal.hasLiveTail}
          exitCode={state.terminal.exitCode}
          durationMs={state.terminal.durationMs}
          isLight={isLight}
        />
      )}

      {/* 5. Deliverable Handoff Strip */}
      {!isStreaming && (state.diffs.length > 0 || state.toolRuns.length > 0) && (
        <div
          data-testid="deliverable-handoff-strip"
          className={`mt-3 pt-3 border-t border-inherit/20 flex items-center justify-between text-xs ${
            isLight ? 'text-neutral-600' : 'text-neutral-400'
          }`}
        >
          <span className="font-mono text-[11.5px]">
            Deliverable ready{state.diffs.length > 0 ? ` · ${state.diffs.length} file${state.diffs.length === 1 ? '' : 's'} modified` : ''}
          </span>
          {onPromote && (
            <button
              type="button"
              data-testid="mind-space-promote-btn"
              onClick={onPromote}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isLight
                  ? 'bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800'
                  : 'bg-white/10 hover:bg-white/20 text-neutral-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Promote to Maestro Team</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
