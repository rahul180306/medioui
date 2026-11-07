import React, { useState, useEffect, useRef } from 'react';
import type { ToolExecutionData, ThreadItem } from '../../types';
import {
  BookOpen,
  Search,
  Folder,
  Terminal,
  FileCode,
  Globe,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Zap,
  Copy,
  Check,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { runtimeInstance } from '../../runtime/client';
import { toolOutputFallback } from './toolExecutionFallback';
import { getOutcomeBadge } from './toolExecutionPresentation';

// ---------------------------------------------------------------------------
// M3: Model Attribution Helpers
// ---------------------------------------------------------------------------

/** Comprehensive model display dictionary covering all target parallel guidance models */
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // Anthropic Claude
  'claude-3-7-sonnet': 'Claude 3.7 Sonnet',
  'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
  'claude-3-5-haiku': 'Claude 3.5 Haiku',
  'claude-3-opus': 'Claude 3 Opus',
  'claude-sonnet-4': 'Claude Sonnet 4',
  'claude-opus-4': 'Claude Opus 4',
  // DeepSeek
  'deepseek-v4-1-flash-uncensored': 'DeepSeek-V4.1-Flash (Uncensored)',
  'deepseek-v4-1-flash': 'DeepSeek-V4.1-Flash',
  'deepseek-chat': 'DeepSeek-V3',
  'deepseek-v3': 'DeepSeek-V3',
  'deepseek-reasoner': 'DeepSeek-R1',
  'deepseek-r1': 'DeepSeek-R1',
  // OpenAI
  'gpt-6-luna': 'GPT-6 Luna',
  'o3-mini': 'o3-mini',
  'o3': 'o3',
  'o1-mini': 'o1-mini',
  'o1': 'o1',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o mini',
  // Google Gemini
  'gemini-2-5-flash': 'Gemini 2.5 Flash',
  'gemini-2-5-pro': 'Gemini 2.5 Pro',
  'gemini-2-0-flash': 'Gemini 2.0 Flash',
  'gemini-1-5-pro': 'Gemini 1.5 Pro',
  // Meta AI / Muse
  'muse-spark-1-3': 'Muse Spark 1.3',
  'muse-spark-1-3-contributor': 'Muse Spark 1.3 Contributor',
  'muse-spark-1-2': 'Muse Spark 1.2',
  'muse-spark-1-1': 'Muse Spark 1.1',
  'muse-wonder-1-0': 'Muse Wonder 1.0',
  'sam-3-1': 'SAM 3.1',
  'muse-image-1-0': 'Muse Image 1.0',
  'muse-voice-transcribe-1-0': 'Muse Voice Transcribe',
  // Open Source / Local / Fast
  'llama-3-3-70b': 'Llama 3.3 70B',
  'minimax-m2-7': 'MiniMax-M2.7',
  'minimaxai-minimax-m2-7': 'MiniMax-M2.7',
};

/** Normalizes dots, slashes, underscores, and colons to cleanly match model IDs */
export function resolveModelDisplay(modelId?: string): string | null {
  if (!modelId) return null;
  const normalized = modelId.toLowerCase().replace(/[/_.:\s]+/g, '-');
  if (MODEL_DISPLAY_NAMES[normalized]) {
    return MODEL_DISPLAY_NAMES[normalized]!;
  }
  // Sort keys by length descending so specific keys (e.g. 'gpt-4o-mini') match before prefixes (e.g. 'gpt-4o')
  const sortedEntries = Object.entries(MODEL_DISPLAY_NAMES).sort((a, b) => b[0].length - a[0].length);
  for (const [key, label] of sortedEntries) {
    if (normalized.includes(key)) return label;
  }
  // Fallback: extract last segment
  const fallback = modelId.split('/').pop()?.split(':')[0]?.trim();
  return fallback || null;
}

/** Resolves family-specific styling tint classes */
export function getModelBadgeColors(modelDisplay: string, isLight: boolean): string {
  const lower = modelDisplay.toLowerCase();
  if (lower.includes('claude')) {
    return isLight
      ? 'bg-purple-50 text-purple-700 border-purple-200/70'
      : 'bg-purple-950/40 text-purple-300 border-purple-700/30';
  }
  if (lower.includes('deepseek')) {
    return isLight
      ? 'bg-sky-50 text-sky-700 border-sky-200/70'
      : 'bg-sky-950/40 text-sky-300 border-sky-700/30';
  }
  if (lower.includes('o3') || lower.includes('o1') || lower.includes('gpt')) {
    return isLight
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
      : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/30';
  }
  if (lower.includes('gemini')) {
    return isLight
      ? 'bg-amber-50 text-amber-800 border-amber-200/70'
      : 'bg-amber-950/40 text-amber-300 border-amber-700/30';
  }
  if (lower.includes('muse') || lower.includes('meta') || lower.includes('sam')) {
    return isLight
      ? 'bg-blue-50 text-blue-700 border-blue-200/70'
      : 'bg-blue-950/40 text-blue-300 border-blue-700/30';
  }
  return isLight
    ? 'bg-neutral-100 text-neutral-700 border-neutral-200/70'
    : 'bg-neutral-800/50 text-neutral-300 border-neutral-700/30';
}

// ---------------------------------------------------------------------------
// M3: Live Elapsed Duration Hook & Formatter
// ---------------------------------------------------------------------------

/** Formats milliseconds into human-readable monospace string (e.g. 0.4s, 1.4s, 1m 23s) */
export function formatDurationMs(ms: number): string {
  if (ms < 0) ms = 0;
  if (ms < 60_000) {
    const rounded = (Math.round(ms / 100) / 10).toFixed(1);
    return `${rounded}s`;
  }
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

/**
 * High-resolution duration timer that ticks in real time via RAF while running,
 * and freezes permanently upon completion. Never vanishes or blinks.
 */
export function useToolDuration(
  tool: ToolExecutionData,
  isRunning: boolean
): { durationText: string | null; isLive: boolean } {
  const [elapsed, setElapsed] = useState<number | null>(() => {
    if (tool.durationMs !== undefined) return tool.durationMs;
    if (isRunning && tool.startedAt) return Math.max(0, Date.now() - tool.startedAt);
    return null;
  });

  const lastElapsedRef = useRef<number | null>(elapsed);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isRunning) {
      // Freezing on completion: prioritize authoritative durationMs, fallback to last tick, then delta
      if (tool.durationMs !== undefined) {
        setElapsed(tool.durationMs);
      } else if (lastElapsedRef.current !== null) {
        setElapsed(lastElapsedRef.current);
      } else if (tool.startedAt) {
        setElapsed(Math.max(0, Date.now() - tool.startedAt));
      }
      return;
    }

    if (!tool.startedAt) return;

    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      const current = Math.max(0, Date.now() - tool.startedAt!);
      lastElapsedRef.current = current;
      setElapsed(current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, tool.startedAt, tool.durationMs]);

  if (elapsed === null) return { durationText: null, isLive: false };
  return { durationText: formatDurationMs(elapsed), isLive: isRunning };
}

// ---------------------------------------------------------------------------
// M3: Telemetry Pill Component & Contracts
// ---------------------------------------------------------------------------

export interface ModelExecutionTelemetry {
  modelId?: string;
  providerName?: string;
  specialistId?: string;
  ttftMs?: number;
  ttfbMs?: number;
  tokensPerSecond?: number;
  outputTokens?: number;
  inputTokens?: number;
  durationMs?: number;
  stdoutBytes?: number;
  stderrBytes?: number;
  status?: 'running' | 'completed' | 'failed' | 'cancelled';
}

// ---------------------------------------------------------------------------
// M3: Model Attribution Badge Component
// ---------------------------------------------------------------------------

export interface ModelBadgeProps {
  modelId?: string;
  specialistName?: string;
  isLight: boolean;
  isRunning?: boolean;
}

export const ModelAttributionBadge: React.FC<ModelBadgeProps> = ({ modelId, isLight, isRunning }) => {
  const modelDisplay = resolveModelDisplay(modelId);
  // FIX: When modelId is absent, do NOT duplicate specialistName
  if (!modelDisplay) return null;

  const colorClasses = getModelBadgeColors(modelDisplay, isLight);

  return (
    <span
      data-testid="model-attribution-badge"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium shrink-0 transition-opacity border ${colorClasses} ${
        isRunning ? 'opacity-100' : 'opacity-75'
      }`}
    >
      {isRunning && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {modelDisplay}
    </span>
  );
};

// ---------------------------------------------------------------------------
// M3: Canonical Trajectory Grammar Parser & Visualizer
// ---------------------------------------------------------------------------

export interface TrajectoryBlock {
  id: string;
  kind: 'action' | 'observation' | 'observation_error' | 'thinking' | 'assistant' | 'user' | 'error';
  tag: string;
  toolName?: string;
  targetOrCommand?: string;
  content: string;
  exitCode?: number;
  isTruncated?: boolean;
  originalLength?: number;
}

const TRAJECTORY_BLOCK_REGEX = /\[(ACTION(?::\s*[^\]]+)?|OBSERVATION(?:\s+ERROR)?|THINKING|REASONING|ASSISTANT|USER|ERROR|HARNESS)\]/g;
const MAX_BLOCK_CHARS = 10_000;

export function parseCanonicalTrajectory(raw: string): TrajectoryBlock[] {
  if (!raw || !raw.trim()) return [];

  const trimmed = raw.trim();
  const matches = [...trimmed.matchAll(TRAJECTORY_BLOCK_REGEX)];
  if (matches.length === 0) {
    return [{
      id: 'block-0',
      kind: 'observation',
      tag: 'OUTPUT',
      content: trimmed,
    }];
  }

  const blocks: TrajectoryBlock[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!;
    const rawTag = match[1]!;
    const startIndex = match.index! + match[0].length;
    const endIndex = i + 1 < matches.length ? matches[i + 1]!.index! : trimmed.length;
    let blockContent = trimmed.substring(startIndex, endIndex).trim();

    let kind: TrajectoryBlock['kind'] = 'observation';
    let toolName: string | undefined;
    let targetOrCommand: string | undefined;
    let exitCode: number | undefined;

    if (rawTag.startsWith('ACTION')) {
      kind = 'action';
      if (rawTag.includes(':')) {
        toolName = rawTag.split(':')[1]?.trim();
      }
      // Check if content starts with toolName(args) or shell: cmd or name: args
      const opencodeCallMatch = blockContent.match(/^([\w.-]+)\((.*)\)$/s);
      const colonPrefixMatch = blockContent.match(/^([\w.-]+):\s*(.*)$/s);

      if (opencodeCallMatch) {
        toolName = toolName || opencodeCallMatch[1];
        targetOrCommand = opencodeCallMatch[2];
      } else if (colonPrefixMatch) {
        toolName = toolName || colonPrefixMatch[1];
        targetOrCommand = colonPrefixMatch[2];
      }
    } else if (rawTag === 'OBSERVATION ERROR') {
      kind = 'observation_error';
      const exitMatch = blockContent.match(/\|\s*exit_code=(\d+)\s*$/);
      if (exitMatch) {
        exitCode = parseInt(exitMatch[1]!, 10);
        blockContent = blockContent.replace(/\|\s*exit_code=\d+\s*$/, '').trim();
      }
    } else if (rawTag === 'OBSERVATION') {
      kind = 'observation';
      const exitMatch = blockContent.match(/\|\s*exit_code=(\d+)\s*$/);
      if (exitMatch) {
        exitCode = parseInt(exitMatch[1]!, 10);
        blockContent = blockContent.replace(/\|\s*exit_code=\d+\s*$/, '').trim();
      }
    } else if (rawTag === 'THINKING' || rawTag === 'REASONING') {
      kind = 'thinking';
    } else if (rawTag === 'ASSISTANT') {
      kind = 'assistant';
    } else if (rawTag === 'USER') {
      kind = 'user';
    } else if (rawTag === 'ERROR' || rawTag === 'HARNESS') {
      kind = 'error';
    }

    const isTruncated = blockContent.length > MAX_BLOCK_CHARS;
    const originalLength = blockContent.length;
    if (isTruncated) {
      blockContent = blockContent.slice(0, MAX_BLOCK_CHARS) + '\n…(truncated for display)';
    }

    blocks.push({
      id: `block-${i}`,
      kind,
      tag: rawTag,
      toolName,
      targetOrCommand,
      content: blockContent,
      exitCode,
      isTruncated,
      originalLength,
    });
  }

  return blocks;
}

export const CanonicalTrajectoryView: React.FC<{
  blocks: TrajectoryBlock[];
  isLight: boolean;
}> = ({ blocks, isLight }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(false);

  const handleCopy = (text: string, id: string) => {
    try {
      void navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard may be unavailable in some sandboxes
    }
  };

  return (
    <div className="space-y-2 select-text font-mono text-[11px] leading-relaxed">
      {blocks.map((block) => {
        // Thinking / Reasoning: Dimmed & Collapsible
        if (block.kind === 'thinking') {
          return (
            <div key={block.id} className="opacity-75 my-1">
              <button
                type="button"
                onClick={() => setShowThinking(!showThinking)}
                className="flex items-center gap-1.5 text-[10px] text-violet-500 hover:text-violet-400 font-sans cursor-pointer py-0.5"
              >
                {showThinking ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>[REASONING] Model deliberation</span>
              </button>
              {showThinking && (
                <div
                  className={`mt-1 pl-3 border-l-2 ${
                    isLight
                      ? 'border-violet-300 bg-violet-50/50 text-violet-900'
                      : 'border-violet-700 bg-violet-950/20 text-violet-200'
                  } p-2 rounded text-[10.5px] whitespace-pre-wrap`}
                >
                  {block.content}
                </div>
              )}
            </div>
          );
        }

        // Action Block: Distinct Tool Invocations
        if (block.kind === 'action') {
          return (
            <div
              key={block.id}
              className={`rounded-md p-2 border ${
                isLight
                  ? 'bg-blue-50/60 border-blue-200 text-blue-950'
                  : 'bg-blue-950/30 border-blue-700/40 text-blue-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-current/10 font-sans text-[10px] font-semibold tracking-wide uppercase">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 opacity-70" />
                  <span>ACTION: {block.toolName || 'tool'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(block.content, block.id)}
                  className="opacity-60 hover:opacity-100 transition-opacity p-0.5"
                  title="Copy Action"
                >
                  {copiedId === block.id ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
              <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed opacity-90 overflow-x-auto">
                {block.targetOrCommand ? (
                  <>
                    <span className="text-amber-500 font-semibold">{block.toolName}</span>
                    <span className="opacity-80">({block.targetOrCommand})</span>
                  </>
                ) : (
                  block.content
                )}
              </div>
            </div>
          );
        }

        // Observation Block: Runtime Results (Teal/Cyan panel matching Antigravity & Sentinel specification)
        const isError = block.kind === 'observation_error' || block.kind === 'error';
        return (
          <div
            key={block.id}
            data-testid="observation-panel"
            className={`rounded-md p-2 border ${
              isError
                ? isLight
                  ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                  : 'bg-rose-950/30 border-rose-800/40 text-rose-100'
                : isLight
                  ? 'bg-teal-50/80 border-teal-200 text-teal-950'
                  : 'bg-[#0c1f24] border-[#134e4a]/70 text-teal-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-current/10 font-sans text-[10px] font-semibold tracking-wide uppercase">
              <span className="flex items-center gap-1.5">
                {isError ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                    <span className="text-rose-600 dark:text-rose-400 font-semibold tracking-wider">
                      ERROR {block.exitCode !== undefined ? `(exit ${block.exitCode})` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-teal-500 dark:text-teal-400" />
                    <span className="text-teal-700 dark:text-teal-400 font-semibold tracking-wider">
                      OUTPUT {block.exitCode === 0 ? '(exit 0)' : block.exitCode !== undefined ? `(exit ${block.exitCode})` : ''}
                    </span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(block.content, block.id)}
                className="opacity-70 hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                title="Copy Observation"
              >
                {copiedId === block.id ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                )}
              </button>
            </div>
            <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72">
              {block.content}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tool Parsing and Actions
// ---------------------------------------------------------------------------

export interface ParsedToolAction {
  id: string;
  icon: 'read' | 'search' | 'list' | 'terminal' | 'edit' | 'web' | 'generic';
  label: string;
  target?: string;
  tool: ToolExecutionData;
  specialistName?: string;
  modelId?: string;
}

export function parseToolAction(
  tool: ToolExecutionData,
  idPrefix: string = 'tool',
  specialistName?: string,
  modelId?: string
): ParsedToolAction {
  const name = (tool.toolName || '').trim();
  const cmd = (tool.command || '').trim();
  const id = tool.toolInvocationId || `${idPrefix}-${name}-${cmd}`;

  // 1. Filesystem Read
  if (name === 'filesystem.read' || cmd.startsWith('filesystem.read')) {
    const rawPath = cmd.replace(/^filesystem\.read\s*/, '').trim();
    let path = rawPath.replace(/^["']|["']$/g, '');
    try {
      if (rawPath.startsWith('{')) {
        const parsed = JSON.parse(rawPath);
        if (parsed.path) path = parsed.path;
      }
    } catch {
      // Keep plain text path
    }
    const fileName = path.split(/[\\/]/).pop() || path || 'file';
    return {
      id,
      icon: 'read',
      label: tool.status === 'running' ? `Reading ${fileName}` : `Read ${fileName}`,
      target: path,
      tool,
      specialistName,
      modelId,
    };
  }

  // 2. Filesystem List
  if (name === 'filesystem.list' || cmd.startsWith('filesystem.list')) {
    const rawDir = cmd.replace(/^filesystem\.list\s*/, '').trim();
    let dir = rawDir.replace(/^["']|["']$/g, '');
    try {
      if (rawDir.startsWith('{')) {
        const parsed = JSON.parse(rawDir);
        if (parsed.directory || parsed.path) dir = parsed.directory || parsed.path;
      }
    } catch {
      // Keep plain text dir
    }
    const dirName = dir ? (dir.split(/[\\/]/).filter(Boolean).pop() || dir) : 'workspace';
    return {
      id,
      icon: 'list',
      label: tool.status === 'running' ? `Listing ${dirName}` : `Listed files in ${dirName}`,
      target: dir,
      tool,
      specialistName,
      modelId,
    };
  }

  // 3. Search / Grep
  if (name.includes('search') || cmd.startsWith('filesystem.search') || cmd.startsWith('project.search') || cmd.startsWith('search')) {
    const query = cmd.replace(/^(filesystem|project)\.search\s*/, '').trim();
    return {
      id,
      icon: 'search',
      label: tool.status === 'running' ? `Searching for ${query}` : `Searched for ${query}`,
      target: query,
      tool,
      specialistName,
      modelId,
    };
  }

  // 4. Terminal Command
  if (name === 'terminal.execute' || cmd.startsWith('terminal.execute') || name.startsWith('terminal')) {
    const execCmd = cmd.replace(/^terminal\.execute\s*/, '').trim();
    let displayCmd = execCmd.replace(/^["']|["']$/g, '');
    try {
      if (execCmd.startsWith('{')) {
        const parsed = JSON.parse(execCmd);
        if (parsed.command) displayCmd = parsed.command;
      }
    } catch {
      // Keep plain command
    }
    return {
      id,
      icon: 'terminal',
      label: tool.status === 'running' ? `Running ${displayCmd}` : `Ran ${displayCmd}`,
      target: displayCmd,
      tool,
      specialistName,
      modelId,
    };
  }

  // 5. File Edit / Write
  if (name.includes('write') || name.includes('edit')) {
    const rawPath = cmd.replace(/^filesystem\.(write|edit)\s*/, '').trim();
    const fileName = rawPath.split(/[\\/]/).pop() || rawPath || 'file';
    return {
      id,
      icon: 'edit',
      label: tool.status === 'running' ? `Writing ${fileName}` : `Edited ${fileName}`,
      target: rawPath,
      tool,
      specialistName,
      modelId,
    };
  }

  // 6. Browser / Web
  if (name.includes('browser') || name.includes('vision') || name.includes('web')) {
    return {
      id,
      icon: 'web',
      label: tool.status === 'running' ? `Browsing web` : `Browsed web`,
      target: cmd,
      tool,
      specialistName,
      modelId,
    };
  }

  // 7. Generic fallback
  return {
    id,
    icon: 'generic',
    label: cmd || name || 'Tool action',
    target: cmd,
    tool,
    specialistName,
    modelId,
  };
}

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

function renderActionIcon(icon: ParsedToolAction['icon'], isLight: boolean, isRunning: boolean) {
  if (isRunning) {
    return <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />;
  }

  const baseColor = isLight ? 'text-neutral-500' : 'text-neutral-400';

  switch (icon) {
    case 'read':
      return <BookOpen className={`w-3.5 h-3.5 ${baseColor} shrink-0`} />;
    case 'search':
      return <Search className={`w-3.5 h-3.5 ${baseColor} shrink-0`} />;
    case 'list':
      return <Folder className={`w-3.5 h-3.5 ${baseColor} shrink-0`} />;
    case 'terminal':
      return <Terminal className={`w-3.5 h-3.5 ${baseColor} shrink-0`} />;
    case 'edit':
      return <FileCode className={`w-3.5 h-3.5 ${baseColor} shrink-0`} />;
    case 'web':
      return <Globe className={`w-3.5 h-3.5 ${baseColor} shrink-0`} />;
    default:
      return <FileText className={`w-3.5 h-3.5 ${baseColor} shrink-0`} />;
  }
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

export interface CodexToolRowProps {
  action: ParsedToolAction;
  isLight: boolean;
  telemetry?: ModelExecutionTelemetry;
  tokensPerSec?: number;
  ttftMs?: number;
}

/**
 * Codex-style Single Tool Action Row
 * Clean, typography-first, without box borders.
 * Clicking toggles the view of what was read or executed inline!
 *
 * M3 Enhancement: Live duration timer, telemetry pill, canonical trajectory parser.
 */
export const CodexToolRow: React.FC<CodexToolRowProps> = ({
  action,
  isLight,
  telemetry,
  tokensPerSec,
  ttftMs,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [asyncContent, setAsyncContent] = useState<string | null>(null);
  const [isLoadingAsync, setIsLoadingAsync] = useState(false);
  const { activeProjectId } = useApp();

  const tool = action.tool;
  const isRunning = tool.status === 'running';
  const isFailed = tool.status === 'failed';
  const isSuccess = tool.status === 'success';
  const outcomeBadge = getOutcomeBadge(tool);
  const emptyOutputMessage = toolOutputFallback(tool.toolName, tool.status);

  // M3: Live duration timer with freeze guarantee
  const { durationText, isLive } = useToolDuration(tool, isRunning);

  // Content to display when clicked open
  const outputContent = tool.outputLog || asyncContent || tool.error || emptyOutputMessage;
  const hasDetail = true;

  const handleToggle = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    // On-demand fetch file or directory content if not present in tool payload
    if (nextOpen && !tool.outputLog && !asyncContent && !isLoadingAsync && activeProjectId) {
      if (action.icon === 'read' && action.target) {
        setIsLoadingAsync(true);
        try {
          const res = await runtimeInstance.readFileVersioned(activeProjectId, action.target);
          if (res && typeof res.content === 'string') {
            setAsyncContent(res.content);
          }
        } catch {
          // If file could not be read, emptyOutputMessage will remain
        } finally {
          setIsLoadingAsync(false);
        }
      } else if (action.icon === 'list' && action.target !== undefined) {
        setIsLoadingAsync(true);
        try {
          const entries = await runtimeInstance.listFiles(activeProjectId, action.target || '');
          if (Array.isArray(entries) && entries.length > 0) {
            setAsyncContent(entries.map((e) => `${e.type === 'folder' ? '📁 ' : '📄 '}${e.name}`).join('\n'));
          }
        } catch {
          // Fallback remains
        } finally {
          setIsLoadingAsync(false);
        }
      }
    }
  };

  const lines = outputContent ? outputContent.split('\n') : [];
  const lineCount = lines.length;

  return (
    <div className="select-text">
      <div
        onClick={handleToggle}
        className={`group flex items-center justify-between gap-2 py-1 px-1 rounded-md text-xs cursor-pointer transition-colors ${
          isLight
            ? 'hover:bg-black/[0.03] text-[#334155]'
            : 'hover:bg-white/[0.04] text-neutral-300'
        }`}
        title={action.target || action.label}
      >
        <div className="flex items-center gap-2 min-w-0">
          {renderActionIcon(action.icon, isLight, isRunning)}

          <span className={`font-mono text-[11.5px] truncate ${
            isLight ? 'text-[#1e293b]' : 'text-neutral-200'
          }`}>
            {action.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">

          {outcomeBadge && (
            <span className={outcomeBadge.className}>
              {outcomeBadge.label}
            </span>
          )}

          {/* M3: Live pulsing dual-ring radar ping while running, frozen neutral text on finish */}
          {isLive && durationText ? (
            <span
              data-testid="tool-live-duration"
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-medium ${
                isLight
                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  : 'bg-amber-950/40 text-amber-300 border border-amber-700/30'
              }`}
              title="Executing..."
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              </span>
              <span>{durationText}</span>
            </span>
          ) : durationText ? (
            <span
              data-testid="tool-duration"
              className={`text-[10px] font-mono tabular-nums ${
                isLight ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              {durationText}
            </span>
          ) : null}

          {isSuccess && !outcomeBadge && (
            <CheckCircle2 className="w-3 h-3 text-emerald-500/80 shrink-0" />
          )}

          {isFailed && (
            <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
          )}

          {hasDetail && (
            <span className={`${isLight ? 'text-neutral-400' : 'text-neutral-500'} transition-transform`}>
              {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
          )}
        </div>
      </div>

      {/* Expanded read content / command output inline */}
      {isOpen && (
        <div className={`mt-1.5 mb-2 ml-5 p-3 rounded-lg text-[11px] font-mono leading-relaxed whitespace-pre overflow-x-auto max-h-80 select-text ${
          isLight
            ? 'bg-[#f4f4f7] border border-[#e2e4e8] text-[#1e293b]'
            : 'bg-[#18181c] border border-white/10 text-neutral-300'
        }`}>
          {isLoadingAsync ? (
            <div className="flex items-center gap-2 py-2 text-neutral-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
              <span>Loading {action.target || 'content'}…</span>
            </div>
          ) : (
            <>
              {/* File header if reading a file */}
              {action.icon === 'read' && action.target ? (
                <>
                  <div className={`text-[10px] font-sans pb-1.5 mb-2 border-b flex items-center justify-between ${
                    isLight ? 'border-neutral-200 text-neutral-500' : 'border-white/10 text-neutral-400'
                  }`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-medium truncate">{action.target}</span>
                      {asyncContent && !tool.outputLog && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-sans font-medium shrink-0">
                          (Current snapshot)
                        </span>
                      )}
                    </div>
                    <span className="shrink-0">{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{outputContent}</div>
                </>
              ) : (
                <>
                  {/* Running state indicator */}
                  {isRunning && (
                    <div
                      data-testid="running-observation-panel"
                      className={`mb-2 p-2 rounded-md border flex items-center gap-2 ${
                        isLight ? 'bg-teal-50/70 border-teal-200 text-teal-900' : 'bg-[#0c1f24] border-[#134e4a]/70 text-teal-300'
                      }`}
                    >
                      <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                      <span className="text-[11px] font-mono">Executing process…</span>
                    </div>
                  )}

                  {/* Terminal command preview */}
                  {action.icon === 'terminal' && (tool.command || tool.workingDirectory) && (
                    <div className="mb-2 text-[10.5px] opacity-70 border-b border-current/10 pb-1.5">
                      {tool.command ? `$ ${tool.command}\n` : ''}
                      {tool.workingDirectory ? `cd ${tool.workingDirectory}\n` : ''}
                      {tool.exitCode !== undefined && tool.exitCode !== null ? `Exit code: ${tool.exitCode}` : ''}
                    </div>
                  )}

                  {/* Error display */}
                  {tool.error ? (
                    <div className={isLight ? 'text-rose-700' : 'text-rose-400'}>
                      <span className="font-semibold">Error: </span>
                      {tool.error}
                      {tool.outputLog ? `\n\n${tool.outputLog}` : ''}
                    </div>
                  ) : (
                    /* M3: Canonical Trajectory parser for command outputs */
                    <CanonicalTrajectoryView
                      blocks={parseCanonicalTrajectory(outputContent ?? '')}
                      isLight={isLight}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
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
 * Antigravity-Style Collapsible Activity Accordion
 * Used in Main Chat for "System activity (1)", "Maestro activity (1)", "Cody activity (2)"
 */
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

/**
 * Codex-style Collapsible Tool Cluster
 *
 * M3 Enhancement: Shows multi-model attribution badge (e.g. "Cody [Claude 3.7 Sonnet]"),
 * enriched parallel specialist activity strip when multiple models run simultaneously,
 * and live animated status indicators.
 */
export const CodexToolCluster: React.FC<CodexToolClusterProps> = ({
  tools,
  defaultOpen = true,
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
