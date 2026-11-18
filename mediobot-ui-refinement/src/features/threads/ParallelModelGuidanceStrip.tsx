import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { resolveModelDisplay } from '../activity/CodexExecutionView';
import { SpecialistMicroGlyph } from '../activity/subcomponents/ExecutionGlyphs';

export interface ParallelGuidanceItem {
  specialistId: string;
  specialistName: string;
  modelKey: string;
  effort: string;
  status: 'working' | 'waiting' | 'idle';
  activityLabel?: string;
}

export const ParallelModelGuidanceStrip: React.FC<{
  activeTurnRunning?: boolean;
  threadId?: string;
}> = ({ activeTurnRunning, threadId }) => {
  const { agents, getAgentPreference, activeThread, theme, getThreadAgentStatus, threads } = useApp();
  const currentThread = threadId ? (threads?.find((t) => t.id === threadId) ?? activeThread) : activeThread;
  const isLight = theme === 'light';
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Identify specialists with genuine active work on THIS thread ONLY:
  const workingSpecialistIds = new Set<string>();
  const activeStepBySpecialist = new Map<string, string>();

  if (activeTurnRunning && currentThread) {
    // 1. Thread-scoped specialist status from AppContext
    if (getThreadAgentStatus) {
      for (const agent of agents) {
        if (agent.group === 'specialist' && getThreadAgentStatus(currentThread.id, agent.id) === 'working') {
          workingSpecialistIds.add(agent.id);
        }
      }
    }

    // 2. Or actively executing tools in the current running turn of this thread
    if (currentThread.turns) {
      const runningTurn = currentThread.turns.find((t) => t.status === 'running' || t.status === 'pause_requested');
      if (runningTurn?.items) {
        for (const item of runningTurn.items) {
          if (
            item.actor &&
            item.actor.type === 'mediobot' &&
            item.actor.mediobotId
          ) {
            if (item.type === 'tool_execution' && item.tool?.status === 'running') {
              workingSpecialistIds.add(item.actor.mediobotId);
              activeStepBySpecialist.set(
                item.actor.mediobotId,
                item.tool.command || item.tool.toolName || 'Executing tool'
              );
            } else if (item.type === 'activity' && item.activityLabel) {
              activeStepBySpecialist.set(item.actor.mediobotId, item.activityLabel);
            }
          }
        }
      }
    }
  }

  // Filter agents by genuine active work strictly on this thread — NO un-scoped fallback!
  const workingSpecialists = agents.filter((a) => workingSpecialistIds.has(a.id));

  // If no specialist has actual running activity or turn is not running, render NOTHING.
  if (!activeTurnRunning || workingSpecialists.length === 0) return null;

  return (
    <div
      data-testid="parallel-model-guidance-strip"
      className="my-2 flex flex-col gap-1.5 text-[13px] select-none"
    >
      {/* Inline multi-specialist started working milestone */}
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        <span className="inline-flex items-center gap-1 shrink-0 mr-0.5">
          {workingSpecialists.map((agent) => (
            <SpecialistMicroGlyph
              key={`glyph-${agent.id}`}
              specialistId={agent.id}
              isLight={isLight}
              working
              className="w-3.5 h-3.5"
            />
          ))}
        </span>

        {workingSpecialists.map((agent, index) => {
          const pref = getAgentPreference(agent.id);
          const modelName = resolveModelDisplay(pref.modelKey) || pref.modelKey;
          const isSecondLast = index === workingSpecialists.length - 2;
          const isLast = index === workingSpecialists.length - 1;

          return (
            <span
              key={agent.id}
              data-testid={`guidance-chip-${agent.id}`}
              className="inline-flex items-baseline gap-1"
            >
              <span className={isLight ? 'text-neutral-800 font-medium' : 'text-neutral-200 font-medium'}>
                {agent.name}
              </span>
              {modelName && (
                <span className={`text-[11px] font-sans ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  ({modelName})
                </span>
              )}
              {!isLast && (
                <span className={isLight ? 'text-neutral-500' : 'text-neutral-400'}>
                  {isSecondLast ? 'and' : ','}
                </span>
              )}
            </span>
          );
        })}
        <span className={isLight ? 'text-neutral-500' : 'text-neutral-400'}>started working</span>
      </div>

      {/* Interactive Subagents status readout */}
      <div className="flex flex-col items-start gap-1.5">
        <button
          type="button"
          onClick={() => setIsDetailOpen((open) => !open)}
          aria-expanded={isDetailOpen}
          className={`inline-flex items-center gap-2 py-0.5 px-1.5 -mx-1.5 rounded-md text-[12px] cursor-pointer transition-colors ${
            isLight
              ? 'hover:bg-black/[0.03] text-neutral-500'
              : 'hover:bg-white/[0.03] text-neutral-400'
          }`}
        >
          <span className={isLight ? 'text-neutral-400' : 'text-neutral-500'}>Subagents</span>
          <span className="inline-flex items-center gap-1.5">
            <SpecialistMicroGlyph
              specialistId={workingSpecialists[0]?.id}
              isLight={isLight}
              working
              className="w-3.5 h-3.5"
            />
            <span className={`tabular-nums ${isLight ? 'text-neutral-700' : 'text-neutral-200'}`}>
              {workingSpecialists.length} working
            </span>
          </span>
          {isDetailOpen ? (
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 opacity-50 shrink-0" />
          )}
        </button>

        {isDetailOpen && (
          <div
            className={`w-full rounded-lg border px-3 py-2 text-[12px] space-y-1.5 ${
              isLight
                ? 'border-black/[0.07] bg-[#fafafa] text-neutral-700'
                : 'border-white/[0.07] bg-white/[0.02] text-neutral-300'
            }`}
          >
            {workingSpecialists.map((agent) => {
              const pref = getAgentPreference(agent.id);
              const modelName = resolveModelDisplay(pref.modelKey) || pref.modelKey;
              const currentStep = activeStepBySpecialist.get(agent.id) || agent.currentTask || agent.role;
              return (
                <div key={agent.id} className="flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <SpecialistMicroGlyph
                      specialistId={agent.id}
                      isLight={isLight}
                      working
                      className="w-3.5 h-3.5"
                    />
                    <span className={`font-medium shrink-0 ${isLight ? 'text-neutral-900' : 'text-neutral-100'}`}>
                      {agent.name}
                    </span>
                    <span className={`truncate text-[11.5px] ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      {currentStep}
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 shrink-0 text-[11px] font-mono ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {modelName && <span className="font-sans">{modelName}</span>}
                    {pref.effort && <span>· {pref.effort}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
