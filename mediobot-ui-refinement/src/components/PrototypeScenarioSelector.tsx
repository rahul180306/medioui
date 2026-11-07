import React, { useState } from 'react';
import { Layers, ChevronDown, Check, Sparkles, X, Info } from 'lucide-react';
import { MOCK_SCENARIOS, MockScenarioMeta } from '../mock/mockScenarios';
import { useApp } from '../state/AppContext';

export const PrototypeScenarioSelector: React.FC = () => {
  const { openChatTab, setActiveProjectId, theme } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('scenario-1');
  const isLight = theme === 'light';

  const activeScenario = MOCK_SCENARIOS.find((s) => s.id === selectedScenarioId) ?? MOCK_SCENARIOS[0];

  const handleSelect = (scenario: MockScenarioMeta) => {
    setSelectedScenarioId(scenario.id);
    setIsOpen(false);
    if (scenario.activeProjectId) {
      setActiveProjectId(scenario.activeProjectId);
    }
    if (scenario.initialActiveThreadId) {
      openChatTab(scenario.initialActiveThreadId);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-[9999] font-sans">
      {/* Floating Pill Trigger */}
      <div className="flex items-center gap-1.5 shadow-xl rounded-full p-1 border backdrop-blur-md transition-all">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-colors cursor-pointer ${
            isLight
              ? 'bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-700/40 shadow-xs'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-400/40 shadow-xs'
          }`}
          title="Switch prototype scenario"
          aria-label="Prototype Scenarios"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span className="font-semibold tracking-tight">Prototype:</span>
          <span className="truncate max-w-[140px] opacity-90">{activeScenario.name}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Scenario Picker Dropdown */}
      {isOpen && (
        <div
          className={`absolute bottom-11 right-0 w-[380px] max-h-[520px] overflow-hidden flex flex-col rounded-2xl shadow-2xl border backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
            isLight
              ? 'bg-white/95 border-neutral-200 text-neutral-900'
              : 'bg-neutral-900/95 border-neutral-700 text-neutral-100'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <div>
                <h4 className="text-[12.5px] font-semibold leading-none">Mediobot Prototype Scenarios</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">15 Realistic Google AI Studio Navigable States</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Banner */}
          <div className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[10.5px] text-amber-500 dark:text-amber-400 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Prototype environment runs 100% offline with zero external API spend. All data is synthetic.</span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {MOCK_SCENARIOS.map((s) => {
              const isSelected = s.id === selectedScenarioId;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${
                    isSelected
                      ? isLight
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-950'
                        : 'bg-indigo-950/40 border border-indigo-700/50 text-indigo-200'
                      : isLight
                      ? 'hover:bg-neutral-100 text-neutral-700'
                      : 'hover:bg-neutral-800/60 text-neutral-300'
                  }`}
                >
                  <span
                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {s.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[12px] font-medium truncate">{s.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 opacity-70 shrink-0">
                        {s.conversationLevel.split(' - ')[0]}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-neutral-400 line-clamp-2 mt-0.5">{s.description}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

