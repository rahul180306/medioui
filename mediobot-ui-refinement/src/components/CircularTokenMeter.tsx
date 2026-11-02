import React, { useState, useRef, useEffect } from 'react';
import { Cpu } from 'lucide-react';
import { useConversationTokenMetrics } from '../features/threads/useTokenMetrics';
import { useApp } from '../state/AppContext';
import CometDial from './CometDial';

interface CircularTokenMeterProps {
  size?: number;
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export const CircularTokenMeter: React.FC<CircularTokenMeterProps> = ({
  size = 38,
  className = '',
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  onClose: controlledOnClose,
}) => {
  const { activeThread, model, theme, openSettings } = useApp();
  const isLight = theme === 'light';
  const metrics = useConversationTokenMetrics(activeThread, model);

  // Support controlled or uncontrolled open state
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (isControlled && controlledOnToggle) {
      controlledOnToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Meter accent color based on capacity
  const displayPercentage = Math.min(100, Math.max(0, Math.round(metrics.percentage)));
  const effectivePercentage = metrics.totalTokens > 0 ? Math.max(1, displayPercentage) : 0;

  const meterColor =
    effectivePercentage > 85
      ? '#ef4444' // red
      : effectivePercentage > 65
      ? '#f59e0b' // amber
      : isLight
      ? '#2563eb' // blue in light mode
      : '#38bdf8'; // sky cyan in dark mode

  const trackColor = isLight ? '#cbd5e1' : '#33323e';

  // Dynamic percentage remaining for session limit
  const sessionLeftPct = Math.max(0, 100 - displayPercentage);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Circle Token Meter Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label="Token usage meter"
        title={`Session Tokens: ${metrics.formattedTotal} / ${metrics.formattedLimit} (${metrics.percentage.toFixed(1)}%) - Click to view usage`}
        className={`relative flex items-center justify-center rounded-full transition-all duration-300 group cursor-pointer active:scale-95 p-0.5 ${
          isOpen
            ? isLight
              ? 'bg-[#dedee6] ring-2 ring-blue-500/30'
              : 'bg-[#39383f] ring-2 ring-cyan-500/30'
            : isLight
            ? 'bg-[#ffffff] hover:bg-[#dedee5] text-[#1f2937] shadow-xs'
            : 'bg-[#1e1d23] hover:bg-[#2b2a33] text-neutral-200 shadow-sm'
        }`}
        style={{ width: size, height: size }}
      >
        {/* React Bits CometDial - Compact Mode */}
        <div className="pointer-events-none scale-100 flex items-center justify-center">
          <CometDial
            size={size}
            value={effectivePercentage}
            min={0}
            max={100}
            sweep={320}
            thickness={2.8}
            speed={30}
            tapBounce={0.2}
            flickBounce={0.15}
            momentum={1}
            cometReach={140}
            cometWidth={6}
            accent={meterColor}
            ink={trackColor}
            hideReadout={false}
          >
            <div className="flex flex-col items-center justify-center pointer-events-none z-10 leading-none">
              {metrics.totalTokens > 0 ? (
                <span
                  className={`text-[9.5px] font-mono font-bold tracking-tighter ${
                    isLight ? 'text-[#0f172a]' : 'text-white'
                  }`}
                >
                  {metrics.formattedTotal}
                </span>
              ) : (
                <Cpu
                  className={`w-3.5 h-3.5 ${
                    isLight ? 'text-neutral-500 group-hover:text-neutral-800' : 'text-neutral-400 group-hover:text-white'
                  }`}
                />
              )}
            </div>
          </CometDial>
        </div>

        {/* Real-time Streaming Pulse Badge */}
        {metrics.isStreaming && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-1 ring-black/20" />
          </span>
        )}
      </button>

      {/* Small and Compact Usage Popover - Exact match to reference image, z-index hoisted to top */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`fixed left-[66px] bottom-16 z-[9999] w-[238px] rounded-2xl shadow-2xl px-4 py-3 border origin-bottom-left animate-fadeIn select-none ${
            isLight
              ? 'bg-[#ffffff] border-[#dcdce2] text-[#111827]'
              : 'bg-[#232326] border-[#38373f] text-[#f3f4f6]'
          }`}
        >
          {/* Header */}
          <div
            className={`text-[13px] font-normal leading-tight ${
              isLight ? 'text-[#4b5563]' : 'text-[#9ca3af]'
            }`}
          >
            Usage source: Your Plus plan
          </div>

          {/* Divider */}
          <div
            className={`my-2.5 border-b ${
              isLight ? 'border-[#e5e7eb]' : 'border-[#38373f]'
            }`}
          />

          {/* Usage Rows */}
          <div className="space-y-3">
            {/* 5-hour limit */}
            <div className="flex items-center justify-between text-[13.5px] font-normal leading-tight">
              <span className={isLight ? 'text-[#1f2937]' : 'text-[#f3f4f6]'}>
                5-hour limit
              </span>
              <span className={isLight ? 'text-[#111827]' : 'text-[#f3f4f6]'}>
                {sessionLeftPct}% left
              </span>
            </div>

            {/* Weekly limit */}
            <div className="flex items-center justify-between text-[13.5px] font-normal leading-tight">
              <span className={isLight ? 'text-[#1f2937]' : 'text-[#f3f4f6]'}>
                Weekly limit
              </span>
              <span className={isLight ? 'text-[#111827]' : 'text-[#f3f4f6]'}>
                58% left
              </span>
            </div>

            {/* Credits */}
            <div className="flex items-center justify-between text-[13.5px] font-normal leading-tight">
              <span className={isLight ? 'text-[#1f2937]' : 'text-[#f3f4f6]'}>
                Credits
              </span>
              <span className={isLight ? 'text-[#111827]' : 'text-[#f3f4f6]'}>
                0 credits
              </span>
            </div>
          </div>

          {/* Divider */}
          <div
            className={`my-2.5 border-b ${
              isLight ? 'border-[#e5e7eb]' : 'border-[#38373f]'
            }`}
          />

          {/* Manage usage action button */}
          <button
            type="button"
            onClick={() => {
              handleClose();
              openSettings('usage');
            }}
            className={`text-[13.5px] font-normal cursor-pointer text-left block w-full py-0.5 transition-colors ${
              isLight
                ? 'text-[#1f2937] hover:text-blue-600'
                : 'text-[#f3f4f6] hover:text-white'
            }`}
          >
            Manage usage
          </button>
        </div>
      )}
    </div>
  );
};

export default CircularTokenMeter;
