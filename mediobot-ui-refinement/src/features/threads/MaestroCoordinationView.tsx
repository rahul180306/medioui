/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Maestro Coordination View & Team Summary Card Components (R2, R4, R6)
 * Embeds chronological timeline and expandable parallel specialist execution canvas,
 * accessible keyboard navigation, and allowlist-redacted team summary cards.
 */

import React, { useState } from 'react';
import type { ExecutionActivityEvent } from '../../types/executionActivity';
import { ExecutionActivityTimeline } from '../activity/ExecutionActivityTimeline';
import {
  MultiSpecialistExecutionView,
  type SpecialistExecutionInterval,
} from '../mediobots/MultiSpecialistExecutionView';
import { SPECIALIST_PROFILES } from '../mediobots/parallelWorkFixture';
import { redactSensitiveData } from '../activity/allowlistRedaction';

export interface MaestroCoordinationViewProps {
  readonly teamId: string;
  readonly events: ReadonlyArray<ExecutionActivityEvent>;
  readonly intervals?: ReadonlyArray<SpecialistExecutionInterval>;
  readonly onNavigateToSpecialist?: (specialistId: string) => void;
  readonly isSimulated?: boolean;
  readonly className?: string;
}

export const MaestroCoordinationView: React.FC<MaestroCoordinationViewProps> = ({
  teamId,
  events,
  intervals = [],
  onNavigateToSpecialist,
  isSimulated = true,
  className = '',
}) => {
  const [showParallelTimeline, setShowParallelTimeline] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && showParallelTimeline) {
      e.preventDefault();
      setShowParallelTimeline(false);
    }
  };

  return (
    <div
      className={`maestro-coordination-view border border-zinc-800 bg-zinc-950 text-zinc-100 rounded-lg p-4 ${className}`}
      data-testid="maestro-coordination-view"
      role="region"
      aria-label="Maestro Coordination View"
      onKeyDown={handleKeyDown}
    >
      <header className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800" role="banner">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-100">Maestro Coordination View</h3>
          {isSimulated && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30"
              data-testid="simulated-badge"
            >
              [Simulated]
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" role="toolbar" aria-label="Coordination Actions">
          <button
            type="button"
            className="px-2.5 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            data-testid="link-to-parallel-timeline"
            aria-expanded={showParallelTimeline}
            aria-controls="parallel-timeline-section"
            onClick={() => setShowParallelTimeline((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowParallelTimeline((prev) => !prev);
              }
            }}
          >
            {showParallelTimeline ? 'Close Parallel Timeline' : 'View Parallel Timeline'}
          </button>
        </div>
      </header>

      {/* Conditionally rendered Multi-Specialist Parallel Timeline */}
      {showParallelTimeline && (
        <section
          id="parallel-timeline-section"
          className="mb-4"
          role="region"
          aria-label="Multi-Specialist Parallel Timeline"
          data-testid="parallel-timeline-container"
        >
          <MultiSpecialistExecutionView
            teamId={teamId}
            intervals={intervals}
            isSimulated={isSimulated}
            onSelectSpecialist={onNavigateToSpecialist}
          />
        </section>
      )}

      {/* Embedded Execution Activity Timeline for Maestro */}
      <section role="region" aria-label="Maestro Timeline Feed">
        <ExecutionActivityTimeline
          events={events}
          isMaestroChat={true}
          isMainChat={false}
        />
      </section>
    </div>
  );
};

/**
 * Maestro Team Summary Card Component (R2, R5, R6)
 */
export interface TeamSummaryData {
  readonly teamId: string;
  readonly teamName: string;
  readonly goal: string;
  readonly status: 'active' | 'blocked' | 'completed' | 'idle';
  readonly activeSpecialists: ReadonlyArray<string>;
  readonly environmentSummary?: string;
  readonly configurationNotes?: string;
}

export interface MaestroTeamSummaryCardProps {
  readonly summary: TeamSummaryData;
  readonly onSelect?: () => void;
  readonly className?: string;
}

export const MaestroTeamSummaryCard: React.FC<MaestroTeamSummaryCardProps> = ({
  summary,
  onSelect,
  className = '',
}) => {
  const safeGoal = redactSensitiveData(summary.goal).text;
  const safeEnv = summary.environmentSummary ? redactSensitiveData(summary.environmentSummary).text : '';
  const safeConfig = summary.configurationNotes ? redactSensitiveData(summary.configurationNotes).text : '';

  return (
    <article
      className={`maestro-team-summary-card border border-zinc-800 rounded-lg p-3 bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors ${className}`}
      data-testid={`team-summary-card-${summary.teamId}`}
      role="article"
      aria-label={`Team Summary: ${summary.teamName}`}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-zinc-100">{summary.teamName}</h4>
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30"
          data-testid="summary-simulated-badge"
        >
          [Simulated]
        </span>
      </div>

      <p className="text-xs text-zinc-300 mb-2" data-testid="summary-goal">
        {safeGoal}
      </p>

      {safeEnv && (
        <div className="text-[11px] font-mono text-zinc-400 bg-black/40 p-1.5 rounded mb-2 border border-zinc-800/80" data-testid="summary-environment">
          <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Environment:</span>
          {safeEnv}
        </div>
      )}

      {safeConfig && (
        <div className="text-[11px] text-zinc-400 mb-2" data-testid="summary-config">
          <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Config:</span>
          {safeConfig}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className="text-[10px] text-zinc-500 font-medium">Specialists:</span>
        {summary.activeSpecialists.map((specId) => {
          const profile = SPECIALIST_PROFILES[specId];
          return (
            <span
              key={specId}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${profile?.badgeTheme || 'bg-zinc-800 text-zinc-300'}`}
              data-testid={`specialist-tag-${specId}`}
            >
              {profile?.name || specId}
            </span>
          );
        })}
      </div>
    </article>
  );
};
