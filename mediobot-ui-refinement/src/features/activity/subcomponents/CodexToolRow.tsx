import React, { useState } from 'react';
import type { ToolExecutionData } from '../../../types';
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
  FileText,
  Copy,
  Check,
  ExternalLink,
  WrapText,
} from 'lucide-react';
import { useApp } from '../../../state/AppContext';
import { runtimeInstance } from '../../../runtime/client';
import { toolOutputFallback } from '../toolExecutionFallback';
import { getOutcomeBadge } from '../toolExecutionPresentation';
import { extractAllowlistToolDetails, redactSensitiveData } from '../allowlistRedaction';
import { useToolDuration } from './useToolTimer';
import type { ModelExecutionTelemetry } from './modelAttribution';
import { CanonicalTrajectoryView, parseCanonicalTrajectory } from './trajectoryParser';
import CallChip, { type CallChipIconKind } from '../../../components/CallChip';

// ---------------------------------------------------------------------------
// Tool Parsing and Actions
// ---------------------------------------------------------------------------

export interface ParsedToolAction {
  id: string;
  icon: 'read' | 'search' | 'list' | 'terminal' | 'edit' | 'web' | 'generic';
  label: string;
  verb?: string;
  subject?: string;
  target?: string;
  tool: ToolExecutionData;
  specialistName?: string;
  modelId?: string;
}

function stripDemoTag(raw: string): string {
  return raw.replace(/\s*\[Controlled demonstration\]\s*/gi, ' ').trim();
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
    const fileName = stripDemoTag(path.split(/[\\/]/).pop() || path || 'file');
    const verb = tool.status === 'running' ? 'Reading' : 'Read';
    return {
      id,
      icon: 'read',
      label: `${verb} ${fileName}`,
      verb,
      subject: fileName,
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
    const dirName = stripDemoTag(dir ? (dir.split(/[\\/]/).filter(Boolean).pop() || dir) : 'workspace');
    const verb = tool.status === 'running' ? 'Listing' : 'Listed files in';
    return {
      id,
      icon: 'list',
      label: `${verb} ${dirName}`,
      verb,
      subject: dirName,
      target: dir,
      tool,
      specialistName,
      modelId,
    };
  }

  // 3. Search / Grep
  if (
    name.includes('search') ||
    cmd.startsWith('filesystem.search') ||
    cmd.startsWith('project.search') ||
    cmd.startsWith('search') ||
    name === 'doc.analyze'
  ) {
    const rawQuery = cmd
      .replace(/^(filesystem|project|web|doc)\.(search|analyze)\s*/, '')
      .replace(/^search\s*/, '')
      .trim();
    const cleanQuery = stripDemoTag(rawQuery).replace(/^["']|["']$/g, '');
    const verb = tool.status === 'running' ? 'Searching for' : 'Searched for';
    return {
      id,
      icon: 'search',
      label: cleanQuery ? `${verb} ${cleanQuery}` : (tool.status === 'running' ? 'Searching codebase' : 'Searched codebase'),
      verb,
      subject: cleanQuery || 'codebase',
      target: cleanQuery,
      tool,
      specialistName,
      modelId,
    };
  }

  // 4. Terminal Command / Benchmark
  if (
    name === 'terminal.execute' ||
    cmd.startsWith('terminal.execute') ||
    name.startsWith('terminal') ||
    name === 'benchmark.run'
  ) {
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
    const safeCmd = stripDemoTag(redactSensitiveData(displayCmd).text);
    const verb = tool.status === 'running' ? 'Running' : 'Ran';
    return {
      id,
      icon: 'terminal',
      label: `${verb} ${safeCmd}`,
      verb,
      subject: safeCmd,
      target: safeCmd,
      tool,
      specialistName,
      modelId,
    };
  }

  // 5. File Edit / Write
  if (name.includes('write') || name.includes('edit')) {
    const rawPath = cmd.replace(/^filesystem\.(write|edit)\s*/, '').trim();
    const safePath = stripDemoTag(redactSensitiveData(rawPath).text);
    const fileName = safePath.split(/[\\/]/).pop() || safePath || 'file';
    const verb = tool.status === 'running' ? 'Writing' : 'Edited';
    return {
      id,
      icon: 'edit',
      label: `${verb} ${fileName}`,
      verb,
      subject: fileName,
      target: safePath,
      tool,
      specialistName,
      modelId,
    };
  }

  // 6. Browser / Web
  if (name.includes('browser') || name.includes('vision') || name.includes('web')) {
    const rawTarget = cmd.replace(/^web\.search\s*/, '').trim();
    const safeTarget = stripDemoTag(redactSensitiveData(rawTarget).text).replace(/^["']|["']$/g, '');
    const verb = tool.status === 'running' ? 'Browsing' : 'Browsed';
    return {
      id,
      icon: 'web',
      label: tool.status === 'running' ? `Browsing web` : `Browsed web`,
      verb,
      subject: safeTarget || 'web',
      target: safeTarget,
      tool,
      specialistName,
      modelId,
    };
  }

  // 7. Generic fallback
  const safeFallback = stripDemoTag(redactSensitiveData(cmd).text);
  return {
    id,
    icon: 'generic',
    label: safeFallback || name || 'Tool action',
    verb: undefined,
    subject: safeFallback || name || 'Tool action',
    target: safeFallback,
    tool,
    specialistName,
    modelId,
  };
}

function renderActionIcon(icon: ParsedToolAction['icon'], isLight: boolean, isRunning: boolean) {
  if (isRunning) {
    return (
      <Loader2
        className={`w-3.5 h-3.5 animate-spin shrink-0 ${
          isLight ? 'text-neutral-500' : 'text-neutral-400'
        }`}
      />
    );
  }

  const baseColor = isLight ? 'text-neutral-400' : 'text-neutral-500';

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

export interface CodexToolRowProps {
  action: ParsedToolAction;
  isLight: boolean;
  telemetry?: ModelExecutionTelemetry;
  tokensPerSec?: number;
  ttftMs?: number;
  onRetry?: () => void;
}

export function mapActionToCallChip(
  action: ParsedToolAction,
  commandDescription?: string
): { icon: CallChipIconKind; name: string; argument: string; expectedMs: number } {
  const iconMap: Record<ParsedToolAction['icon'], CallChipIconKind> = {
    terminal: 'terminal',
    edit: 'edit',
    search: 'search',
    read: 'file',
    list: 'file',
    web: 'search',
    generic: 'terminal',
  };

  const nameMap: Record<ParsedToolAction['icon'], string> = {
    terminal: action.tool.toolName === 'benchmark.run' ? 'bench' : 'bash',
    edit: 'edit',
    search: 'search',
    read: 'read',
    list: 'list',
    web: 'web',
    generic: action.tool.toolName || 'tool',
  };

  const expectedMsMap: Record<ParsedToolAction['icon'], number> = {
    terminal: 2800,
    edit: 1400,
    search: 1800,
    read: 900,
    list: 800,
    web: 2600,
    generic: 2000,
  };

  const arg =
    (action.icon === 'terminal' ? commandDescription : undefined) ||
    action.target ||
    action.subject ||
    action.label;

  return {
    icon: iconMap[action.icon],
    name: nameMap[action.icon],
    argument: stripDemoTag(arg),
    expectedMs: expectedMsMap[action.icon],
  };
}

/**
 * Unboxed Codex-style Single Tool Action Row
 * Quiet two-tone typography ("Read" muted + "package.json" crisp), zero border boxes or badge clutter.
 * Clicking expands the inline execution detail or file snapshot smoothly.
 */
export const CodexToolRow: React.FC<CodexToolRowProps> = ({
  action,
  isLight,
  onRetry,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [asyncContent, setAsyncContent] = useState<string | null>(null);
  const [isLoadingAsync, setIsLoadingAsync] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);

  let activeProjectId: string | undefined;
  let openFileTab: ((path: string, name?: string) => void) | undefined;
  let sendPrompt: ((text: string) => Promise<void>) | undefined;
  let activeTurnId: string | null | undefined;
  try {
    const app = useApp();
    activeProjectId = app.activeProjectId;
    openFileTab = app.openFileTab;
    sendPrompt = app.sendPrompt;
    activeTurnId = app.activeTurnId;
  } catch {
    activeProjectId = undefined;
    openFileTab = undefined;
    sendPrompt = undefined;
    activeTurnId = undefined;
  }

  const tool = action.tool;
  const isRunning = tool.status === 'running';
  const isFailed = tool.status === 'failed';
  const outcomeBadge = getOutcomeBadge(tool);
  const emptyOutputMessage = toolOutputFallback(tool.toolName, tool.status);

  // Allowlist extraction for defensive and sanitized display
  const safeDetails = extractAllowlistToolDetails(tool, action.specialistName, action.specialistName);
  const chipMeta = mapActionToCallChip(action, safeDetails.commandDescription);

  const retryHandler =
    onRetry ??
    (isFailed && sendPrompt && !activeTurnId
      ? () => {
          void sendPrompt!(`Retry failed step: ${chipMeta.name} ${chipMeta.argument}`);
        }
      : undefined);

  // Live duration timer with freeze guarantee
  const { durationText, isLive } = useToolDuration(tool, isRunning);

  // Content to display when clicked open (strictly sanitized)
  const rawOutput = tool.outputLog || asyncContent || tool.error || emptyOutputMessage;
  const outputContent = rawOutput ? redactSensitiveData(rawOutput).text : '';

  const isFileAction = (action.icon === 'read' || action.icon === 'edit') && Boolean(action.target);
  const cleanTargetPath = action.target ? action.target.replace(/^\.\//, '').replace(/^\/+/, '').trim() : '';

  const handleOpenInEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (openFileTab && cleanTargetPath) {
      openFileTab(cleanTargetPath);
    }
  };

  const handleCopyDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    const copyPayload =
      action.icon === 'terminal' && safeDetails.commandDescription
        ? `$ ${safeDetails.commandDescription}\n${outputContent}`
        : outputContent;
    if (!copyPayload) return;
    try {
      void navigator.clipboard.writeText(copyPayload);
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 1600);
    } catch {
      // Clipboard unavailable in test/sandbox contexts
    }
  };

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
            setAsyncContent(redactSensitiveData(res.content).text);
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
            const rawListing = entries.map((e) => `${e.type === 'folder' ? '📁 ' : '📄 '}${e.name}`).join('\n');
            setAsyncContent(redactSensitiveData(rawListing).text);
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
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Collapse' : 'Expand'} details for ${action.label}`}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void handleToggle();
          }
        }}
        className={`group flex items-center justify-between gap-2 py-[3px] px-1.5 -mx-1.5 rounded-md text-[13px] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 ${
          isLight
            ? 'hover:bg-black/[0.03] focus-visible:ring-neutral-400 text-neutral-700'
            : 'hover:bg-white/[0.03] focus-visible:ring-neutral-600 text-neutral-300'
        }`}
        title={outcomeBadge ? `${action.target || action.label} · ${outcomeBadge.label}` : (action.target || action.label)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isRunning || isFailed ? (
            <>
              <CallChip
                icon={chipMeta.icon}
                name={chipMeta.name}
                argument={chipMeta.argument}
                status={isRunning ? 'running' : 'error'}
                expectedMs={chipMeta.expectedMs}
                startedAt={tool.startedAt}
                durationMs={tool.durationMs}
                size={26}
                radius={7}
                color={isLight ? '#18181b' : '#e4e4e7'}
                surfaceColor={isLight ? '#f4f4f6' : '#1e1e23'}
                borderColor={isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}
                progressColor={isLight ? '#09090b' : '#ffffff'}
                progressOpacity={isLight ? 0.06 : 0.08}
                doneColor={isLight ? '#16a34a' : '#22c55e'}
                errorColor={isLight ? '#dc2626' : '#ef4444'}
                washOpacity={0.14}
                shake={5}
                showTimer
                timerTestId={isLive ? 'tool-live-duration' : 'tool-duration'}
                onRetry={isFailed ? retryHandler : undefined}
              />
              {isOpen ? (
                <ChevronDown className={`w-3 h-3 shrink-0 transition-opacity ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
              ) : (
                <ChevronRight className={`w-3 h-3 shrink-0 opacity-50 group-hover:opacity-80 transition-opacity ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
              )}
            </>
          ) : (
            <>
              {renderActionIcon(action.icon, isLight, isRunning)}

              {action.verb && action.subject ? (
                <span className="truncate font-sans text-[13px] leading-snug">
                  <span className="text-neutral-500">
                    {action.verb}
                  </span>{' '}
                  <span className={isLight ? 'text-neutral-800' : 'text-neutral-300'}>
                    {action.subject}
                  </span>
                </span>
              ) : (
                <span
                  className={`font-sans text-[13px] truncate ${
                    isLight ? 'text-neutral-700' : 'text-neutral-300'
                  }`}
                >
                  {action.label}
                </span>
              )}

              {isOpen ? (
                <ChevronDown className={`w-3 h-3 shrink-0 transition-opacity ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
              ) : (
                <ChevronRight className={`w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isFileAction && openFileTab && cleanTargetPath && (
            <button
              type="button"
              onClick={handleOpenInEditor}
              title={`Open ${cleanTargetPath} in editor`}
              className={`opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-sans cursor-pointer ${
                isLight
                  ? 'text-neutral-500 hover:text-sky-700 hover:bg-black/[0.04]'
                  : 'text-neutral-400 hover:text-sky-300 hover:bg-white/[0.06]'
              }`}
            >
              <ExternalLink className="w-2.5 h-2.5" />
              <span>Open</span>
            </button>
          )}

          {!(isRunning || isFailed) && durationText ? (
            <span
              data-testid="tool-duration"
              className={`text-[11px] font-mono tabular-nums opacity-0 group-hover:opacity-100 transition-opacity ${
                isLight ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              {durationText}
            </span>
          ) : null}
        </div>
      </div>

      {/* Expanded read content / command output inline */}
      {isOpen && (
        <div
          className={`mt-1.5 mb-2 ml-5 p-3 rounded-lg text-[11.5px] font-mono leading-relaxed overflow-x-auto max-h-80 select-text border ${
            isLight
              ? 'bg-[#f8f9fb] border-black/[0.08] text-[#1e293b]'
              : 'bg-[#18181b] border-white/[0.08] text-neutral-300'
          }`}
        >
          {isLoadingAsync ? (
            <div className="flex items-center gap-2 py-2 text-neutral-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>Loading {action.target || 'content'}…</span>
            </div>
          ) : (
            <>
              {/* Top quiet metadata & control bar inside expanded disclosure */}
              <div
                className={`text-[10.5px] font-sans pb-1.5 mb-2 border-b flex items-center justify-between gap-3 ${
                  isLight ? 'border-black/[0.06] text-neutral-500' : 'border-white/[0.06] text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {action.icon === 'terminal' || tool.isVerification ? (
                    <CallChip
                      icon={chipMeta.icon}
                      name={chipMeta.name}
                      argument={chipMeta.argument}
                      status={isFailed ? 'error' : isRunning ? 'running' : 'done'}
                      expectedMs={chipMeta.expectedMs}
                      startedAt={tool.startedAt}
                      durationMs={tool.durationMs}
                      size={24}
                      radius={6}
                      color={isLight ? '#18181b' : '#e4e4e7'}
                      surfaceColor={isLight ? '#ffffff' : '#222227'}
                      borderColor={isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}
                      progressColor={isLight ? '#09090b' : '#ffffff'}
                      progressOpacity={isLight ? 0.06 : 0.08}
                      doneColor={isLight ? '#16a34a' : '#22c55e'}
                      errorColor={isLight ? '#dc2626' : '#ef4444'}
                      washOpacity={0.12}
                      shake={4}
                      showTimer
                      onRetry={isFailed ? retryHandler : undefined}
                    />
                  ) : (
                    <span className="font-mono truncate">
                      {safeDetails.filePath || action.target || safeDetails.toolName}
                    </span>
                  )}
                  {asyncContent && !tool.outputLog && (
                    <span className="opacity-70 shrink-0">(Snapshot)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  {outcomeBadge && (
                    <span className="opacity-75">{outcomeBadge.label}</span>
                  )}
                  {action.icon === 'read' && (
                    <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
                  )}
                  {tool.exitCode !== undefined && tool.exitCode !== null && (
                    <span className={tool.exitCode === 0 ? (isLight ? 'text-emerald-700' : 'text-emerald-400/90') : (isLight ? 'text-rose-700' : 'text-rose-400')}>
                      exit {tool.exitCode}
                    </span>
                  )}
                  {isFileAction && openFileTab && cleanTargetPath && (
                    <button
                      type="button"
                      onClick={handleOpenInEditor}
                      title={`Open ${cleanTargetPath} in editor`}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        isLight ? 'hover:bg-black/[0.06] text-neutral-700' : 'hover:bg-white/[0.08] text-neutral-300'
                      }`}
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>Open file</span>
                    </button>
                  )}
                  {outputContent && lineCount > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWrapLines((w) => !w);
                      }}
                      title={wrapLines ? 'Disable line wrap' : 'Enable line wrap'}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        wrapLines
                          ? isLight ? 'bg-black/[0.06] text-neutral-800' : 'bg-white/[0.08] text-neutral-200'
                          : isLight ? 'hover:bg-black/[0.05] text-neutral-500' : 'hover:bg-white/[0.06] text-neutral-400'
                      }`}
                    >
                      <WrapText className="w-3 h-3" />
                    </button>
                  )}
                  {outputContent && (
                    <button
                      type="button"
                      onClick={handleCopyDetails}
                      title={copiedOutput ? 'Copied' : 'Copy output'}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isLight ? 'hover:bg-black/[0.05] text-neutral-500 hover:text-neutral-800' : 'hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {copiedOutput ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {action.icon === 'read' && action.target ? (
                lines.length > 1 ? (
                  <div className="space-y-0.5">
                    {lines.map((ln, lIdx) => (
                      <div key={lIdx} className="flex items-start gap-2.5">
                        <span
                          className={`w-7 shrink-0 text-right select-none tabular-nums text-[10.5px] opacity-45 ${
                            isLight ? 'text-neutral-500' : 'text-neutral-500'
                          }`}
                        >
                          {lIdx + 1}
                        </span>
                        <span className={`min-w-0 flex-1 ${wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
                          {ln || ' '}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}>{outputContent}</div>
                )
              ) : (
                <>
                  {isRunning && (
                    <div
                      data-testid="running-observation-panel"
                      className={`mb-2 px-2.5 py-1.5 rounded border flex items-center gap-2 ${
                        isLight
                          ? 'bg-neutral-100 border-neutral-200 text-neutral-700'
                          : 'bg-white/[0.03] border-white/[0.08] text-neutral-300'
                      }`}
                    >
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-neutral-400" />
                      <span className="text-[11px] font-mono">Executing process…</span>
                    </div>
                  )}

                  {tool.workingDirectory && (
                    <div className="mb-1.5 text-[10.5px] opacity-65">
                      cd {tool.workingDirectory}
                      {tool.exitCode !== undefined && tool.exitCode !== null ? ` · exit ${tool.exitCode}` : ''}
                    </div>
                  )}

                  {safeDetails.errorInfo || tool.error ? (
                    <div className={`${isLight ? 'text-rose-700' : 'text-rose-400'} ${wrapLines ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}>
                      <span className="font-semibold">Error: </span>
                      {safeDetails.errorInfo || redactSensitiveData(tool.error || '').text}
                      {tool.outputLog ? `\n\n${redactSensitiveData(tool.outputLog).text}` : ''}
                    </div>
                  ) : (
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
