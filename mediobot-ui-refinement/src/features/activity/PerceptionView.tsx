import React, { useState } from 'react';
import { ComputerActionData, PerceptionData } from '../../types';
import { Eye, MousePointer, Monitor, ChevronRight, ChevronDown } from 'lucide-react';
import { useApp } from '../../state/AppContext';

export const PerceptionView: React.FC<{
  computerAction?: ComputerActionData;
  perception?: PerceptionData;
}> = ({ computerAction, perception }) => {
  const { theme } = useApp();
  const isLight = theme === 'light';
  const [isOpen, setIsOpen] = useState(false);

  if (!computerAction && !perception) return null;

  return (
    <div className="my-0.5 select-none">
      <div
        onClick={() => setIsOpen((p) => !p)}
        className={`group flex items-center justify-between gap-2 py-[3px] px-1.5 -mx-1.5 rounded-md text-[13px] cursor-pointer transition-colors ${
          isLight
            ? 'text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.03]'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {perception ? (
            <Eye className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
          ) : (
            <MousePointer className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
          )}

          <span className="truncate">
            <span className={isLight ? 'text-neutral-500' : 'text-neutral-500'}>
              {perception ? 'Perception snapshot' : 'Computer action'}
            </span>{' '}
            <span className={isLight ? 'text-neutral-800' : 'text-neutral-300'}>
              {perception ? perception.focusedApp : computerAction?.action}
            </span>
          </span>

          {isOpen ? (
            <ChevronDown className={`w-3 h-3 shrink-0 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
          ) : (
            <ChevronRight className={`w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
          )}
        </div>

        {perception?.confidenceScore && (
          <span className={`text-[11px] font-mono tabular-nums shrink-0 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
            {(perception.confidenceScore * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {isOpen && (
        <div
          className={`mt-1 mb-1.5 ml-5 p-3 rounded-lg border space-y-2 text-[11.5px] ${
            isLight
              ? 'bg-[#f8f9fb] border-black/[0.08] text-neutral-700'
              : 'bg-white/[0.02] border-white/[0.06] text-neutral-300'
          }`}
        >
          {perception && (
            <div className="space-y-1">
              <div className={`flex items-center gap-1.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                <Monitor className="w-3.5 h-3.5" />
                <span className="font-mono">{perception.windowTitle}</span>
              </div>
              <p className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>{perception.visualSummary}</p>
              <div className={`text-[10.5px] font-mono ${isLight ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Detected interactive regions: {perception.detectedElementsCount}
              </div>
            </div>
          )}

          {computerAction && (
            <div className={`font-mono ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>
              <span className="opacity-65">Action: </span>
              <span className="font-semibold">{computerAction.action}</span>
              {computerAction.keys && (
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded border ${
                    isLight ? 'bg-white border-black/[0.08] text-neutral-700' : 'bg-white/[0.04] border-white/[0.08] text-neutral-200'
                  }`}
                >
                  {computerAction.keys}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

