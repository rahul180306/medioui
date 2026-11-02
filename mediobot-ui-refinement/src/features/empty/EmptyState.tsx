import React, { useState, useEffect, useRef } from 'react';
import { CodexGlyph } from '../../components/icons/CodexGlyph';
import { Composer } from '../composer/Composer';
import { useApp } from '../../state/AppContext';
import { getMediobotPresentation, getMediobotAvatarColors } from '../mediobots/presentation';

export const EmptyState: React.FC = () => {
  const { selectedMediobotId, agents, theme } = useApp();
  const isLight = theme === 'light';
  const isMedioBotMode = selectedMediobotId !== null;
  const currentAgent = selectedMediobotId
    ? agents.find((agent) => agent.id === selectedMediobotId) ?? null
    : null;

  const targetName = isMedioBotMode ? currentAgent?.name ?? 'Mediobot' : 'Mediobot';
  const botVisuals = getMediobotPresentation(
    currentAgent?.preferenceId ?? selectedMediobotId ?? 'maestro',
    currentAgent?.name,
    currentAgent?.role
  );
  const avatarColors = getMediobotAvatarColors(botVisuals.id, isLight);

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

        {/* Subtitle / Role description for selected MedioBot */}
        {isMedioBotMode && currentAgent?.role && (
          <p
            className={`mt-2.5 text-xs ${
              isLight ? 'text-neutral-600' : 'text-neutral-400'
            } font-normal animate-in fade-in duration-200`}
          >
            Specialization:{' '}
            <span
              className={`${
                isLight ? 'text-neutral-900 font-semibold' : 'text-neutral-200 font-medium'
              }`}
            >
              {currentAgent.role}
            </span>
          </p>
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
