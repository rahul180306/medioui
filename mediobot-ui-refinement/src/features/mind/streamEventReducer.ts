/**
 * Deterministic Pure StreamEvent Reducer for Specialist Mind Space
 * Folds real-time execution stream events and historical SQLite replay identically.
 */

export interface DiagnosticRibbonItem {
  readonly id: string;
  readonly path: string;
  readonly lineNo: number;
  readonly severity: 'error' | 'warning' | 'info';
  readonly code?: string;
  readonly message: string;
}

export interface ToolRunItem {
  readonly callId: string;
  readonly tool: string;
  readonly args: Record<string, unknown>;
  readonly status: 'running' | 'ok' | 'error';
  readonly durationMs?: number;
  readonly summary?: string;
  readonly output?: string;
  readonly exitCode?: number;
}

export interface DiffItem {
  readonly path: string;
  readonly oldContent: string;
  readonly newContent: string;
  readonly diagnostics?: ReadonlyArray<DiagnosticRibbonItem>;
}

export type StreamEvent =
  | { type: 'turn_started'; turnId: string; threadId?: string; sequence?: number; timestamp: number }
  | { type: 'reasoning_delta'; turnId: string; threadId?: string; sequence?: number; delta: string; timestamp: number }
  | { type: 'reasoning_completed'; turnId: string; threadId?: string; sequence?: number; durationSec: number; totalText: string; timestamp: number }
  | { type: 'tool_call_started'; turnId: string; threadId?: string; sequence?: number; callId: string; tool: string; args: Record<string, unknown>; timestamp: number }
  | { type: 'tool_call_completed'; turnId: string; threadId?: string; sequence?: number; callId: string; tool: string; durationMs: number; status: 'ok' | 'error'; summary: string; output?: string; exitCode?: number; timestamp: number }
  | { type: 'diff_emitted'; turnId: string; threadId?: string; sequence?: number; path: string; oldContent: string; newContent: string; diagnostics?: DiagnosticRibbonItem[]; timestamp: number }
  | { type: 'diagnostic_emitted'; turnId: string; threadId?: string; sequence?: number; path: string; lineNo: number; severity: 'error' | 'warning' | 'info'; code?: string; message: string; timestamp: number }
  | { type: 'terminal_output'; turnId: string; threadId?: string; sequence?: number; chunk: string; timestamp: number }
  | { type: 'terminal_completed'; turnId: string; threadId?: string; sequence?: number; exitCode: number; durationMs: number; timestamp: number }
  | { type: 'turn_completed'; turnId: string; threadId?: string; sequence?: number; timestamp: number }
  | { type: 'turn_failed'; turnId: string; threadId?: string; sequence?: number; error?: string; timestamp: number };

export interface MindSpaceState {
  readonly threadId?: string;
  readonly turnId: string;
  readonly status: 'idle' | 'running' | 'completed' | 'failed';
  readonly lastSequence?: number;
  readonly reasoning: {
    readonly isStreaming: boolean;
    readonly text: string;
    readonly durationSec: number;
    readonly collapsed: boolean;
    readonly headerText: string;
  } | null;
  readonly toolRuns: ReadonlyArray<ToolRunItem>;
  readonly diffs: ReadonlyArray<DiffItem>;
  readonly terminal: {
    readonly rawBuffer: string;
    readonly hasLiveTail: boolean;
    readonly exitCode?: number;
    readonly durationMs?: number;
  };
}

export const MAX_TERMINAL_BUFFER_BYTES = 64 * 1024; // 64KB strict boundary

/**
 * Browser-safe UTF-8 tail slicing aligned to character boundaries using standard Web APIs.
 * Prevents \uFFFD replacement character corruption and ensures byte length <= maxBytes.
 */
export function safeTailSliceUtf8(str: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);
  if (encoded.length <= maxBytes) return str;
  let start = encoded.length - maxBytes;
  // If start offset lands on a UTF-8 continuation byte (10xxxxxx), advance until next leading byte
  while (start < encoded.length && (encoded[start]! & 0xC0) === 0x80) {
    start++;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(encoded.subarray(start));
}

export function createInitialMindSpaceState(turnId: string, threadId?: string): MindSpaceState {
  return {
    threadId,
    turnId,
    status: 'idle',
    lastSequence: -1,
    reasoning: null,
    toolRuns: [],
    diffs: [],
    terminal: {
      rawBuffer: '',
      hasLiveTail: false,
    },
  };
}

/**
 * Pure deterministic StreamEvent reducer with bit-for-bit replay equivalence.
 */
export function streamEventReducer(state: MindSpaceState, event: StreamEvent): MindSpaceState {
  if (event.sequence !== undefined) {
    if (state.lastSequence !== undefined && event.sequence <= state.lastSequence) {
      // Gracefully ignore stale or duplicate out-of-order sequence arrivals
      return state;
    }
  }

  const nextSeq = event.sequence !== undefined
    ? Math.max(state.lastSequence ?? -1, event.sequence)
    : state.lastSequence;

  switch (event.type) {
    case 'turn_started':
      return {
        ...state,
        lastSequence: nextSeq,
        turnId: event.turnId,
        threadId: event.threadId ?? state.threadId,
        status: 'running',
      };

    case 'reasoning_delta': {
      if (state.reasoning && !state.reasoning.isStreaming) {
        // Reasoning has already completed; do NOT revert isStreaming or append stale deltas
        return {
          ...state,
          lastSequence: nextSeq,
        };
      }
      const prevText = state.reasoning?.text ?? '';
      const newText = prevText + event.delta;
      return {
        ...state,
        lastSequence: nextSeq,
        reasoning: {
          isStreaming: true,
          text: newText,
          durationSec: state.reasoning?.durationSec ?? 0,
          collapsed: state.reasoning?.collapsed ?? true,
          headerText: state.reasoning?.headerText ?? 'Thinking...',
        },
      };
    }

    case 'reasoning_completed': {
      const dur = Math.max(1, Math.round(event.durationSec));
      return {
        ...state,
        lastSequence: nextSeq,
        reasoning: {
          isStreaming: false,
          text: event.totalText,
          durationSec: event.durationSec,
          collapsed: true, // Collapsed by default (open = false)
          headerText: `Worked for ${dur}s ›`,
        },
      };
    }

    case 'tool_call_started': {
      if (state.toolRuns.some((run) => run.callId === event.callId)) {
        return {
          ...state,
          lastSequence: nextSeq,
        };
      }
      const newRun: ToolRunItem = {
        callId: event.callId,
        tool: event.tool,
        args: event.args,
        status: 'running',
      };
      return {
        ...state,
        lastSequence: nextSeq,
        toolRuns: [...state.toolRuns, newRun],
      };
    }

    case 'tool_call_completed': {
      const updatedRuns = state.toolRuns.map((run) => {
        if (run.callId !== event.callId) return run;
        return {
          ...run,
          status: event.status,
          durationMs: event.durationMs,
          summary: event.summary,
          output: event.output ?? run.output,
          exitCode: event.exitCode ?? run.exitCode,
        };
      });
      return {
        ...state,
        lastSequence: nextSeq,
        toolRuns: updatedRuns,
      };
    }

    case 'diff_emitted': {
      const existingIndex = state.diffs.findIndex((d) => d.path === event.path);
      const existing = existingIndex >= 0 ? state.diffs[existingIndex] : undefined;
      const newDiff: DiffItem = {
        path: event.path,
        oldContent: event.oldContent,
        newContent: event.newContent,
        diagnostics: event.diagnostics ?? existing?.diagnostics ?? [],
      };
      const updatedDiffs = existingIndex >= 0
        ? state.diffs.map((d, idx) => (idx === existingIndex ? newDiff : d))
        : [...state.diffs, newDiff];
      return {
        ...state,
        lastSequence: nextSeq,
        diffs: updatedDiffs,
      };
    }

    case 'diagnostic_emitted': {
      const diag: DiagnosticRibbonItem = {
        id: `diag-${event.path}-${event.lineNo}-${event.code || 'err'}`,
        path: event.path,
        lineNo: event.lineNo,
        severity: event.severity,
        code: event.code,
        message: event.message,
      };
      const updatedDiffs = state.diffs.map((diff) => {
        if (diff.path !== event.path) return diff;
        return {
          ...diff,
          diagnostics: [...(diff.diagnostics ?? []), diag],
        };
      });
      return {
        ...state,
        lastSequence: nextSeq,
        diffs: updatedDiffs,
      };
    }

    case 'terminal_output': {
      const combined = safeTailSliceUtf8(state.terminal.rawBuffer + event.chunk, MAX_TERMINAL_BUFFER_BYTES);
      return {
        ...state,
        lastSequence: nextSeq,
        terminal: {
          ...state.terminal,
          rawBuffer: combined,
          hasLiveTail: true,
        },
      };
    }

    case 'terminal_completed':
      return {
        ...state,
        lastSequence: nextSeq,
        terminal: {
          ...state.terminal,
          hasLiveTail: false,
          exitCode: event.exitCode,
          durationMs: event.durationMs,
        },
      };

    case 'turn_completed':
      return {
        ...state,
        lastSequence: nextSeq,
        status: 'completed',
        terminal: {
          ...state.terminal,
          hasLiveTail: false,
        },
      };

    case 'turn_failed':
      return {
        ...state,
        lastSequence: nextSeq,
        status: 'failed',
        terminal: {
          ...state.terminal,
          hasLiveTail: false,
        },
      };

    default:
      return state;
  }
}
