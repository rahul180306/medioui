import React, { useState } from 'react';
import { useApp } from '../../state/AppContext';
import { X, Settings, Cpu, Shield, Keyboard, Check, Layers, Zap, Sparkles } from 'lucide-react';
import { ApprovalMode, ModelOption } from '../../types';
import { runtimeInstance } from '../../runtime/client';

export const SettingsModal: React.FC = () => {
  const {
    approvalMode,
    setApprovalMode,
    model,
    setModel,
    setActiveModal,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'models' | 'runtime' | 'shortcuts'>('models');
  const isOfflineFixture = runtimeInstance.runtimeKind === 'offline-fixture';

  const approvalOptions: ApprovalMode[] = [
    'Ask for approval',
    'Approve for me',
    'Full access',
  ];

  const geminiModels: { name: ModelOption; badge: string; tag: string; context: string }[] = [
    { name: 'Gemini 3.8 Flash', badge: 'Example', tag: 'Display label only', context: 'availability unknown' },
    { name: 'Gemini 3.1 Pro Preview', badge: 'Example', tag: 'Display label only', context: 'availability unknown' },
    { name: 'Gemini 3.1 Flash Lite', badge: 'Example', tag: 'Display label only', context: 'availability unknown' },
    { name: 'Gemini 3.8 Live', badge: 'Example', tag: 'Display label only', context: 'availability unknown' },
    { name: 'Gemini 3.1 Flash Image', badge: 'Example', tag: 'Display label only', context: 'availability unknown' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-xl bg-[#17171c] border border-[#2b2b34] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#24242c]">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-semibold text-neutral-100">Preferences & Runtime</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-[#25252e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#24242c] px-5 gap-4 text-xs font-medium text-neutral-400">
          <button
            onClick={() => setActiveTab('models')}
            className={`py-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'models'
                ? 'border-neutral-200 text-white'
                : 'border-transparent hover:text-neutral-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Models & Keys</span>
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-neutral-200 text-white'
                : 'border-transparent hover:text-neutral-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>General & Approvals</span>
          </button>

          <button
            onClick={() => setActiveTab('runtime')}
            className={`py-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'runtime'
                ? 'border-neutral-200 text-white'
                : 'border-transparent hover:text-neutral-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Mediobot Integration Layer</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`py-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'shortcuts'
                ? 'border-neutral-200 text-white'
                : 'border-transparent hover:text-neutral-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-neutral-300">
          {activeTab === 'models' && (
            <div className="space-y-4">
              {/* Architecture Deep Dive Callout */}
              <div className="p-3.5 rounded-xl bg-[#1e2027] border border-[#2b303e] space-y-2">
                <div className="flex items-center gap-2 text-neutral-100 font-medium text-xs">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>How Coding Agents (Codex, Claude Code, OpenCode) Manage Models</span>
                </div>
                <p className="text-[11.5px] text-neutral-400 leading-relaxed">
                  Coding agents store credentials in local config trees (e.g. <code className="text-neutral-300 bg-[#16171d] px-1 py-0.5 rounded">~/.codex/config.json</code> or <code className="text-neutral-300 bg-[#16171d] px-1 py-0.5 rounded">~/.opencode/providers.json</code>). When an API key is connected, the agent queries the provider's model catalog dynamically and registers active capabilities (reasoning tokens, tool declarations, context windows).
                </p>
              </div>

              {/* Runtime/provider status is derived from the selected runtime; no status probe is issued here. */}
              <div className="p-3.5 rounded-xl bg-[#1d1d23] border border-[#2c2b36] space-y-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-neutral-400" />
                  <span className="font-semibold text-neutral-100 text-xs">Provider connection status</span>
                </div>
                <p className="text-[11.5px] text-neutral-400 leading-relaxed">
                  {isOfflineFixture
                    ? 'No provider is connected in the selected offline fixture. Credentials are not read, stored, or tested by this runtime.'
                    : 'The selected backend runtime does not expose verified provider connection status in this panel.'}
                </p>
                <div className="p-2.5 rounded-lg bg-[#16161b] border border-[#24232c] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-neutral-500" />
                  <span className="text-[11.5px] text-neutral-200 font-medium">
                    {isOfflineFixture ? 'Not connected · offline fixture' : 'Connection status not verified'}
                  </span>
                </div>
              </div>

              {/* Model names below are UI labels, not a verified provider catalog. */}
              <div className="p-3.5 rounded-xl bg-[#1d1d23] border border-[#2c2b36] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neutral-500" />
                    <span className="font-semibold text-neutral-100 text-xs">Model labels</span>
                  </div>
                </div>

                <div className="text-[11.5px] text-neutral-400 space-y-1 bg-[#16161b] p-2.5 rounded-lg border border-[#24232c]">
                  <span>These names are display examples only. Provider availability, credentials, and model capabilities have not been checked.</span>
                </div>

                {/* Available Gemini Models */}
                <div>
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    Example model names
                  </div>
                  <div className="space-y-1.5">
                    {geminiModels.map((m) => (
                      <div
                        key={m.name}
                        onClick={() => setModel(m.name)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          model === m.name
                            ? 'border-neutral-300 bg-[#25242d] text-white'
                            : 'border-[#292832] hover:border-neutral-500 bg-[#1a1920] text-neutral-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-neutral-100">{m.name}</span>
                            <span className="text-[10px] text-neutral-400 bg-[#2c2b36] border border-[#3b3a48] px-1.5 py-0.5 rounded">
                              {m.badge}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">
                            {m.tag} · {m.context}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {model === m.name && <Check className="w-4 h-4 text-neutral-300 stroke-[2.2]" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-neutral-400 font-medium mb-1.5">
                  {isOfflineFixture ? 'Default Agent Model Label' : 'Default Agent Model'}
                </label>
                {isOfflineFixture && (
                  <p className="mb-2 text-[11px] leading-relaxed text-neutral-500">
                    Display preference only. The offline fixture does not send requests to any model.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {geminiModels.map((opt) => (
                    <button
                      key={opt.name}
                      onClick={() => setModel(opt.name)}
                      className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                        model === opt.name
                          ? 'border-neutral-400 bg-[#23232b] text-white'
                          : 'border-[#2d2d37] hover:border-neutral-500 text-neutral-300'
                      }`}
                    >
                      <span className="truncate">{opt.name}</span>
                      {model === opt.name && <Check className="w-3.5 h-3.5 text-neutral-200 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-neutral-400 font-medium mb-1.5">
                  Default Approval Policy
                </label>
                <div className="space-y-1.5">
                  {approvalOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setApprovalMode(opt)}
                      className={`w-full px-3 py-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                        approvalMode === opt
                          ? 'border-neutral-400 bg-[#23232b] text-white'
                          : 'border-[#2d2d37] hover:border-neutral-500 text-neutral-300'
                      }`}
                    >
                      <span>{opt}</span>
                      {approvalMode === opt && <Check className="w-3.5 h-3.5 text-neutral-200 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'runtime' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#121216] border border-[#26262e] rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-neutral-200 font-semibold">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Planned Integration Architecture</span>
                </div>
                <div className="font-mono text-[11px] leading-relaxed text-neutral-400 bg-[#16161b] p-3 rounded border border-[#222228] select-all">
                  Coding Chat UI (V0 Standing App)<br />
                  &nbsp;&nbsp;↓<br />
                  Mediobot Integration Layer (Bridge Transport)<br />
                  &nbsp;&nbsp;↓<br />
                  Mediobot Agent Runtime<br />
                  &nbsp;&nbsp;↓<br />
                  ComputerUseProvider<br />
                  &nbsp;&nbsp;↓<br />
                  Perception + Vision + Kernel + Browser/OS
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  This diagram is a target design, not a report of active connections. The selected runtime is {isOfflineFixture ? 'an offline fixture; provider, host terminal, and computer-use execution are unavailable.' : 'a backend client; provider and execution readiness are not verified by this panel.'}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-[#24242c]">
                  <span className="text-neutral-400">Selected runtime</span>
                  <span className="font-mono text-neutral-300">
                    {isOfflineFixture ? 'Offline fixture · simulated only' : 'Backend client · readiness unverified'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#24242c]">
                  <span className="text-neutral-400">Computer-use integration</span>
                  <span className="font-mono text-neutral-300">Planned · not active</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-[#24242c]">
                <span className="text-neutral-300">Submit prompt</span>
                <kbd className="px-2 py-0.5 rounded bg-[#23232b] text-[11px] font-mono border border-[#32323d] text-neutral-300">
                  Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#24242c]">
                <span className="text-neutral-300">New line in prompt</span>
                <kbd className="px-2 py-0.5 rounded bg-[#23232b] text-[11px] font-mono border border-[#32323d] text-neutral-300">
                  Shift + Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#24242c]">
                <span className="text-neutral-300">Toggle Threads Drawer</span>
                <kbd className="px-2 py-0.5 rounded bg-[#23232b] text-[11px] font-mono border border-[#32323d] text-neutral-300">
                  Panel Icon [|]
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#24242c]">
                <span className="text-neutral-300">New conversation</span>
                <kbd className="px-2 py-0.5 rounded bg-[#23232b] text-[11px] font-mono border border-[#32323d] text-neutral-300">
                  Home / [+]
                </kbd>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#24242c] bg-[#141418] flex justify-end">
          <button
            onClick={() => setActiveModal(null)}
            className="px-4 py-1.5 bg-neutral-200 hover:bg-white text-neutral-900 font-medium rounded-lg text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
