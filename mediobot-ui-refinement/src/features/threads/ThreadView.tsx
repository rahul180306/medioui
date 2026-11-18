import React, { useMemo, useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useApp } from '../../state/AppContext';
import { ActivityItem } from '../activity/ActivityItem';
import { Composer } from '../composer/Composer';
import { MarkdownContent } from './MarkdownContent';
import {
  Paperclip,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  FileCode,
  ExternalLink,
  Square,
  ArrowUpRight,
} from 'lucide-react';
import { EmptyState } from '../empty/EmptyState';
import { TimelineNavigator, type TimelineAnchorMeta } from './TimelineNavigator';
import { MediobotAvatar } from './MediobotAvatar';
import { buildTimelineNavigatorAnchors, conversationActorName, projectThreadTimeline } from './timeline';
import { getMediobotPresentation, getMediobotCursorColor, normalizeMediobotId } from '../mediobots/presentation';
import type { ConversationActor, FileDiff, ThreadItem, Turn } from '../../types';
import LatticeLoader from '../../components/LatticeLoader';
import CallChip from '../../components/CallChip';
import ThoughtLine from '../../components/ThoughtLine';
import { runtimeInstance } from '../../runtime/client';
import { CodexToolCluster, deduplicateTools, parseToolAction, resolveModelDisplay } from '../activity/CodexExecutionView';
import { mapActionToCallChip } from '../activity/subcomponents/CodexToolRow';
import { extractAllowlistToolDetails } from '../activity/allowlistRedaction';
import { SpecialistMicroGlyph } from '../activity/subcomponents/ExecutionGlyphs';
import { ParallelModelGuidanceStrip } from './ParallelModelGuidanceStrip';

function formatElapsedDuration(seconds: number): string {
  const total = Math.max(1, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function useTurnTimer(isRunning: boolean, startedAt?: number, completedAt?: number): string {
  const [elapsed, setElapsed] = useState(() => {
    if (!startedAt) return '0s';
    const end = completedAt || Date.now();
    return formatElapsedDuration((end - startedAt) / 1000);
  });

  useEffect(() => {
    if (!isRunning || !startedAt) {
      if (startedAt && completedAt) {
        setElapsed(formatElapsedDuration((completedAt - startedAt) / 1000));
      }
      return;
    }
    const update = () => {
      setElapsed(formatElapsedDuration((Date.now() - startedAt) / 1000));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startedAt, completedAt]);

  return elapsed;
}

interface TurnSummaryMetrics {
  toolCount: number;
  failedToolCount: number;
  diffItems: Array<{ item: ThreadItem; diff: FileDiff; targetId?: string }>;
  totalAdditions: number;
  totalDeletions: number;
}

function summarizeTurnMetrics(turn: Turn, entries: ReadonlyArray<ReturnType<typeof projectThreadTimeline>[number]>): TurnSummaryMetrics {
  let toolCount = 0;
  let failedToolCount = 0;
  const diffItems: Array<{ item: ThreadItem; diff: FileDiff; targetId?: string }> = [];
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const entry of entries) {
    for (const item of entry.items) {
      if (item.type === 'tool_execution' && item.tool) {
        toolCount++;
        if (item.tool.status === 'failed') failedToolCount++;
      }
      if (item.type === 'diff' && item.diff) {
        const adds = item.diff.truncated
          ? item.diff.additions
          : item.diff.hunks?.reduce((acc, h) => acc + h.lines.filter((l) => l.type === 'add').length, 0) ?? item.diff.additions;
        const dels = item.diff.truncated
          ? item.diff.deletions
          : item.diff.hunks?.reduce((acc, h) => acc + h.lines.filter((l) => l.type === 'remove').length, 0) ?? item.diff.deletions;
        totalAdditions += adds;
        totalDeletions += dels;
        diffItems.push({ item, diff: item.diff, targetId: entry.targetId });
      }
    }
  }

  return { toolCount, failedToolCount, diffItems, totalAdditions, totalDeletions };
}

const TurnDurationHeader: React.FC<{
  isRunning: boolean;
  turnStatus: Turn['status'];
  createdAt: number;
  completedAt?: number;
  isLight: boolean;
  metrics?: TurnSummaryMetrics;
  activeTools?: ReadonlyArray<import('../../types').ToolExecutionData>;
  onJumpToChanges?: () => void;
  onStopTurn?: () => void;
  onCopyTurn?: () => void;
  copiedTurn?: boolean;
}> = ({
  isRunning,
  turnStatus,
  createdAt,
  completedAt,
  isLight,
  metrics,
  activeTools = [],
  onJumpToChanges,
  onStopTurn,
  onCopyTurn,
  copiedTurn,
}) => {
  const durationText = useTurnTimer(isRunning, createdAt, completedAt);
  const filesCount = metrics?.diffItems.length ?? 0;

  const runningActions = activeTools.map((t, i) => parseToolAction(t, `hdr-${i}`));
  const hasTerminalRunning = runningActions.some((a) => a.icon === 'terminal');
  const hasSearchRunning = runningActions.some((a) => a.icon === 'search' || a.icon === 'web');
  const hasEditRunning = runningActions.some((a) => a.icon === 'edit');
  const hasReadRunning = runningActions.some((a) => a.icon === 'read' || a.icon === 'list');

  const livePhaseLabel =
    turnStatus === 'pause_requested'
      ? 'Pausing at checkpoint…'
      : hasTerminalRunning
      ? runningActions.filter((a) => a.icon === 'terminal').length > 1
        ? 'Running commands…'
        : 'Running command…'
      : hasEditRunning
      ? 'Editing files…'
      : hasSearchRunning
      ? 'Searching codebase…'
      : hasReadRunning
      ? 'Reading files…'
      : 'Thinking…';

  const completedSeconds =
    !isRunning && createdAt && completedAt
      ? Math.max(0.1, (completedAt - createdAt) / 1000)
      : undefined;

  return (
    <div className="group/turnheader select-none mb-3">
      <div
        className={`flex items-center justify-between gap-3 text-[12.5px] font-sans pb-2 border-b ${
          isLight
            ? 'text-neutral-500 border-black/[0.07]'
            : 'text-neutral-400 border-white/[0.07]'
        } font-normal tracking-tight`}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 tabular-nums">
          <ThoughtLine
            working={isRunning}
            label={livePhaseLabel}
            doneLabel="Worked for"
            glyph={isRunning ? (runningActions.length > 0 ? 'dot' : 'sparkle') : 'none'}
            collapsible={false}
            startedAt={createdAt}
            elapsed={completedSeconds}
            showTimer={true}
            durationText={!isRunning ? durationText : undefined}
            fontSize={12.5}
            breathPeriod={1.6}
            breathDepth={0.45}
            settleDuration={350}
            settleBlur={2}
            isLight={isLight}
            color={isLight ? '#52525b' : '#a1a1aa'}
            glyphColor={runningActions.length > 0 ? (isLight ? '#2563eb' : '#60a5fa') : (isLight ? '#3b82f6' : '#60a5fa')}
          />

          {metrics && metrics.toolCount > 0 && (
            <span className={isLight ? 'text-neutral-400' : 'text-neutral-500'}>
              · {metrics.toolCount} {metrics.toolCount === 1 ? 'tool' : 'tools'}
            </span>
          )}

          {metrics && metrics.failedToolCount > 0 && (
            <span className="text-rose-400">
              · {metrics.failedToolCount} failed
            </span>
          )}

          {filesCount > 0 && (
            <button
              type="button"
              onClick={onJumpToChanges}
              className={`inline-flex items-center gap-1 cursor-pointer transition-colors ${
                isLight ? 'text-neutral-600 hover:text-sky-700' : 'text-neutral-300 hover:text-sky-300'
              }`}
              title="Jump to changed files in this turn"
            >
              <span>· {filesCount} {filesCount === 1 ? 'file' : 'files'}</span>
              <span className={isLight ? 'text-emerald-700' : 'text-emerald-400/90'}>+{metrics!.totalAdditions}</span>
              <span className={isLight ? 'text-rose-700' : 'text-rose-400/90'}>-{metrics!.totalDeletions}</span>
            </button>
          )}

          {turnStatus === 'waiting_approval' && (
            <span className={isLight ? 'text-amber-700' : 'text-amber-400/90'}>
              · Waiting approval
            </span>
          )}
          {turnStatus === 'failed' && (
            <span className="text-rose-400">· Failed</span>
          )}
          {turnStatus === 'cancelled' && (
            <span className={isLight ? 'text-neutral-400' : 'text-neutral-500'}>· Cancelled</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isRunning && onStopTurn && (
            <button
              type="button"
              onClick={onStopTurn}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap cursor-pointer transition-colors ${
                isLight
                  ? 'border-black/[0.1] text-neutral-700 hover:bg-black/[0.04]'
                  : 'border-white/[0.1] text-neutral-300 hover:bg-white/[0.06]'
              }`}
              title="Stop active run"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>Stop</span>
            </button>
          )}

          {!isRunning && onCopyTurn && (
            <button
              type="button"
              onClick={onCopyTurn}
              className={`opacity-0 group-hover/turnheader:opacity-100 focus-visible:opacity-100 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] cursor-pointer transition-opacity ${
                isLight ? 'text-neutral-500 hover:text-neutral-900 hover:bg-black/[0.04]' : 'text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.06]'
              }`}
              title="Copy full turn summary"
            >
              {copiedTurn ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function formatTemporalDivider(ts?: number): string {
  if (!ts) return '';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return `Today ${hours}:${minutes}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return `Yesterday ${hours}:${minutes}`;
  }

  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${month} ${hours}:${minutes}`;
}

function formatUserTimestamp(ts?: number): string {
  if (!ts) return '';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '';
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month}, ${hours}:${minutes}`;
}

interface SpecialistTurnSummary {
  id: string;
  name: string;
  role?: string;
  toolCount: number;
  failedCount: number;
  totalDurationMs: number;
  firstTargetId?: string;
  hasRunning: boolean;
}

function collectTurnSpecialists(
  items: ReadonlyArray<ThreadItem>,
  entries?: ReadonlyArray<ReturnType<typeof projectThreadTimeline>[number]>
): SpecialistTurnSummary[] {
  const byId = new Map<string, SpecialistTurnSummary>();
  const firstEntryTargetByActor = new Map<string, string>();
  if (entries) {
    for (const entry of entries) {
      if (entry.actor?.type === 'mediobot') {
        const nid = normalizeMediobotId(entry.actor.presentationId ?? entry.actor.mediobotId ?? entry.actor.name);
        if (nid && !firstEntryTargetByActor.has(nid)) {
          firstEntryTargetByActor.set(nid, entry.targetId);
        }
      }
    }
  }

  for (const item of items) {
    if (item.actor?.type === 'mediobot') {
      const normalized = normalizeMediobotId(item.actor.presentationId ?? item.actor.mediobotId ?? item.actor.name);
      if (normalized && normalized !== 'maestro') {
        const existing = byId.get(normalized) ?? {
          id: normalized,
          name: item.actor.name || normalized.charAt(0).toUpperCase() + normalized.slice(1),
          role: item.actor.role,
          toolCount: 0,
          failedCount: 0,
          totalDurationMs: 0,
          firstTargetId: firstEntryTargetByActor.get(normalized),
          hasRunning: false,
        };
        if (item.type === 'tool_execution' && item.tool) {
          existing.toolCount++;
          if (item.tool.status === 'failed') existing.failedCount++;
          if (item.tool.status === 'running') existing.hasRunning = true;
          if (typeof item.tool.durationMs === 'number') {
            existing.totalDurationMs += item.tool.durationMs;
          }
        }
        if (!existing.role && item.actor.role) existing.role = item.actor.role;
        byId.set(normalized, existing);
      }
    }
  }
  return Array.from(byId.values());
}

function actorIdentityKey(actor?: ConversationActor): string {
  if (!actor) return 'mediobot:maestro';
  if (actor.type === 'system') return 'system';
  if (actor.type === 'user') return 'user';
  const norm = normalizeMediobotId(actor.presentationId ?? actor.mediobotId ?? actor.name);
  return `mediobot:${norm || actor.name || 'maestro'}`;
}

const TurnSpecialistMilestone: React.FC<{
  specialists: SpecialistTurnSummary[];
  isLight: boolean;
  getAgentPreference: (id: string) => { modelKey: string; effort: string };
  onJumpToTarget: (targetId: string) => void;
}> = ({ specialists, isLight, getAgentPreference, onJumpToTarget }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-1.5 select-none">
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        aria-expanded={isOpen}
        className={`group/spec flex flex-wrap items-center gap-1.5 py-0.5 px-1.5 -mx-1.5 rounded-md text-[13px] cursor-pointer transition-colors ${
          isLight ? 'hover:bg-black/[0.03]' : 'hover:bg-white/[0.03]'
        }`}
      >
        <span className="inline-flex items-center gap-1 shrink-0 mr-0.5">
          {specialists.map((spec) => (
            <SpecialistMicroGlyph
              key={`turn-spec-${spec.id}`}
              specialistId={spec.id}
              isLight={isLight}
              working={spec.hasRunning}
              className="w-3.5 h-3.5"
            />
          ))}
        </span>
        <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>
          {specialists.map((spec, idx) => {
            const isSecondLast = idx === specialists.length - 2;
            const isLast = idx === specialists.length - 1;
            return (
              <React.Fragment key={spec.id}>
                <span className="font-medium">{spec.name}</span>
                {!isLast && (
                  <span className={isLight ? 'text-neutral-500' : 'text-neutral-400'}>
                    {isSecondLast ? ' and ' : ', '}
                  </span>
                )}
              </React.Fragment>
            );
          })}{' '}
          <span className={isLight ? 'text-neutral-500' : 'text-neutral-400'}>
            started working
          </span>
        </span>
        {isOpen ? (
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
        ) : (
          <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover/spec:opacity-65 transition-opacity shrink-0 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
        )}
      </button>

      {isOpen && (
        <div
          className={`mt-1.5 ml-5 rounded-lg border divide-y text-[12px] ${
            isLight
              ? 'border-black/[0.07] bg-[#fafafa] divide-black/[0.05] text-neutral-700'
              : 'border-white/[0.07] bg-white/[0.02] divide-white/[0.05] text-neutral-300'
          }`}
        >
          {specialists.map((spec) => {
            const pref = getAgentPreference(spec.id);
            const modelName = resolveModelDisplay(pref.modelKey) || pref.modelKey;
            const durText =
              spec.totalDurationMs > 0
                ? spec.totalDurationMs >= 1000
                  ? `${(spec.totalDurationMs / 1000).toFixed(1)}s`
                  : `${spec.totalDurationMs}ms`
                : null;
            return (
              <div key={spec.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <SpecialistMicroGlyph specialistId={spec.id} isLight={isLight} working={spec.hasRunning} className="w-3.5 h-3.5" />
                  <span className={`font-medium shrink-0 ${isLight ? 'text-neutral-900' : 'text-neutral-100'}`}>
                    {spec.name}
                  </span>
                  {spec.role && (
                    <span className={`truncate text-[11px] ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      {spec.role}
                    </span>
                  )}
                </div>

                <div className={`flex items-center gap-2.5 shrink-0 text-[11px] tabular-nums ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  {modelName && <span className="hidden sm:inline">{modelName}</span>}
                  {spec.toolCount > 0 && (
                    <span>{spec.toolCount} {spec.toolCount === 1 ? 'step' : 'steps'}</span>
                  )}
                  {spec.failedCount > 0 && (
                    <span className="text-rose-400">{spec.failedCount} failed</span>
                  )}
                  {durText && <span className="font-mono">{durText}</span>}
                  {spec.firstTargetId && (
                    <button
                      type="button"
                      onClick={() => onJumpToTarget(spec.firstTargetId!)}
                      className={`inline-flex items-center gap-0.5 cursor-pointer transition-colors ${
                        isLight ? 'text-sky-700 hover:underline' : 'text-sky-400 hover:underline'
                      }`}
                    >
                      <span>Jump</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ThreadView: React.FC = () => {
  const {
    activeThread,
    activeTurnId,
    chatHydrationStatus,
    reloadThreads,
    theme,
    selectedMediobotId,
    persistenceError,
    clearPersistenceError,
    cancelTurn,
    openFileTab,
    getAgentPreference,
  } = useApp();
  const isLight = theme === 'light';

  // Determine whether this conversation is an individual specialist's separate workspace/chat
  const isTeamThread = activeThread?.threadType === 'team';
  const cleanSpecId = !isTeamThread
    ? (selectedMediobotId
        ? normalizeMediobotId(selectedMediobotId)
        : activeThread?.specialistId
        ? normalizeMediobotId(activeThread.specialistId)
        : (activeThread?.ownerAgent && activeThread.ownerAgent !== 'team')
        ? normalizeMediobotId(activeThread.ownerAgent)
        : null)
    : null;
  const isSpecificMediobotChat = Boolean(cleanSpecId);
  const isMainChat = !isSpecificMediobotChat;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resumingTaskId, setResumingTaskId] = useState<string | null>(null);
  const [pausingTaskId, setPausingTaskId] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{ id: string; name: string; url: string } | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const restoredThreadId = useRef<string | null>(null);
  const wasNearBottom = useRef(true);
  const bindScrollRoot = useCallback((element: HTMLDivElement | null) => {
    setScrollRoot(previous => previous === element ? previous : element);
  }, []);
  const targetElements = useRef(new Map<string, HTMLElement>());
  const typedMessageIds = useRef<Set<string>>(new Set<string>());
  const mountTimestamp = useRef<number>(Date.now());
  const uniqueTurns = useMemo(() => {
    const seen = new Set<string>();
    const list: NonNullable<typeof activeThread>['turns'] = [];
    for (const turn of activeThread?.turns ?? []) {
      if (!turn.id || seen.has(turn.id)) continue;
      seen.add(turn.id);
      list.push(turn);
    }
    return list;
  }, [activeThread?.turns]);

  const timeline = useMemo(() => projectThreadTimeline(uniqueTurns), [uniqueTurns]);
  const entriesByTurn = useMemo(() => {
    const byTurn = new Map<string, typeof timeline>();
    for (const entry of timeline) {
      const turnId = entry.items[0]?.turnId;
      if (!turnId) continue;
      const entries = byTurn.get(turnId) ?? [];
      entries.push(entry);
      byTurn.set(turnId, entries);
    }
    return byTurn;
  }, [timeline]);
  const anchors = useMemo(() => buildTimelineNavigatorAnchors(timeline), [timeline]);
  const turnMetaByTargetId = useMemo(() => {
    const map = new Map<string, TimelineAnchorMeta>();
    for (const turn of uniqueTurns) {
      const turnEntries = entriesByTurn.get(turn.id) ?? [];
      const userEntry = turnEntries.find((e) => e.kind === 'user');
      if (!userEntry) continue;
      const metrics = summarizeTurnMetrics(turn, turnEntries);
      const durationLabel =
        turn.completedAt && turn.createdAt
          ? formatElapsedDuration((turn.completedAt - turn.createdAt) / 1000)
          : undefined;
      map.set(userEntry.targetId, {
        durationLabel,
        filesCount: metrics.diffItems.length,
        stepsCount: metrics.toolCount,
        status: turn.status,
      });
    }
    return map;
  }, [uniqueTurns, entriesByTurn]);

  const scrollToTargetId = useCallback((id: string) => {
    const el = targetElements.current.get(id) ?? document.getElementById(id);
    if (!el) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }, []);

  useLayoutEffect(() => {
    if (!scrollRoot || !activeThread || restoredThreadId.current === activeThread.id) return;
    let saved: number | null = null;
    try {
      const value = sessionStorage.getItem(`mediobot-thread-scroll:${activeThread.id}`);
      if (value !== null && Number.isFinite(Number(value))) saved = Number(value);
    } catch { /* Session storage may be unavailable in private browsing. */ }
    scrollRoot.scrollTop = saved ?? scrollRoot.scrollHeight;
    wasNearBottom.current = scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight < 120;
    restoredThreadId.current = activeThread.id;
  }, [activeThread?.id, scrollRoot]);

  // Pre-seed any historical completed turns immediately on render so they don't re-type on refresh or thread switch
  const seededThreadIdRef = useRef<string | null>(null);
  if (activeThread && seededThreadIdRef.current !== activeThread.id) {
    seededThreadIdRef.current = activeThread.id;
    for (const turn of activeThread.turns ?? []) {
      if (turn.status !== 'running') {
        for (const item of turn.items ?? []) {
          typedMessageIds.current.add(item.id);
        }
      }
    }
  }

  // Follow new activity only while the reader is already at the bottom.
  useEffect(() => {
    if (!scrollRoot || !activeThread || restoredThreadId.current !== activeThread.id || !wasNearBottom.current) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollRoot.scrollTo({ top: scrollRoot.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [activeThread?.turns, activeTurnId, activeThread?.id, scrollRoot]);

  if (!activeThread) {
    if (chatHydrationStatus === 'LOADING') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400">
          <LatticeLoader
            status="working"
            label="Loading conversation"
            color={isLight ? '#475569' : '#a1a1aa'}
            fontSize={12}
            cellSize={3.5}
            gap={1.5}
            showTimer={false}
          />
        </div>
      );
    }
    if (chatHydrationStatus === 'ERROR') {
      return <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400"><span className="text-xs text-rose-400 mb-2">Conversation failed to load from database.</span><button onClick={() => void reloadThreads()} className="px-3 py-1 bg-[#242429] hover:bg-[#2f2f37] text-neutral-200 text-xs rounded border border-[#3b3b45] transition-colors">Retry</button></div>;
    }
    return null;
  }

  if (activeThread.turns.length === 0) return <EmptyState />;

  const bindTarget = (id: string) => (element: HTMLElement | null) => {
    if (element) targetElements.current.set(id, element);
    else targetElements.current.delete(id);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <div ref={bindScrollRoot} onScroll={(event) => {
        const element = event.currentTarget;
        wasNearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
        if (activeThread) {
          try { sessionStorage.setItem(`mediobot-thread-scroll:${activeThread.id}`, String(element.scrollTop)); }
          catch { /* Session storage may be unavailable in private browsing. */ }
        }
      }} data-testid="thread-scroll-root" className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-3xl w-full mx-auto space-y-7">
        {persistenceError && (
          <div
            data-testid="persistence-error-banner"
            className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 select-none ${
              isLight
                ? 'border-rose-200 bg-rose-50/70 text-rose-900'
                : 'border-rose-900/50 bg-rose-950/30 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium shrink-0">Persistence error:</span>
              <span className="truncate">{persistenceError}</span>
            </div>
            <button
              type="button"
              onClick={clearPersistenceError}
              className={`shrink-0 px-2 py-0.5 rounded-md font-medium cursor-pointer transition-colors ${
                isLight ? 'text-rose-700 hover:bg-rose-100' : 'text-rose-300 hover:bg-white/[0.06]'
              }`}
            >
              Dismiss
            </button>
          </div>
        )}
        {uniqueTurns.map((turn, turnIdx) => {
          const entries = entriesByTurn.get(turn.id) ?? [];
          const isTurnRunning = turn.status === 'running' || turn.status === 'pause_requested';
          const turnSpecialists = collectTurnSpecialists(turn.items ?? [], entries);
          const turnMetrics = summarizeTurnMetrics(turn, entries);
          const turnOverallText = entries
            .filter((e) => e.kind === 'message')
            .map((e) => e.items[0]?.text || '')
            .filter((t) => Boolean(t.trim()) && !t.startsWith('Using Gemini'))
            .join('\n\n');
          const showTurnParallelMilestone = !isTurnRunning && turnSpecialists.length >= 2;
          let renderedParallelMilestone = false;
          let lastSpeakerKey: string | null = null;

          const temporalLabel = formatTemporalDivider(turn.createdAt);
          const prevTemporalLabel = turnIdx > 0 ? formatTemporalDivider(uniqueTurns[turnIdx - 1]?.createdAt) : '';
          const shouldShowTemporalDivider = Boolean(temporalLabel) && (turnIdx === 0 || temporalLabel !== prevTemporalLabel);
          const hasAssistantEntries = entries.some((e) => e.kind !== 'user');
          const activeRunningTools = isTurnRunning
            ? deduplicateTools(
                (turn.items ?? [])
                  .filter((it) => it.type === 'tool_execution' && it.tool?.status === 'running')
                  .map((it) => it.tool!)
              )
            : [];

          return (
            <div key={`${turn.id}-${turnIdx}`} className="space-y-3.5">
              {shouldShowTemporalDivider && (
                <div className="flex justify-center py-0.5 select-none">
                  <span
                    className={`text-[11.5px] font-sans tabular-nums ${
                      isLight ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    {temporalLabel}
                  </span>
                </div>
              )}

              {turn.taskId && turn.status === 'running' && runtimeInstance.pauseTask && (
                <div className="flex justify-end">
                  <button type="button" disabled={pausingTaskId === turn.taskId}
                    onClick={async () => {
                      setRecoveryError(null); setPausingTaskId(turn.taskId!);
                      try { await runtimeInstance.pauseTask!(turn.taskId!); }
                      catch (error) { setRecoveryError(error instanceof Error ? error.message : 'Could not pause this task.'); }
                      finally { setPausingTaskId(null); }
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${isLight ? 'border border-gray-300 hover:bg-gray-100 text-gray-700' : 'border border-white/10 hover:bg-white/5 text-gray-300'}`}>
                    {pausingTaskId === turn.taskId ? 'Requesting pause…' : 'Pause task'}
                  </button>
                </div>
              )}

              {turn.status === 'pause_requested' && (
                <div className="text-xs text-neutral-500" role="status">
                  Pause requested. Active work is settling at a safe checkpoint.
                </div>
              )}

              {turn.recoveryState && turn.taskId && (
                <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs ${isLight ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-amber-950/30 text-amber-200 border border-amber-900/60'}`} role="status">
                  <span>{turn.recoveryState === 'paused'
                    ? 'This task is paused at a saved checkpoint.'
                    : turn.recoveryState === 'interrupted'
                    ? 'This task was interrupted. Its saved execution can be resumed.'
                    : 'This task is queued and ready to start.'}</span>
                  <button
                    type="button"
                    disabled={resumingTaskId === turn.taskId}
                    onClick={async () => {
                      setRecoveryError(null);
                      setResumingTaskId(turn.taskId!);
                      try {
                        if (!runtimeInstance.resumeTask) throw new Error('Task recovery is not available in this runtime.');
                        await runtimeInstance.resumeTask(turn.taskId!, activeThread.id, turn.id);
                      } catch (error) {
                        setRecoveryError(error instanceof Error ? error.message : 'Could not resume this task.');
                      } finally {
                        setResumingTaskId(null);
                      }
                    }}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${isLight ? 'bg-amber-100 hover:bg-amber-200 text-amber-950' : 'bg-amber-900/50 hover:bg-amber-900 text-amber-100'}`}
                  >
                    {resumingTaskId === turn.taskId ? 'Resuming…' : 'Resume task'}
                  </button>
                  {recoveryError && <span className="basis-full text-rose-500">{recoveryError}</span>}
                </div>
              )}

              {entries.map((entry, entryIndex) => {
                const first = entry.items[0]!;
                const isFirstAssistantEntry = entry.kind !== 'user' && (entryIndex === 0 || entries[entryIndex - 1]?.kind === 'user');

                if (entry.kind === 'user') {
                  lastSpeakerKey = null;
                  const itemTimestamp = first.timestamp || turn.createdAt;
                  const displayTime = formatUserTimestamp(itemTimestamp);

                  return (
                    <div
                      key={entry.id}
                      id={entry.targetId}
                      ref={bindTarget(entry.targetId)}
                      data-timeline-anchor="user"
                      className="group flex flex-col items-end scroll-mt-24 scroll-mb-24"
                    >
                      <div
                        className={`max-w-[85%] ${
                          isLight
                            ? 'bg-[#f4f4f7] text-[#09090b] border-black/[0.07]'
                            : 'bg-[#232328] text-neutral-100 border-white/[0.07]'
                        } text-[13.5px] px-4 py-2 rounded-2xl border leading-relaxed select-text`}
                      >
                        {first.text}
                        {first.attachments?.length ? (
                          <div className="mt-2.5 flex flex-col gap-2">
                            {first.attachments.filter((a) => a.mimeType.startsWith('image/')).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {first.attachments
                                  .filter((a) => a.mimeType.startsWith('image/'))
                                  .map((attachment) => (
                                    <div
                                      key={attachment.id}
                                      className={`group/img relative rounded-xl overflow-hidden border ${
                                        isLight ? 'border-black/10 bg-black/5' : 'border-white/10 bg-black/40'
                                      } cursor-pointer transition-transform hover:scale-[1.02]`}
                                      onClick={() => setViewingImage({ id: attachment.id, name: attachment.name, url: `/api/attachments/${attachment.id}` })}
                                    >
                                      <img
                                        src={`/api/attachments/${attachment.id}`}
                                        alt={attachment.name}
                                        loading="lazy"
                                        className="max-h-[180px] max-w-[260px] object-contain rounded-xl block"
                                      />
                                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 py-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                        <p className="text-[10px] text-white truncate font-medium">{attachment.name}</p>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}

                            {first.attachments.filter((a) => !a.mimeType.startsWith('image/')).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {first.attachments
                                  .filter((a) => !a.mimeType.startsWith('image/'))
                                  .map((attachment) => (
                                    <span
                                      key={attachment.id}
                                      className={`inline-flex items-center gap-1.5 rounded-lg ${
                                        isLight
                                          ? 'bg-white border-black/[0.08] text-neutral-700'
                                          : 'bg-[#19191d] border-white/[0.08] text-neutral-300'
                                      } border px-2.5 py-1 text-[11px] font-medium`}
                                      title={`${attachment.name} · ${attachment.mimeType} · ${attachment.size} bytes`}
                                    >
                                      <Paperclip className="w-3.5 h-3.5 opacity-70" />
                                      <span className="truncate max-w-[180px]">{attachment.name}</span>
                                      <span className="text-[9px] opacity-60 tabular-nums">
                                        {attachment.size < 1024 * 1024
                                          ? `${(attachment.size / 1024).toFixed(0)} KB`
                                          : `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`}
                                      </span>
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div
                        className={`mt-1 flex items-center gap-2 text-[11px] ${
                          isLight ? 'text-neutral-400' : 'text-neutral-500'
                        } opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none pr-1`}
                      >
                        {displayTime && <span className="font-sans tabular-nums">{displayTime}</span>}
                        <button
                          type="button"
                          onClick={() => handleCopy(first.text || '', entry.id)}
                          className={`p-1 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                            isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-neutral-200'
                          } flex items-center gap-1 text-[11px] font-medium cursor-pointer`}
                          title="Copy input text"
                          aria-label="Copy input text"
                        >
                          {copiedId === entry.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500 text-[10.5px]">Copied</span>
                            </>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }

                if (entry.kind === 'message') {
                  const actor: ConversationActor | undefined = first.actor;
                  const isSystem = actor?.type === 'system';
                  const currentSpeakerKey = actorIdentityKey(actor);
                  const showSpeakerHeader = !isSystem && currentSpeakerKey !== lastSpeakerKey;
                  if (!isSystem) {
                    lastSpeakerKey = currentSpeakerKey;
                  }

                  const presentation = actor?.type === 'mediobot'
                    ? getMediobotPresentation(actor.presentationId ?? actor.mediobotId ?? actor.name, actor.name)
                    : null;

                  // Keep assistant prose calm and high-contrast neutral; signature specialist color lives on the avatar & header
                  const botTextColor = isSystem
                    ? (isLight ? 'text-neutral-500' : 'text-neutral-400')
                    : (isLight ? 'text-[#18181b]' : 'text-[#e4e4e7]');

                  const botNameColor = presentation
                    ? (isLight ? presentation.lightText : presentation.darkText)
                    : (isLight ? 'text-neutral-600' : 'text-neutral-400');

                  const lastMessageIndex = entries.findLastIndex((e) => e.kind === 'message' && e.items[0]?.actor?.type !== 'system');
                  const fallbackLastMessageIndex = entries.findLastIndex((e) => e.kind === 'message');
                  const targetCopyIdx = lastMessageIndex >= 0 ? lastMessageIndex : fallbackLastMessageIndex;
                  const isLastMessageInTurn = entryIndex === targetCopyIdx;

                  const allAssistantMessages = entries.filter((e) => e.kind === 'message');
                  const overallTurnText = allAssistantMessages
                    .map((e) => e.items[0]?.text || '')
                    .filter((t) => Boolean(t.trim()) && !t.startsWith('Using Gemini'))
                    .join('\n\n') || allAssistantMessages.map((e) => e.items[0]?.text || '').join('\n\n');

                  const botCursorColor = actor?.type === 'mediobot'
                    ? getMediobotCursorColor(actor.presentationId ?? actor.mediobotId ?? actor.name?.toLowerCase(), isLight)
                    : (isLight ? '#18181b' : '#f4f4f5');

                  const isHistorical = typedMessageIds.current.has(first.id);
                  const shouldAnimateTyping = !isHistorical && (turn.status === 'running' || (first.timestamp ? first.timestamp >= mountTimestamp.current - 2500 : true));

                  return (
                    <React.Fragment key={entry.id}>
                      {isFirstAssistantEntry && (
                        <TurnDurationHeader
                          isRunning={isTurnRunning}
                          turnStatus={turn.status}
                          createdAt={turn.createdAt}
                          completedAt={turn.completedAt}
                          isLight={isLight}
                          metrics={turnMetrics}
                          activeTools={activeRunningTools}
                          onJumpToChanges={() => {
                            const changesEl = document.getElementById(`turn-changes-${turn.id}`);
                            if (changesEl) {
                              const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                              changesEl.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
                            } else if (turnMetrics.diffItems[0]?.targetId) {
                              scrollToTargetId(turnMetrics.diffItems[0].targetId);
                            }
                          }}
                          onStopTurn={cancelTurn ? () => void cancelTurn(activeThread.id, turn.id) : undefined}
                          onCopyTurn={turnOverallText ? () => handleCopy(turnOverallText, `turn-hdr-${turn.id}`) : undefined}
                          copiedTurn={copiedId === `turn-hdr-${turn.id}`}
                        />
                      )}

                      {isSystem ? (
                        <div
                          id={entry.targetId}
                          ref={bindTarget(entry.targetId)}
                          data-timeline-anchor="message"
                          className={`scroll-mt-24 scroll-mb-24 text-[12px] leading-relaxed select-text ${
                            isLight ? 'text-neutral-500' : 'text-neutral-400'
                          }`}
                        >
                          {first.text}
                        </div>
                      ) : (
                        <div
                          id={entry.targetId}
                          ref={bindTarget(entry.targetId)}
                          data-timeline-anchor="message"
                          className="group scroll-mt-24 scroll-mb-24"
                        >
                          {showSpeakerHeader && (
                            <div className={`mb-1.5 flex items-center gap-2 text-[11.5px] font-medium ${botNameColor}`}>
                              <MediobotAvatar actor={actor} size="sm" />
                              <span>{conversationActorName(actor)}</span>
                            </div>
                          )}

                          <div className={`text-[14px] ${botTextColor} leading-[1.6] select-text`}>
                            <MarkdownContent
                              content={first.text || ''}
                              textColor={botTextColor}
                              animateTyping={shouldAnimateTyping}
                              cursorColor={botCursorColor}
                              onTypingComplete={() => {
                                typedMessageIds.current.add(first.id);
                              }}
                            />
                          </div>

                          {isLastMessageInTurn && (
                            <div
                              className={`mt-1 flex items-center gap-1.5 ${
                                isLight ? 'text-neutral-400' : 'text-neutral-500'
                              } opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none`}
                            >
                              <button
                                type="button"
                                onClick={() => handleCopy(overallTurnText, turn.id)}
                                className={`p-1 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                                  isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-neutral-200'
                                } flex items-center gap-1 text-[11px] font-medium cursor-pointer`}
                                title="Copy response"
                                aria-label="Copy response"
                              >
                                {copiedId === turn.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-emerald-500 text-[10.5px]">Copied</span>
                                  </>
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                }

                const isActiveGroup = isTurnRunning && entries[entries.length - 1]?.id === entry.id;
                const tools = entry.items.filter((it) => it.type === 'tool_execution' && it.tool).map((it) => it.tool!);
                const nonTools = entry.items.filter((it) => it.type !== 'tool_execution');

                const shouldInsertTurnParallelMilestone = showTurnParallelMilestone && !renderedParallelMilestone;
                if (shouldInsertTurnParallelMilestone) {
                  renderedParallelMilestone = true;
                }

                return (
                  <React.Fragment key={entry.id}>
                    {isFirstAssistantEntry && (
                      <TurnDurationHeader
                        isRunning={isTurnRunning}
                        turnStatus={turn.status}
                        createdAt={turn.createdAt}
                        completedAt={turn.completedAt}
                        isLight={isLight}
                        metrics={turnMetrics}
                        activeTools={activeRunningTools}
                        onJumpToChanges={() => {
                          const changesEl = document.getElementById(`turn-changes-${turn.id}`);
                          if (changesEl) {
                            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                            changesEl.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
                          } else if (turnMetrics.diffItems[0]?.targetId) {
                            scrollToTargetId(turnMetrics.diffItems[0].targetId);
                          }
                        }}
                        onStopTurn={cancelTurn ? () => void cancelTurn(activeThread.id, turn.id) : undefined}
                        onCopyTurn={turnOverallText ? () => handleCopy(turnOverallText, `turn-hdr-${turn.id}`) : undefined}
                        copiedTurn={copiedId === `turn-hdr-${turn.id}`}
                      />
                    )}

                    {shouldInsertTurnParallelMilestone && (
                      <TurnSpecialistMilestone
                        specialists={turnSpecialists}
                        isLight={isLight}
                        getAgentPreference={getAgentPreference}
                        onJumpToTarget={scrollToTargetId}
                      />
                    )}

                    <div
                      id={entry.targetId}
                      ref={bindTarget(entry.targetId)}
                      data-timeline-anchor="activity"
                      className="group scroll-mt-24 scroll-mb-24 my-1"
                    >
                      {/* Render tool executions cleanly as an unboxed Codex collapsible cluster */}
                      {tools.length > 0 && (
                        <CodexToolCluster
                          tools={tools}
                          defaultOpen={isSpecificMediobotChat || isActiveGroup}
                        />
                      )}

                      {/* Render diffs, approvals, perceptions, compactions, or detailed activities */}
                      {nonTools.length > 0 && (
                        <div className="space-y-1 mt-0.5">
                          {nonTools.map((item) => (
                            <ActivityItem
                              key={item.id}
                              item={item}
                              turnId={turn.id}
                              turnStatus={turn.status}
                              isActive={Boolean(isActiveGroup && item === entry.items[entry.items.length - 1])}
                              isMainChat={isMainChat}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              {!isTurnRunning && turnMetrics.diffItems.length > 0 && (
                <div
                  id={`turn-changes-${turn.id}`}
                  data-testid={`turn-changed-files-${turn.id}`}
                  className={`mt-2 rounded-lg border overflow-hidden text-[12px] ${
                    isLight
                      ? 'border-black/[0.08] bg-[#fafafa]'
                      : 'border-white/[0.08] bg-[#161619]'
                  }`}
                >
                  <div
                    className={`px-3 py-1.5 border-b flex items-center justify-between gap-3 text-[11.5px] font-sans ${
                      isLight
                        ? 'border-black/[0.06] text-neutral-600'
                        : 'border-white/[0.06] text-neutral-400'
                    }`}
                  >
                    <span className="font-medium">
                      Files changed ({turnMetrics.diffItems.length})
                    </span>
                    <span className="font-mono tabular-nums text-[11px] flex items-center gap-1.5">
                      <span className={isLight ? 'text-emerald-700' : 'text-emerald-400/90'}>+{turnMetrics.totalAdditions}</span>
                      <span className={isLight ? 'text-rose-700' : 'text-rose-400/90'}>-{turnMetrics.totalDeletions}</span>
                    </span>
                  </div>
                  <div className={`divide-y ${isLight ? 'divide-black/[0.05]' : 'divide-white/[0.05]'}`}>
                    {turnMetrics.diffItems.map(({ item, diff, targetId }) => {
                      const adds = diff.truncated
                        ? diff.additions
                        : diff.hunks?.reduce((acc, h) => acc + h.lines.filter((l) => l.type === 'add').length, 0) ?? diff.additions;
                      const dels = diff.truncated
                        ? diff.deletions
                        : diff.hunks?.reduce((acc, h) => acc + h.lines.filter((l) => l.type === 'remove').length, 0) ?? diff.deletions;
                      const stateLabel =
                        diff.state === 'verified'
                          ? 'Verified (Simulated)'
                          : diff.state === 'applied'
                          ? 'Applied (Simulated)'
                          : diff.state === 'rejected'
                          ? 'Rejected'
                          : 'Proposed';

                      return (
                        <div
                          key={item.id}
                          className={`px-3 py-1.5 flex items-center justify-between gap-3 ${
                            isLight ? 'hover:bg-black/[0.02]' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileCode className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
                            <button
                              type="button"
                              onClick={() => openFileTab(diff.filePath)}
                              className={`font-mono truncate cursor-pointer hover:underline ${
                                isLight ? 'text-neutral-800 hover:text-sky-700' : 'text-neutral-200 hover:text-sky-300'
                              }`}
                              title={`Open ${diff.filePath} in editor`}
                            >
                              {diff.filePath}
                            </button>
                            <span
                              className={`text-[11px] font-sans shrink-0 ${
                                diff.state === 'verified'
                                  ? isLight ? 'text-emerald-700' : 'text-emerald-400/80'
                                  : diff.state === 'rejected'
                                  ? 'text-rose-400'
                                  : isLight ? 'text-neutral-500' : 'text-neutral-500'
                              }`}
                            >
                              {stateLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-[11px] font-sans tabular-nums">
                            <span className="font-mono flex items-center gap-1">
                              <span className={isLight ? 'text-emerald-700' : 'text-emerald-400/90'}>+{adds}</span>
                              <span className={isLight ? 'text-rose-700' : 'text-rose-400/90'}>-{dels}</span>
                            </span>
                            {targetId && (
                              <button
                                type="button"
                                onClick={() => scrollToTargetId(targetId)}
                                className={`cursor-pointer transition-colors ${
                                  isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-neutral-100'
                                }`}
                              >
                                Inspect diff
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openFileTab(diff.filePath)}
                              className={`inline-flex items-center gap-1 cursor-pointer transition-colors ${
                                isLight ? 'text-sky-700 hover:underline' : 'text-sky-400 hover:underline'
                              }`}
                            >
                              <span>Open</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isTurnRunning && activeRunningTools.length > 0 && (
                <div
                  data-testid="active-tool-call-strip"
                  className="flex flex-wrap items-center gap-2 py-1 select-none"
                >
                  {activeRunningTools.slice(0, 3).map((tool, rIdx) => {
                    const parsed = parseToolAction(tool, `live-${rIdx}`);
                    const details = extractAllowlistToolDetails(tool);
                    const meta = mapActionToCallChip(parsed, details.commandDescription);
                    return (
                      <CallChip
                        key={parsed.id}
                        icon={meta.icon}
                        name={meta.name}
                        argument={meta.argument}
                        status="running"
                        expectedMs={meta.expectedMs}
                        startedAt={tool.startedAt}
                        size={26}
                        radius={7}
                        color={isLight ? '#18181b' : '#e4e4e7'}
                        surfaceColor={isLight ? '#f4f4f6' : '#1e1e23'}
                        borderColor={isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}
                        progressColor={isLight ? '#09090b' : '#ffffff'}
                        progressOpacity={isLight ? 0.06 : 0.08}
                        doneColor={isLight ? '#16a34a' : '#22c55e'}
                        errorColor={isLight ? '#dc2626' : '#ef4444'}
                        showTimer
                      />
                    );
                  })}
                  {activeRunningTools.length > 3 && (
                    <span className={`text-[11px] font-sans tabular-nums ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      +{activeRunningTools.length - 3} more running
                    </span>
                  )}
                </div>
              )}

              {isTurnRunning && hasAssistantEntries && (
                <ParallelModelGuidanceStrip activeTurnRunning={isTurnRunning} threadId={activeThread.id} />
              )}

              {isTurnRunning && entries.every((e) => e.kind === 'user') && (
                <>
                  <TurnDurationHeader
                    isRunning={true}
                    turnStatus={turn.status}
                    createdAt={turn.createdAt}
                    isLight={isLight}
                    activeTools={activeRunningTools}
                    onStopTurn={cancelTurn ? () => void cancelTurn(activeThread.id, turn.id) : undefined}
                  />
                  <div className="py-1 select-none">
                    <ThoughtLine
                      working={true}
                      label={turn.status === 'pause_requested' ? 'Pausing at checkpoint…' : 'Thinking…'}
                      doneLabel="Thought for"
                      glyph="sparkle"
                      startedAt={turn.createdAt}
                      collapsible={false}
                      showTimer={true}
                      fontSize={13.5}
                      breathPeriod={1.6}
                      breathDepth={0.45}
                      shimmer={true}
                      isLight={isLight}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-6" />
      </div>

      {anchors.length > 0 && (
        <TimelineNavigator
          anchors={anchors}
          scrollRoot={scrollRoot}
          targets={targetElements}
          turnMetaByTargetId={turnMetaByTargetId}
        />
      )}

      <div className={`w-full pb-4 pt-2 ${
        isLight
          ? 'bg-gradient-to-t from-[#ffffff] via-[#ffffff] to-transparent'
          : 'bg-gradient-to-t from-[#141415] via-[#141415] to-transparent'
      } z-10 shrink-0`}>
        <Composer compact />
      </div>

      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4"
          onClick={() => setViewingImage(null)}
        >
          <div
            className={`relative max-w-4xl max-h-[90vh] flex flex-col items-center ${
              isLight ? 'bg-white border-[#e2e4e8]' : 'bg-[#1a1a20] border-white/10'
            } rounded-2xl border p-3 shadow-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full px-2 py-1 border-b border-white/10 mb-2">
              <span className={`text-xs font-semibold ${isLight ? 'text-black' : 'text-neutral-200'} truncate`}>
                {viewingImage.name}
              </span>
              <button
                onClick={() => setViewingImage(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-center overflow-auto max-h-[calc(90vh-80px)]">
              <img
                src={viewingImage.url}
                alt={viewingImage.name}
                className="max-h-[calc(90vh-100px)] max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


