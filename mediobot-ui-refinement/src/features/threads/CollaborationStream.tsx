import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import type { ThreadItem } from '../../types';
import { PeerMessageView } from './PeerMessageView';

/** Groups live and persisted peer messages so coordination reads as one stream. */
export const CollaborationStream: React.FC<{
  items: ReadonlyArray<ThreadItem>;
  isLight: boolean;
  /** True while the owning turn is still producing messages. */
  live?: boolean;
}> = ({ items, isLight, live = false }) => {
  const messages = useMemo(
    () => items.flatMap((item) => (item.type === 'peer_message' && item.peerMessage ? [item.peerMessage] : [])),
    [items],
  );
  const [open, setOpen] = useState(live);

  if (messages.length === 0) return null;

  const counts = messages.reduce<Record<string, number>>((totals, message) => {
    totals[message.messageKind] = (totals[message.messageKind] ?? 0) + 1;
    return totals;
  }, {});
  const breakdown = [
    counts.request ? `${counts.request} request${counts.request === 1 ? '' : 's'}` : null,
    counts.response ? `${counts.response} response${counts.response === 1 ? '' : 's'}` : null,
    counts.finding ? `${counts.finding} finding${counts.finding === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      data-testid="collaboration-stream"
      className={`rounded-xl border ${
        isLight ? 'border-[#e2e4e8] bg-white' : 'border-[#2a2a33] bg-[#16161b]'
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11.5px] transition-colors ${
          isLight ? 'text-[#475569] hover:bg-[#f4f4f7]' : 'text-neutral-400 hover:bg-white/5'
        }`}
      >
        <Users className={`h-3.5 w-3.5 shrink-0 ${live ? 'text-emerald-500' : ''}`} />
        <span className={`font-semibold ${isLight ? 'text-[#18181b]' : 'text-neutral-200'}`}>Team collaboration</span>
        <span className={`${isLight ? 'text-[#94a3b8]' : 'text-neutral-500'} tabular-nums`}>{messages.length}</span>
        {breakdown && <span className={`truncate text-[10.5px] ${isLight ? 'text-[#94a3b8]' : 'text-neutral-500'}`}>{breakdown}</span>}
        <span className="ml-auto shrink-0">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>

      {open && (
        <div className={`space-y-1.5 border-t px-2.5 py-2 ${isLight ? 'border-[#eef0f3]' : 'border-[#26262d]'}`}>
          {messages.map((message, index) => (
            <PeerMessageView
              key={message.messageId}
              message={message}
              isLight={isLight}
              defaultOpen={live && index === messages.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
