import React, { useState, useEffect, useRef } from 'react';
import { CodexGlyph } from '../../components/icons/CodexGlyph';
import { Composer } from '../composer/Composer';
import { useApp } from '../../state/AppContext';
import { getMediobotPresentation, getMediobotAvatarColors, normalizeMediobotId } from '../mediobots/presentation';

export const EmptyState: React.FC = () => {
  const { selectedMediobotId, agents, theme } = useApp();
  const isLight = theme === 'light';
  const cleanSelectedId = selectedMediobotId ? normalizeMediobotId(selectedMediobotId) : null;
  const isMedioBotMode = cleanSelectedId !== null;
  const currentAgent = cleanSelectedId
    ? agents.find((agent) => normalizeMediobotId(agent.id) === cleanSelectedId || normalizeMediobotId(agent.preferenceId) === cleanSelectedId) ?? null
    : null;

  const targetName = isMedioBotMode ? (currentAgent?.name ?? cleanSelectedId.charAt(0).toUpperCase() + cleanSelectedId.slice(1)) : 'Mediobot';
  const botVisuals = getMediobotPresentation(
    cleanSelectedId ?? 'maestro',
    currentAgent?.name,
    currentAgent?.role
  );
  const avatarColors = getMediobotAvatarColors(cleanSelectedId ?? 'maestro', isLight);

  const [typedText, setTypedText] = useState('');
  const workspaceContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let index = 0;
    setTypedText('');

    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        index++;
        if (index <= targetName.length) {
          setTypedText(targetName.slice(0, index));
        } else {
          clearInterval(interval);
        }
      }, 90);

      return () => clearInterval(interval);
    }, 120);

    return () => clearTimeout(startTimer);
  }, [targetName]);

  return (
    <div className="flex-1 flex flex-col items-center justify-between w-full h-full min-h-0 pb-8 select-none">
      {/* Top spacing to center the greeting vertically */}
      <div className="flex-1" />

      {/* Center Emblem & Headline */}
      <div
        ref={workspaceContentRef}
        data-testid={isMedioBotMode && currentAgent ? `mediobot-workspace-content-${currentAgent.id}` : undefined}
        className="flex flex-col items-center text-center px-4 justify-center max-w-xl animate-in fade-in duration-300"
      >
        {/* Emblem: SVG circle emblem with vertical blinking eyes */}
        <div
          data-testid={isMedioBotMode && selectedMediobotId ? `mediobot-welcome-${selectedMediobotId}` : undefined}
          className="mb-6 opacity-90 hover:opacity-100 transition-opacity"
        >
          <CodexGlyph
            className="w-16 h-16"
            bgColor={avatarColors.bg}
            eyeColor={avatarColors.eye}
            isLight={isLight}
          />
        </div>

        {/* Product welcome copy */}
        <h1
          className={`text-2xl sm:text-[28px] font-medium tracking-tight ${
            isLight ? 'text-[#18181b]' : 'text-neutral-200'
          } inline-flex items-center justify-center flex-wrap gap-x-2`}
        >
          <span>{isMedioBotMode ? 'Hi, I am' : 'What Should we Build with'}</span>
          <span
            className={`font-semibold inline-flex items-center ${
              isMedioBotMode
                ? isLight
                  ? botVisuals.lightText
                  : botVisuals.darkText
                : isLight
                ? 'text-[#09090b]'
                : 'text-white'
            }`}
          >
            <span>{typedText}{!isMedioBotMode && typedText === targetName ? '?' : ''}</span>
            {/* Smooth terminal-grade blinking cursor */}
            <span
              className={`inline-block w-[2px] h-[0.88em] ${
                isLight ? 'bg-[#18181b]' : 'bg-neutral-200'
              } ml-[2px] animate-cursor-blink align-middle rounded-full`}
              aria-hidden="true"
            />
          </span>
        </h1>

        {/* Subtitle / Role description & Mind card for selected MedioBot */}
        {isMedioBotMode && (
          <div className="mt-3 flex flex-col items-center gap-2 max-w-md animate-in fade-in duration-200">
            <p
              className={`text-xs ${
                isLight ? 'text-neutral-600' : 'text-neutral-400'
              } font-normal`}
            >
              Specialization:{' '}
              <span
                className={`${
                  isLight ? 'text-neutral-900 font-semibold' : 'text-neutral-200 font-medium'
                }`}
              >
                {currentAgent?.role || botVisuals.specialization}
              </span>
            </p>

            {/* Mind Status / Thinking card */}
            <div
              className={`mt-1.5 px-4 py-2 rounded-xl border text-xs flex items-center gap-2.5 shadow-2xs ${
                isLight
                  ? 'bg-neutral-50/90 border-[#e2e4e8] text-neutral-700'
                  : 'bg-[#18181d]/90 border-[#2b2b34] text-neutral-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  currentAgent?.status === 'working'
                    ? 'bg-amber-400 animate-ping'
                    : currentAgent?.status === 'waiting'
                    ? 'bg-sky-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="font-mono text-[11px] opacity-70">Mind:</span>
              <span className="truncate max-w-[320px]">
                {currentAgent?.currentTask ||
                  (currentAgent?.status === 'working'
                    ? 'Executing specialized tasks…'
                    : currentAgent?.status === 'waiting'
                    ? 'Waiting for Maestro delegation or other mediobots to complete…'
                    : `Standing by · Speak to ${targetName} directly or delegate tasks`)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Spacer between headline and bottom composer */}
      <div className="flex-1" />

      {/* Floating Composer */}
      <div className="w-full">
        <Composer />
      </div>
    </div>
  );
};
