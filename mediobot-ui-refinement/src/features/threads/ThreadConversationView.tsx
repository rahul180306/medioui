/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Thread Conversation Component (R2)
 * Clean, isolated thread conversation view supporting message streams,
 * streaming indicators, draft input isolation, and thread type metadata.
 */

import React from 'react';

export interface ThreadConversationViewProps {
  readonly thread: {
    readonly id: string;
    readonly title: string;
    readonly threadType: 'team' | 'mind';
    readonly ownerAgent: string;
    readonly mode?: string;
  } | null;
  readonly messages?: ReadonlyArray<{
    readonly id: string;
    readonly actor: string;
    readonly text: string;
  }>;
  readonly draftText?: string;
  readonly onDraftChange?: (draft: string) => void;
  readonly isStreaming?: boolean;
  readonly streamingText?: string;
  readonly className?: string;
}

export const ThreadConversationView: React.FC<ThreadConversationViewProps> = ({
  thread,
  messages = [],
  draftText = '',
  onDraftChange,
  isStreaming = false,
  streamingText = '',
  className = '',
}) => {
  if (!thread) {
    return (
      <div
        className={`thread-fallback-view p-6 text-center text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-lg ${className}`}
        data-testid="thread-fallback-view"
      >
        <h3 className="text-sm font-semibold text-zinc-300 mb-1">No Active Thread</h3>
        <p className="text-xs text-zinc-500">
          The selected thread is unavailable or was deleted. Please select or create another thread.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`thread-conversation-view p-4 rounded-lg bg-zinc-950 border border-zinc-800 ${className}`}
      data-testid={`thread-conversation-${thread.id}`}
    >
      <div className="thread-header flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
        <h3
          className="thread-title text-sm font-semibold text-zinc-200 truncate max-w-[240px]"
          title={thread.title}
          data-testid="thread-title"
        >
          {thread.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            {thread.threadType}
          </span>
          <span className="text-[10px] text-zinc-500">owner: {thread.ownerAgent}</span>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="empty-messages py-6 text-center text-xs text-zinc-500" data-testid="thread-empty-state">
          No messages in this conversation yet.
        </div>
      ) : (
        <div className="messages-list flex flex-col gap-2 my-2 max-h-80 overflow-y-auto" data-testid="thread-messages-list">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`message-row p-2 rounded text-xs ${
                m.actor === 'user' ? 'bg-amber-500/10 text-amber-200' : 'bg-zinc-900/70 text-zinc-300'
              }`}
              data-testid={`thread-message-${m.id}`}
            >
              <span className="text-[10px] text-zinc-500 font-bold block mb-0.5">{m.actor}:</span>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Streaming indicator */}
      {isStreaming && (
        <div
          className="streaming-indicator p-2 my-2 bg-sky-950/30 border border-sky-500/30 rounded text-sky-300 text-xs animate-pulse flex items-center gap-2"
          data-testid="streaming-indicator"
        >
          <span className="font-semibold text-[10px] uppercase tracking-wider bg-sky-500/20 px-1 py-0.5 rounded">
            Streaming
          </span>
          <span className="truncate">{streamingText || 'Simulating agent response...'}</span>
        </div>
      )}

      {/* Composer Area */}
      <div className="composer-area mt-3">
        <textarea
          data-testid={`thread-draft-input-${thread.id}`}
          value={draftText}
          onChange={(e) => onDraftChange?.(e.target.value)}
          placeholder={`Reply to ${thread.title}...`}
          className="w-full h-16 p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
        />
      </div>
    </div>
  );
};
