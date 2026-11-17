/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Multi-Specialist Parallel Work Visualization (R4)
 * Displays multiple specialists working simultaneously, with stable identities,
 * current tasks, live activity status indicators, expandable step history drawers,
 * and visual multi-lane overlapping timeline intervals as a frontend presentation
 * abstraction for offline demonstrations.
 */

import React, { useState } from 'react';
import { Info, Check, AlertCircle, Clock, ChevronDown, Users } from 'lucide-react';
import { MediobotAvatar } from '../threads/MediobotAvatar';
import { getMediobotPresentation } from './presentation';
import { redactSensitiveData } from '../activity/allowlistRedaction';
import type { SpecialistExecutionInterval } from './parallelWorkFixture';

export type { SpecialistExecutionInterval } from './parallelWorkFixture';

export interface MultiSpecialistExecutionViewProps {
  readonly teamId: string;
  readonly intervals?: ReadonlyArray<SpecialistExecutionInterval>;
  readonly isSimulated?: boolean;
  readonly className?: string;
  readonly onSelectSpecialist?: (specialistId: string) => void;
  readonly theme?: 'light' | 'dark';
}

export const MultiSpecialistExecutionView: React.FC<MultiSpecialistExecutionViewProps> = ({
  teamId,
  intervals = [],
  isSimulated = true,
  className = '',
  onSelectSpecialist,
  theme,
}) => {
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  // Safe theme detection without throwing outside AppProvider
  const isLight = theme === 'light' || (
    typeof document !== 'undefined' &&
    document.documentElement?.classList?.contains('light')
  );

  const toggleHistory = (intervalId: string) => {
    setExpandedHistory((prev) => ({
      ...prev,
      [intervalId]: !prev[intervalId],
    }));
  };

  const safeIntervals = Array.isArray(intervals) ? intervals : [];

  // Relative timeline geometry math
  const minStart = safeIntervals.length > 0
    ? Math.min(0, ...safeIntervals.map((i) => i.startRelativeSec || 0))
    : 0;
  const maxEndSec = safeIntervals.length > 0
    ? Math.max(1, ...safeIntervals.map((i) => i.endRelativeSec || i.startRelativeSec || 0), 30)
    : 30;
  const totalSpan = Math.max(1, maxEndSec - minStart);

  // Peak concurrency calculation across the timeline
  let peakConcurrency = 0;
  if (safeIntervals.length > 0) {
    const timePoints = Array.from(
      new Set(safeIntervals.flatMap((i) => [i.startRelativeSec, i.endRelativeSec]))
    ).sort((a, b) => a - b);

    for (const t of timePoints) {
      const active = safeIntervals.filter(
        (i) => t >= i.startRelativeSec && t < i.endRelativeSec
      ).length;
      if (active > peakConcurrency) peakConcurrency = active;
    }
    if (peakConcurrency === 0) peakConcurrency = 1;
  }

  // Ticks calculation for horizon ruler (5 ticks: 0%, 25%, 50%, 75%, 100%)
  const rulerTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    percent: pct * 100,
    timeSec: Math.round(minStart + totalSpan * pct),
  }));

  return (
    <div
      data-testid="multi-specialist-execution-view"
      className={`multi-specialist-execution-view rounded-2xl border transition-colors ${
        isLight
          ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
          : 'bg-zinc-950/90 border-zinc-800 text-zinc-100'
      } p-4 md:p-6 shadow-sm ${className}`}
    >
      {/* 1. Prominent Explicit Truthful Simulation Disclaimer Banner */}
      {isSimulated !== false && (
        <div
          data-testid="simulated-work-banner"
          role="status"
          aria-live="polite"
          className={`simulated-banner flex flex-wrap items-center justify-between gap-3 p-3 mb-5 rounded-xl border text-xs font-sans shadow-xs ${
            isLight
              ? 'bg-amber-50/90 border-amber-300 text-amber-900'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <span className="font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
              [Simulated Work Visualization]
            </span>
            <span className="font-semibold tracking-normal text-[11.5px]">
              Simulated Presentation · Offline Demonstration · No Real Backend Concurrency
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] opacity-85">
            <span>Does not imply real backend concurrency</span>
            <span className="opacity-40">·</span>
            <span>Team: {teamId}</span>
          </div>
        </div>
      )}

      {/* 2. Zero Active Intervals Idle Guidance */}
      {safeIntervals.length === 0 ? (
        <div
          data-testid="multi-specialist-idle-state"
          className={`idle-guidance py-10 text-center rounded-xl border border-dashed my-2 ${
            isLight
              ? 'bg-zinc-100/60 border-zinc-300 text-zinc-600'
              : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400'
          }`}
        >
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" aria-hidden="true" />
          <span className="block font-medium text-sm text-zinc-300 mb-1">
            No active specialist intervals
          </span>
          <span className="text-xs text-zinc-500 block max-w-sm mx-auto">
            Team is currently idle. Assign tasks to specialists to start execution.
          </span>
        </div>
      ) : (
        <>
          {/* Header Summary with Peak Concurrency & Horizon */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
                <span>Multi-Specialist Workstreams</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-normal">
                  {safeIntervals.length} Active {safeIntervals.length === 1 ? 'Lane' : 'Lanes'}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Concurrent execution intervals across specialized Mediobots
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                data-testid="peak-concurrency-badge"
                className={`text-[10.5px] font-mono px-2.5 py-1 rounded-full border ${
                  isLight
                    ? 'bg-sky-50 border-sky-200 text-sky-800'
                    : 'bg-sky-500/10 border-sky-500/20 text-sky-300'
                }`}
              >
                Peak Concurrency: {peakConcurrency} {peakConcurrency === 1 ? 'Specialist' : 'Specialists'} Active Simultaneously
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                Horizon: {maxEndSec}s
              </span>
            </div>
          </div>

          {/* 3. Multi-Specialist Parallel Cards Grid */}
          <div
            className="specialists-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-6"
            role="feed"
            aria-label="Active specialist execution cards"
          >
            {safeIntervals.map((interval) => {
              const presentation = getMediobotPresentation(
                interval.specialistId,
                interval.specialistName,
                interval.specialistRole
              );
              const isHistoryExpanded = Boolean(expandedHistory[interval.intervalId]);

              const taskTitleRedacted = redactSensitiveData(interval.taskTitle || '').text;
              const currentStepRedacted = redactSensitiveData(interval.currentStep || '').text;

              return (
                <div
                  key={interval.intervalId}
                  data-testid={`specialist-card-${interval.specialistId}`}
                  className={`specialist-card border rounded-xl p-3.5 transition-all ${
                    isLight
                      ? 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700/80 shadow-xs'
                  } ${
                    onSelectSpecialist
                      ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-sky-500/50'
                      : ''
                  }`}
                  tabIndex={onSelectSpecialist ? 0 : undefined}
                  role={onSelectSpecialist ? 'button' : undefined}
                  aria-label={
                    onSelectSpecialist
                      ? `Navigate to ${interval.specialistName} direct chat`
                      : undefined
                  }
                  onClick={() => onSelectSpecialist?.(interval.specialistId)}
                  onKeyDown={(e) => {
                    if (onSelectSpecialist && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelectSpecialist(interval.specialistId);
                    }
                  }}
                >
                  {/* Card Header: Avatar, Name, Role & Status Pill */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar glyph with initial letter for contract assertion & Mediobot presentation eyes */}
                      <div className="relative shrink-0 flex items-center justify-center">
                        <div
                          data-testid={`specialist-avatar-${interval.specialistId}`}
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${presentation.avatar}`}
                          aria-hidden="true"
                        >
                          <span
                            className={`font-bold text-xs ${
                              presentation.eye === 'bg-white' ? 'text-white' : 'text-zinc-900'
                            }`}
                          >
                            {interval.specialistName.slice(0, 1)}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                          <MediobotAvatar
                            actor={{
                              type: 'mediobot',
                              mediobotId: interval.specialistId,
                              name: interval.specialistName,
                            }}
                            size="xs"
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            isLight ? presentation.lightText : presentation.darkText
                          }`}
                        >
                          {interval.specialistName}
                        </h4>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          {interval.specialistRole}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill with Screen-Reader Accessible Label */}
                    <div className="shrink-0 flex items-center">
                      <span
                        data-testid={`specialist-status-${interval.specialistId}`}
                        role="status"
                        aria-label={
                          interval.status === 'working'
                            ? 'Working'
                            : interval.status === 'completed'
                            ? 'Completed'
                            : interval.status === 'failed'
                            ? 'Failed'
                            : interval.status === 'waiting'
                            ? 'Waiting'
                            : 'Blocked'
                        }
                        className={`status-pill inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                          interval.status === 'working'
                            ? isLight
                              ? 'bg-sky-100 text-sky-800 border border-sky-200 animate-pulse'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30 animate-pulse'
                            : interval.status === 'completed'
                            ? isLight
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : interval.status === 'failed'
                            ? isLight
                              ? 'bg-rose-100 text-rose-800 border border-rose-200 font-bold'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                            : (interval.status as string) === 'blocked'
                            ? isLight
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold'
                            : isLight
                            ? 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {interval.status === 'working' ? (
                          <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500" />
                          </span>
                        ) : interval.status === 'completed' ? (
                          <Check className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                        ) : interval.status === 'failed' || (interval.status as string) === 'blocked' ? (
                          <AlertCircle className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <Clock className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                        )}
                        <span>{interval.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Current Task & Current Activity Step */}
                  <div className="task-info mb-2 text-xs">
                    <div
                      data-testid={`task-title-${interval.specialistId}`}
                      className="font-medium text-zinc-200 mb-1 leading-snug break-words"
                    >
                      {taskTitleRedacted}
                    </div>
                    <div
                      data-testid={`current-step-${interval.specialistId}`}
                      className="text-[11px] text-zinc-400 italic break-words"
                    >
                      Current step: {currentStepRedacted}
                    </div>
                  </div>

                  {/* Expandable Activity Step History Drawer */}
                  {interval.history && interval.history.length > 0 && (
                    <div className="history-section mt-2.5 pt-2 border-t border-zinc-800/80 text-[11px]">
                      <button
                        type="button"
                        data-testid={`history-toggle-${interval.specialistId}`}
                        aria-expanded={isHistoryExpanded}
                        aria-controls={`history-list-${interval.specialistId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHistory(interval.intervalId);
                        }}
                        className={`text-zinc-400 hover:text-zinc-200 flex items-center justify-between w-full text-[10.5px] font-medium py-1 px-1 rounded transition-colors ${
                          isLight ? 'hover:bg-zinc-100' : 'hover:bg-zinc-800/60'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{isHistoryExpanded ? 'Hide' : 'Show'} Step History ({interval.history.length})</span>
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isHistoryExpanded ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </button>

                      {isHistoryExpanded && (
                        <ul
                          id={`history-list-${interval.specialistId}`}
                          data-testid={`history-list-${interval.specialistId}`}
                          role="list"
                          className="history-list space-y-1.5 mt-2 pl-3 border-l-2 border-zinc-700/60 text-[10.5px] text-zinc-400 font-mono"
                        >
                          {interval.history.map((step, idx) => (
                            <li key={idx} role="listitem" className="break-words">
                              • {redactSensitiveData(step).text}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4. Overlapping Timeline Intervals Section (Gantt Visualization) */}
          <div className="timeline-intervals-section mt-6 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-zinc-300">
                Simulated Activity Interval Tracks
              </h5>
              <span className="text-[10px] font-mono text-zinc-400">
                Rel. Time (s)
              </span>
            </div>

            {/* Time Ruler with 5 ticks */}
            <div className="relative h-4 mb-2 select-none" aria-hidden="true">
              {rulerTicks.map((tick, i) => (
                <div
                  key={i}
                  className="absolute transform -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${tick.percent}%` }}
                >
                  <span className="text-[9px] font-mono text-zinc-500">
                    {tick.timeSec}s
                  </span>
                  <div className="w-[1px] h-1.5 bg-zinc-700 mt-0.5" />
                </div>
              ))}
            </div>

            {/* Parallel Tracks Container */}
            <div
              data-testid="parallel-tracks-container"
              className={`space-y-2.5 p-3 rounded-xl border ${
                isLight ? 'bg-zinc-100/70 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800/70'
              }`}
            >
              {safeIntervals.map((interval) => {
                const start = interval.startRelativeSec || 0;
                const end = interval.endRelativeSec ?? start;

                // Mathematical percentage calculation clamped within [0, 100]
                const leftPercent = Math.min(
                  100,
                  Math.max(0, ((start - minStart) / totalSpan) * 100)
                );
                const rawWidth = Math.max(0, ((end - start) / totalSpan) * 100);

                // Minimum width floor (5%) to keep short/zero-duration intervals visible and interactive
                const widthPercent = Math.min(100 - leftPercent, Math.max(5, rawWidth));

                return (
                  <div
                    key={interval.intervalId}
                    className="flex items-center text-xs gap-3"
                  >
                    <span className="w-24 shrink-0 truncate text-[11px] text-zinc-400 font-medium">
                      {interval.specialistName}
                    </span>
                    <div className="flex-1 bg-zinc-800/60 h-5 rounded-md overflow-hidden relative shadow-inner">
                      <div
                        data-testid={`interval-bar-${interval.specialistId}`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        title={`${interval.specialistName}: ${start}s - ${end}s (${interval.status})`}
                        className={`absolute top-0 bottom-0 rounded-md px-1.5 flex items-center justify-between text-[9.5px] font-mono font-bold text-zinc-950 transition-all ${
                          interval.status === 'completed'
                            ? 'bg-emerald-400'
                            : interval.status === 'working'
                            ? 'bg-sky-400'
                            : interval.status === 'failed' || (interval.status as string) === 'blocked'
                            ? 'bg-rose-400'
                            : 'bg-zinc-500'
                        }`}
                      >
                        <span className="truncate">
                          {start}s - {end}s
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
