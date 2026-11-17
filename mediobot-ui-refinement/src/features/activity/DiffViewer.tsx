import React, { useState, useEffect } from 'react';
import type { FileDiff, FileChangeState } from '../../types';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { USE_OFFLINE_FIXTURE } from '../../runtime/client';

export const DiffViewer: React.FC<{
  diff: FileDiff;
  onStateChange?: (newState: FileChangeState) => void;
}> = ({ diff, onStateChange }) => {
  const { theme, openFileTab } = useApp();
  const isLight = theme === 'light';
  const isSimulated = diff.isControlledDemonstration !== undefined
    ? Boolean(diff.isControlledDemonstration)
    : Boolean(USE_OFFLINE_FIXTURE);
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentState, setCurrentState] = useState<FileChangeState>(diff.state || 'proposed');

  useEffect(() => {
    setCurrentState(diff.state || 'proposed');
  }, [diff.state, diff.filePath, diff.receipt]);

  // Validate durable receipt when in connected mode (isSimulated === false)
  let effectiveState: FileChangeState = currentState;
  let receiptError: string | null = null;

  if (!isSimulated) {
    if (currentState === 'applied' || currentState === 'verified') {
      const receipt = diff.receipt;
      if (!receipt) {
        receiptError = `Receipt validation error: Missing durable receipt for ${currentState} state.`;
        effectiveState = 'proposed';
      } else if (receipt.filePath !== diff.filePath) {
        receiptError = `Receipt validation error: Receipt file path "${receipt.filePath}" does not match diff file path "${diff.filePath}".`;
        effectiveState = 'proposed';
      } else if (currentState === 'applied') {
        if (receipt.status !== 'applied') {
          receiptError = `Receipt validation error: Receipt status "${receipt.status}" does not match claimed state "applied".`;
          effectiveState = 'proposed';
        } else if (!receipt.effectEvidence || !receipt.effectEvidence.trim()) {
          receiptError = 'Receipt validation error: Missing required effectEvidence for applied state.';
          effectiveState = 'proposed';
        }
      } else if (currentState === 'verified') {
        if (receipt.status !== 'verified') {
          receiptError = `Receipt validation error: Receipt status "${receipt.status}" does not match claimed state "verified".`;
          effectiveState = 'proposed';
        } else if (!receipt.verificationEvidence || !receipt.verificationEvidence.trim()) {
          receiptError = 'Receipt validation error: Missing required verificationEvidence for verified state.';
          effectiveState = 'proposed';
        }
      }
    }
  }

  const hunkAdditions = diff.hunks?.reduce(
    (acc, h) => acc + h.lines.filter((l) => l.type === 'add').length,
    0
  ) ?? 0;
  const hunkDeletions = diff.hunks?.reduce(
    (acc, h) => acc + h.lines.filter((l) => l.type === 'remove').length,
    0
  ) ?? 0;
  const effectiveAdditions = diff.truncated ? diff.additions : (diff.hunks && diff.hunks.length > 0 ? hunkAdditions : diff.additions);
  const effectiveDeletions = diff.truncated ? diff.deletions : (diff.hunks && diff.hunks.length > 0 ? hunkDeletions : diff.deletions);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = diff.hunks
      ?.map((h) =>
        h.lines
          .map((l) => (l.type === 'add' ? `+ ${l.content}` : l.type === 'remove' ? `- ${l.content}` : `  ${l.content}`))
          .join('\n')
      )
      .join('\n');
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleSetState = (e: React.MouseEvent, next: FileChangeState) => {
    e.stopPropagation();
    if (!isSimulated) {
      // In connected mode, local state transitions are unsupported without authorized backend
      return;
    }
    setCurrentState(next);
    if (onStateChange) onStateChange(next);
  };

  const renderStateBadge = () => {
    switch (effectiveState) {
      case 'verified':
        return (
          <span
            data-testid="diff-state-verified"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
              isLight
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>
              {isSimulated
                ? 'Verified (Simulated)'
                : diff.receipt?.verifier
                ? `Verified by ${diff.receipt.verifier}`
                : 'Verified'}
            </span>
          </span>
        );
      case 'applied':
        return (
          <span
            data-testid="diff-state-applied"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
              isLight
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-blue-950/60 text-blue-300 border-blue-800/60'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>{isSimulated ? 'Applied (Simulated)' : 'Applied'}</span>
          </span>
        );
      case 'rejected':
        return (
          <span
            data-testid="diff-state-rejected"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
              isLight
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>{isSimulated ? 'Rejected (Simulated)' : 'Rejected'}</span>
          </span>
        );
      case 'proposed':
      default:
        return (
          <span
            data-testid="diff-state-proposed"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
              isLight
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>Proposed (Unverified)</span>
          </span>
        );
    }
  };

  return (
    <div
      data-testid="file-change-review-card"
      className={`my-2.5 border ${
        isLight ? 'border-[#e2e4e8] bg-white shadow-xs' : 'border-[#2b2b32] bg-[#18181c]'
      } rounded-xl overflow-hidden text-xs font-mono`}
    >
      {/* File Diff Header */}
      <div
        onClick={() => setIsExpanded((p) => !p)}
        className={`flex items-center justify-between px-3.5 py-2.5 ${
          isLight
            ? 'bg-[#f8f9fa] hover:bg-[#f1f2f5] border-b border-[#e2e4e8]'
            : 'bg-[#202025] hover:bg-[#24242a] border-b border-[#2b2b32]'
        } cursor-pointer select-none transition-colors`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
          {isExpanded ? (
            <ChevronDown className={`w-3.5 h-3.5 ${isLight ? 'text-[#64748b]' : 'text-neutral-400'} shrink-0`} />
          ) : (
            <ChevronRight className={`w-3.5 h-3.5 ${isLight ? 'text-[#64748b]' : 'text-neutral-400'} shrink-0`} />
          )}

          <button
            type="button"
            data-testid={`diff-file-link-${diff.filePath.replace(/[/\\:.]/g, '-')}`}
            onClick={(e) => {
              e.stopPropagation();
              if (typeof openFileTab === 'function') {
                openFileTab(diff.filePath);
              }
            }}
            className="flex items-center gap-1.5 hover:underline cursor-pointer group text-left truncate"
            title={`Click to open ${diff.filePath} in editor`}
          >
            <FileCode className={`w-3.5 h-3.5 ${isLight ? 'text-[#64748b]' : 'text-neutral-400'} group-hover:text-sky-500 shrink-0`} />
            <span className={`${isLight ? 'text-[#09090b]' : 'text-neutral-200'} font-medium truncate group-hover:text-sky-500`}>
              {diff.filePath}
            </span>
          </button>

          {renderStateBadge()}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Additions / Deletions */}
          <div className="flex items-center gap-1.5 tabular-nums text-[11px] font-semibold">
            <span className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>+{effectiveAdditions}</span>
            <span className={isLight ? 'text-rose-700' : 'text-rose-400'}>-{effectiveDeletions}</span>
          </div>

          {/* Interactive State Transition Controls */}
          <div className="flex items-center gap-1 pl-1 border-l border-black/10 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
            {effectiveState !== 'verified' && (
              <button
                type="button"
                onClick={(e) => handleSetState(e, 'verified')}
                disabled={!isSimulated}
                className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium transition-colors ${
                  !isSimulated
                    ? 'opacity-40 cursor-not-allowed text-neutral-400'
                    : isLight
                    ? 'hover:bg-emerald-100 text-emerald-800'
                    : 'hover:bg-emerald-950 text-emerald-300'
                }`}
                title={isSimulated ? "Simulate verification in controlled demonstration" : "Connected-mode operations require authorized backend execution"}
              >
                {isSimulated ? 'Verify (Simulated)' : 'Verify'}
              </button>
            )}
            {effectiveState !== 'applied' && (
              <button
                type="button"
                onClick={(e) => handleSetState(e, 'applied')}
                disabled={!isSimulated}
                className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium transition-colors ${
                  !isSimulated
                    ? 'opacity-40 cursor-not-allowed text-neutral-400'
                    : isLight
                    ? 'hover:bg-blue-100 text-blue-800'
                    : 'hover:bg-blue-950 text-blue-300'
                }`}
                title={isSimulated ? "Simulate applying change in controlled demonstration" : "Connected-mode operations require authorized backend execution"}
              >
                {isSimulated ? 'Apply (Simulated)' : 'Apply'}
              </button>
            )}
            {effectiveState !== 'rejected' && (
              <button
                type="button"
                onClick={(e) => handleSetState(e, 'rejected')}
                disabled={!isSimulated}
                className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium transition-colors ${
                  !isSimulated
                    ? 'opacity-40 cursor-not-allowed text-neutral-400'
                    : isLight
                    ? 'hover:bg-rose-100 text-rose-800'
                    : 'hover:bg-rose-950 text-rose-300'
                }`}
                title={isSimulated ? "Simulate rejecting proposed change (does not modify files)" : "Connected-mode operations require authorized backend execution"}
              >
                {isSimulated ? 'Reject (Simulated)' : 'Reject'}
              </button>
            )}
          </div>

          <button
            onClick={handleCopy}
            title="Copy diff"
            className={`p-1 rounded ${
              isLight ? 'text-[#64748b] hover:text-[#09090b] hover:bg-[#eaebee]' : 'text-neutral-400 hover:text-white hover:bg-[#2e2e36]'
            } transition-colors cursor-pointer`}
          >
            {copied ? <Check className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Simulation Disclosure */}
      {isSimulated && (
        <div
          data-testid="diff-simulation-disclosure"
          className={`px-3 py-1 text-[10.5px] font-sans border-b flex items-center justify-between ${
            isLight ? 'bg-amber-50/70 border-amber-200/80 text-amber-900' : 'bg-amber-950/20 border-amber-900/40 text-amber-300'
          }`}
        >
          <span>Simulated demonstration change. Does not modify host filesystem.</span>
          <span className="text-[10px] font-mono opacity-75">Demonstration only</span>
        </div>
      )}

      {/* Receipt Validation Error */}
      {receiptError && (
        <div
          data-testid="diff-receipt-error"
          className={`px-3 py-1.5 text-[11px] font-sans border-b flex items-center gap-1.5 ${
            isLight
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="font-medium">{receiptError}</span>
        </div>
      )}

      {/* Verification or Effect Evidence Sub-bar */}
      {(diff.verificationEvidence || diff.receipt?.verificationEvidence || diff.receipt?.effectEvidence) && (
        <div
          data-testid="diff-verification-evidence"
          className={`px-3 py-1.5 text-[11px] font-sans border-b flex items-center justify-between ${
            effectiveState === 'verified'
              ? isLight
                ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
              : effectiveState === 'applied'
              ? isLight
                ? 'bg-blue-50/70 border-blue-200/80 text-blue-900'
                : 'bg-blue-950/20 border-blue-900/40 text-blue-200'
              : isLight
              ? 'bg-[#f8f9fa] border-[#e2e4e8] text-[#475569]'
              : 'bg-[#18181d] border-[#2b2b32] text-neutral-400'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {effectiveState === 'applied' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate">
              {effectiveState === 'applied' && diff.receipt?.effectEvidence
                ? `Effect: ${diff.receipt.effectEvidence}`
                : `Evidence: ${diff.receipt?.verificationEvidence || diff.verificationEvidence}`}
            </span>
          </div>
          <span className="text-[10px] font-mono shrink-0 opacity-75">
            {isSimulated
              ? 'Controlled demonstration'
              : diff.receipt?.authorizedBy
              ? `Authorized by ${diff.receipt.authorizedBy}`
              : 'Authorized'}
          </span>
        </div>
      )}

      {/* Code Hunks */}
      {isExpanded && diff.hunks && (
        <div className="overflow-x-auto text-[11px] leading-5 py-1">
          {diff.truncated && (
            <div className={`px-3 py-1 ${isLight ? 'text-[#64748b]' : 'text-neutral-500'} font-sans`}>
              Large diff excerpt; addition and deletion totals are exact.
            </div>
          )}
          {diff.hunks.map((hunk, hIdx) => (
            <div key={hIdx}>
              <div
                className={`px-3 py-0.5 ${
                  isLight ? 'bg-[#f1f2f5] text-[#64748b]' : 'bg-[#1f1f26] text-neutral-500'
                } font-semibold select-none text-[10px]`}
              >
                {hunk.header}
              </div>
              {hunk.lines.map((line, lIdx) => {
                const isAdd = line.type === 'add';
                const isRemove = line.type === 'remove';
                return (
                  <div
                    key={lIdx}
                    className={`flex items-start px-2 font-mono ${
                      isAdd
                        ? isLight
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-emerald-950/25 text-emerald-300'
                        : isRemove
                        ? isLight
                          ? 'bg-rose-50 text-rose-800 line-through opacity-90'
                          : 'bg-rose-950/25 text-rose-300 line-through opacity-85'
                        : isLight
                        ? 'text-[#334155] hover:bg-[#f8f9fa]'
                        : 'text-neutral-400 hover:bg-[#1d1d23]'
                    }`}
                  >
                    {/* Line numbers */}
                    <span className={`w-7 shrink-0 text-right pr-2 select-none ${isLight ? 'text-[#94a3b8]' : 'text-neutral-600'} tabular-nums`}>
                      {line.oldLineNo ?? ''}
                    </span>
                    <span className={`w-7 shrink-0 text-right pr-2 select-none ${isLight ? 'text-[#94a3b8]' : 'text-neutral-600'} tabular-nums`}>
                      {line.newLineNo ?? ''}
                    </span>
                    {/* Prefix */}
                    <span className="w-4 shrink-0 text-center select-none font-bold">
                      {isAdd ? '+' : isRemove ? '-' : ' '}
                    </span>
                    {/* Code Content */}
                    <span className="whitespace-pre overflow-x-auto">{line.content}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};