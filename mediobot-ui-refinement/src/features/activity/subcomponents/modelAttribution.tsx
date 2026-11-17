import React from 'react';

// ---------------------------------------------------------------------------
// M3: Model Attribution Helpers
// ---------------------------------------------------------------------------

/** Comprehensive model display dictionary covering all target parallel guidance models */
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // Anthropic Claude
  'claude-3-7-sonnet': 'Claude 3.7 Sonnet',
  'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
  'claude-3-5-haiku': 'Claude 3.5 Haiku',
  'claude-3-opus': 'Claude 3 Opus',
  'claude-sonnet-4': 'Claude Sonnet 4',
  'claude-opus-4': 'Claude Opus 4',
  // DeepSeek
  'deepseek-v4-1-flash-uncensored': 'DeepSeek-V4.1-Flash (Uncensored)',
  'deepseek-v4-1-flash': 'DeepSeek-V4.1-Flash',
  'deepseek-chat': 'DeepSeek-V3',
  'deepseek-v3': 'DeepSeek-V3',
  'deepseek-reasoner': 'DeepSeek-R1',
  'deepseek-r1': 'DeepSeek-R1',
  // OpenAI
  'gpt-6-luna': 'GPT-6 Luna',
  'o3-mini': 'o3-mini',
  'o3': 'o3',
  'o1-mini': 'o1-mini',
  'o1': 'o1',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o mini',
  // Google Gemini
  'gemini-2-5-flash': 'Gemini 2.5 Flash',
  'gemini-2-5-pro': 'Gemini 2.5 Pro',
  'gemini-2-0-flash': 'Gemini 2.0 Flash',
  'gemini-1-5-pro': 'Gemini 1.5 Pro',
  // Meta AI / Muse
  'muse-spark-1-3': 'Muse Spark 1.3',
  'muse-spark-1-3-contributor': 'Muse Spark 1.3 Contributor',
  'muse-spark-1-2': 'Muse Spark 1.2',
  'muse-spark-1-1': 'Muse Spark 1.1',
  'muse-wonder-1-0': 'Muse Wonder 1.0',
  'sam-3-1': 'SAM 3.1',
  'muse-image-1-0': 'Muse Image 1.0',
  'muse-voice-transcribe-1-0': 'Muse Voice Transcribe',
  // Open Source / Local / Fast
  'llama-3-3-70b': 'Llama 3.3 70B',
  'minimax-m2-7': 'MiniMax-M2.7',
  'minimaxai-minimax-m2-7': 'MiniMax-M2.7',
};

/** Normalizes dots, slashes, underscores, and colons to cleanly match model IDs */
export function resolveModelDisplay(modelId?: string): string | null {
  if (!modelId) return null;
  const normalized = modelId.toLowerCase().replace(/[/_.:\s]+/g, '-');
  if (MODEL_DISPLAY_NAMES[normalized]) {
    return MODEL_DISPLAY_NAMES[normalized]!;
  }
  // Sort keys by length descending so specific keys (e.g. 'gpt-4o-mini') match before prefixes (e.g. 'gpt-4o')
  const sortedEntries = Object.entries(MODEL_DISPLAY_NAMES).sort((a, b) => b[0].length - a[0].length);
  for (const [key, label] of sortedEntries) {
    if (normalized.includes(key)) return label;
  }
  // Fallback: extract last segment
  const fallback = modelId.split('/').pop()?.split(':')[0]?.trim();
  return fallback || null;
}

/** Resolves family-specific styling tint classes */
export function getModelBadgeColors(modelDisplay: string, isLight: boolean): string {
  const lower = modelDisplay.toLowerCase();
  if (lower.includes('claude')) {
    return isLight
      ? 'bg-purple-50 text-purple-700 border-purple-200/70'
      : 'bg-purple-950/40 text-purple-300 border-purple-700/30';
  }
  if (lower.includes('deepseek')) {
    return isLight
      ? 'bg-sky-50 text-sky-700 border-sky-200/70'
      : 'bg-sky-950/40 text-sky-300 border-sky-700/30';
  }
  if (lower.includes('o3') || lower.includes('o1') || lower.includes('gpt')) {
    return isLight
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
      : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/30';
  }
  if (lower.includes('gemini')) {
    return isLight
      ? 'bg-amber-50 text-amber-800 border-amber-200/70'
      : 'bg-amber-950/40 text-amber-300 border-amber-700/30';
  }
  if (lower.includes('muse') || lower.includes('meta') || lower.includes('sam')) {
    return isLight
      ? 'bg-blue-50 text-blue-700 border-blue-200/70'
      : 'bg-blue-950/40 text-blue-300 border-blue-700/30';
  }
  return isLight
    ? 'bg-neutral-100 text-neutral-700 border-neutral-200/70'
    : 'bg-neutral-800/50 text-neutral-300 border-neutral-700/30';
}

// ---------------------------------------------------------------------------
// M3: Telemetry Pill Component & Contracts
// ---------------------------------------------------------------------------

export interface ModelExecutionTelemetry {
  modelId?: string;
  providerName?: string;
  specialistId?: string;
  ttftMs?: number;
  ttfbMs?: number;
  tokensPerSecond?: number;
  outputTokens?: number;
  inputTokens?: number;
  durationMs?: number;
  stdoutBytes?: number;
  stderrBytes?: number;
  status?: 'running' | 'completed' | 'failed' | 'cancelled';
}

// ---------------------------------------------------------------------------
// M3: Model Attribution Badge Component
// ---------------------------------------------------------------------------

export interface ModelBadgeProps {
  modelId?: string;
  specialistName?: string;
  isLight: boolean;
  isRunning?: boolean;
}

export const ModelAttributionBadge: React.FC<ModelBadgeProps> = ({ modelId, isLight, isRunning }) => {
  const modelDisplay = resolveModelDisplay(modelId);
  // When modelId is absent, do NOT duplicate specialistName
  if (!modelDisplay) return null;

  const colorClasses = getModelBadgeColors(modelDisplay, isLight);

  return (
    <span
      data-testid="model-attribution-badge"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium shrink-0 transition-opacity border ${colorClasses} ${
        isRunning ? 'opacity-100' : 'opacity-75'
      }`}
    >
      {isRunning && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {modelDisplay}
    </span>
  );
};
