import React, { useState } from 'react';
import type { ToolExecutionData } from '../../../types';
import {
  Folder,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../../state/AppContext';
import {
  CodexToolRow,
  parseToolAction,
  type ParsedToolAction,
} from './CodexToolRow';
import {
  ModelAttributionBadge,
  resolveModelDisplay,
  type ModelExecutionTelemetry,
} from './modelAttribution';

// ---------------------------------------------------------------------------
// Tool Grouping and Deduplication
// ---------------------------------------------------------------------------

export function computeGroupHeader(actions: ParsedToolAction[]): string {
  if (actions.length === 0) return 'Read files';
  if (actions.length === 1) return actions[0]!.label;
  const hasReads = actions.some((a) => a.icon === 'read');
  const hasLists = actions.some((a) => a.icon === 'list');
  const hasSearches = actions.some((a) => a.icon === 'search');
  const hasTerminal = actions.some((a) => a.icon === 'terminal');
  const hasEdits = actions.some((a) => a.icon === 'edit');
  const hasWeb = actions.some((a) => a.icon === 'web');

  const onlyReads = hasReads && !hasTerminal && !hasSearches && !hasLists && !hasEdits && !hasWeb;
  if (onlyReads) {
    return 'Read files';
  }

  const onlyLists = hasLists && !hasReads && !hasTerminal && !hasSearches && !hasEdits && !hasWeb;
  if (onlyLists) {
    return 'Listed files';
  }

  const onlySearches = hasSearches && !hasReads && !hasTerminal && !hasLists && !hasEdits && !hasWeb;
  if (onlySearches) {
    return 'Searched codebase';
  }

  const onlyTerminal = hasTerminal && !hasReads && !hasSearches && !hasLists && !hasEdits && !hasWeb;
  if (onlyTerminal) {
    return actions.length === 1 ? 'Ran a command' : 'Ran commands';
  }

  const onlyWeb = hasWeb && !hasReads && !hasTerminal && !hasSearches && !hasLists && !hasEdits;
  if (onlyWeb) {
    return 'Browsed web';
  }

  if (hasReads && hasTerminal && !hasSearches) {
    return actions.filter((a) => a.icon === 'terminal').length === 1
      ? 'Read files, ran a command'
      : 'Read files, ran commands';
  }

  if (hasReads && hasSearches && !hasTerminal) {
    return 'Read files, searched codebase';
  }

  return 'Read files, ran commands';
}

/**
 * Deduplicate consecutive or re-delivered tool events so running and completed states
 * for the same invocation never render as duplicate rows.
 */
export function deduplicateTools(tools: ToolExecutionData[]): ToolExecutionData[] {
  const byKey = new Map<string, ToolExecutionData>();
  for (const tool of tools) {
    const key = tool.toolInvocationId || `${tool.toolName}:${tool.command ?? ''}:${tool.startedAt ?? ''}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, tool);
    } else {
      // Monotonic progression: prefer terminal states over running
      if (existing.status === 'running' && tool.status !== 'running') {
        byKey.set(key, tool);
      } else if (tool.durationMs !== undefined && existing.durationMs === undefined) {
        byKey.set(key, tool);
      } else if (tool.outputLog && !existing.outputLog) {
        byKey.set(key, tool);
      }
    }
  }
  return Array.from(byKey.values());
}

// ---------------------------------------------------------------------------
// Accordion & Cluster Components
// ---------------------------------------------------------------------------

export interface ActivityAccordionProps {
  title: string;
  count: number;
  isRunning?: boolean;
  isLight: boolean;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}

/**
 * Antigravity-Style Collapsible Activity Accordion
 * Used in Main Chat for "System activity (1)", "Maestro activity (1)", "Cody activity (2)"
 */
export const ActivityAccordion: React.FC<ActivityAccordionProps> = ({
  title,
  count,
  isRunning = false,
  isLight,
  defaultOpen = false,
  icon,
  children,
  testId,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      data-testid={testId || `activity-accordion-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="my-1.5 select-none group/accordion"
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary
        className={`flex items-center gap-2 py-1 px-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors list-none select-none ${
          isLight
            ? 'text-neutral-700 hover:text-neutral-900 hover:bg-black/[0.03]'
            : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
        }`}
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
        )}

        {isRunning ? (
          <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
        ) : (
          icon ?? <Folder className={`w-3.5 h-3.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'} shrink-0`} />
        )}

        <span className="truncate font-medium">
          {title} ({count})
        </span>

        {isRunning && (
          <span className="relative flex h-1.5 w-1.5 shrink-0 ml-1">
            <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
          </span>
        )}
      </summary>

      <div
        className={`mt-1 ml-2.5 pl-3 border-l ${
          isLight ? 'border-[#e2e4e8]' : 'border-[#2b2b34]'
        } space-y-1`}
      >
        {children}
      </div>
    </details>
  );
};

export interface CodexToolClusterProps {
  tools: ToolExecutionData[];
  defaultOpen?: boolean;
  specialistName?: string;
  /** Model ID for attribution badge (e.g. "claude-3-7-sonnet-20250219") */
  modelId?: string;
  /** Telemetry object for high-resolution timing and metrics */
  telemetry?: ModelExecutionTelemetry;
  /** Tokens/sec from streaming telemetry if available */
  tokensPerSec?: number;
  /** Time-to-first-token in milliseconds */
  ttftMs?: number;
  /** Custom accordion title override e.g. "Cody activity" or "System activity" */
  accordionTitle?: string;
}

/**
 * Codex-style Collapsible Tool Cluster
 *
 * M3 Enhancement: Shows multi-model attribution badge (e.g. "Cody [Claude 3.7 Sonnet]"),
 * enriched parallel specialist activity strip when multiple models run simultaneously,
 * and live animated status indicators.
 */
export const CodexToolCluster: React.FC<CodexToolClusterProps> = ({
  tools,
  defaultOpen = false,
  specialistName,
  modelId,
  telemetry,
  tokensPerSec,
  ttftMs,
  accordionTitle,
}) => {
  const { theme } = useApp();
  const isLight = theme === 'light';
  const [isGroupOpen, setIsGroupOpen] = useState(defaultOpen);

  const deduplicated = deduplicateTools(tools);
  const actions = deduplicated.map((t, index) => parseToolAction(t, `cluster-${index}`, specialistName, modelId));
  const groupHeader = computeGroupHeader(actions);

  if (actions.length === 0) return null;

  const anyRunning = actions.some((a) => a.tool.status === 'running');
  const runningActions = actions.filter((a) => a.tool.status === 'running');

  // Specialist display label — "Cody" not "Mediobot"
  const agentLabel = specialistName && specialistName !== 'Mediobot' ? specialistName : null;

  return (
    <details
      data-testid="codex-tool-cluster"
      className="my-1.5 select-none group/cluster"
      open={isGroupOpen}
      onToggle={(e) => setIsGroupOpen((e.target as HTMLDetailsElement).open)}
    >
      {/* Group Header: "Cody activity (2)" or "Cody · Read files [Claude 3.7 Sonnet] ⌄" */}
      <summary
        className={`flex items-center gap-2 py-1 px-1 rounded-md text-xs font-medium cursor-pointer transition-colors list-none select-none ${
          isLight
            ? 'text-neutral-700 hover:text-neutral-900 hover:bg-black/[0.03]'
            : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
        }`}
      >
        {isGroupOpen ? (
          <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
        )}

        {anyRunning ? (
          <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
        ) : (
          <Folder className={`w-3.5 h-3.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'} shrink-0`} />
        )}

        {/* Accordion title or agent name + action summary */}
        <span className="truncate">
          {accordionTitle ? (
            <span className="font-semibold">{accordionTitle} ({actions.length})</span>
          ) : (
            <>
              {agentLabel ? (
                <><span className={`font-semibold ${isLight ? 'text-neutral-800' : 'text-neutral-200'}`}>{agentLabel}</span>
                <span className="opacity-50 mx-1">·</span></>
              ) : null}
              {groupHeader}
            </>
          )}
        </span>

        {/* Multi-model attribution badge — no duplicate specialist label */}
        <ModelAttributionBadge
          modelId={modelId}
          specialistName={agentLabel ?? undefined}
          isLight={isLight}
          isRunning={anyRunning}
        />

        <span className="ml-auto" />

        {anyRunning && (
          <span className="relative flex h-1.5 w-1.5 shrink-0 ml-1">
            <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
          </span>
        )}
      </summary>

      {/* M3: Enriched Parallel Specialist Activity Strip — shown when >1 tool running simultaneously */}
      {runningActions.length > 1 && (
        <div
          data-testid="parallel-activity-strip"
          className="mx-1 mt-1 mb-1 flex flex-wrap items-center gap-1.5 py-0.5 px-1 text-xs"
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          {runningActions.map((a) => {
            const spec = a.specialistName || specialistName;
            const model = a.modelId || modelId;
            const modelLabel = resolveModelDisplay(model);
            return (
              <span
                key={a.id}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono min-w-0 max-w-full ${
                  isLight
                    ? 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                    : 'bg-neutral-900/90 text-neutral-300 border border-neutral-800'
                }`}
              >
                {spec && <span className="font-semibold">{spec}</span>}
                {modelLabel && <span className="opacity-60 text-[9px]">({modelLabel})</span>}
                <span className="text-neutral-400 truncate">: {a.label}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Indented operations list */}
      <div className={`mt-0.5 ml-2 pl-3 border-l ${
        isLight ? 'border-neutral-200' : 'border-neutral-800'
      } space-y-0.5`}>
        {actions.map((action) => (
          <CodexToolRow
            key={action.id}
            action={action}
            isLight={isLight}
            telemetry={telemetry}
            tokensPerSec={telemetry?.tokensPerSecond ?? tokensPerSec}
            ttftMs={telemetry?.ttftMs ?? ttftMs}
          />
        ))}
      </div>
    </details>
  );
};
