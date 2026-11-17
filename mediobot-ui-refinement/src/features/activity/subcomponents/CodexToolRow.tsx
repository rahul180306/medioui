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
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useApp } from '../../../state/AppContext';
import { runtimeInstance } from '../../../runtime/client';
import { toolOutputFallback } from '../toolExecutionFallback';
import { getOutcomeBadge } from '../toolExecutionPresentation';
import { extractAllowlistToolDetails, redactSensitiveData } from '../allowlistRedaction';
import { useToolDuration } from './useToolTimer';
import type { ModelExecutionTelemetry } from './modelAttribution';
import { CanonicalTrajectoryView, parseCanonicalTrajectory } from './trajectoryParser';

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
    const safeCmd = redactSensitiveData(displayCmd).text;
    return {
      id,
      icon: 'terminal',
      label: tool.status === 'running' ? `Running ${safeCmd}` : `Ran ${safeCmd}`,
      target: safeCmd,
      tool,
      specialistName,
      modelId,
    };
  }

  // 5. File Edit / Write
  if (name.includes('write') || name.includes('edit')) {
    const rawPath = cmd.replace(/^filesystem\.(write|edit)\s*/, '').trim();
    const safePath = redactSensitiveData(rawPath).text;
    const fileName = safePath.split(/[\\/]/).pop() || safePath || 'file';
    return {
      id,
      icon: 'edit',
      label: tool.status === 'running' ? `Writing ${fileName}` : `Edited ${fileName}`,
      target: safePath,
      tool,
      specialistName,
      modelId,
    };
  }

  // 6. Browser / Web
  if (name.includes('browser') || name.includes('vision') || name.includes('web')) {
    const safeTarget = redactSensitiveData(cmd).text;
    return {
      id,
      icon: 'web',
      label: tool.status === 'running' ? `Browsing web` : `Browsed web`,
      target: safeTarget,
      tool,
      specialistName,
      modelId,
    };
  }

  // 7. Generic fallback
  const safeFallback = redactSensitiveData(cmd).text;
  return {
    id,
    icon: 'generic',
    label: safeFallback || name || 'Tool action',
    target: safeFallback,
    tool,
    specialistName,
    modelId,
  };
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
 * M2 / M3 Enhancement: Live duration timer, telemetry pill, canonical trajectory parser,
 * allowlist redaction integration, and accessible keyboard disclosure.
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

  let activeProjectId: string | undefined;
  try {
    const app = useApp();
    activeProjectId = app.activeProjectId;
  } catch {
    activeProjectId = undefined;
  }

  const tool = action.tool;
  const isRunning = tool.status === 'running';
  const isFailed = tool.status === 'failed';
  const isSuccess = tool.status === 'success';
  const outcomeBadge = getOutcomeBadge(tool);
  const emptyOutputMessage = toolOutputFallback(tool.toolName, tool.status);

  // M1 Allowlist extraction for defensive and sanitized display
  const safeDetails = extractAllowlistToolDetails(tool, action.specialistName, action.specialistName);

  // M3: Live duration timer with freeze guarantee
  const { durationText, isLive } = useToolDuration(tool, isRunning);

  // Content to display when clicked open (strictly sanitized)
  const rawOutput = tool.outputLog || asyncContent || tool.error || emptyOutputMessage;
  const outputContent = rawOutput ? redactSensitiveData(rawOutput).text : '';
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
        className={`group flex items-center justify-between gap-2 py-1 px-1 rounded-md text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 focus-visible:ring-offset-1 ${
          isLight
            ? 'hover:bg-black/[0.03] focus-visible:ring-offset-white text-[#334155]'
            : 'hover:bg-white/[0.04] focus-visible:ring-offset-neutral-900 text-neutral-300'
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
                      <span className="font-mono font-medium truncate">{safeDetails.filePath || action.target}</span>
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

                  {/* Terminal command preview with sanitized allowlist description */}
                  {action.icon === 'terminal' && (tool.command || tool.workingDirectory) && (
                    <div className="mb-2 text-[10.5px] opacity-70 border-b border-current/10 pb-1.5">
                      {`$ ${safeDetails.commandDescription || safeDetails.toolName}\n`}
                      {tool.workingDirectory ? `cd ${tool.workingDirectory}\n` : ''}
                      {tool.exitCode !== undefined && tool.exitCode !== null ? `Exit code: ${tool.exitCode}` : ''}
                    </div>
                  )}

                  {/* Error display */}
                  {safeDetails.errorInfo || tool.error ? (
                    <div className={isLight ? 'text-rose-700' : 'text-rose-400'}>
                      <span className="font-semibold">Error: </span>
                      {safeDetails.errorInfo || redactSensitiveData(tool.error || '').text}
                      {tool.outputLog ? `\n\n${redactSensitiveData(tool.outputLog).text}` : ''}
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
