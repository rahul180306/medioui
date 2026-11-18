import React from 'react';
import { normalizeMediobotId } from '../../mediobots/presentation';

/**
 * Crisp [=] rounded-rect compaction glyph matching the editorial execution stream.
 */
export const CompactionGlyph: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect
      x="2.25"
      y="3.25"
      width="11.5"
      height="9.5"
      rx="2.25"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path
      d="M5 6.75H11M5 9.25H11"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
  </svg>
);

const GLYPH_HEX_BY_SPECIALIST: Record<string, string> = {
  maestro: '#e4e4e7',
  cody: '#facc15',
  vision: '#38bdf8',
  doc: '#94a3b8',
  research: '#fb923c',
  tester: '#c084fc',
  scraapy: '#2dd4bf',
  deployer: '#34d399',
};

const LIGHT_GLYPH_HEX_BY_SPECIALIST: Record<string, string> = {
  maestro: '#27272a',
  cody: '#ca8a04',
  vision: '#0284c7',
  doc: '#475569',
  research: '#ea580c',
  tester: '#9333ea',
  scraapy: '#0f766e',
  deployer: '#059669',
};

/**
 * Tactile geometric micro-emblem for multi-specialist subagent lines.
 * Distinct silhouette and muted signature hue per Mediobot specialist.
 */
export const SpecialistMicroGlyph: React.FC<{
  specialistId?: string;
  isLight?: boolean;
  working?: boolean;
  className?: string;
}> = ({ specialistId, isLight = false, working = false, className = 'w-3.5 h-3.5' }) => {
  const id = normalizeMediobotId(specialistId) || 'maestro';
  const color = isLight
    ? (LIGHT_GLYPH_HEX_BY_SPECIALIST[id] ?? '#52525b')
    : (GLYPH_HEX_BY_SPECIALIST[id] ?? '#a1a1aa');

  // Render distinct geometric glyph silhouettes per specialist
  if (id === 'research' || id === 'scraapy') {
    // 6-petal rosette / coral node (inspired by subagent glyph)
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} shrink-0 ${working ? 'animate-pulse' : ''}`}
        style={{ color }}
        aria-hidden="true"
      >
        <circle cx="8" cy="3.6" r="1.9" fill="currentColor" fillOpacity="0.88" />
        <circle cx="11.8" cy="5.8" r="1.9" fill="currentColor" fillOpacity="0.88" />
        <circle cx="11.8" cy="10.2" r="1.9" fill="currentColor" fillOpacity="0.88" />
        <circle cx="8" cy="12.4" r="1.9" fill="currentColor" fillOpacity="0.88" />
        <circle cx="4.2" cy="10.2" r="1.9" fill="currentColor" fillOpacity="0.88" />
        <circle cx="4.2" cy="5.8" r="1.9" fill="currentColor" fillOpacity="0.88" />
        <circle cx="8" cy="8" r="1.6" fill="currentColor" fillOpacity="0.35" />
      </svg>
    );
  }

  if (id === 'tester') {
    // 8-ray starburst / verification asterisk
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} shrink-0 ${working ? 'animate-pulse' : ''}`}
        style={{ color }}
        aria-hidden="true"
      >
        <path
          d="M8 1.75V14.25M1.75 8H14.25M3.6 3.6L12.4 12.4M12.4 3.6L3.6 12.4"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (id === 'vision' || id === 'maestro') {
    // Faceted globe / concentric lens ring
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} shrink-0 ${working ? 'animate-pulse' : ''}`}
        style={{ color }}
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.35" />
        <ellipse cx="8" cy="8" rx="2.6" ry="5.75" stroke="currentColor" strokeWidth="1.1" />
        <path d="M2.5 8H13.5" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    );
  }

  if (id === 'cody') {
    // Crisp diamond prism
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} shrink-0 ${working ? 'animate-pulse' : ''}`}
        style={{ color }}
        aria-hidden="true"
      >
        <path
          d="M8 1.8L13.6 8L8 14.2L2.4 8L8 1.8Z"
          fill="currentColor"
          fillOpacity="0.22"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="8" r="1.6" fill="currentColor" />
      </svg>
    );
  }

  if (id === 'deployer') {
    // Triangle delta
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} shrink-0 ${working ? 'animate-pulse' : ''}`}
        style={{ color }}
        aria-hidden="true"
      >
        <path
          d="M8 2.4L13.5 12.6H2.5L8 2.4Z"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Doc / fallback: clean layered square
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0 ${working ? 'animate-pulse' : ''}`}
      style={{ color }}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="10"
        height="10"
        rx="2.5"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path d="M5.5 6.8H10.5M5.5 9.2H8.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};
