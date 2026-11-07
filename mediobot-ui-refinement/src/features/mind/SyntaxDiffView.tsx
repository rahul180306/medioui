import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import hljs from 'highlight.js';
import { UnboxedFileMention } from './UnboxedFileMention';
import type { DiagnosticRibbonItem } from './streamEventReducer';

export interface DiffHunkLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNo?: number;
  newLineNo?: number;
}

export interface SyntaxDiffViewProps {
  filePath: string;
  oldContent: string;
  newContent: string;
  diagnostics?: ReadonlyArray<DiagnosticRibbonItem>;
  isLight?: boolean;
}

/**
 * Computes unified diff hunks from old and new text contents deterministically
 */
function computeDiffHunks(oldText: string, newText: string): DiffHunkLine[] {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];
  const lines: DiffHunkLine[] = [];

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oLine = oldLines[oldIdx];
    const nLine = newLines[newIdx];

    if (oLine === nLine) {
      if (oLine !== undefined) {
        lines.push({ type: 'context', content: oLine, oldLineNo: oldIdx + 1, newLineNo: newIdx + 1 });
      }
      oldIdx++;
      newIdx++;
    } else {
      if (oLine !== undefined && (nLine === undefined || !newLines.slice(newIdx, newIdx + 3).includes(oLine))) {
        lines.push({ type: 'remove', content: oLine, oldLineNo: oldIdx + 1 });
        oldIdx++;
      }
      if (nLine !== undefined && (oLine === undefined || !oldLines.slice(oldIdx, oldIdx + 3).includes(nLine))) {
        lines.push({ type: 'add', content: nLine, newLineNo: newIdx + 1 });
        newIdx++;
      }
    }
  }

  return lines;
}

/**
 * Resolves syntax highlighting language from file extension
 */
function getLanguageFromPath(filePath: string): string | undefined {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'rs':
      return 'rust';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'xml';
    case 'md':
      return 'markdown';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'sql':
      return 'sql';
    case 'sh':
    case 'bash':
      return 'bash';
    default:
      return undefined;
  }
}

function highlightLine(code: string, lang?: string): string {
  if (!code) return '';
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export const SyntaxDiffView: React.FC<SyntaxDiffViewProps> = ({
  filePath,
  oldContent,
  newContent,
  diagnostics = [],
  isLight = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const lang = useMemo(() => getLanguageFromPath(filePath), [filePath]);
  const lines = useMemo(() => computeDiffHunks(oldContent, newContent), [oldContent, newContent]);
  const additions = lines.filter((l) => l.type === 'add').length;
  const deletions = lines.filter((l) => l.type === 'remove').length;

  // Map diagnostics by line number for inline ribbon attachment
  const diagsByLine = useMemo(() => {
    const map = new Map<number, DiagnosticRibbonItem[]>();
    for (const d of diagnostics) {
      const existing = map.get(d.lineNo) ?? [];
      existing.push(d);
      map.set(d.lineNo, existing);
    }
    return map;
  }, [diagnostics]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const patch = lines
      .map((l) => (l.type === 'add' ? `+ ${l.content}` : l.type === 'remove' ? `- ${l.content}` : `  ${l.content}`))
      .join('\n');
    void navigator.clipboard.writeText(patch);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      data-testid="syntax-diff-view"
      className="my-3 font-mono text-xs select-text"
    >
      {/* File Header Row - Unboxed with metrics */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer select-none transition-colors ${
          isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800/40'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="opacity-50">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
          <UnboxedFileMention filePath={filePath} isLight={isLight} />
        </div>

        <div className="flex items-center gap-2 shrink-0 tabular-nums text-[11px]">
          <span className="text-emerald-500 font-semibold">+{additions}</span>
          <span className="text-rose-500 font-semibold">-{deletions}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 opacity-60 hover:opacity-100 transition-opacity"
            title="Copy diff patch"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Code Lines with Inline Diagnostics Ribbons */}
      {isOpen && (
        <div className={`mt-1 border-y ${isLight ? 'border-neutral-200' : 'border-neutral-800'} py-1 leading-5 overflow-x-auto`}>
          {lines.map((line, idx) => {
            const isAdd = line.type === 'add';
            const isRemove = line.type === 'remove';
            const lineDiags = (line.newLineNo ? diagsByLine.get(line.newLineNo) : undefined) ?? [];
            const highlightedHtml = highlightLine(line.content, lang);

            return (
              <React.Fragment key={idx}>
                <div
                  className={`flex items-start px-2 ${
                    isAdd
                      ? isLight
                        ? 'bg-emerald-50/70 text-emerald-950 border-l-2 border-emerald-500'
                        : 'bg-emerald-950/30 text-emerald-200 border-l-2 border-emerald-500'
                      : isRemove
                      ? isLight
                        ? 'bg-rose-50/70 text-rose-950 line-through opacity-80 border-l-2 border-rose-500'
                        : 'bg-rose-950/30 text-rose-200 line-through opacity-80 border-l-2 border-rose-500'
                      : isLight
                      ? 'text-neutral-700 hover:bg-neutral-50'
                      : 'text-neutral-400 hover:bg-neutral-900/40'
                  }`}
                >
                  <span className={`w-8 shrink-0 text-right pr-2 select-none tabular-nums ${isLight ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {line.oldLineNo ?? ''}
                  </span>
                  <span className={`w-8 shrink-0 text-right pr-2 select-none tabular-nums ${isLight ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {line.newLineNo ?? ''}
                  </span>
                  <span className="w-4 shrink-0 text-center select-none font-bold">
                    {isAdd ? '+' : isRemove ? '-' : ' '}
                  </span>
                  <span
                    className="whitespace-pre overflow-x-auto flex-1 font-mono text-[11.5px]"
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                  />
                </div>

                {/* Inline Diagnostics Ribbon Anchored to this Line */}
                {lineDiags.map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center gap-2 pl-20 pr-3 py-1 border-l-2 text-[10.5px] font-mono ${
                      d.severity === 'error'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : d.severity === 'warning'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                    }`}
                  >
                    {d.severity === 'error' && <AlertCircle className="w-3 h-3 shrink-0" />}
                    {d.severity === 'warning' && <AlertTriangle className="w-3 h-3 shrink-0" />}
                    {d.severity === 'info' && <Info className="w-3 h-3 shrink-0" />}
                    {d.code && <span className="font-semibold">{d.code}</span>}
                    <span>{d.message}</span>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
