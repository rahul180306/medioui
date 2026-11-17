import React, { useState } from 'react';
import { Terminal, Copy, Check, Eye, AlertTriangle } from 'lucide-react';

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
        // Thinking / Reasoning: Strictly suppressed per architecture review.
        // Hidden chain-of-thought and raw model deliberation are never exposed in user-facing UI.
        if (block.kind === 'thinking') {
          return null;
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

        // Observation Block: Runtime Results
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
