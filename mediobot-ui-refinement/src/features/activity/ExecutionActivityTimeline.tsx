/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canonical Execution Activity Timeline Component (R1, R6)
 * Reusable execution activity timeline conforming strictly to PROJECT.md interface contracts.
 * Combines Codex timeline clarity and Antigravity subagent coordination patterns.
 * Renders chronological step items with compact rows, accessible disclosure controls (WAI-ARIA),
 * allowlist-based safe tool details, explicit truthful [Simulated] badges, and disabled
 * connected verification controls.
 */

import React, { useState, useMemo } from 'react';
import type {
  ExecutionActivityEvent,
  ExecutionStepItemType,
  ExecutionStepStatus,
  SafeToolExecutionDetails,
} from '../../types/executionActivity';
import { useApp } from '../../state/AppContext';
import { getMediobotPresentation } from '../mediobots/presentation';
import { redactSensitiveData } from './allowlistRedaction';
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  AlertOctagon,
  Terminal,
  FileText,
  Search,
  ShieldCheck,
  RotateCcw,
  GitPullRequest,
  Users,
  ChevronRight,
  ChevronDown,
  Lock,
  Shield,
} from 'lucide-react';

export interface ExecutionActivityTimelineProps {
  readonly events: ReadonlyArray<ExecutionActivityEvent>;
  readonly isMainChat?: boolean;
  readonly isMaestroChat?: boolean;
  readonly activeSpecialistId?: string;
  readonly className?: string;
  readonly maxInitialVisible?: number;
  readonly onSelectEvent?: (event: ExecutionActivityEvent) => void;
}

export const ALL_CANONICAL_EVENT_TYPES: ReadonlyArray<ExecutionStepItemType> = [
  'agent.started',
  'agent.working',
  'agent.completed',
  'agent.failed',
  'agent.cancelled',
  'task.queued',
  'task.blocked',
  'tool.started',
  'tool.completed',
  'tool.failed',
  'file.inspected',
  'search.performed',
  'command.executed',
  'verification.completed',
  'context.compacted',
  'delegation.proposed',
  'specialist.requested',
];

/**
 * Validates canonical ExecutionActivityEvent envelope (R6.1).
 */
export function validateExecutionActivityEvent(event: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['Event must be a non-null object'] };
  }

  if (typeof event.eventId !== 'string' || !event.eventId.trim()) {
    errors.push('Missing or empty eventId');
  }

  if (!ALL_CANONICAL_EVENT_TYPES.includes(event.eventType)) {
    errors.push(`Invalid eventType: ${event.eventType}`);
  }

  if (typeof event.teamId !== 'string' || !event.teamId.trim()) {
    errors.push('Missing or empty teamId');
  }

  if (typeof event.timestamp !== 'number' || event.timestamp <= 0) {
    errors.push('Missing or invalid timestamp');
  }

  const validStatuses = ['queued', 'running', 'completed', 'failed', 'cancelled', 'blocked'];
  if (!validStatuses.includes(event.status)) {
    errors.push(`Invalid status: ${event.status}`);
  }

  if (typeof event.summary !== 'string' || !event.summary.trim()) {
    errors.push('Missing or empty summary');
  }

  if (event.sourceClassification !== 'simulated' && event.sourceClassification !== 'unverified') {
    errors.push(`Forbidden sourceClassification: ${event.sourceClassification}. Must be 'simulated' or 'unverified'.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Chronological sorting utility: primary by timestamp asc, secondary by eventId asc.
 */
export function sortExecutionEventsChronologically(
  events: ReadonlyArray<ExecutionActivityEvent>
): ExecutionActivityEvent[] {
  const safeEvents = Array.isArray(events) ? events : [];
  return [...safeEvents].sort((a, b) => {
    const diff = a.timestamp - b.timestamp;
    if (diff !== 0) return diff;
    return a.eventId.localeCompare(b.eventId);
  });
}

// ---------------------------------------------------------------------------
// Helper: Format Milliseconds
// ---------------------------------------------------------------------------
export function formatTimelineDuration(ms?: number): string | null {
  if (ms === undefined || ms === null || !Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// Helper: Format Timestamp (HH:MM:SS)
// ---------------------------------------------------------------------------
export function formatTimelineTimestamp(timestamp: number): string {
  try {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return '';
    return d.toTimeString().split(' ')[0] ?? '';
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Visual Configuration for all 17 ExecutionStepItemType values
// ---------------------------------------------------------------------------
export interface EventVisualConfig {
  icon: React.ReactElement;
  category: 'lifecycle' | 'task' | 'tool' | 'granular';
  defaultLabel: string;
  badgeStyle: {
    dark: string;
    light: string;
  };
}

export function getEventVisualConfig(
  eventType: ExecutionStepItemType,
  status: ExecutionStepStatus,
  isLight: boolean
): EventVisualConfig {
  const isRunning = status === 'running';

  switch (eventType) {
    // 1. Agent Lifecycle (5)
    case 'agent.started':
      return {
        icon: <Play className="w-3.5 h-3.5 text-neutral-400 shrink-0" />,
        category: 'lifecycle',
        defaultLabel: 'Agent started',
        badgeStyle: {
          dark: 'bg-neutral-800 text-neutral-300 border-neutral-700/50',
          light: 'bg-neutral-100 text-neutral-700 border-neutral-200',
        },
      };
    case 'agent.working':
      return {
        icon: isRunning ? (
          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
        ) : (
          <Play className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        ),
        category: 'lifecycle',
        defaultLabel: 'Agent working',
        badgeStyle: {
          dark: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
          light: 'bg-amber-50 text-amber-800 border-amber-200',
        },
      };
    case 'agent.completed':
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
        category: 'lifecycle',
        defaultLabel: 'Agent completed',
        badgeStyle: {
          dark: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
          light: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        },
      };
    case 'agent.failed':
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
        category: 'lifecycle',
        defaultLabel: 'Agent failed',
        badgeStyle: {
          dark: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
          light: 'bg-rose-50 text-rose-800 border-rose-200',
        },
      };
    case 'agent.cancelled':
      return {
        icon: <XCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />,
        category: 'lifecycle',
        defaultLabel: 'Agent cancelled',
        badgeStyle: {
          dark: 'bg-neutral-800 text-neutral-400 border-neutral-700/50',
          light: 'bg-neutral-100 text-neutral-600 border-neutral-200',
        },
      };

    // 2. Task States (2)
    case 'task.queued':
      return {
        icon: <Clock className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />,
        category: 'task',
        defaultLabel: 'Task queued',
        badgeStyle: {
          dark: 'bg-amber-950/30 text-amber-300 border-amber-800/30',
          light: 'bg-amber-50 text-amber-700 border-amber-200',
        },
      };
    case 'task.blocked':
      return {
        icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
        category: 'task',
        defaultLabel: 'Task blocked',
        badgeStyle: {
          dark: 'bg-rose-950/40 text-rose-300 border-rose-800/50',
          light: 'bg-rose-50 text-rose-800 border-rose-200',
        },
      };

    // 3. Tool Operations (3)
    case 'tool.started':
      return {
        icon: <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
        category: 'tool',
        defaultLabel: 'Tool started',
        badgeStyle: {
          dark: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
          light: 'bg-amber-50 text-amber-800 border-amber-200',
        },
      };
    case 'tool.completed':
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
        category: 'tool',
        defaultLabel: 'Tool completed',
        badgeStyle: {
          dark: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
          light: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        },
      };
    case 'tool.failed':
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
        category: 'tool',
        defaultLabel: 'Tool failed',
        badgeStyle: {
          dark: 'bg-rose-950/40 text-rose-300 border-rose-800/50',
          light: 'bg-rose-50 text-rose-800 border-rose-200',
        },
      };

    // 4. Granular Semantic Operations (7)
    case 'file.inspected':
      return {
        icon: <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
        category: 'granular',
        defaultLabel: 'File inspected',
        badgeStyle: {
          dark: 'bg-sky-950/40 text-sky-300 border-sky-800/40',
          light: 'bg-sky-50 text-sky-800 border-sky-200',
        },
      };
    case 'search.performed':
      return {
        icon: <Search className="w-3.5 h-3.5 text-indigo-400 shrink-0" />,
        category: 'granular',
        defaultLabel: 'Search performed',
        badgeStyle: {
          dark: 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40',
          light: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        },
      };
    case 'command.executed':
      return {
        icon: <Terminal className="w-3.5 h-3.5 text-teal-400 shrink-0" />,
        category: 'granular',
        defaultLabel: 'Command executed',
        badgeStyle: {
          dark: 'bg-teal-950/40 text-teal-300 border-teal-800/40',
          light: 'bg-teal-50 text-teal-800 border-teal-200',
        },
      };
    case 'verification.completed':
      return {
        icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
        category: 'granular',
        defaultLabel: 'Verification completed',
        badgeStyle: {
          dark: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
          light: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        },
      };
    case 'context.compacted':
      return {
        icon: <RotateCcw className="w-3.5 h-3.5 text-neutral-400 shrink-0" />,
        category: 'granular',
        defaultLabel: 'Context compacted',
        badgeStyle: {
          dark: 'bg-neutral-800 text-neutral-400 border-neutral-700/50',
          light: 'bg-neutral-100 text-neutral-600 border-neutral-200',
        },
      };
    case 'delegation.proposed':
      return {
        icon: <GitPullRequest className="w-3.5 h-3.5 text-violet-400 shrink-0" />,
        category: 'granular',
        defaultLabel: 'Delegation proposed',
        badgeStyle: {
          dark: 'bg-violet-950/40 text-violet-300 border-violet-800/40',
          light: 'bg-violet-50 text-violet-800 border-violet-200',
        },
      };
    case 'specialist.requested':
      return {
        icon: <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
        category: 'granular',
        defaultLabel: 'Specialist requested',
        badgeStyle: {
          dark: 'bg-purple-950/40 text-purple-300 border-purple-800/40',
          light: 'bg-purple-50 text-purple-800 border-purple-200',
        },
      };
    default:
      return {
        icon: <Play className="w-3.5 h-3.5 text-neutral-400 shrink-0" />,
        category: 'granular',
        defaultLabel: 'Activity',
        badgeStyle: {
          dark: 'bg-neutral-800 text-neutral-300 border-neutral-700/50',
          light: 'bg-neutral-100 text-neutral-700 border-neutral-200',
        },
      };
  }
}

// ---------------------------------------------------------------------------
// ExecutionActivityTimeline Component
// ---------------------------------------------------------------------------
export const ExecutionActivityTimeline: React.FC<ExecutionActivityTimelineProps> = ({
  events = [],
  isMainChat = false,
  isMaestroChat = false,
  activeSpecialistId,
  className = '',
  maxInitialVisible = 50,
  onSelectEvent,
}) => {
  let isLight = false;
  try {
    const app = useApp();
    isLight = app.theme === 'light';
  } catch {
    isLight = false;
  }

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAllEvents, setShowAllEvents] = useState(false);

  // 1. Safe array and chronological sorting
  const safeEvents = Array.isArray(events) ? events : [];
  const sortedEvents = useMemo(() => {
    return sortExecutionEventsChronologically(safeEvents);
  }, [safeEvents]);

  // 2. Chat-type and specialist filtering
  const filteredEvents = useMemo(() => {
    return sortedEvents.filter((event) => {
      // In specialist direct chat, isolate to specialist's activity
      if (activeSpecialistId) {
        const eventSpecId = event.specialistId;
        const toolSpecId = event.toolDetails?.associatedSpecialist?.id;

        // If explicitly associated with another specialist, filter out
        if (eventSpecId && eventSpecId !== activeSpecialistId) return false;
        if (toolSpecId && toolSpecId !== activeSpecialistId) return false;
      }

      // In Main Team chat (when not Maestro chat), suppress internal coordinator/granular events
      if (isMainChat && !isMaestroChat) {
        if (
          event.eventType === 'file.inspected' ||
          event.eventType === 'search.performed' ||
          event.eventType === 'tool.started' ||
          event.eventType === 'delegation.proposed' ||
          event.eventType === 'task.blocked'
        ) {
          return false;
        }
      }

      return true;
    });
  }, [sortedEvents, activeSpecialistId, isMainChat, isMaestroChat]);

  // 3. Paging / bounded display
  const visibleEvents = useMemo(() => {
    if (showAllEvents || filteredEvents.length <= maxInitialVisible) {
      return filteredEvents;
    }
    return filteredEvents.slice(filteredEvents.length - maxInitialVisible);
  }, [filteredEvents, showAllEvents, maxInitialVisible]);

  const hiddenCount = filteredEvents.length - visibleEvents.length;

  const toggleExpand = (eventId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const hasSimulatedEvents = events.some((e) => e.sourceClassification === 'simulated');

  if (filteredEvents.length === 0) {
    return (
      <div
        data-testid="execution-activity-timeline-empty"
        className={`timeline-empty-state p-4 text-center text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-500'} ${className}`}
      >
        No execution activity recorded.
      </div>
    );
  }

  return (
    <div
      data-testid="execution-activity-timeline"
      className={`execution-activity-timeline rounded-lg border select-text ${
        isLight ? 'bg-white border-neutral-200 text-neutral-800' : 'bg-[#141418] border-neutral-800 text-neutral-100'
      } ${className}`}
    >
      {/* Timeline Header */}
      <div
        className={`timeline-header flex items-center justify-between px-3 py-2 border-b text-xs ${
          isLight ? 'border-neutral-200 bg-neutral-50/70' : 'border-neutral-800/80 bg-neutral-900/50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isLight ? 'text-neutral-800' : 'text-neutral-200'}`}>
            Execution Activity Timeline
          </span>
          <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
            ({filteredEvents.length})
          </span>

          {/* Prominent Truthful Simulated Status Badge */}
          {hasSimulatedEvents && (
            <span
              data-testid="simulated-badge"
              className="simulated-badge inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30"
              title="Controlled offline demonstration mode. No live external network calls or persistent host modifications are made."
            >
              <span
                data-testid="simulated-status-badge"
                className="inline-flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                [Simulated]
              </span>
            </span>
          )}
        </div>

        {/* Top Header Disabled Verification Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="connected-verification-btn"
            disabled={true}
            aria-disabled="true"
            title="Connected verification unavailable in demonstration mode. Live backend execution requires authenticated provider credentials."
            className="connected-verification-btn px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800/50 text-neutral-500 border border-neutral-700/40 cursor-not-allowed opacity-60 flex items-center gap-1 focus-visible:outline-none"
          >
            <Lock className="w-3 h-3" />
            <span>Connected Verification (Unavailable)</span>
          </button>
        </div>
      </div>

      {/* Earlier Events Expander */}
      {hiddenCount > 0 && (
        <div className="px-2 py-1 text-center border-b border-neutral-800/30">
          <button
            type="button"
            data-testid="show-earlier-events-btn"
            onClick={() => setShowAllEvents(true)}
            className="text-[11px] font-mono text-neutral-400 hover:text-neutral-200 underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
          >
            Show {hiddenCount} earlier events…
          </button>
        </div>
      )}

      {/* Chronological Event Rows */}
      <div className="timeline-items divide-y divide-neutral-800/30 p-1" role="list">
        {visibleEvents.map((event) => {
          const isExpanded = expandedIds.has(event.eventId);
          const config = getEventVisualConfig(event.eventType, event.status, isLight);
          const tool = event.toolDetails;
          const specialist =
            tool?.associatedSpecialist ??
            (event.specialistId ? getMediobotPresentation(event.specialistId) : undefined);
          const durationText = formatTimelineDuration(tool?.durationMs);
          const timeText = formatTimelineTimestamp(event.timestamp);
          const hasDetails = Boolean(tool || event.details);
          const panelId = `details-${event.eventId}`;

          return (
            <div
              key={event.eventId}
              data-event-id={event.eventId}
              data-event-type={event.eventType}
              data-testid={`timeline-row-${event.eventId}`}
              role="listitem"
              className="timeline-row compact-row py-0.5"
            >
              {/* Row Container */}
              <div className="flex items-center justify-between min-h-7">
                {hasDetails ? (
                  /* Accessible Disclosure Button */
                  <button
                    type="button"
                    id={`trigger-${event.eventId}`}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${event.summary || config.defaultLabel}`}
                    onClick={() => {
                      toggleExpand(event.eventId);
                      onSelectEvent?.(event);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpand(event.eventId);
                        onSelectEvent?.(event);
                      }
                    }}
                    className={`disclosure-toggle w-full flex items-center justify-between gap-2 py-1.5 px-2 rounded text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 focus-visible:ring-offset-1 ${
                      isLight
                        ? 'hover:bg-neutral-100/80 focus-visible:ring-offset-white text-neutral-800'
                        : 'hover:bg-neutral-800/40 focus-visible:ring-offset-neutral-900 text-neutral-200'
                    }`}
                    data-testid={`disclosure-btn-${event.eventId}`}
                  >
                    {/* Left Side: Icon, Summary, Specialist Pill */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{config.icon}</span>

                      <span className="event-type font-mono text-[10px] text-neutral-500 uppercase tracking-wider shrink-0 hidden sm:inline">
                        {event.eventType}
                      </span>

                      <span className="event-summary font-medium truncate text-[11.5px]" title={event.summary}>
                        {event.summary || config.defaultLabel}
                      </span>

                      {/* Specialist Attribution Pill */}
                      {specialist && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono shrink-0 border ${
                            'badge' in specialist
                              ? specialist.badge
                              : isLight
                                ? 'bg-neutral-100 text-neutral-700 border-neutral-300'
                                : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                          }`}
                        >
                          {'displayName' in specialist ? specialist.displayName : specialist.name}
                        </span>
                      )}
                    </div>

                    {/* Right Side: Status/Category Pill, Duration, Time, Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status Pill */}
                      <span
                        className={`status-badge status-indicator px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                          isLight ? config.badgeStyle.light : config.badgeStyle.dark
                        }`}
                        data-testid={`status-badge-${event.eventId}`}
                      >
                        {event.status}
                      </span>

                      {/* Duration Monospace */}
                      {durationText && (
                        <span className="text-[10px] font-mono tabular-nums text-neutral-500">
                          {durationText}
                        </span>
                      )}

                      {/* Timestamp */}
                      {timeText && (
                        <span className="timestamp text-[10px] font-mono tabular-nums text-neutral-500 hidden sm:inline">
                          {timeText}
                        </span>
                      )}

                      {/* Disclosure Chevron */}
                      <span className="text-neutral-500 transition-transform">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </div>
                  </button>
                ) : (
                  /* Static Non-Expandable Row when event has no details */
                  <div
                    className={`w-full flex items-center justify-between gap-2 py-1.5 px-2 rounded text-left text-xs ${
                      isLight ? 'text-neutral-800' : 'text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{config.icon}</span>
                      <span className="event-type font-mono text-[10px] text-neutral-500 uppercase tracking-wider shrink-0 hidden sm:inline">
                        {event.eventType}
                      </span>
                      <span className="event-summary font-medium truncate text-[11.5px]" title={event.summary}>
                        {event.summary || config.defaultLabel}
                      </span>
                      {specialist && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono shrink-0 border ${
                            'badge' in specialist
                              ? specialist.badge
                              : isLight
                                ? 'bg-neutral-100 text-neutral-700 border-neutral-300'
                                : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                          }`}
                        >
                          {'displayName' in specialist ? specialist.displayName : specialist.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`status-badge status-indicator px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                          isLight ? config.badgeStyle.light : config.badgeStyle.dark
                        }`}
                        data-testid={`status-badge-${event.eventId}`}
                      >
                        {event.status}
                      </span>
                      {durationText && (
                        <span className="text-[10px] font-mono tabular-nums text-neutral-500">
                          {durationText}
                        </span>
                      )}
                      {timeText && (
                        <span className="timestamp text-[10px] font-mono tabular-nums text-neutral-500 hidden sm:inline">
                          {timeText}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded Details Panel */}
              {isExpanded && hasDetails && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={`trigger-${event.eventId}`}
                  aria-label={`Details for ${event.summary || config.defaultLabel}`}
                  data-testid={`expanded-panel-${event.eventId}`}
                  className={`expanded-details mt-1 mb-2 ml-5 p-3 rounded-lg text-xs border font-mono select-text ${
                    isLight
                      ? 'bg-neutral-50 border-neutral-200 text-neutral-800'
                      : 'bg-[#1a1a20] border-neutral-800 text-neutral-200'
                  }`}
                >
                  {/* Tool Execution Details */}
                  {tool ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b pb-1.5 border-neutral-800/40">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[11px] text-amber-400">
                            {tool.toolName}
                          </span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {tool.operationType}
                          </span>
                        </div>
                        {tool.durationMs !== undefined && (
                          <span className="text-[10px] text-neutral-400 tabular-nums">
                            duration: {tool.durationMs}ms
                          </span>
                        )}
                      </div>

                      {tool.filePath && (
                        <div className="text-[11px]">
                          <span className="text-neutral-500">File: </span>
                          <span className="text-neutral-300">{tool.filePath}</span>
                        </div>
                      )}

                      {tool.commandDescription && (
                        <div className="text-[11px]">
                          <span className="text-neutral-500">Command: </span>
                          <span className="text-neutral-300">{redactSensitiveData(tool.commandDescription).text}</span>
                        </div>
                      )}

                      {tool.errorInfo && (
                        <div className="p-2 rounded bg-rose-950/30 border border-rose-800/50 text-rose-300 text-[10.5px]">
                          <div className="flex items-center gap-1 font-semibold text-rose-400 mb-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Error</span>
                          </div>
                          <div className="whitespace-pre-wrap">{redactSensitiveData(tool.errorInfo).text}</div>
                        </div>
                      )}

                      {tool.sanitizedOutputPreview && (
                        <div>
                          <div className="text-[10px] text-neutral-500 mb-1">Sanitized Output Preview:</div>
                          <div
                            className={`p-2 rounded max-h-48 overflow-y-auto text-[10.5px] leading-relaxed whitespace-pre-wrap ${
                              isLight ? 'bg-neutral-200/50 text-neutral-900' : 'bg-black/40 text-neutral-300'
                            }`}
                          >
                            {redactSensitiveData(tool.sanitizedOutputPreview).text}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : event.details ? (
                    <div className="whitespace-pre-wrap leading-relaxed text-[11px]">
                      {redactSensitiveData(event.details).text}
                    </div>
                  ) : null}

                  {/* Connected Verification Controls (Truthfully Disabled) */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-400/80" />
                      <span>Verification Status: Unverified (Offline Fixture)</span>
                    </span>

                    <button
                      type="button"
                      disabled={true}
                      aria-disabled="true"
                      title="Connected verification unavailable in demonstration mode. Live backend execution requires authenticated provider credentials."
                      className="px-2 py-1 rounded text-[10.5px] font-mono bg-neutral-800/50 text-neutral-500 border border-neutral-700/40 cursor-not-allowed opacity-60 flex items-center gap-1 focus-visible:outline-none"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Verify in Backend</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExecutionActivityTimeline;
