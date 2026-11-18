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
import { SpecialistMicroGlyph } from './ExecutionGlyphs';
import ThoughtLine from '../../../components/ThoughtLine';

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

export function computeLiveGroupHeader(actions: ParsedToolAction[]): string {
  const running = actions.filter((a) => a.tool.status === 'running');
  const sample = running.length > 0 ? running : actions;
  const hasReads = sample.some((a) => a.icon === 'read' || a.icon === 'list');
  const hasSearches = sample.some((a) => a.icon === 'search');
  const hasTerminal = sample.some((a) => a.icon === 'terminal');
  const hasEdits = sample.some((a) => a.icon === 'edit');
  const hasWeb = sample.some((a) => a.icon === 'web');

  if (hasTerminal && hasReads) return 'Reading files, running commands…';
  if (hasTerminal) return running.length === 1 ? 'Running command…' : 'Running commands…';
  if (hasEdits) return 'Editing files…';
  if (hasSearches && hasReads) return 'Searching and reading files…';
  if (hasSearches) return 'Searching codebase…';
  if (hasWeb) return 'Searching web…';
  if (hasReads) return 'Reading files…';
  return 'Working…';
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
 * Unboxed Inline Collapsible Activity Accordion
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
      className="my-1 select-none group/accordion"
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary
        className={`inline-flex items-center gap-2 py-1 px-1.5 -mx-1.5 rounded-md text-[13px] cursor-pointer transition-colors list-none select-none ${
          isLight
            ? 'text-neutral-500 hover:text-neutral-800 hover:bg-black/[0.03]'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
        }`}
      >
        {isRunning ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-neutral-400" />
        ) : (
          icon ?? <Folder className={`w-3.5 h-3.5 ${isLight ? 'text-neutral-400' : 'text-neutral-500'} shrink-0`} />
        )}

        <span className="truncate font-normal">
          {title} ({count})
        </span>

        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover/accordion:opacity-60 transition-opacity shrink-0" />
        )}
      </summary>

      <div className="mt-0.5 pl-5 space-y-0.5">
        {children}
      </div>
    </details>
  );
};

export interface CodexToolClusterProps {
  tools: ToolExecutionData[];
  defaultOpen?: boolean;
  specialistName?: string;
  modelId?: string;
  telemetry?: ModelExecutionTelemetry;
  tokensPerSec?: number;
  ttftMs?: number;
  accordionTitle?: string;
}

/**
 * Refined Unboxed Tool Cluster
 * Matches the calm, linear flow of the Codex-style reference:
 * - Quiet monochrome summary line with inline chevron right next to the label ("Read files v")
 * - Clean indented rows with no heavy vertical border cage or per-row badge clutter
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
  let theme: 'dark' | 'light' = 'dark';
  try {
    theme = useApp().theme;
  } catch {
    theme = 'dark';
  }
  const isLight = theme === 'light';
  const [filterKind, setFilterKind] = useState<'all' | 'files' | 'commands' | 'failed'>('all');

  const deduplicated = deduplicateTools(tools);
  const actions = deduplicated.map((t, index) => parseToolAction(t, `cluster-${index}`, specialistName, modelId));
  const groupHeader = computeGroupHeader(actions);

  if (actions.length === 0) return null;

  const anyRunning = actions.some((a) => a.tool.status === 'running');
  const failedActions = actions.filter((a) => a.tool.status === 'failed');
  const fileActions = actions.filter((a) => a.icon === 'read' || a.icon === 'edit' || a.icon === 'list' || a.icon === 'search');
  const commandActions = actions.filter((a) => a.icon === 'terminal');
  const runningActions = actions.filter((a) => a.tool.status === 'running');
  const agentLabel = specialistName && specialistName !== 'Mediobot' ? specialistName : null;

  const totalDurationMs = actions.reduce((sum, a) => sum + (a.tool.durationMs ?? 0), 0);
  const totalDurationLabel =
    totalDurationMs > 0
      ? totalDurationMs >= 1000
        ? `${(totalDurationMs / 1000).toFixed(1)}s`
        : `${totalDurationMs}ms`
      : null;

  const hasFilterChoices =
    actions.length > 2 &&
    ((fileActions.length > 0 && commandActions.length > 0) || failedActions.length > 0);

  const visibleActions =
    filterKind === 'files'
      ? fileActions
      : filterKind === 'commands'
      ? commandActions
      : filterKind === 'failed'
      ? failedActions
      : actions;

  const liveGroupHeader = computeLiveGroupHeader(actions);
  const earliestStartedAt = actions.reduce<number | undefined>((min, a) => {
    if (typeof a.tool.startedAt !== 'number') return min;
    return min === undefined ? a.tool.startedAt : Math.min(min, a.tool.startedAt);
  }, undefined);
  const runningInteractiveActions = runningActions.filter(
    (a) => a.icon === 'terminal' || a.tool.status === 'failed'
  );

  // If there is only a single tool without custom accordion title, render it directly inline
  // (using CallChip when active/failed or unboxed text when completed).
  if (actions.length === 1 && !accordionTitle) {
    return (
      <div data-testid="codex-tool-cluster" className="my-0.5 select-none">
        <CodexToolRow
          action={actions[0]!}
          isLight={isLight}
          telemetry={telemetry}
          tokensPerSec={telemetry?.tokensPerSecond ?? tokensPerSec}
          ttftMs={telemetry?.ttftMs ?? ttftMs}
        />
      </div>
    );
  }

  const resolvedDoneLabel = accordionTitle
    ? `${accordionTitle} (${actions.length})`
    : agentLabel
    ? `${agentLabel} · ${groupHeader}`
    : groupHeader;

  const resolvedWorkLabel = accordionTitle
    ? `${accordionTitle} (${actions.length})…`
    : agentLabel
    ? `${agentLabel} · ${liveGroupHeader}`
    : liveGroupHeader;

  const clusterRightSlot = (
    <div className="flex items-center gap-2 text-[11.5px] font-sans tabular-nums shrink-0">
      {!accordionTitle && (
        <span className={isLight ? 'text-neutral-400' : 'text-neutral-500'}>
          · {actions.length}
        </span>
      )}

      {failedActions.length > 0 && (
        <span className="text-[11px] text-rose-400">
          · {failedActions.length} failed
        </span>
      )}

      <ModelAttributionBadge
        modelId={modelId}
        specialistName={agentLabel ?? undefined}
        isLight={isLight}
        isRunning={anyRunning}
      />
    </div>
  );

  return (
    <div data-testid="codex-tool-cluster" className="my-1.5 select-none w-full">
      <ThoughtLine
        working={anyRunning}
        label={resolvedWorkLabel}
        doneLabel={resolvedDoneLabel}
        glyph="dot"
        steps={anyRunning ? actions.map((a) => a.label) : []}
        collapsible={true}
        collapseOnSettle={!defaultOpen}
        defaultOpen={defaultOpen ? true : undefined}
        startedAt={earliestStartedAt}
        elapsed={!anyRunning && totalDurationMs > 0 ? totalDurationMs / 1000 : undefined}
        showTimer={anyRunning || totalDurationMs > 0}
        durationText={!anyRunning && totalDurationLabel ? totalDurationLabel : undefined}
        fontSize={13}
        breathPeriod={1.6}
        breathDepth={0.45}
        settleDuration={350}
        settleBlur={2}
        isLight={isLight}
        color={isLight ? '#52525b' : '#a1a1aa'}
        glyphColor={anyRunning ? (isLight ? '#2563eb' : '#60a5fa') : (isLight ? '#71717a' : '#71717a')}
        className="w-full"
        rightSlot={clusterRightSlot}
      >
        {/* Enriched Parallel Activity Strip when >1 tool runs simultaneously */}
        {runningActions.length > 1 && (
          <div
            data-testid="parallel-activity-strip"
            className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]"
          >
            {runningActions.map((a) => {
              const spec = a.specialistName || specialistName;
              const model = a.modelId || modelId;
              const modelLabel = resolveModelDisplay(model);
              return (
                <span
                  key={a.id}
                  className={`inline-flex items-center gap-1.5 min-w-0 max-w-full ${
                    isLight ? 'text-neutral-600' : 'text-neutral-400'
                  }`}
                >
                  <SpecialistMicroGlyph specialistId={spec} isLight={isLight} working className="w-3.5 h-3.5" />
                  {spec && (
                    <span className={`font-medium ${isLight ? 'text-neutral-800' : 'text-neutral-200'}`}>
                      {spec}
                    </span>
                  )}
                  {modelLabel && <span className="opacity-60 text-[11px]">({modelLabel})</span>}
                  <span className="truncate opacity-80">{a.label}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Quiet filter strip when settled and multiple categories or failures exist */}
        {!anyRunning && hasFilterChoices && (
          <div
            className={`mb-1 flex items-center gap-3 text-[11px] font-sans ${
              isLight ? 'text-neutral-500' : 'text-neutral-400'
            }`}
          >
            {(
              [
                { id: 'all', label: `All (${actions.length})`, show: true },
                { id: 'files', label: `Files (${fileActions.length})`, show: fileActions.length > 0 },
                { id: 'commands', label: `Commands (${commandActions.length})`, show: commandActions.length > 0 },
                { id: 'failed', label: `Failed (${failedActions.length})`, show: failedActions.length > 0 },
              ] as const
            )
              .filter((tab) => tab.show)
              .map((tab) => {
                const active = filterKind === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterKind(tab.id)}
                    className={`cursor-pointer transition-colors tabular-nums ${
                      active
                        ? tab.id === 'failed'
                          ? 'text-rose-400 font-medium underline underline-offset-4'
                          : isLight
                          ? 'text-neutral-900 font-medium underline underline-offset-4'
                          : 'text-neutral-100 font-medium underline underline-offset-4'
                        : isLight
                        ? 'hover:text-neutral-800'
                        : 'hover:text-neutral-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
          </div>
        )}

        {/* Interactive rows: show running/failed CallChips while running, full filterable rows once settled */}
        {(!anyRunning || runningInteractiveActions.length > 0) && (
          <div className="space-y-0.5">
            {(anyRunning ? runningInteractiveActions : visibleActions).map((action) => (
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
        )}
      </ThoughtLine>
    </div>
  );
};
