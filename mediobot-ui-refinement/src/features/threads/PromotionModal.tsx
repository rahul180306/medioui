import React, { useState, useMemo } from 'react';
import { X, ArrowUpRight, AlertCircle, FileCode, Check } from 'lucide-react';
import { useApp } from '../../state/AppContext';
export const MAX_PROMOTION_TOKENS = 12000;
export function estimateTokenCount(text: string): number {
  return Math.ceil((text || '').length / 4);
}
import { getMediobotPresentation } from '../mediobots/presentation';

export interface PromotionModalProps {
  isOpen: boolean;
  sourceThreadId: string;
  sourceAgentId: string;
  initialSummary?: string;
  artifactRefs?: string[];
  evidenceRefs?: string[];
  onClose: () => void;
  onSuccess?: (promotion: any) => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  sourceThreadId,
  sourceAgentId,
  initialSummary = '',
  artifactRefs = [],
  evidenceRefs = [],
  onClose,
  onSuccess,
}) => {
  const { theme } = useApp();
  const isLight = theme === 'light';

  const [summary, setSummary] = useState(initialSummary);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presentation = getMediobotPresentation(sourceAgentId);

  const tokenCount = useMemo(() => estimateTokenCount(summary), [summary]);
  const exceedsBudget = tokenCount > MAX_PROMOTION_TOKENS;
  const hasCodeFences = /```/.test(summary);
  const hasAnsiEscapes = /\u001b\[/.test(summary);

  const isValid =
    summary.trim().length > 0 && !exceedsBudget && !hasCodeFences && !hasAnsiEscapes;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = `promo-${sourceThreadId}-${Date.now()}`;
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceThreadId,
          sourceAgentId,
          idempotencyKey,
          payload: {
            summary: summary.trim(),
            artifactRefs,
            evidenceRefs,
            tokenCount,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to promote deliverable.');
      }

      onSuccess?.(data.promotion);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit deliverable promotion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl transition-all ${
          isLight
            ? 'bg-white border-[#e2e4e8] text-[#09090b]'
            : 'bg-[#18181c] border-[#2b2b34] text-white'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-inherit/20">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${presentation.avatar}`}
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold tracking-tight">
              Promote Deliverable to Team Chat
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isLight
                ? 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
                : 'hover:bg-white/10 text-neutral-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-neutral-400">
                Executive Brief (Clean Unboxed Narrative)
              </label>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                  exceedsBudget
                    ? 'bg-rose-500/20 text-rose-400 font-semibold'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {tokenCount} / {MAX_PROMOTION_TOKENS} tokens
              </span>
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summarize the core outcome, changes made, and verification status for Maestro and the team..."
              rows={5}
              className={`w-full text-xs rounded-xl p-3 border outline-none font-sans leading-relaxed transition-all resize-none ${
                isLight
                  ? 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:bg-white'
                  : 'bg-[#121215] border-[#2b2b34] text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-400 focus:bg-[#151519]'
              } ${exceedsBudget ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500' : ''}`}
            />
            {hasCodeFences && (
              <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Remove markdown code fences (```). Deliverable summaries must be clean prose.
              </p>
            )}
            {hasAnsiEscapes && (
              <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Remove terminal ANSI escape codes from the summary.
              </p>
            )}
            {exceedsBudget && (
              <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Summary exceeds {MAX_PROMOTION_TOKENS} tokens. Please edit to be more concise.
              </p>
            )}
          </div>

          {/* Artifact References */}
          {artifactRefs.length > 0 && (
            <div>
              <div className="text-xs font-medium text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5" />
                <span>Changed Artifacts ({artifactRefs.length})</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] font-mono">
                {artifactRefs.map((ref, idx) => (
                  <div
                    key={idx}
                    className={`px-2 py-1 rounded truncate border ${
                      isLight
                        ? 'bg-neutral-100 border-neutral-200 text-neutral-700'
                        : 'bg-[#131317] border-white/5 text-neutral-300'
                    }`}
                  >
                    {ref}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isLight
                  ? 'hover:bg-neutral-100 text-neutral-700'
                  : 'hover:bg-white/10 text-neutral-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white shadow-xs transition-all cursor-pointer ${
                isValid && !submitting
                  ? 'bg-blue-600 hover:bg-blue-500 active:scale-98'
                  : 'bg-neutral-600 opacity-50 cursor-not-allowed'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{submitting ? 'Promoting...' : 'Promote Deliverable'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
