import React from 'react';
import { useApp } from '../../state/AppContext';
import { resolveModelDisplay } from '../activity/CodexExecutionView';

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

  // Identify specialists with genuine active work on THIS thread ONLY:
  const workingSpecialistIds = new Set<string>();

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
            item.type === 'tool_execution' &&
            item.tool?.status === 'running' &&
            item.actor &&
            item.actor.type === 'mediobot' &&
            item.actor.mediobotId
          ) {
            workingSpecialistIds.add(item.actor.mediobotId);
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
      className="my-2.5 flex items-center gap-2 text-[12px] select-none pl-1 transition-opacity animate-in fade-in duration-200"
    >
      {/* Sleek pulsing green dot matching Codex reference */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
      </span>

      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        {workingSpecialists.map((agent, index) => {
          const pref = getAgentPreference(agent.id);
          const modelName = resolveModelDisplay(pref.modelKey) || pref.modelKey;

          return (
            <span
              key={agent.id}
              data-testid={`guidance-chip-${agent.id}`}
              className="inline-flex items-center gap-1 font-medium"
            >
              <span className={isLight ? 'text-neutral-900 font-semibold' : 'text-neutral-100 font-semibold'}>
                {agent.name}
              </span>
              {modelName && (
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                  isLight ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {modelName}
                </span>
              )}
              {index < workingSpecialists.length - 1 && (
                <span className={isLight ? 'text-neutral-400' : 'text-neutral-500'}>and</span>
              )}
            </span>
          );
        })}
        <span className={isLight ? 'text-neutral-500' : 'text-neutral-400'}>started working</span>
      </div>
    </div>
  );
};
