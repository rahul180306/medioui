import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Clock,
  MoreHorizontal,
  Settings,
  ChevronRight,
  LifeBuoy,
  LogOut,
  Home,
  UserRound,
  LogIn,
} from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { SignInModal } from '../auth/SignInModal';
import { CircularTokenMeter } from '../../components/CircularTokenMeter';
import { getMediobotPresentation } from '../mediobots/presentation';

export type SpecialistStatus = 'working' | 'idle' | 'disabled';

export interface SpecialistStatusInfo {
  status: SpecialistStatus;
  statusLabel: string;
  tooltip: string;
}

export function getSpecialistStatus(
  agent: {
    id?: string;
    name?: string;
    status?: string;
    availability?: string;
    executable?: boolean;
    directConversationAvailable?: boolean;
    currentTask?: string;
    activityState?: string;
  }
): SpecialistStatusInfo {
  const name = agent.name || 'Specialist';
  const isWorking =
    agent.status === 'working' ||
    agent.activityState === 'working' ||
    agent.activityState === 'running';

  if (isWorking) {
    return {
      status: 'working',
      statusLabel: 'Working',
      tooltip: `${name} (Working)`,
    };
  }

  const isDisabled =
    agent.availability === 'unavailable' ||
    agent.availability === 'not-configured' ||
    agent.currentTask === 'unavailable' ||
    agent.currentTask === 'not-configured' ||
    (agent.availability !== 'available' && agent.executable === false && agent.status === 'waiting' && !agent.directConversationAvailable);

  if (isDisabled) {
    return {
      status: 'disabled',
      statusLabel: 'Disabled',
      tooltip: `${name} (Disabled)`,
    };
  }

  return {
    status: 'idle',
    statusLabel: 'Idle',
    tooltip: `${name} (Idle)`,
  };
}

export const SpecialistStatusIndicator: React.FC<{
  status: SpecialistStatus;
  className?: string;
}> = ({ status, className = '' }) => {
  if (status === 'working') {
    return (
      <span
        data-status="working"
        data-testid="status-indicator-working"
        className={`relative flex h-2 w-2 items-center justify-center shrink-0 ${className}`}
        aria-label="Working"
      >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    );
  }

  if (status === 'disabled') {
    return (
      <span
        data-status="disabled"
        data-testid="status-indicator-disabled"
        className={`border border-neutral-600 w-2 h-2 rounded-full shrink-0 bg-transparent ${className}`}
        aria-label="Disabled"
      />
    );
  }

  return (
    <span
      data-status="idle"
      data-testid="status-indicator-idle"
      className={`bg-neutral-500 w-2 h-2 rounded-full shrink-0 ${className}`}
      aria-label="Idle"
    />
  );
};

export const SpecialistDeck: React.FC<{ isLight?: boolean }> = ({ isLight }) => {
  const { agents, selectedMediobotId, selectAgent, activeThread } = useApp();

  const assignedSpecialistIds = useMemo(() => {
    if (!activeThread) return [];
    if (Array.isArray(activeThread.assignedSpecialists)) {
      return activeThread.assignedSpecialists;
    }
    // If turns exist and no explicit assignedSpecialists array, infer from active thread turns / owner
    if (activeThread.turns && activeThread.turns.length > 0) {
      const ids = new Set<string>();
      if (activeThread.ownerAgent && activeThread.ownerAgent !== 'maestro') {
        ids.add(activeThread.ownerAgent);
      }
      if (activeThread.specialistId && activeThread.specialistId !== 'maestro') {
        ids.add(activeThread.specialistId);
      }
      for (const turn of activeThread.turns) {
        if (turn.items) {
          for (const item of turn.items) {
            if (item.actor?.type === 'mediobot' && item.actor.mediobotId && item.actor.mediobotId !== 'maestro') {
              ids.add(item.actor.mediobotId);
            }
          }
        }
      }
      return Array.from(ids);
    }
    if (activeThread.specialistId && activeThread.specialistId !== 'maestro') {
      return [activeThread.specialistId];
    }
    return [];
  }, [activeThread]);

  const deckAgents = useMemo(() => {
    if (assignedSpecialistIds.length === 0) return [];
    const list = agents.filter((a) => a.id !== 'maestro' && assignedSpecialistIds.includes(a.id));
    const order = ['cody', 'tester', 'research', 'doc', 'vision', 'scraapy', 'cli'];
    return list.sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [agents, assignedSpecialistIds]);

  if (deckAgents.length === 0) {
    return (
      <div
        data-testid="specialist-deck-empty"
        className="hidden"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      data-testid="specialist-deck"
      className="flex flex-col items-center gap-1.5 w-full my-1 py-1 border-t border-b border-black/5 dark:border-white/5 overflow-y-auto max-h-[190px] scrollbar-thin scrollbar-thumb-neutral-400/40 dark:scrollbar-thumb-neutral-700/60 scroll-smooth pr-0.5"
      role="region"
      aria-label="Specialist Deck"
    >
      {deckAgents.map((agent) => {
        const statusInfo = getSpecialistStatus(agent);
        const presentation = getMediobotPresentation(agent.id, agent.name, agent.role);
        const isSelected = selectedMediobotId === agent.id;

        return (
          <button
            key={agent.id}
            onClick={() => selectAgent(agent.id)}
            data-testid={`specialist-deck-${agent.id}`}
            data-agent-status={statusInfo.status}
            title={statusInfo.tooltip}
            aria-label={statusInfo.tooltip}
            className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all group cursor-pointer ${
              isSelected
                ? isLight
                  ? 'bg-[#dedee6] shadow-xs'
                  : 'bg-[#39383f] shadow-xs'
                : isLight
                ? 'hover:bg-[#dedee5]'
                : 'hover:bg-[#323137]'
            }`}
          >
            {/* Avatar icon with thick vertical blinking eyes */}
            <div
              className={`w-[18px] h-[18px] rounded-full ${presentation.avatar} flex items-center justify-center gap-[2px] shrink-0 shadow-xs`}
            >
              <span className={`w-[2.8px] h-[6px] rounded-full ${presentation.eye} animate-eye-blink block`} />
              <span className={`w-[2.8px] h-[6px] rounded-full ${presentation.eye} animate-eye-blink block`} />
            </div>

            {/* Status indicator on bottom-right of avatar */}
            <div className="absolute -bottom-0.5 -right-0.5">
              <SpecialistStatusIndicator status={statusInfo.status} />
            </div>

            {/* Tooltip on hover */}
            <span
              className={`pointer-events-none absolute left-[54px] top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-medium rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 ${
                isLight
                  ? 'bg-[#ffffff] text-[#111827] border border-[#dcdce2]'
                  : 'bg-[#1e1e22] text-[#e4e4e7] border border-[#2b2b30]'
              }`}
            >
              {statusInfo.tooltip}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const NavRail: React.FC = () => {
  const {
    activeThreadId,
    createNewChat,
    toggleSidebar,
    isSidebarOpen,
    sidebarTab,
    setSidebarTab,
    setSidebarOpen,
    setActiveModal,
    openSettings,
    closeSettings,
    setIsSettingsView,
    setActiveWorkbenchTabId,
    isSettingsView,
    isLibraryView,
    isTerminalView,
    openLibrary,
    closeLibrary,
    openTerminal,
    closeTerminal,
    selectAgent,
    selectedMediobotId,
    user,
    signOut,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);

  const isHomeActive = !isSettingsView && !isLibraryView && !isTerminalView && isSidebarOpen && sidebarTab === 'home';
  const isHistoryActive = !isSettingsView && !isLibraryView && !isTerminalView && isSidebarOpen && sidebarTab === 'history';
  const isMaestroActive = !isSettingsView && !isLibraryView && !isTerminalView && isSidebarOpen && sidebarTab === 'maestro';
  const isLibraryActive = !isSettingsView && isLibraryView;
  const isTerminalActive = !isSettingsView && isTerminalView;

  const handleHomeClick = () => {
    if (isSettingsView) {
      setIsSettingsView(false);
      setActiveWorkbenchTabId(null);
      selectAgent(null);
      setSidebarTab('home');
      setSidebarOpen(true);
      return;
    }
    if (isLibraryView) {
      closeLibrary();
    }
    if (isTerminalView) {
      closeTerminal();
    }
    selectAgent(null);
    if (!isSidebarOpen || sidebarTab !== 'home') {
      setSidebarTab('home');
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  };

  const handleHistoryClick = () => {
    if (isSettingsView) {
      closeSettings();
      selectAgent(null);
      setSidebarTab('history');
      setSidebarOpen(true);
      return;
    }
    if (isLibraryView) {
      closeLibrary();
    }
    if (isTerminalView) {
      closeTerminal();
    }
    if (!isSidebarOpen || sidebarTab !== 'history') {
      selectAgent(null);
      setSidebarTab('history');
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  };

  const handleMaestroClick = () => {
    selectAgent(null);
    if (isSettingsView) {
      closeSettings();
      setSidebarTab('maestro');
      setSidebarOpen(true);
      return;
    }
    if (isLibraryView) {
      closeLibrary();
      setSidebarTab('maestro');
      setSidebarOpen(true);
      return;
    }
    if (isTerminalView) {
      closeTerminal();
      setSidebarTab('maestro');
      setSidebarOpen(true);
      return;
    }
    if (!isSidebarOpen || sidebarTab !== 'maestro') {
      setSidebarTab('maestro');
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  };

  const handleLibraryClick = () => {
    if (isSettingsView) {
      closeSettings();
    }
    if (isTerminalView) {
      closeTerminal();
    }
    if (isLibraryView) {
      closeLibrary();
    } else {
      openLibrary();
    }
  };

  const handleTerminalClick = () => {
    if (isSettingsView) {
      closeSettings();
    }
    if (isLibraryView) {
      closeLibrary();
    }
    if (isTerminalView) {
      closeTerminal();
    } else {
      openTerminal();
    }
  };

  // Click outside listener for the profile menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node) &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(e.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  return (
    <>
      <aside
        className={`w-[58px] h-screen flex flex-col items-center justify-between pt-11 pb-3.5 z-30 shrink-0 select-none relative transition-colors ${
          isLight ? 'bg-[#ebebef]' : 'bg-[#28272c]'
        }`}
      >
        {/* Top Nav Group (matches image: Home card, Clock, Library/Books) */}
        <div className="flex flex-col items-center gap-4 w-full pt-1">
          {/* Keep the supplied home-rail interaction while using the shared icon family. */}
          <button
            onClick={handleHomeClick}
            title="Home / New Chat"
            className={`w-[44px] h-[44px] flex items-center justify-center rounded-2xl transition-all group relative cursor-pointer active:scale-95 ${
              isHomeActive
                ? isLight
                  ? 'bg-[#dedee6] text-[#09090b] shadow-xs'
                  : 'bg-[#39383f] text-white shadow-xs'
                : isLight
                ? 'text-[#6b6a75] hover:text-[#09090b] hover:bg-[#dedee5]'
                : 'text-[#8e8d96] hover:text-white hover:bg-[#323137]'
            }`}
          >
            <Home size={20} strokeWidth={1.8} />
            {/* Subtle tooltip */}
            <span
              className={`pointer-events-none absolute left-[60px] top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-medium rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 ${
                isLight ? 'bg-[#ffffff] text-[#111827] border border-[#dcdce2]' : 'bg-[#1e1e22] text-[#e4e4e7] border border-[#2b2b30]'
              }`}
            >
              Home
            </span>
          </button>

          {/* Threads / History Clock Icon */}
          <button
            onClick={handleHistoryClick}
            title="Threads & History"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors group relative cursor-pointer active:scale-95 ${
              isHistoryActive
                ? isLight
                  ? 'text-[#09090b] bg-[#dedee6]'
                  : 'text-white bg-[#323137]'
                : isLight
                ? 'text-[#6b6a75] hover:text-[#09090b] hover:bg-[#dedee5]'
                : 'text-[#8e8d96] hover:text-white hover:bg-[#323137]'
            }`}
          >
            <Clock className="w-5 h-5 stroke-[1.75]" />
            <span
              className={`pointer-events-none absolute left-[60px] top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-medium rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 ${
                isLight ? 'bg-[#ffffff] text-[#111827] border border-[#dcdce2]' : 'bg-[#1e1e22] text-[#e4e4e7] border border-[#2b2b30]'
              }`}
            >
              History
            </span>
          </button>

          {/* Maestro Bots Button: circle with two vertical blinking eyes */}
          <button
            onClick={handleMaestroClick}
            title="Maestro Agents"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors group relative cursor-pointer active:scale-95 ${
              isMaestroActive
                ? isLight
                  ? 'text-[#09090b] bg-[#dedee6]'
                  : 'text-white bg-[#323137]'
                : isLight
                ? 'text-[#6b6a75] hover:text-[#09090b] hover:bg-[#dedee5]'
                : 'text-[#8e8d96] hover:text-white hover:bg-[#323137]'
            }`}
          >
            {/* Circle with two vertical blinking eyes matching icons style */}
            <div className={`w-[20px] h-[20px] rounded-full ${isLight ? 'bg-[#dedee6]' : 'bg-[#f4f4f5]'} flex items-center justify-center gap-[2.5px] shrink-0 shadow-xs transition-transform group-hover:scale-105`}>
              <span
                className="w-[3.2px] h-[7px] rounded-full bg-black animate-eye-blink block"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="w-[3.2px] h-[7px] rounded-full bg-black animate-eye-blink block"
                style={{ animationDelay: '0.2s' }}
              />
            </div>
            <span
              className={`pointer-events-none absolute left-[60px] top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-medium rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 ${
                isLight ? 'bg-[#ffffff] text-[#111827] border border-[#dcdce2]' : 'bg-[#1e1e22] text-[#e4e4e7] border border-[#2b2b30]'
              }`}
            >
              Maestro
            </span>
          </button>

          {/* CLI / Terminal Button: Placed directly above the Library button */}
          <button
            onClick={handleTerminalClick}
            title="Terminal / CLI"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors group relative cursor-pointer active:scale-95 ${
              isTerminalActive
                ? isLight
                  ? 'text-[#09090b] bg-[#dedee6]'
                  : 'text-white bg-[#323137]'
                : isLight
                ? 'text-[#6b6a75] hover:text-[#09090b] hover:bg-[#dedee5]'
                : 'text-[#8e8d96] hover:text-white hover:bg-[#323137]'
            }`}
          >
            {/* Terminal prompt icon `>_` matching CLI identity */}
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 transition-transform group-hover:scale-105"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span
              className={`pointer-events-none absolute left-[60px] top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-medium rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 ${
                isLight ? 'bg-[#ffffff] text-[#111827] border border-[#dcdce2]' : 'bg-[#1e1e22] text-[#e4e4e7] border border-[#2b2b30]'
              }`}
            >
              Terminal
            </span>
          </button>

          {/* Library / Books Icon */}
          <button
            onClick={handleLibraryClick}
            title="Workspace Library"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors group relative cursor-pointer active:scale-95 ${
              isLibraryActive
                ? isLight
                  ? 'text-[#09090b] bg-[#dedee6]'
                  : 'text-white bg-[#323137]'
                : isLight
                ? 'text-[#6b6a75] hover:text-[#09090b] hover:bg-[#dedee5]'
                : 'text-[#8e8d96] hover:text-white hover:bg-[#323137]'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2.5" y="4" width="4.5" height="16" rx="1.8" />
              <rect x="9" y="4" width="4.5" height="16" rx="1.8" />
              <rect x="15.5" y="4" width="4.5" height="16" rx="1.8" transform="rotate(11 17.75 20)" />
            </svg>
            <span
              className={`pointer-events-none absolute left-[60px] top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-medium rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 ${
                isLight ? 'bg-[#ffffff] text-[#111827] border border-[#dcdce2]' : 'bg-[#1e1e22] text-[#e4e4e7] border border-[#2b2b30]'
              }`}
            >
              Library
            </span>
          </button>
        </div>

        {/* Middle / Specialist Deck */}
        <SpecialistDeck isLight={isLight} />

        {/* Bottom Nav Group */}
        <div className="flex flex-col items-center gap-1.5 w-full relative">
          {/* Circular Token Usage Meter */}
          <CircularTokenMeter size={34} />

          {/* User Account / Profile Button */}
          <button
            ref={profileBtnRef}
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            title={user.isSignedIn ? user.name : 'Account / Sign in'}
            aria-label="Account / Profile"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 group relative cursor-pointer ${
              isProfileMenuOpen
                ? isLight
                  ? 'bg-[#dedee6] text-[#09090b]'
                  : 'bg-[#39383f] text-white'
                : isLight
                ? 'text-[#6b6a75] hover:text-[#09090b] hover:bg-[#dedee5]'
                : 'text-[#8e8d96] hover:text-white hover:bg-[#323137]'
            }`}
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              {/* Outline icon: visible when closed and not hovered */}
              <UserRound
                size={19}
                className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] absolute inset-0 m-auto ${
                  isProfileMenuOpen
                    ? 'opacity-0 scale-90'
                    : 'group-hover:opacity-0 group-hover:scale-90'
                }`}
              />

              {/* Solid icon: visible when clicked/opened OR when hovered */}
              <UserRound
                size={19}
                strokeWidth={2.4}
                className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] absolute inset-0 m-auto ${
                  isProfileMenuOpen
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
                }`}
              />
            </div>

            {!isProfileMenuOpen && (
              <span
                className={`pointer-events-none absolute left-[60px] top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-medium rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 ${
                  isLight ? 'bg-[#ffffff] text-[#111827] border border-[#dcdce2]' : 'bg-[#1e1e22] text-[#e4e4e7] border border-[#2b2b30]'
                }`}
              >
                {user.isSignedIn ? user.name : 'Sign in'}
              </span>
            )}
          </button>

          {/* Profile Popup Menu */}
          <div
            ref={profileMenuRef}
            className={`fixed left-[66px] bottom-3.5 z-[60] w-[230px] rounded-2xl shadow-2xl p-2 origin-bottom-left transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
              isLight ? 'bg-[#ffffff] border border-[#dcdce2] text-[#111827]' : 'bg-[#1e1d23] border border-[#32313a] text-neutral-200'
            } ${
              isProfileMenuOpen
                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 scale-95 translate-y-1 pointer-events-none'
            }`}
          >
            {/* 1. Header / Sign-in Section */}
            <div className="min-w-0">
              {user.isSignedIn ? (
                <div className="flex items-center gap-2.5 px-2.5 py-2">
                  <div className={`w-8 h-8 rounded-full ${isLight ? 'bg-[#e2e2e8] text-[#111827]' : 'bg-[#52515b] text-neutral-200'} font-semibold text-xs flex items-center justify-center shrink-0`}>
                    {user.avatarText || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[13px] font-semibold leading-tight truncate ${isLight ? 'text-[#09090b]' : 'text-neutral-100'}`}>
                      {user.name}
                    </div>
                    {user.email && (
                      <div className={`text-[11px] font-normal leading-tight mt-0.5 truncate ${isLight ? 'text-[#64748b]' : 'text-neutral-400'}`}>
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsSignInModalOpen(true);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group shadow-xs text-left ${
                    isLight ? 'bg-[#f4f4f7] hover:bg-[#eaebee] text-[#09090b]' : 'bg-[#2a2933] hover:bg-[#32313a] text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                      isLight ? 'bg-[#e2e2e8] text-[#09090b]' : 'bg-[#41404e] group-hover:bg-[#4d4b5c] text-neutral-200'
                    }`}>
                      <LogIn size={14} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-[13px] font-semibold leading-tight ${isLight ? 'text-[#09090b]' : 'text-neutral-100'}`}>Sign in</div>
                      <div className={`text-[10px] leading-tight mt-0.5 truncate ${isLight ? 'text-[#64748b]' : 'text-neutral-400'}`}>Sync chats & agents</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              )}
            </div>

            {/* 2. Separator line */}
            <div className={`h-[1px] my-1 ${isLight ? 'bg-[#e5e7eb]' : 'bg-[#2b2a33]'}`} />

            {/* 3. Menu Items */}
            <div className="space-y-0.5">
              {/* Settings */}
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  openSettings();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer text-left ${
                  isLight ? 'text-[#374151] hover:text-[#09090b] hover:bg-[#eaebee]' : 'text-neutral-300 hover:text-white hover:bg-[#32313a]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-neutral-400 shrink-0" strokeWidth={1.75} />
                  <span className="text-[13px] font-medium">Settings</span>
                </div>
              </button>
            </div>

            {/* 4. Separator line */}
            <div className={`h-[1px] my-1 ${isLight ? 'bg-[#e5e7eb]' : 'bg-[#2b2a33]'}`} />

            {/* 5. Help & Auth actions */}
            <div className="space-y-0.5">
              {/* Help */}
              <button
                onClick={() => setIsProfileMenuOpen(false)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer text-left ${
                  isLight ? 'text-[#374151] hover:text-[#09090b] hover:bg-[#eaebee]' : 'text-neutral-300 hover:text-white hover:bg-[#32313a]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LifeBuoy className="w-4 h-4 text-neutral-400 shrink-0" strokeWidth={1.75} />
                  <span className="text-[13px] font-medium">Help</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              </button>

              {/* Log out (only shown when signed in) */}
              {user.isSignedIn && (
                <button
                  onClick={() => {
                    signOut();
                    setIsProfileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer text-left ${
                    isLight ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50' : 'text-rose-300 hover:text-rose-100 hover:bg-[#331d22]'
                  }`}
                >
                  <LogOut className="w-4 h-4 text-rose-500 shrink-0" strokeWidth={1.75} />
                  <span className="text-[13px] font-medium">Log out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Real Sign In Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </>
  );
};
