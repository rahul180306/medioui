import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Zap,
  RotateCcw,
  Lock,
  Copy,
  Check,
  Server,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { runtimeInstance } from '../../runtime/client';

interface KeyStatus {
  isConfigured: boolean;
  isCustomOverride: boolean;
  isEnvConfigured: boolean;
  maskedKey: string | null;
}

interface ExperientialKeyStatus {
  isConfigured: boolean;
  isCustomOverride: boolean;
  isEnvConfigured: boolean;
  maskedKey: string | null;
  baseUrl: string;
  modelId: string;
}

interface ValidationResult {
  valid: boolean;
  usedModel?: string;
  latencyMs?: number;
  maskedKey?: string;
  isCustomOverride?: boolean;
  isEnvConfigured?: boolean;
  message?: string;
  error?: string;
}

type CredentialStatusRead = 'checking' | 'available' | 'unavailable';

interface ExperientialTestResult {
  success: boolean;
  model?: string;
  reply?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: string;
}

export const GeminiApiKeyManager: React.FC = () => {
  const { theme } = useApp();
  const isLight = theme === 'light';
  const isOfflineFixture = runtimeInstance.runtimeKind === 'offline-fixture';

  const [activeSection, setActiveSection] = useState<'experiential' | 'gemini'>('experiential');

  // Experiential State
  const [explabsInputKey, setExplabsInputKey] = useState('');
  const [showExplabsKey, setShowExplabsKey] = useState(false);
  const [explabsStatus, setExplabsStatus] = useState<ExperientialKeyStatus>({
    isConfigured: false,
    isCustomOverride: false,
    isEnvConfigured: false,
    maskedKey: null,
    baseUrl: 'https://api.experientiallabs.ai/v1',
    modelId: 'deepseek-v4.1-flash',
  });
  const [explabsLoading, setExplabsLoading] = useState(true);
  const [explabsStatusRead, setExplabsStatusRead] = useState<CredentialStatusRead>('checking');
  const [explabsTesting, setExplabsTesting] = useState(false);
  const [explabsSaving, setExplabsSaving] = useState(false);
  const [explabsResult, setExplabsResult] = useState<ExperientialTestResult | null>(null);
  const [explabsCopiedCmd, setExplabsCopiedCmd] = useState(false);

  // Gemini State
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<KeyStatus>({
    isConfigured: false,
    isCustomOverride: false,
    isEnvConfigured: false,
    maskedKey: null,
  });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [geminiStatusRead, setGeminiStatusRead] = useState<CredentialStatusRead>('checking');
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const experientialCredentialConfirmed = explabsStatusRead === 'available' && explabsStatus.isConfigured;
  const experientialCredentialMissing = explabsStatusRead === 'available' && !explabsStatus.isConfigured;
  const geminiCredentialConfirmed = geminiStatusRead === 'available' && status.isConfigured;
  const geminiCredentialMissing = geminiStatusRead === 'available' && !status.isConfigured;

  // Fetch initial statuses
  const fetchExperientialStatus = async () => {
    if (isOfflineFixture) return;
    try {
      setExplabsLoading(true);
      setExplabsStatusRead('checking');
      const res = await fetch('/api/experiential/key-status');
      if (!res.ok) throw new Error(`Credential status request failed (${res.status})`);
      const data = await res.json();
      if (typeof data?.isConfigured !== 'boolean') throw new Error('Credential status response was invalid');
      setExplabsStatus(data);
      setExplabsStatusRead('available');
    } catch (err) {
      console.warn('Failed to fetch Experiential status:', err);
      setExplabsStatusRead('unavailable');
    } finally {
      setExplabsLoading(false);
    }
  };

  const fetchGeminiStatus = async () => {
    if (isOfflineFixture) return;
    try {
      setLoadingStatus(true);
      setGeminiStatusRead('checking');
      const res = await fetch('/api/gemini/key-status');
      if (!res.ok) throw new Error(`Credential status request failed (${res.status})`);
      const data = await res.json();
      if (typeof data?.isConfigured !== 'boolean') throw new Error('Credential status response was invalid');
      setStatus(data);
      setGeminiStatusRead('available');
    } catch (err) {
      console.warn('Failed to fetch Gemini key status:', err);
      setGeminiStatusRead('unavailable');
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOfflineFixture) {
      setExplabsLoading(false);
      setLoadingStatus(false);
      setExplabsStatusRead('unavailable');
      setGeminiStatusRead('unavailable');
      setExplabsStatus({
        isConfigured: false,
        isCustomOverride: false,
        isEnvConfigured: false,
        maskedKey: null,
        baseUrl: 'https://api.experientiallabs.ai/v1',
        modelId: 'deepseek-v4.1-flash',
      });
      setStatus({
        isConfigured: false,
        isCustomOverride: false,
        isEnvConfigured: false,
        maskedKey: null,
      });
      return;
    }
    fetchExperientialStatus();
    fetchGeminiStatus();
  }, []);

  // Save / Override Experiential Key
  const handleSaveExplabsKey = async () => {
    if (isOfflineFixture) return;
    setExplabsSaving(true);
    setExplabsResult(null);
    try {
      const res = await fetch('/api/experiential/save-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: explabsInputKey.trim() || undefined }),
      });
      if (res.ok) {
        await fetchExperientialStatus();
        setExplabsInputKey('');
      }
    } catch (err) {
      console.warn('Failed to save Experiential key:', err);
    } finally {
      setExplabsSaving(false);
    }
  };

  // Run Experiential Test Call
  const handleTestExplabsCall = async () => {
    if (isOfflineFixture) return;
    setExplabsTesting(true);
    setExplabsResult(null);
    try {
      const res = await fetch('/api/experiential/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: explabsInputKey.trim() || undefined }),
      });
      const data = await res.json();
      setExplabsResult(data);
      if (data.success) {
        await fetchExperientialStatus();
      }
    } catch (err: any) {
      setExplabsResult({
        success: false,
        error: err?.message || 'Network error communicating with Experiential gateway.',
      });
    } finally {
      setExplabsTesting(false);
    }
  };

  // Validate Gemini key
  const handleValidateGemini = async (save = false) => {
    if (isOfflineFixture) return;
    const keyToTest = inputKey.trim();
    if (!keyToTest && !status.isConfigured) {
      setValidationResult({
        valid: false,
        error: 'Please enter a Gemini API key to validate.',
      });
      return;
    }

    if (save) setSaving(true);
    else setValidating(true);
    setValidationResult(null);

    try {
      const res = await fetch('/api/gemini/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: keyToTest || undefined,
          save,
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setValidationResult({
          valid: true,
          usedModel: data.usedModel,
          latencyMs: data.latencyMs,
          maskedKey: data.maskedKey,
          isCustomOverride: data.isCustomOverride,
          isEnvConfigured: data.isEnvConfigured,
          message: data.message || 'Credentials validated successfully.',
        });
        if (save) {
          setInputKey('');
          await fetchGeminiStatus();
        }
      } else {
        setValidationResult({
          valid: false,
          error: data.error || 'Failed to validate credentials.',
        });
      }
    } catch (err: any) {
      setValidationResult({
        valid: false,
        error: err?.message || 'Network error communicating with validation server.',
      });
    } finally {
      setValidating(false);
      setSaving(false);
    }
  };

  // Clear Gemini key
  const handleClearGeminiKey = async () => {
    if (isOfflineFixture) return;
    setClearing(true);
    setValidationResult(null);
    try {
      const res = await fetch('/api/gemini/clear-key', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setInputKey('');
        await fetchGeminiStatus();
        setValidationResult({
          valid: true,
          message: 'Reset to environment default credentials.',
          maskedKey: data.maskedKey,
        });
      }
    } catch (err: any) {
      setValidationResult({
        valid: false,
        error: err?.message || 'Failed to reset key.',
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-3xl">
      {/* Header */}
      <div>
        <h1 className={`text-[26px] font-semibold tracking-tight ${isLight ? 'text-[#111827]' : 'text-white'}`}>
          API Keys & Gateway Credentials
        </h1>
        <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-[#4b5563]' : 'text-neutral-400'}`}>
          {isOfflineFixture
            ? 'Provider configuration and testing are disabled in the selected offline fixture.'
            : 'Configure credentials for real-time model executions and OpenAI-compatible gateways.'}
        </p>
      </div>

      {isOfflineFixture && (
        <div
          data-testid="controlled-demo-banner"
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
            isLight
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
          <span>Controlled demonstration: Provider credential mutation disabled in offline fixture mode</span>
        </div>
      )}

      {/* Tabs */}
      <div className={`flex items-center gap-2 border-b pb-1 ${isLight ? 'border-[#e2e4e8]' : 'border-[#292830]'}`}>
        <button
          onClick={() => setActiveSection('experiential')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 ${
            activeSection === 'experiential'
              ? isLight
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
              : isLight
              ? 'text-neutral-600 hover:text-black hover:bg-neutral-100'
              : 'text-neutral-400 hover:text-white hover:bg-[#25242d]'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>{isOfflineFixture ? 'Experiential Gateway · Unavailable offline' : 'Experiential Gateway (EXPLABS_API_KEY)'}</span>
          <span className="w-2 h-2 rounded-full bg-neutral-500 inline-block" aria-label="Provider connection not verified" />
        </button>

        <button
          onClick={() => setActiveSection('gemini')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 ${
            activeSection === 'gemini'
              ? isLight
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
              : isLight
              ? 'text-neutral-600 hover:text-black hover:bg-neutral-100'
              : 'text-neutral-400 hover:text-white hover:bg-[#25242d]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isOfflineFixture ? 'Google Gemini · Unavailable offline' : 'Google Gemini (GEMINI_API_KEY)'}</span>
          <span className="w-2 h-2 rounded-full bg-neutral-500 inline-block" aria-label="Provider connection not verified" />
        </button>
      </div>

      {activeSection === 'experiential' ? (
        <div className="space-y-5">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
              experientialCredentialConfirmed
                ? isLight
                  ? 'bg-neutral-50 border-neutral-200 text-neutral-800'
                  : 'bg-[#1d1d23] border-[#2c2b36] text-neutral-200'
                : experientialCredentialMissing && isLight
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : experientialCredentialMissing
                ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                : isLight ? 'bg-neutral-50 border-neutral-200 text-neutral-700' : 'bg-[#1d1d23] border-[#2c2b36] text-neutral-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  experientialCredentialConfirmed
                    ? isLight
                      ? 'bg-neutral-100 text-neutral-600'
                      : 'bg-[#25242d] text-neutral-400'
                    : experientialCredentialMissing && isLight
                    ? 'bg-amber-100 text-amber-700'
                    : experientialCredentialMissing
                    ? 'bg-amber-900/60 text-amber-400'
                    : isLight ? 'bg-neutral-100 text-neutral-600' : 'bg-[#25242d] text-neutral-400'
                }`}
              >
                {experientialCredentialConfirmed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
              </div>
              <div className="space-y-1">
                <div className="text-[13.5px] font-semibold flex items-center gap-2">
                  <span>
                    {isOfflineFixture
                      ? 'Experiential Gateway unavailable in offline fixture'
                      : experientialCredentialConfirmed
                      ? 'Experiential credential configured'
                      : experientialCredentialMissing
                      ? 'EXPLABS_API_KEY Not Configured'
                      : explabsStatusRead === 'checking' ? 'Checking Experiential credential status' : 'Experiential credential status unavailable'}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                      experientialCredentialConfirmed
                        ? isLight
                          ? 'bg-neutral-100 text-neutral-700 border-neutral-300'
                          : 'bg-[#25242d] text-neutral-300 border-[#363542]'
                        : experientialCredentialMissing && isLight
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : experientialCredentialMissing
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : isLight ? 'bg-neutral-100 text-neutral-600 border-neutral-300' : 'bg-[#25242d] text-neutral-400 border-[#363542]'
                    }`}
                  >
                    {isOfflineFixture ? 'Unavailable' : experientialCredentialConfirmed ? 'Configured' : experientialCredentialMissing ? 'Setup Required' : explabsStatusRead === 'checking' ? 'Checking' : 'Unknown'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  {isOfflineFixture
                    ? 'Provider credentials and readiness are not inspected in the offline fixture.'
                    : explabsStatusRead === 'checking'
                    ? 'Checking whether provider credentials are configured.'
                    : explabsStatusRead === 'unavailable'
                    ? 'Credential configuration could not be determined. Refresh status to retry.'
                    : explabsStatus.isConfigured
                    ? `A credential is configured for ${explabsStatus.baseUrl}; provider reachability and model availability have not been verified.`
                    : 'The EXPLABS_API_KEY environment variable is not set. Create one and export it or enter it below to run on your Experiential credits.'}
                </p>
                {explabsStatus.maskedKey && (
                  <div className="text-[11px] font-mono mt-1 opacity-80">
                    Configured key: <span className="font-semibold">{explabsStatus.maskedKey}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={fetchExperientialStatus}
              disabled={isOfflineFixture || explabsLoading}
              className={`p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-neutral-100 border-[#d8d8de] text-neutral-600'
                  : 'bg-[#25242d] hover:bg-[#2e2d38] border-[#363542] text-neutral-300'
              } ${isOfflineFixture ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isOfflineFixture ? 'Status refresh disabled in controlled demonstration' : 'Refresh status'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${explabsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isOfflineFixture && (
            <div className={`p-4 rounded-xl border text-xs leading-relaxed ${isLight ? 'bg-neutral-50 border-neutral-200 text-neutral-600' : 'bg-[#1a191f] border-[#292830] text-neutral-400'}`}>
              Provider endpoint, model, and credential configuration are not inspected by the offline fixture.
            </div>
          )}
          {!isOfflineFixture && <>
          {/* Configuration Parameters Card */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isLight ? 'bg-[#f8f9fa] border-[#e2e4e8]' : 'bg-[#1a191f] border-[#292830]'
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Gateway Endpoint & Model Binding
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className={`p-3 rounded-lg border ${isLight ? 'bg-white border-[#e2e4e8]' : 'bg-[#222129] border-[#33323e]'}`}>
                <div className="text-[11px] text-neutral-400 mb-1">Base URL</div>
                <div className="font-mono font-medium truncate text-blue-500">
                  https://api.experientiallabs.ai/v1
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${isLight ? 'bg-white border-[#e2e4e8]' : 'bg-[#222129] border-[#33323e]'}`}>
                <div className="text-[11px] text-neutral-400 mb-1">Model ID</div>
                <div className="font-mono font-medium truncate text-neutral-300">
                  deepseek-v4.1-flash
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${isLight ? 'bg-white border-[#e2e4e8]' : 'bg-[#222129] border-[#33323e]'}`}>
                <div className="text-[11px] text-neutral-400 mb-1">Environment Variable</div>
                <div className="font-mono font-medium truncate text-purple-400">
                  EXPLABS_API_KEY
                </div>
              </div>
            </div>
          </div>

          {/* Export Command Helper */}
          <div
            className={`p-4 rounded-xl border space-y-2.5 ${
              isLight ? 'bg-[#f8f9fa] border-[#e2e4e8]' : 'bg-[#1d1d21] border-[#2b2b32]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Terminal className="w-3.5 h-3.5 text-blue-500" />
                <span>Export to Environment</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('export EXPLABS_API_KEY="your-key-here"');
                  setExplabsCopiedCmd(true);
                  setTimeout(() => setExplabsCopiedCmd(false), 2000);
                }}
                className={`text-[11px] px-2 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-neutral-100 text-neutral-700 border border-[#d8d8de]'
                    : 'bg-[#28272f] hover:bg-[#32313b] text-neutral-300 border border-[#3c3b47]'
                }`}
              >
                {explabsCopiedCmd ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{explabsCopiedCmd ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <div className={`p-2.5 rounded-lg font-mono text-xs select-all ${
              isLight ? 'bg-white border border-[#e2e4e8] text-neutral-800' : 'bg-[#141417] border border-[#27262d] text-neutral-300'
            }`}>
              export EXPLABS_API_KEY=&quot;your_experiential_key_here&quot;
            </div>
            <p className={`text-[11.5px] leading-relaxed ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
              After exporting, restart or refresh to authenticate directly from your shell environment.
            </p>
          </div>
          </>}

          {/* Quick Input & Test Call Section */}
          <div
            className={`p-5 rounded-xl border space-y-4 ${
              isLight ? 'bg-white border-[#e2e4e8]' : 'bg-[#1a191f] border-[#292830]'
            }`}
          >
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-neutral-800' : 'text-neutral-200'}`}>
                Enter Experiential API Key for Testing
              </label>
              <div className="relative">
                <input
                  type={showExplabsKey ? 'text' : 'password'}
                  value={explabsInputKey}
                  onChange={(e) => setExplabsInputKey(e.target.value)}
                  placeholder={explabsStatus.maskedKey || 'exp-live-...'}
                  disabled={isOfflineFixture}
                  className={`w-full px-3.5 py-2.5 pr-20 text-xs font-mono rounded-lg border outline-none transition-all ${
                    isOfflineFixture
                      ? 'opacity-60 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800'
                      : isLight
                      ? 'bg-[#fcfcfd] border-[#d8d8de] text-black focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                      : 'bg-[#222129] border-[#363542] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowExplabsKey(!showExplabsKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  {showExplabsKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={handleSaveExplabsKey}
                disabled={isOfflineFixture || explabsSaving || !explabsInputKey.trim()}
                className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  isOfflineFixture || !explabsInputKey.trim()
                    ? 'opacity-50 cursor-not-allowed bg-neutral-600 text-neutral-300'
                    : isLight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                }`}
              >
                {explabsSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Key</span>
              </button>

              <button
                onClick={handleTestExplabsCall}
                disabled={isOfflineFixture || explabsTesting || (!explabsStatus.isConfigured && !explabsInputKey.trim())}
                className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  isOfflineFixture || (!explabsStatus.isConfigured && !explabsInputKey.trim())
                    ? 'opacity-50 cursor-not-allowed bg-neutral-700 text-neutral-400'
                    : isLight
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                }`}
              >
                {explabsTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                <span>Make Test Call (Verify Credits & Tokens)</span>
              </button>
            </div>

            {/* Test Call Results Display */}
            {explabsResult && (
              <div
                className={`p-4 rounded-xl border mt-3 space-y-3 animate-fadeIn ${
                  explabsResult.success
                    ? isLight
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-emerald-950/20 border-emerald-800/40'
                    : isLight
                    ? 'bg-red-50/70 border-red-200'
                    : 'bg-red-950/20 border-red-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {explabsResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={explabsResult.success ? 'text-emerald-500' : 'text-red-500'}>
                      {explabsResult.success
                        ? 'Experiential Gateway Call Succeeded'
                        : 'Experiential Gateway Call Failed'}
                    </span>
                  </div>
                  {explabsResult.model && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {explabsResult.model}
                    </span>
                  )}
                </div>

                {explabsResult.reply && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-medium text-neutral-400">Reply from Model:</div>
                    <div className={`p-2.5 rounded-lg text-xs font-mono leading-relaxed ${
                      isLight ? 'bg-white border border-[#e2e4e8] text-neutral-900' : 'bg-[#18171d] border border-[#2c2b36] text-neutral-200'
                    }`}>
                      {explabsResult.reply}
                    </div>
                  </div>
                )}

                {explabsResult.usage && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-medium text-neutral-400">Experiential Token Usage:</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`p-2 rounded border text-center ${isLight ? 'bg-white border-neutral-200' : 'bg-[#1a191f] border-neutral-800'}`}>
                        <div className="text-[10px] text-neutral-400">Prompt Tokens</div>
                        <div className="font-mono text-sm font-semibold text-blue-500">
                          {explabsResult.usage.prompt_tokens ?? 0}
                        </div>
                      </div>
                      <div className={`p-2 rounded border text-center ${isLight ? 'bg-white border-neutral-200' : 'bg-[#1a191f] border-neutral-800'}`}>
                        <div className="text-[10px] text-neutral-400">Completion Tokens</div>
                        <div className="font-mono text-sm font-semibold text-emerald-500">
                          {explabsResult.usage.completion_tokens ?? 0}
                        </div>
                      </div>
                      <div className={`p-2 rounded border text-center ${isLight ? 'bg-white border-neutral-200' : 'bg-[#1a191f] border-neutral-800'}`}>
                        <div className="text-[10px] text-neutral-400">Total Tokens</div>
                        <div className="font-mono text-sm font-semibold text-purple-400">
                          {explabsResult.usage.total_tokens ?? 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {explabsResult.error && (
                  <div className="text-xs text-red-400 leading-relaxed font-mono">
                    {explabsResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Gemini Section */
        <div className="space-y-5">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
              geminiCredentialConfirmed
                ? isLight
                  ? 'bg-neutral-50 border-neutral-200 text-neutral-800'
                  : 'bg-[#1d1d23] border-[#2c2b36] text-neutral-200'
                : geminiCredentialMissing && isLight
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : geminiCredentialMissing
                ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                : isLight ? 'bg-neutral-50 border-neutral-200 text-neutral-700' : 'bg-[#1d1d23] border-[#2c2b36] text-neutral-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  geminiCredentialConfirmed
                    ? isLight
                      ? 'bg-neutral-100 text-neutral-600'
                      : 'bg-[#25242d] text-neutral-400'
                    : geminiCredentialMissing && isLight
                    ? 'bg-amber-100 text-amber-700'
                    : geminiCredentialMissing
                    ? 'bg-amber-900/60 text-amber-400'
                    : isLight ? 'bg-neutral-100 text-neutral-600' : 'bg-[#25242d] text-neutral-400'
                }`}
              >
                {geminiCredentialConfirmed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
              </div>
              <div className="space-y-1">
                <div className="text-[13.5px] font-semibold flex items-center gap-2">
                  <span>
                    {isOfflineFixture
                      ? 'Google Gemini unavailable in offline fixture'
                      : geminiCredentialConfirmed
                      ? 'Google Gemini credential configured'
                      : geminiCredentialMissing
                      ? 'Gemini Key Not Configured'
                      : geminiStatusRead === 'checking' ? 'Checking Google Gemini credential status' : 'Google Gemini credential status unavailable'}
                  </span>
                  {status.isCustomOverride && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      Custom Override
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  {isOfflineFixture
                    ? 'Provider credentials and model readiness are not inspected in the offline fixture.'
                    : geminiStatusRead === 'checking'
                    ? 'Checking whether provider credentials are configured.'
                    : geminiStatusRead === 'unavailable'
                    ? 'Credential configuration could not be determined. Refresh status to retry.'
                    : status.isConfigured
                    ? 'A Gemini credential is configured; provider reachability and model availability have not been verified.'
                    : 'No API key detected. Provide your Gemini key to enable live model reasoning.'}
                </p>
                {status.maskedKey && (
                  <div className="text-[11px] font-mono mt-1 opacity-80">
                    Configured key: <span className="font-semibold">{status.maskedKey}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={fetchGeminiStatus}
              disabled={isOfflineFixture || loadingStatus}
              className={`p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-neutral-100 border-[#d8d8de] text-neutral-600'
                  : 'bg-[#25242d] hover:bg-[#2e2d38] border-[#363542] text-neutral-300'
              } ${isOfflineFixture ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isOfflineFixture ? 'Status refresh disabled in controlled demonstration' : 'Refresh status'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Key Input */}
          <div
            className={`p-5 rounded-xl border space-y-4 ${
              isLight ? 'bg-white border-[#e2e4e8]' : 'bg-[#1a191f] border-[#292830]'
            }`}
          >
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-neutral-800' : 'text-neutral-200'}`}>
                {status.isConfigured ? 'Update Gemini API Key' : 'Enter Gemini API Key'}
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder={status.maskedKey || 'AIzaSy...'}
                  disabled={isOfflineFixture}
                  className={`w-full px-3.5 py-2.5 pr-20 text-xs font-mono rounded-lg border outline-none transition-all ${
                    isOfflineFixture
                      ? 'opacity-60 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800'
                      : isLight
                      ? 'bg-[#fcfcfd] border-[#d8d8de] text-black focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                      : 'bg-[#222129] border-[#363542] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={() => handleValidateGemini(true)}
                disabled={isOfflineFixture || saving || validating || !inputKey.trim()}
                className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  isOfflineFixture || !inputKey.trim()
                    ? 'opacity-50 cursor-not-allowed bg-neutral-600 text-neutral-300'
                    : isLight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                }`}
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Validate & Save Key</span>
              </button>

              <button
                onClick={() => handleValidateGemini(false)}
                disabled={isOfflineFixture || validating || saving || (!inputKey.trim() && !status.isConfigured)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium border flex items-center gap-2 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-neutral-100 border-[#d8d8de] text-neutral-700'
                    : 'bg-[#25242d] hover:bg-[#2e2d38] border-[#363542] text-neutral-200'
                }`}
              >
                {validating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
                <span>Test Key (Ping)</span>
              </button>

              {status.isCustomOverride && (
                <button
                  onClick={handleClearGeminiKey}
                  disabled={isOfflineFixture || clearing}
                  className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-red-400 hover:bg-red-500/10`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>
              )}
            </div>

            {/* Validation Feedback */}
            {validationResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fadeIn ${
                  validationResult.valid
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                    : isLight
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-red-950/30 border-red-800/50 text-red-200'
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {validationResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span>{validationResult.valid ? 'Credentials Valid' : 'Validation Failed'}</span>
                </div>
                <div className="opacity-90">{validationResult.message || validationResult.error}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
