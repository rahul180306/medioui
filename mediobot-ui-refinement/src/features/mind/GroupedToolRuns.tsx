import React, { useState } from 'react';
import {
  FileText,
  Search,
  Folder,
  Terminal,
  FileCode,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { ToolRunItem } from './streamEventReducer';

export interface GroupedToolRunsProps {
  toolRuns: ReadonlyArray<ToolRunItem>;
  isLight?: boolean;
}

function resolveToolIcon(tool: string, isLight: boolean, isRunning: boolean) {
  if (isRunning) {
    return <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />;
  }
  const color = isLight ? 'text-neutral-500' : 'text-neutral-400';
  if (tool.includes('read')) return <FileText className={`w-3.5 h-3.5 ${color} shrink-0`} />;
  if (tool.includes('search') || tool.includes('grep')) return <Search className={`w-3.5 h-3.5 ${color} shrink-0`} />;
  if (tool.includes('list')) return <Folder className={`w-3.5 h-3.5 ${color} shrink-0`} />;
  if (tool.includes('pty') || tool.includes('terminal')) return <Terminal className={`w-3.5 h-3.5 ${color} shrink-0`} />;
  if (tool.includes('write') || tool.includes('edit') || tool.includes('patch')) return <FileCode className={`w-3.5 h-3.5 ${color} shrink-0`} />;
  if (tool.includes('web') || tool.includes('crawl')) return <Globe className={`w-3.5 h-3.5 ${color} shrink-0`} />;
  return <FileText className={`w-3.5 h-3.5 ${color} shrink-0`} />;
}

export const InlineToolRow: React.FC<{ run: ToolRunItem; isLight: boolean }> = ({ run, isLight }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isRunning = run.status === 'running';
  const isError = run.status === 'error';
  const hasDetail = Boolean(run.output || run.summary);

  const argSummary = typeof run.args?.path === 'string'
    ? run.args.path
    : typeof run.args?.command === 'string'
    ? run.args.command
    : typeof run.args?.file === 'string'
    ? run.args.file
    : JSON.stringify(run.args ?? {});

  return (
    <div className="select-text text-xs font-mono">
      <div
        onClick={() => hasDetail && setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 py-1 px-1 rounded cursor-pointer transition-colors ${
          isLight ? 'hover:bg-black/[0.03] text-neutral-700' : 'hover:bg-white/[0.04] text-neutral-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {resolveToolIcon(run.tool, isLight, isRunning)}
          <span className="font-semibold text-[11px] truncate">{run.tool}</span>
          <span className="opacity-60 truncate max-w-sm text-[11px]">{argSummary}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[10.5px] tabular-nums">
          {run.durationMs !== undefined && (
            <span className="opacity-50">{run.durationMs}ms</span>
          )}
          {isRunning && <span className="text-amber-500 font-medium">running</span>}
          {run.status === 'ok' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
          {isError && <AlertCircle className="w-3 h-3 text-rose-500" />}
          {hasDetail && (
            <span className="opacity-40">
              {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className={`mt-1 mb-2 ml-5 p-2 rounded text-[11px] font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-60 ${
            isLight ? 'bg-neutral-100 text-neutral-800' : 'bg-neutral-900/80 text-neutral-300'
          }`}
        >
          {run.output || run.summary}
        </div>
      )}
    </div>
  );
};

export const GroupedToolRuns: React.FC<GroupedToolRunsProps> = ({ toolRuns, isLight = false }) => {
  if (!toolRuns || toolRuns.length === 0) return null;

  return (
    <div data-testid="grouped-tool-runs" className="my-2 space-y-0.5">
      {toolRuns.map((run) => (
        <InlineToolRow key={run.callId} run={run} isLight={isLight} />
      ))}
    </div>
  );
};
