/**
 * Execution Activity Domain Types
 * Canonical typed presentation models for execution activity timeline and safe tool presentation.
 */

/**
 * Truthful execution classification for UI visualization.
 * In demo/fixture mode, execution is 'simulated'.
 * In local execution without authenticated backend, execution is 'unverified'.
 */
export type ExecutionSourceClassification = 'simulated' | 'unverified';

/**
 * Standardized status progression for execution steps and tool operations.
 */
export type ExecutionStepStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'blocked';

/**
 * 17 canonical granular execution step item types for chronological timeline visualization.
 */
export type ExecutionStepItemType =
  | 'agent.started'
  | 'agent.working'
  | 'agent.completed'
  | 'agent.failed'
  | 'agent.cancelled'
  | 'task.queued'
  | 'task.blocked'
  | 'tool.started'
  | 'tool.completed'
  | 'tool.failed'
  | 'file.inspected'
  | 'search.performed'
  | 'command.executed'
  | 'verification.completed'
  | 'context.compacted'
  | 'delegation.proposed'
  | 'specialist.requested';

/**
 * Allowlisted operation types for safe tool presentation.
 */
export type ToolOperationType =
  | 'read'
  | 'write'
  | 'list'
  | 'search'
  | 'execute'
  | 'browser'
  | 'inspect'
  | 'generic';

/**
 * Safe allowlist-based tool execution presentation model.
 * Never contains raw environment variables, credentials, auth headers,
 * or unrestricted command arguments.
 */
export interface SafeToolExecutionDetails {
  readonly toolName: string;
  readonly operationType: ToolOperationType;
  readonly filePath?: string;
  readonly commandDescription?: string;
  readonly startTimestamp: number;
  readonly completionTimestamp?: number;
  readonly durationMs?: number;
  readonly status: ExecutionStepStatus;
  readonly errorInfo?: string;
  readonly associatedSpecialist?: {
    readonly id: string;
    readonly name: string;
    readonly role?: string;
  };
  readonly sanitizedOutputPreview?: string;
}

/**
 * Canonical typed presentation model for the execution activity timeline.
 */
export interface ExecutionActivityEvent {
  readonly eventId: string;
  readonly eventType: ExecutionStepItemType;
  readonly teamId: string;
  readonly conversationId?: string;
  readonly specialistId?: string;
  readonly taskId?: string;
  readonly timestamp: number;
  readonly status: ExecutionStepStatus;
  readonly summary: string;
  readonly details?: string;
  readonly sourceClassification: ExecutionSourceClassification;
  readonly toolDetails?: SafeToolExecutionDetails;
}
