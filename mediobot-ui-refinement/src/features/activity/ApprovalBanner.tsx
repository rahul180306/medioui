import React from 'react';
import { ApprovalRequestData } from '../../types';
import { ShieldAlert, Check, X, ShieldCheck } from 'lucide-react';
import { useApp } from '../../state/AppContext';

export const ApprovalBanner: React.FC<{
  approval: ApprovalRequestData;
  turnId: string;
}> = ({ approval, turnId }) => {
  const { respondApproval, theme } = useApp();
  const isLight = theme === 'light';

  const isPending = approval.status === 'pending';
  const isApproved = approval.status === 'approved';

  const riskLabel = `${approval.risk.charAt(0).toUpperCase()}${approval.risk.slice(1).toLowerCase()} risk`;

  return (
    <div
      className={`my-2.5 p-3.5 rounded-xl border text-xs ${
        isLight
          ? 'border-black/[0.08] bg-[#fafafc] text-neutral-800'
          : 'border-white/[0.09] bg-[#161619] text-neutral-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={`p-1 rounded-md shrink-0 mt-0.5 ${
              isApproved
                ? 'text-emerald-500'
                : isLight
                ? 'text-amber-600'
                : 'text-amber-400/90'
            }`}
          >
            {isApproved ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold ${isLight ? 'text-neutral-900' : 'text-neutral-100'}`}>
                {approval.title}
              </span>
              <span className={`text-[11px] font-sans ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                · {riskLabel}
              </span>
            </div>
            <p className={`leading-relaxed ${isLight ? 'text-neutral-600' : 'text-neutral-300'}`}>
              {approval.description}
            </p>

            {approval.actionPayload && (
              <div
                className={`mt-1.5 px-2.5 py-1.5 rounded-md border font-mono text-[11px] truncate ${
                  isLight
                    ? 'bg-white border-black/[0.07] text-neutral-700'
                    : 'bg-white/[0.025] border-white/[0.07] text-neutral-300'
                }`}
              >
                {approval.actionPayload.detail}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="shrink-0 flex items-center gap-1.5 self-start mt-0.5">
          {isPending ? (
            <>
              <button
                type="button"
                onClick={() => respondApproval(turnId, approval.approvalId, false)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                  isLight
                    ? 'text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.04] border-black/[0.1]'
                    : 'text-neutral-300 hover:text-white hover:bg-white/[0.06] border-white/[0.1]'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>

              <button
                type="button"
                onClick={() => respondApproval(turnId, approval.approvalId, true)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                  isLight
                    ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                    : 'bg-neutral-100 text-neutral-900 hover:bg-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>
            </>
          ) : isApproved ? (
            <span className={`text-xs font-medium flex items-center gap-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
              <Check className="w-3.5 h-3.5" />
              <span>Approved</span>
            </span>
          ) : (
            <span className={`text-xs font-medium flex items-center gap-1 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
              <X className="w-3.5 h-3.5" />
              <span>Rejected</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

