import { useMemo } from 'react';
import type { Thread, Turn } from '../../types';

export interface ConversationTokenMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextLimit: number;
  percentage: number;
  formattedInput: string;
  formattedOutput: string;
  formattedTotal: string;
  formattedLimit: string;
  modelName: string;
  isStreaming: boolean;
  turnCount: number;
}

export function formatTokenNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}k`;
  }
  return num.toLocaleString();
}

export function useConversationTokenMetrics(
  thread: Thread | null,
  activeModelName?: string
): ConversationTokenMetrics {
  return useMemo(() => {
    if (!thread || !thread.turns || thread.turns.length === 0) {
      const model = activeModelName || 'deepseek-v4.1-flash';
      const limit = model.toLowerCase().includes('deepseek') ? 131_072 : 1_048_576;
      return {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        contextLimit: limit,
        percentage: 0,
        formattedInput: '0',
        formattedOutput: '0',
        formattedTotal: '0',
        formattedLimit: formatTokenNumber(limit),
        modelName: model,
        isStreaming: false,
        turnCount: 0,
      };
    }

    let inputTokens = 0;
    let outputTokens = 0;
    let hasRunningTurn = false;

    for (const turn of thread.turns) {
      if (turn.status === 'running') {
        hasRunningTurn = true;
      }

      // Check if explicit token usage is recorded on turn
      const explicitUsage = (turn as any).usage || (turn as any).tokenUsage;
      if (explicitUsage) {
        inputTokens += explicitUsage.prompt_tokens || explicitUsage.promptTokens || 0;
        outputTokens += explicitUsage.completion_tokens || explicitUsage.completionTokens || 0;
        continue;
      }

      // Calculate based on items
      let turnInputChars = 0;
      let turnOutputChars = 0;

      if (turn.prompt) {
        turnInputChars += turn.prompt.length;
      }

      for (const item of turn.items || []) {
        if (item.type === 'user_message') {
          turnInputChars += item.text?.length || 0;
        } else if (item.type === 'agent_message') {
          turnOutputChars += item.text?.length || 0;
        } else if (item.type === 'tool_execution') {
          turnOutputChars += (item.tool?.command?.length || 0) + (item.tool?.outputLog?.length || 0);
        } else if (item.type === 'diff') {
          const diffText = JSON.stringify(item.diff || '');
          turnOutputChars += diffText.length;
        }
      }

      // Token approximation (~3.8 chars per token for code & conversation)
      const approxInput = Math.max(12, Math.round(turnInputChars / 3.8));
      const approxOutput = turnOutputChars > 0 ? Math.max(8, Math.round(turnOutputChars / 3.6)) : 0;

      inputTokens += approxInput;
      outputTokens += approxOutput;
    }

    // Add streaming buffer if turn is currently executing
    if (hasRunningTurn) {
      outputTokens += 64;
    }

    const totalTokens = inputTokens + outputTokens;
    const model = activeModelName || thread.model || 'deepseek-v4.1-flash';
    const contextLimit = model.toLowerCase().includes('deepseek') ? 131_072 : 1_048_576;
    const percentage = Math.min(100, Math.max(0.1, (totalTokens / contextLimit) * 100));

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      contextLimit,
      percentage,
      formattedInput: formatTokenNumber(inputTokens),
      formattedOutput: formatTokenNumber(outputTokens),
      formattedTotal: formatTokenNumber(totalTokens),
      formattedLimit: formatTokenNumber(contextLimit),
      modelName: model,
      isStreaming: hasRunningTurn,
      turnCount: thread.turns.length,
    };
  }, [thread, activeModelName]);
}
