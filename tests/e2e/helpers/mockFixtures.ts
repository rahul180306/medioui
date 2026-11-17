/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mock Fixtures and Canonical Presentation Models for Mediobot UI E2E Testing
 * Provides canonical ExecutionActivityEvent fixtures (17 types), 7 specialist profiles,
 * parallel execution timeline intervals, and adversarial tool execution test cases.
 */

import type {
  ExecutionSourceClassification,
  ExecutionStepStatus,
  ExecutionStepItemType,
  SafeToolExecutionDetails,
  ExecutionActivityEvent,
} from '../../../mediobot-ui-refinement/src/types/executionActivity.ts';
import type {
  SpecialistExecutionInterval,
  SpecialistProfile,
} from '../../../mediobot-ui-refinement/src/features/mediobots/parallelWorkFixture.ts';

export type {
  ExecutionSourceClassification,
  ExecutionStepStatus,
  ExecutionStepItemType,
  SafeToolExecutionDetails,
  ExecutionActivityEvent,
  SpecialistExecutionInterval,
  SpecialistProfile,
};

/**
 * 7 Canonical Specialist Profiles (+ Coordinator)
 */
export const SPECIALIST_PROFILES: Readonly<Record<string, SpecialistProfile>> = {
  maestro: {
    id: 'maestro',
    name: 'Maestro',
    role: 'Team orchestration',
    avatar: 'bg-[#f4f4f5]',
    textTheme: 'text-[#f4f4f5]',
    borderTheme: 'border-white/20',
    badgeTheme: 'bg-white/10 text-neutral-200',
    currentTask: 'Delegating architecture milestones',
  },
  cody: {
    id: 'cody',
    name: 'Cody',
    role: 'Software engineering',
    avatar: 'bg-[#fef08a]',
    textTheme: 'text-[#fde047]',
    borderTheme: 'border-[#fef08a]/30',
    badgeTheme: 'bg-[#fef08a]/10 text-[#fef08a]',
    currentTask: 'Implementing timeline subcomponents',
  },
  vision: {
    id: 'vision',
    name: 'Vision',
    role: 'UI inspection & visual review',
    avatar: 'bg-[#bae6fd]',
    textTheme: 'text-[#38bdf8]',
    borderTheme: 'border-[#bae6fd]/30',
    badgeTheme: 'bg-[#bae6fd]/10 text-[#bae6fd]',
    currentTask: 'Auditing layout density and spacing',
  },
  doc: {
    id: 'doc',
    name: 'Doc',
    role: 'Documentation intelligence',
    avatar: 'bg-[#4b4a56]',
    textTheme: 'text-[#cbd5e1]',
    borderTheme: 'border-[#52525b]/40',
    badgeTheme: 'bg-[#52525b]/20 text-[#d4d4d8]',
    currentTask: 'Updating interface contracts in PROJECT.md',
  },
  research: {
    id: 'research',
    name: 'Research',
    role: 'Web research',
    avatar: 'bg-[#fed7aa]',
    textTheme: 'text-[#fb923c]',
    borderTheme: 'border-[#fed7aa]/30',
    badgeTheme: 'bg-[#fed7aa]/10 text-[#fed7aa]',
    currentTask: 'Analyzing Codex vs Antigravity timeline patterns',
  },
  tester: {
    id: 'tester',
    name: 'Tester',
    role: 'Independent verification',
    avatar: 'bg-[#ddd6fe]',
    textTheme: 'text-[#c084fc]',
    borderTheme: 'border-[#ddd6fe]/30',
    badgeTheme: 'bg-[#ddd6fe]/10 text-[#ddd6fe]',
    currentTask: 'Authoring Tier 1 feature coverage tests',
  },
  deployer: {
    id: 'deployer',
    name: 'Deployer',
    role: 'Deployment',
    avatar: 'bg-[#a7f3d0]',
    textTheme: 'text-[#34d399]',
    borderTheme: 'border-[#a7f3d0]/30',
    badgeTheme: 'bg-[#a7f3d0]/10 text-[#a7f3d0]',
    currentTask: 'Staging static asset server on port 0',
  },
  scraapy: {
    id: 'scraapy',
    name: 'Scraapy',
    role: 'Web scraping & extraction',
    avatar: 'bg-[#99f6e4]',
    textTheme: 'text-[#2dd4bf]',
    borderTheme: 'border-[#99f6e4]/30',
    badgeTheme: 'bg-[#99f6e4]/10 text-[#2dd4bf]',
    currentTask: 'Extracting offline UI component fixtures',
  },
};

/**
 * Array of all 17 canonical event types
 */
export const ALL_CANONICAL_EVENT_TYPES: ReadonlyArray<ExecutionStepItemType> = [
  'agent.started',
  'agent.working',
  'agent.completed',
  'agent.failed',
  'agent.cancelled',
  'task.queued',
  'task.blocked',
  'tool.started',
  'tool.completed',
  'tool.failed',
  'file.inspected',
  'search.performed',
  'command.executed',
  'verification.completed',
  'context.compacted',
  'delegation.proposed',
  'specialist.requested',
];

/**
 * 17 Canonical Execution Activity Events (one for each type)
 */
export const CANONICAL_EXECUTION_EVENTS: ReadonlyArray<ExecutionActivityEvent> = [
  {
    eventId: 'evt-01-agent-started',
    eventType: 'agent.started',
    teamId: 'team-primary',
    specialistId: 'cody',
    timestamp: 1700000001000,
    status: 'running',
    summary: 'Cody agent initialized and attached to workspace',
    details: 'Agent process began execution with sandbox containment.',
    sourceClassification: 'simulated',
  },
  {
    eventId: 'evt-02-task-queued',
    eventType: 'task.queued',
    teamId: 'team-primary',
    taskId: 'task-101',
    timestamp: 1700000002000,
    status: 'queued',
    summary: 'Task queued: Refactor timeline subcomponents',
    details: 'Placed in execution FIFO queue behind task-100.',
    sourceClassification: 'simulated',
  },
  {
    eventId: 'evt-03-agent-working',
    eventType: 'agent.working',
    teamId: 'team-primary',
    specialistId: 'cody',
    taskId: 'task-101',
    timestamp: 1700000003000,
    status: 'running',
    summary: 'Cody actively parsing AST of CodexExecutionView',
    details: 'Traversing component tree and isolating trajectory parser.',
    sourceClassification: 'simulated',
  },
  {
    eventId: 'evt-04-specialist-requested',
    eventType: 'specialist.requested',
    teamId: 'team-primary',
    specialistId: 'tester',
    timestamp: 1700000004000,
    status: 'running',
    summary: 'Maestro requested Tester specialist for independent verification',
    details: 'Specialist Tester assigned to create boundary test matrix.',
    sourceClassification: 'simulated',
  },
  {
    eventId: 'evt-05-delegation-proposed',
    eventType: 'delegation.proposed',
    teamId: 'team-primary',
    specialistId: 'maestro',
    timestamp: 1700000005000,
    status: 'completed',
    summary: 'Maestro proposed delegating CSS review to Vision',
    details: 'Proposed subtask with target path src/features/activity/.',
    sourceClassification: 'simulated',
  },
  {
    eventId: 'evt-06-search-performed',
    eventType: 'search.performed',
    teamId: 'team-primary',
    specialistId: 'research',
    timestamp: 1700000006000,
    status: 'completed',
    summary: 'Searched for "accessible disclosure button" patterns',
    details: 'Matched 3 WAI-ARIA design pattern references in local docs.',
    sourceClassification: 'simulated',
    toolDetails: {
      toolName: 'search_files',
      operationType: 'search',
      startTimestamp: 1700000006000,
      completionTimestamp: 1700000006250,
      durationMs: 250,
      status: 'completed',
      associatedSpecialist: { id: 'research', name: 'Research', role: 'Web research' },
      sanitizedOutputPreview: 'Found 3 matches across 2 files.',
    },
  },
  {
    eventId: 'evt-07-file-inspected',
    eventType: 'file.inspected',
    teamId: 'team-primary',
    specialistId: 'doc',
    timestamp: 1700000007000,
    status: 'completed',
    summary: 'Inspected src/features/activity/CodexExecutionView.tsx',
    details: 'Lines 1-120 examined for monolithic dependencies.',
    sourceClassification: 'simulated',
    toolDetails: {
      toolName: 'read_file',
      operationType: 'read',
      filePath: 'src/features/activity/CodexExecutionView.tsx',
      startTimestamp: 1700000007000,
      completionTimestamp: 1700000007120,
      durationMs: 120,
      status: 'completed',
      associatedSpecialist: { id: 'doc', name: 'Doc', role: 'Documentation intelligence' },
      sanitizedOutputPreview: 'File size: 34KB, 1195 lines',
    },
  },
  {
    eventId: 'evt-08-tool-started',
    eventType: 'tool.started',
    teamId: 'team-primary',
    specialistId: 'cody',
    timestamp: 1700000008000,
    status: 'running',
    summary: 'Started tool: execute_command (typecheck)',
    details: 'Executing tsc --noEmit in sandbox container.',
    sourceClassification: 'simulated',
    toolDetails: {
      toolName: 'execute_command',
      operationType: 'execute',
      commandDescription: 'Run TypeScript compiler typecheck',
      startTimestamp: 1700000008000,
      status: 'running',
      associatedSpecialist: { id: 'cody', name: 'Cody', role: 'Software engineering' },
    },
  },
  {
    eventId: 'evt-09-command-executed',
    eventType: 'command.executed',
    teamId: 'team-primary',
    specialistId: 'cody',
    timestamp: 1700000009000,
    status: 'completed',
    summary: 'Executed: npm run build',
    details: 'Compiled bundle generated in dist/ directory in 1.4s.',
    sourceClassification: 'simulated',
    toolDetails: {
      toolName: 'execute_command',
      operationType: 'execute',
      commandDescription: 'Compile frontend bundle with Vite',
      startTimestamp: 1700000009000,
      completionTimestamp: 1700000010400,
      durationMs: 1400,
      status: 'completed',
      associatedSpecialist: { id: 'cody', name: 'Cody', role: 'Software engineering' },
      sanitizedOutputPreview: 'dist/index.html 1.2kB, dist/assets/index.js 420kB',
    },
  },
  {
    eventId: 'evt-10-tool-completed',
    eventType: 'tool.completed',
    teamId: 'team-primary',
    specialistId: 'cody',
    timestamp: 1700000010000,
    status: 'completed',
    summary: 'Completed tool: write_file (ExecutionActivityTimeline.tsx)',
    details: 'Wrote 180 lines with clean export contracts.',
    sourceClassification: 'simulated',
    toolDetails: {
      toolName: 'write_file',
      operationType: 'write',
      filePath: 'src/features/activity/ExecutionActivityTimeline.tsx',
      startTimestamp: 1700000009500,
      completionTimestamp: 1700000010000,
      durationMs: 500,
      status: 'completed',
      associatedSpecialist: { id: 'cody', name: 'Cody', role: 'Software engineering' },
      sanitizedOutputPreview: 'Wrote 180 lines (6.4 KB)',
    },
  },
  {
    eventId: 'evt-11-context-compacted',
    eventType: 'context.compacted',
    teamId: 'team-primary',
    timestamp: 1700000011000,
    status: 'completed',
    summary: 'Compacted execution context from 48KB to 12KB',
    details: 'Pruned redundant intermediate tool logs and merged summaries.',
    sourceClassification: 'simulated',
  },
  {
    eventId: 'evt-12-task-blocked',
    eventType: 'task.blocked',
    teamId: 'team-primary',
    taskId: 'task-102',
    timestamp: 1700000012000,
    status: 'blocked',
    summary: 'Task blocked: Live deployment verification',
    details: 'Blocked on external credentials: authenticated backend unavailable.',
    sourceClassification: 'simulated',
  },
  {
    eventId: 'evt-13-tool-failed',
    eventType: 'tool.failed',
    teamId: 'team-primary',
    specialistId: 'deployer',
    timestamp: 1700000013000,
    status: 'failed',
    summary: 'Failed tool: network_egress_probe',
    details: 'Interception blocked forbidden external egress attempt.',
    sourceClassification: 'simulated',
    toolDetails: {
      toolName: 'network_egress_probe',
      operationType: 'execute',
      startTimestamp: 1700000013000,
      completionTimestamp: 1700000013050,
      durationMs: 50,
      status: 'failed',
      errorInfo: 'NetworkGuardPolicyError: Blocked non-static network access.',
      associatedSpecialist: { id: 'deployer', name: 'Deployer', role: 'Deployment' },
    },
  },
  {
    eventId: 'evt-14-verification-completed',
    eventType: 'verification.completed',
    teamId: 'team-primary',
    specialistId: 'tester',
    timestamp: 1700000014000,
    status: 'completed',
    summary: 'Offline verification completed: 30 of 30 tests passed',
    details: 'All simulated invariants confirmed with zero failures.',
    sourceClassification: 'simulated',
  },
  {
    eventId: 'evt-15-agent-cancelled',
    eventType: 'agent.cancelled',
    teamId: 'team-primary',
    specialistId: 'scraapy',
    timestamp: 1700000015000,
    status: 'cancelled',
    summary: 'Scraapy crawler cancelled by user request',
    details: 'Process gracefully terminated after SIGINT.',
    sourceClassification: 'simulated',
  },
  {
    eventId: 'evt-16-agent-failed',
    eventType: 'agent.failed',
    teamId: 'team-primary',
    specialistId: 'deployer',
    timestamp: 1700000016000,
    status: 'failed',
    summary: 'Deployer agent terminated with exit code 1',
    details: 'Production push aborted in demonstration mode.',
    sourceClassification: 'simulated',
  },
  {
    eventId: 'evt-17-agent-completed',
    eventType: 'agent.completed',
    teamId: 'team-primary',
    specialistId: 'maestro',
    timestamp: 1700000017000,
    status: 'completed',
    summary: 'Maestro completed orchestration turn',
    details: 'All assigned subtasks verified and delivered.',
    sourceClassification: 'simulated',
  },
];

/**
 * Parallel Execution Intervals for Multi-Specialist View (R4)
 */
export const PARALLEL_SPECIALIST_INTERVALS: ReadonlyArray<SpecialistExecutionInterval> = [
  {
    intervalId: 'int-cody-1',
    specialistId: 'cody',
    specialistName: 'Cody',
    specialistRole: 'Software engineering',
    taskTitle: 'Decompose CodexExecutionView subcomponents',
    startRelativeSec: 0,
    endRelativeSec: 14,
    status: 'working',
    currentStep: 'Exporting CodexToolRow and trajectoryParser',
    history: [
      'Isolated trajectory parser from monolithic component',
      'Created useToolTimer hook with zero drift',
      'Extracted ModelAttributionBadge',
    ],
  },
  {
    intervalId: 'int-tester-1',
    specialistId: 'tester',
    specialistName: 'Tester',
    specialistRole: 'Independent verification',
    taskTitle: 'Author 4-Tier E2E test suite',
    startRelativeSec: 4,
    endRelativeSec: 18,
    status: 'working',
    currentStep: 'Verifying chronological sorting of 17 event types',
    history: [
      'Configured JSDOM React 19 test harness',
      'Formulated canonical test fixtures',
      'Implemented R1 through R6 assertion suites',
    ],
  },
  {
    intervalId: 'int-vision-1',
    specialistId: 'vision',
    specialistName: 'Vision',
    specialistRole: 'UI inspection & visual review',
    taskTitle: 'Audit component layout density and spacing',
    startRelativeSec: 8,
    endRelativeSec: 22,
    status: 'working',
    currentStep: 'Inspecting disclosure toggle hit targets and ARIA states',
    history: [
      'Checked compact row height (28px target)',
      'Verified theme border contrast',
      'Validated focus ring visibility',
    ],
  },
  {
    intervalId: 'int-doc-1',
    specialistId: 'doc',
    specialistName: 'Doc',
    specialistRole: 'Documentation intelligence',
    taskTitle: 'Maintain interface contracts in PROJECT.md',
    startRelativeSec: 12,
    endRelativeSec: 24,
    status: 'completed',
    currentStep: 'Synchronized event schemas and redaction contracts',
    history: [
      'Documented SafeToolExecutionDetails interface',
      'Aligned ExecutionActivityEvent types',
    ],
  },
  {
    intervalId: 'int-research-1',
    specialistId: 'research',
    specialistName: 'Research',
    specialistRole: 'Web research',
    taskTitle: 'Research accessible timeline disclosure patterns',
    startRelativeSec: 2,
    endRelativeSec: 10,
    status: 'completed',
    currentStep: 'Delivered WAI-ARIA pattern recommendations',
    history: [
      'Analyzed keyboard navigation standards',
      'Selected aria-expanded and aria-controls attributes',
    ],
  },
  {
    intervalId: 'int-deployer-1',
    specialistId: 'deployer',
    specialistName: 'Deployer',
    specialistRole: 'Deployment',
    taskTitle: 'Verify offline containment and static server',
    startRelativeSec: 15,
    endRelativeSec: 25,
    status: 'waiting',
    currentStep: 'Waiting for port 0 ephemeral listener',
    history: ['Verified dist build assets present'],
  },
  {
    intervalId: 'int-scraapy-1',
    specialistId: 'scraapy',
    specialistName: 'Scraapy',
    specialistRole: 'Web scraping & extraction',
    taskTitle: 'Extract test vectors from offline fixtures',
    startRelativeSec: 6,
    endRelativeSec: 16,
    status: 'failed',
    currentStep: 'Execution halted: external fetch blocked by guardrail',
    history: ['Parsed local offline fixture envelope'],
  },
];

import {
  redactSensitiveData,
  extractAllowlistToolDetails as genuineExtractAllowlistToolDetails,
} from '../../../mediobot-ui-refinement/src/features/activity/allowlistRedaction.ts';
import {
  sortExecutionEventsChronologically,
} from '../../../mediobot-ui-refinement/src/features/activity/ExecutionActivityTimeline.tsx';

/**
 * Adversarial Raw Tool Outputs for Allowlist & Redaction Testing (R5)
 */
export const ADVERSARIAL_TOOL_PAYLOADS = {
  bearerToken: {
    raw: 'Authorization: Bearer ya29.a0AfH6SMB_secret_access_token_123456789\nUser connected.',
    expectedRedacted: 'Authorization: [REDACTED]\nUser connected.',
  },
  openAiApiKey: {
    raw: 'Failed with key sk-proj-abc123456789xyz9876543210QWERTYUIOP\nPlease check billing.',
    expectedRedacted: 'Failed with key [REDACTED]\nPlease check billing.',
  },
  googleApiKey: {
    raw: 'Using Gemini key AIzaSyD1234567890abcdefghijklmnopqrstuv\nQuota exceeded.',
    expectedRedacted: 'Using Gemini key [REDACTED]\nQuota exceeded.',
  },
  envVars: {
    raw: 'Exported ANTHROPIC_API_KEY=sk-ant-api03-abcdef123456 and AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY in subshell.',
    expectedRedacted: 'Exported ANTHROPIC_API_KEY=[REDACTED] and AWS_SECRET_ACCESS_KEY=[REDACTED] in subshell.',
  },
  authHeader: {
    raw: 'GET /api/v1/projects HTTP/1.1\nHost: api.example.com\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-z8\nAccept: application/json',
    expectedRedacted: 'GET /api/v1/projects HTTP/1.1\nHost: api.example.com\nAuthorization: [REDACTED]\nAccept: application/json',
  },
  postgresUri: {
    raw: 'Connected to postgresql://postgres:SuperSecretPassword123!@127.0.0.1:5432/mediobot_prod',
    expectedRedacted: 'Connected to postgresql://postgres:[REDACTED]@127.0.0.1:5432/mediobot_prod',
  },
  allowedFieldsOnly: {
    rawTool: {
      toolName: 'read_file',
      operationType: 'read',
      filePath: '/safe/project/path/src/App.tsx',
      commandDescription: 'Read App component source code',
      command: 'cat /safe/project/path/src/App.tsx',
      inputArgs: { path: '/safe/project/path/src/App.tsx' },
      startTimestamp: 1700000000000,
      completionTimestamp: 1700000000100,
      startedAt: 1700000000000,
      durationMs: 100,
      status: 'completed' as ExecutionStepStatus,
      // Forbidden fields that must NOT leak into safe presentation model:
      rawStderr: 'internal debug traceback',
      environment: { SECRET: 'super_secret', HOME: '/Users/admin' },
      systemTokens: ['tok_abc123'],
      hostDetails: { os: 'darwin', user: 'admin', ip: '192.168.1.5' },
    },
  },
};

export { redactSensitiveData, sortExecutionEventsChronologically };

/**
 * Extracts strictly allowlisted fields for SafeToolExecutionDetails (R5),
 * backed by genuine allowlistRedaction production engine.
 */
export function extractAllowlistToolDetails(
  rawTool: Record<string, any>,
  specialistId?: string,
  specialistName?: string
): SafeToolExecutionDetails {
  if (!rawTool || typeof rawTool !== 'object') {
    return genuineExtractAllowlistToolDetails(rawTool as any, specialistId, specialistName);
  }

  const toolInput: any = { ...rawTool };
  if (toolInput.sanitizedOutputPreview && !toolInput.outputLog && !toolInput.output) {
    toolInput.outputLog = toolInput.sanitizedOutputPreview;
  }
  if (toolInput.filePath && !toolInput.inputArgs) {
    toolInput.inputArgs = { path: toolInput.filePath };
  }

  const result = genuineExtractAllowlistToolDetails(toolInput, specialistId, specialistName);

  if (rawTool.commandDescription !== undefined && result.commandDescription === undefined) {
    return {
      ...result,
      commandDescription: rawTool.commandDescription ? redactSensitiveData(rawTool.commandDescription).text : '',
    };
  }

  return result;
}
