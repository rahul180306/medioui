/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Specialist Direct Chat Component (R3)
 * Provides dedicated, private direct-chat spaces for each specialist with
 * distinct visual identities, isolated message streams, code block formatting,
 * welcome states on zero messages, and isolated draft persistence.
 */

import React from 'react';
import { SPECIALIST_PROFILES } from '../mediobots/parallelWorkFixture';

export interface SpecialistDirectChatMessage {
  readonly id: string;
  readonly actor: 'user' | 'specialist' | 'coordinator';
  readonly authorName: string;
  readonly role?: string;
  readonly text: string;
  readonly timestamp?: number;
}

export interface SpecialistDirectChatViewProps {
  readonly specialistId: string;
  readonly messages?: ReadonlyArray<SpecialistDirectChatMessage>;
  readonly draftText?: string;
  readonly onDraftChange?: (draft: string) => void;
  readonly className?: string;
}

export const SpecialistDirectChatView: React.FC<SpecialistDirectChatViewProps> = ({
  specialistId,
  messages = [],
  draftText = '',
  onDraftChange,
  className = '',
}) => {
  const profile = SPECIALIST_PROFILES[specialistId];

  if (!profile) {
    return (
      <div
        className={`specialist-direct-chat-not-found p-4 rounded-lg bg-zinc-950 border border-rose-900/50 text-zinc-300 ${className}`}
        data-testid="specialist-not-found"
      >
        <div className="flex items-center gap-2 text-rose-400 font-semibold mb-2 text-sm">
          <span>⚠</span>
          <span>Specialist Not Found</span>
        </div>
        <p className="text-xs text-zinc-400">
          No specialist with ID &quot;{specialistId}&quot; was discovered in the current team. Please select a valid specialist.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`specialist-direct-chat p-4 rounded-lg bg-zinc-950 border border-zinc-800 ${className}`}
      data-testid={`specialist-direct-chat-${specialistId}`}
    >
      {/* Header with Visual Identity */}
      <div className="chat-header flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${profile.avatar}`}
            data-testid={`specialist-avatar-${specialistId}`}
          >
            {profile.name.slice(0, 1)}
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${profile.textTheme}`} data-testid="specialist-chat-name">
              {profile.name}
            </h3>
            <span className="text-[11px] text-zinc-400 block">{profile.role}</span>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
          Direct Chat
        </span>
      </div>

      {/* Dedicated Welcome State on zero prior messages (R3.1) */}
      {messages.length === 0 ? (
        <div
          className="welcome-state py-8 text-center bg-zinc-900/30 rounded border border-zinc-800/40 my-3"
          data-testid="specialist-welcome-state"
        >
          <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center font-bold text-lg ${profile.avatar}`}>
            {profile.name.slice(0, 1)}
          </div>
          <h4 className="text-sm font-semibold text-zinc-200 mb-1">
            Welcome to direct chat with {profile.name}
          </h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-2">
            Specialized in {profile.role}. Direct conversations are isolated to this specialist.
          </p>
          <span className="text-[10px] text-zinc-500 font-mono">
            Send a message below to begin collaboration.
          </span>
        </div>
      ) : (
        <div className="messages-stream flex flex-col gap-2 my-3 max-h-96 overflow-y-auto" data-testid="messages-stream">
          {messages.map((m) => {
            const isCodeBlock = m.text.includes('```');
            return (
              <div
                key={m.id}
                className={`message-bubble p-2.5 rounded text-xs ${
                  m.actor === 'user'
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-100 self-end ml-8'
                    : 'bg-zinc-900/70 border border-zinc-800 text-zinc-200 self-start mr-8'
                }`}
                data-testid={`message-${m.id}`}
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                  <span className="font-semibold">{m.authorName}</span>
                  {m.role && <span className="text-zinc-500">({m.role})</span>}
                </div>
                {isCodeBlock ? (
                  <div className="font-mono bg-black/60 p-2 rounded text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {m.text}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Draft input */}
      <div className="composer-area mt-3">
        <textarea
          data-testid={`specialist-draft-input-${specialistId}`}
          value={draftText}
          onChange={(e) => onDraftChange?.(e.target.value)}
          placeholder={`Message ${profile.name}...`}
          className="w-full h-16 p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
        />
      </div>
    </div>
  );
};
