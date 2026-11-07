import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Check,
  Lightbulb,
  MessageSquare,
  MessageSquareReply,
  Users,
  XCircle,
} from 'lucide-react';
import type { PeerMessageData } from '../../types';
import { getMediobotPresentation } from '../mediobots/presentation';
import { MediobotAvatar } from './MediobotAvatar';

const KIND_META: Readonly<Record<PeerMessageData['messageKind'], {
  label: string;
  Icon: typeof MessageSquare;
  light: string;
  dark: string;
}>> = {
  request: {
    label: 'Request',
    Icon: MessageSquare,
    light: 'bg-amber-50 text-amber-900 border-amber-200',
    dark: 'bg-amber-950/30 text-amber-200 border-amber-900/60',
  },
  response: {
    label: 'Response',
    Icon: MessageSquareReply,
    light: 'bg-sky-50 text-sky-900 border-sky-200',
    dark: 'bg-sky-950/30 text-sky-200 border-sky-900/60',
  },
  finding: {
    label: 'Finding',
    Icon: Lightbulb,
    light: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    dark: 'bg-emerald-950/30 text-emerald-200 border-emerald-900/60',
  },
};

const STATUS_META: Readonly<Record<PeerMessageData['status'], {
  label: string;
  Icon: typeof Check;
  className: string;
}>> = {
  sent: { label: 'Sent', Icon: Clock, className: 'text-neutral-400' },
  delivered: { label: 'Delivered', Icon: Check, className: 'text-emerald-500' },
  failed: { label: 'Failed', Icon: AlertTriangle, className: 'text-rose-500' },
  cancelled: { label: 'Cancelled', Icon: XCircle, className: 'text-neutral-400' },
  timed_out: { label: 'Timed out', Icon: AlertTriangle, className: 'text-amber-500' },
};

function actorFor(id: string, name: string) {
  const presentation = getMediobotPresentation(id, name);
  return {
    type: 'mediobot' as const,
    mediobotId: id || presentation.id,
    presentationId: presentation.id,
    name: name || presentation.displayName,
  };
}

const KIND_ICON_BADGE: React.FC<{ kind: PeerMessageData['messageKind']; isLight: boolean }> = ({ kind, isLight }) => {
  const meta = KIND_META[kind];
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide ${isLight ? meta.light : meta.dark}`}>
      <meta.Icon className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  );
};

/** Renders one persisted or live specialist-to-specialist collaboration message. */
export const PeerMessageView: React.FC<{
  message: PeerMessageData;
  isLight: boolean;
  /** Opens the body without requiring an extra click, used for the latest live message. */
  defaultOpen?: boolean;
}> = ({ message, isLight, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const status = STATUS_META[message.status];
  const text = message.text?.trim();
  const hasBody = Boolean(text);
  const canCollapse = hasBody && !defaultOpen;

  const sender = actorFor(message.senderId, message.senderName);
  const recipient = actorFor(message.recipientId, message.recipientName);

  return (
    <div
      data-testid={`peer-message-${message.messageId}`}
      data-peer-kind={message.messageKind}
      data-peer-status={message.status}
      className={`rounded-lg border px-3 py-2 ${
        isLight
          ? 'border-[#e2e4e8] bg-[#fafafb]'
          : 'border-[#2a2a33] bg-[#191920]'
      }`}
    >
      <div
        role={canCollapse ? 'button' : undefined}
        tabIndex={canCollapse ? 0 : undefined}
        onClick={() => canCollapse && setOpen((previous) => !previous)}
        onKeyDown={(event) => {
          if (!canCollapse) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((previous) => !previous);
          }
        }}
        className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11.5px] ${canCollapse ? 'cursor-pointer' : ''}`}
      >
        <span className="inline-flex items-center gap-1.5">
          <MediobotAvatar actor={sender} size="xs" />
          <span className={`font-semibold ${isLight ? 'text-[#18181b]' : 'text-neutral-200'}`}>{message.senderName}</span>
        </span>
        <span className={`text-[10.5px] ${isLight ? 'text-[#94a3b8]' : 'text-neutral-500'}`}>to</span>
        <span className="inline-flex items-center gap-1.5">
          <MediobotAvatar actor={recipient} size="xs" />
          <span className={`font-medium ${isLight ? 'text-[#334155]' : 'text-neutral-300'}`}>{message.recipientName}</span>
        </span>
        <KIND_ICON_BADGE kind={message.messageKind} isLight={isLight} />
        {message.scope === 'group' && (
          <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide ${
            isLight ? 'border-[#e2e4e8] text-[#64748b]' : 'border-white/10 text-neutral-400'
          }`}>
            <Users className="h-2.5 w-2.5" />
            Group
          </span>
        )}
        <span className={`ml-auto inline-flex items-center gap-1 text-[10px] ${status.className}`}>
          <status.Icon className="h-3 w-3" />
          {status.label}
        </span>
        {canCollapse && (
          <span className={isLight ? 'text-[#94a3b8]' : 'text-neutral-500'}>
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        )}
      </div>

      {hasBody && (open || defaultOpen) && (
        <p className={`mt-1.5 whitespace-pre-line break-words text-[12px] leading-relaxed select-text ${isLight ? 'text-[#334155]' : 'text-neutral-300'}`}>
          {text}
        </p>
      )}
      {hasBody && !open && !defaultOpen && (
        <p className={`mt-1.5 truncate text-[11.5px] ${isLight ? 'text-[#64748b]' : 'text-neutral-500'}`}>{text}</p>
      )}
    </div>
  );
};
