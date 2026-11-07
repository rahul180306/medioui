import type {
  Thread,
  ProjectInfo,
  MedioBotAgent,
  CatalogProviderItem,
  ProviderConfig,
} from '../types';

/**
 * 15 Dedicated Realistic Prototype Scenarios for Google AI Studio & MedioBot UI Prototyping
 * All data in this file is explicitly identified as mock/prototype data.
 */

export interface MockScenarioMeta {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  readonly description: string;
  readonly conversationLevel: 'LEVEL 1 - ORGANIZATION' | 'LEVEL 2 - TEAM WORKSPACE' | 'LEVEL 3 - MAIN TEAM' | 'LEVEL 4 - SPECIALISTS' | 'LEVEL 5 - COLLABORATION';
  readonly relevantThreads: Thread[];
  readonly initialActiveThreadId: string;
  readonly activeTeamId: string;
  readonly activeProjectId: string;
}

const NOW = Date.now();
const HOUR = 3600000;
const MIN = 60000;

// ============================================================================
// LEVEL 1: ORGANIZATION ROSTER & CATALOG
// ============================================================================
export const PROTOTYPE_ORGANIZATION_AGENTS: MedioBotAgent[] = [
  { id: 'maestro', name: 'Maestro', group: 'orchestrator', role: 'Team orchestration & Goal decomposition', status: 'idle', directConversationAvailable: true },
  { id: 'cody', definitionId: 'cody', directConversationAvailable: true, name: 'Cody', group: 'specialist', role: 'Software architecture & Implementation', status: 'idle' },
  { id: 'tester', definitionId: 'tester', directConversationAvailable: true, name: 'Tester', group: 'specialist', role: 'Independent verification & Quality gates', status: 'idle' },
  { id: 'research', definitionId: 'research', directConversationAvailable: true, name: 'Research', group: 'specialist', role: 'Deep research & Web intelligence', status: 'idle' },
  { id: 'doc', definitionId: 'doc', directConversationAvailable: true, name: 'Doc', group: 'specialist', role: 'Documentation & Architecture synthesis', status: 'idle' },
  { id: 'scraapy', definitionId: 'scraapy', directConversationAvailable: true, name: 'Scraapy', group: 'specialist', role: 'Web scraping & Extraction pipeline', status: 'idle' },
  { id: 'vision', definitionId: 'vision', directConversationAvailable: true, name: 'Vision', group: 'specialist', role: 'Visual UX inspection & Browser workflows', status: 'development' },
];

// ============================================================================
// SCENARIO 1: A New Team Workspace (Level 2)
// ============================================================================
const SCENARIO_1_THREAD: Thread = {
  id: 'thread-s1-new-team',
  teamId: 'team-phoenix-s1',
  title: 'Fresh Project Initialization',
  projectId: 'workspace-demo-1',
  ownerAgent: 'maestro',
  threadType: 'team',
  mode: 'connected_main',
  agentScope: 'maestro',
  assignedSpecialists: [], // Standby idle state
  createdAt: NOW - 10 * MIN,
  updatedAt: NOW - 5 * MIN,
  model: 'Gemini 3.6 Flash',
  turns: [
    {
      id: 'turn-s1-1',
      threadId: 'thread-s1-new-team',
      prompt: 'Hello Maestro, we are starting project Phoenix.',
      status: 'completed',
      createdAt: NOW - 8 * MIN,
      completedAt: NOW - 7 * MIN,
      items: [
        {
          id: 'item-s1-user',
          turnId: 'turn-s1-1',
          type: 'user_message',
          actor: { type: 'user', name: 'Lead Architect' },
          timestamp: NOW - 8 * MIN,
          text: 'Hello Maestro, we are starting project Phoenix.',
        },
        {
          id: 'item-s1-maestro',
          turnId: 'turn-s1-1',
          type: 'agent_message',
          actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
          timestamp: NOW - 7 * MIN,
          text: 'Welcome to your new team workspace for **Project Phoenix**. No specialists are currently assigned. Describe your goal, and I will assemble the ideal team of specialists from the Mediobots Library.',
        },
      ],
    },
  ],
};

// ============================================================================
// SCENARIO 2: Multiple Main Team Conversations (Level 3)
// ============================================================================
const SCENARIO_2_THREAD_A: Thread = {
  id: 'thread-s2-main-arch',
  teamId: 'team-apollo-s2',
  title: 'Apollo: Architecture & Core API Design',
  projectId: 'workspace-demo-1',
  ownerAgent: 'maestro',
  threadType: 'team',
  mode: 'connected_main',
  agentScope: 'maestro',
  assignedSpecialists: ['cody', 'doc'],
  createdAt: NOW - 2 * HOUR,
  updatedAt: NOW - HOUR,
  model: 'Claude 3.7 Sonnet',
  turns: [
    {
      id: 'turn-s2-a1',
      threadId: 'thread-s2-main-arch',
      prompt: 'Let us design the high-throughput streaming API endpoints.',
      status: 'completed',
      createdAt: NOW - HOUR,
      completedAt: NOW - 50 * MIN,
      items: [
        {
          id: 'item-s2-user-a',
          turnId: 'turn-s2-a1',
          type: 'user_message',
          actor: { type: 'user', name: 'Lead Architect' },
          timestamp: NOW - HOUR,
          text: 'Let us design the high-throughput streaming API endpoints.',
        },
        {
          id: 'item-s2-maestro-a',
          turnId: 'turn-s2-a1',
          type: 'agent_message',
          actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
          timestamp: NOW - 50 * MIN,
          text: 'Understood. Cody has drafted the endpoint contracts with SSE replay determinism, and Doc has mapped the OpenAPI specification.',
        },
      ],
    },
  ],
};

const SCENARIO_2_THREAD_B: Thread = {
  id: 'thread-s2-main-triage',
  teamId: 'team-apollo-s2', // Same team ID!
  title: 'Apollo: Bug Triage & Release Verification',
  projectId: 'workspace-demo-1',
  ownerAgent: 'maestro',
  threadType: 'team',
  mode: 'connected_main',
  agentScope: 'maestro',
  assignedSpecialists: ['cody', 'doc', 'tester'],
  createdAt: NOW - 40 * MIN,
  updatedAt: NOW - 10 * MIN,
  model: 'Claude 3.7 Sonnet',
  turns: [
    {
      id: 'turn-s2-b1',
      threadId: 'thread-s2-main-triage',
      prompt: 'Check whether all smoke tests pass before tagging v1.2.',
      status: 'completed',
      createdAt: NOW - 30 * MIN,
      completedAt: NOW - 20 * MIN,
      items: [
        {
          id: 'item-s2-user-b',
          turnId: 'turn-s2-b1',
          type: 'user_message',
          actor: { type: 'user', name: 'Lead Architect' },
          timestamp: NOW - 30 * MIN,
          text: 'Check whether all smoke tests pass before tagging v1.2.',
        },
        {
          id: 'item-s2-maestro-b',
          turnId: 'turn-s2-b1',
          type: 'agent_message',
          actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
          timestamp: NOW - 20 * MIN,
          text: 'Tester executed the automated regression suite across 34 endpoints. All suites passed with zero regressions.',
        },
      ],
    },
  ],
};

// ============================================================================
// SCENARIO 3: Independent Specialist Side Chats (Level 4)
// ============================================================================
const SCENARIO_3_THREAD_CODY_SIDECHAT: Thread = {
  id: 'thread-s3-cody-side',
  teamId: 'team-apollo-s2',
  title: 'Cody Direct: Memory Allocator Tuning',
  projectId: 'workspace-demo-1',
  ownerAgent: 'cody',
  threadType: 'mind',
  mode: 'standalone_specialist',
  agentScope: 'cody',
  specialistId: 'cody',
  assignedSpecialists: ['cody'],
  createdAt: NOW - HOUR,
  updatedAt: NOW - 15 * MIN,
  model: 'Claude 3.7 Sonnet',
  turns: [
    {
      id: 'turn-s3-c1',
      threadId: 'thread-s3-cody-side',
      prompt: 'Cody, can you profile our object allocation in the streaming loop?',
      status: 'completed',
      createdAt: NOW - 45 * MIN,
      completedAt: NOW - 35 * MIN,
      items: [
        {
          id: 'item-s3-u1',
          turnId: 'turn-s3-c1',
          type: 'user_message',
          actor: { type: 'user', name: 'Lead Architect' },
          timestamp: NOW - 45 * MIN,
          text: 'Cody, can you profile our object allocation in the streaming loop?',
        },
        {
          id: 'item-s3-cody-1',
          turnId: 'turn-s3-c1',
          type: 'agent_message',
          actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software architecture & Implementation' },
          timestamp: NOW - 35 * MIN,
          text: 'I inspected `src/allocator.ts`. Reusing byte buffers across chunk iterations drops GC pauses by 68%. Diffs ready for review.',
        },
      ],
    },
  ],
};

// ============================================================================
// SCENARIO 4: Maestro Recruiting Specialists Dynamically
// ============================================================================
const SCENARIO_4_THREAD: Thread = {
  id: 'thread-s4-dynamic-recruitment',
  teamId: 'team-nova-s4',
  title: 'Full-stack Authentication & Penetration Testing',
  projectId: 'workspace-demo-1',
  ownerAgent: 'maestro',
  threadType: 'team',
  mode: 'connected_main',
  agentScope: 'maestro',
  assignedSpecialists: ['cody', 'tester', 'doc'],
  createdAt: NOW - 50 * MIN,
  updatedAt: NOW - 5 * MIN,
  model: 'Gemini 3.6 Flash',
  turns: [
    {
      id: 'turn-s4-1',
      threadId: 'thread-s4-dynamic-recruitment',
      prompt: 'Implement secure JWT refresh token rotation with automated adversarial tests and security documentation.',
      status: 'completed',
      createdAt: NOW - 40 * MIN,
      completedAt: NOW - 25 * MIN,
      items: [
        {
          id: 'item-s4-user',
          turnId: 'turn-s4-1',
          type: 'user_message',
          actor: { type: 'user', name: 'Security Lead' },
          timestamp: NOW - 40 * MIN,
          text: 'Implement secure JWT refresh token rotation with automated adversarial tests and security documentation.',
        },
        {
          id: 'item-s4-maestro',
          turnId: 'turn-s4-1',
          type: 'agent_message',
          actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
          timestamp: NOW - 38 * MIN,
          text: 'Goal analyzed. Recruiting **Cody** (Implementation), **Tester** (Adversarial Security Gates), and **Doc** (Security Architecture Documentation). Assembling subteam...',
        },
        {
          id: 'item-s4-act',
          turnId: 'turn-s4-1',
          type: 'activity',
          actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro' },
          timestamp: NOW - 37 * MIN,
          activityState: 'collaborating',
          activityLabel: 'Recruited Cody, Tester, and Doc into active team deck',
          text: 'Maestro dynamically assigned 3 specialists.',
        },
      ],
    },
  ],
};

// ============================================================================
// SCENARIO 6: Research and Doc Collaborating (Peer Messaging)
// ============================================================================
const SCENARIO_6_THREAD: Thread = {
  id: 'thread-s6-peer-collab',
  teamId: 'team-research-s6',
  title: 'Vector Database Benchmarking & Architecture Brief',
  projectId: 'workspace-demo-1',
  ownerAgent: 'maestro',
  threadType: 'team',
  mode: 'connected_main',
  agentScope: 'maestro',
  assignedSpecialists: ['research', 'doc'],
  createdAt: NOW - 3 * HOUR,
  updatedAt: NOW - 30 * MIN,
  model: 'Claude 3.7 Sonnet',
  turns: [
    {
      id: 'turn-s6-1',
      threadId: 'thread-s6-peer-collab',
      prompt: 'Benchmark Pinecone, Qdrant, and Milvus for 10M vectors and produce an architecture whitepaper.',
      status: 'completed',
      createdAt: NOW - 90 * MIN,
      completedAt: NOW - 40 * MIN,
      items: [
        {
          id: 'item-s6-user',
          turnId: 'turn-s6-1',
          type: 'user_message',
          actor: { type: 'user', name: 'Data Architect' },
          timestamp: NOW - 90 * MIN,
          text: 'Benchmark Pinecone, Qdrant, and Milvus for 10M vectors and produce an architecture whitepaper.',
        },
        {
          id: 'item-s6-peer-1',
          turnId: 'turn-s6-1',
          type: 'peer_message',
          actor: { type: 'mediobot', mediobotId: 'research', name: 'Research' },
          timestamp: NOW - 80 * MIN,
          text: 'Doc, I have compiled latency and memory metrics across all 3 engines. Qdrant demonstrates the lowest p99 under HNSW index construction.',
          peerMessage: {
            messageId: 'peer-s6-1',
            messageKind: 'finding',
            scope: 'direct',
            senderId: 'research',
            senderName: 'Research',
            recipientId: 'doc',
            recipientName: 'Doc',
            sequenceNumber: 1,
            status: 'delivered',
            text: 'Doc, I have compiled latency and memory metrics across all 3 engines. Qdrant demonstrates the lowest p99 under HNSW index construction.',
          },
        },
        {
          id: 'item-s6-peer-2',
          turnId: 'turn-s6-1',
          type: 'peer_message',
          actor: { type: 'mediobot', mediobotId: 'doc', name: 'Doc' },
          timestamp: NOW - 70 * MIN,
          text: 'Received metrics from Research. Synthesizing Section 3: Engine Trade-off Matrix in `docs/architecture/vector-evaluation.md`.',
          peerMessage: {
            messageId: 'peer-s6-2',
            messageKind: 'response',
            scope: 'direct',
            senderId: 'doc',
            senderName: 'Doc',
            recipientId: 'research',
            recipientName: 'Research',
            sequenceNumber: 2,
            status: 'delivered',
            text: 'Received metrics from Research. Synthesizing Section 3: Engine Trade-off Matrix in `docs/architecture/vector-evaluation.md`.',
          },
        },
      ],
    },
  ],
};

// ============================================================================
// SCENARIO 10: Multi-step Tool Execution & Verification (Level 5)
// ============================================================================
const SCENARIO_10_THREAD: Thread = {
  id: 'thread-s10-execution-verification',
  teamId: 'team-ops-s10',
  title: 'Payment Gateway Defect Remediation & Verification',
  projectId: 'workspace-demo-1',
  ownerAgent: 'cody',
  threadType: 'mind',
  mode: 'standalone_specialist',
  agentScope: 'cody',
  specialistId: 'cody',
  assignedSpecialists: ['cody', 'tester'],
  createdAt: NOW - 80 * MIN,
  updatedAt: NOW - 10 * MIN,
  model: 'DeepSeek R1 (Local)',
  turns: [
    {
      id: 'turn-s10-1',
      threadId: 'thread-s10-execution-verification',
      prompt: 'Resolve race condition in payment idempotency key validation and verify with concurrent load tests.',
      status: 'completed',
      createdAt: NOW - 60 * MIN,
      completedAt: NOW - 20 * MIN,
      items: [
        {
          id: 'item-s10-u1',
          turnId: 'turn-s10-1',
          type: 'user_message',
          actor: { type: 'user', name: 'Fintech Lead' },
          timestamp: NOW - 60 * MIN,
          text: 'Resolve race condition in payment idempotency key validation and verify with concurrent load tests.',
        },
        {
          id: 'item-s10-tool-read',
          turnId: 'turn-s10-1',
          type: 'tool_execution',
          actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
          timestamp: NOW - 55 * MIN,
          text: 'filesystem.read src/payments/idempotency.ts',
          tool: {
            toolName: 'filesystem.read',
            command: 'filesystem.read src/payments/idempotency.ts',
            status: 'success',
            startedAt: NOW - 55 * MIN,
            durationMs: 84,
            output: 'Exported checkAndLockIdempotencyKey(key, ttl)',
            verificationStatus: 'unverified',
          },
        },
        {
          id: 'item-s10-diff',
          turnId: 'turn-s10-1',
          type: 'diff',
          actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
          timestamp: NOW - 45 * MIN,
          diff: {
            filePath: 'src/payments/idempotency.ts',
            additions: 12,
            deletions: 3,
            lines: [
              { type: 'context', content: 'export async function lockIdempotency(key: string) {', oldLineNo: 20, newLineNo: 20 },
              { type: 'remove', content: '-   const exists = await redis.get(key);', oldLineNo: 21 },
              { type: 'add', content: '+   // Atomic SETNX lock prevents multi-process race', newLineNo: 21 },
              { type: 'add', content: '+   const acquired = await redis.set(key, "LOCKED", "NX", "EX", 60);', newLineNo: 22 },
            ],
          },
        },
        {
          id: 'item-s10-verify-tool',
          turnId: 'turn-s10-1',
          type: 'tool_execution',
          actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester' },
          timestamp: NOW - 30 * MIN,
          text: 'terminal.run node --test tests/idempotency-concurrency.test.js',
          tool: {
            toolName: 'terminal.run',
            command: 'node --test tests/idempotency-concurrency.test.js',
            status: 'success',
            startedAt: NOW - 30 * MIN,
            durationMs: 1420,
            exitCode: 0,
            stdoutBytes: 812,
            isVerification: true,
            verificationStatus: 'command-succeeded',
            outputLog: '✔ 50 concurrent payment attempts: exactly 1 charge executed, 49 idempotency-cached returns\nℹ tests 1\nℹ pass 1\nℹ fail 0',
          },
        },
        {
          id: 'item-s10-summary',
          turnId: 'turn-s10-1',
          type: 'agent_message',
          actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
          timestamp: NOW - 20 * MIN,
          text: 'Verified: Atomic SETNX lock successfully eliminates the payment race condition under 50 simultaneous concurrent requests. All verification criteria met.',
        },
      ],
    },
  ],
};

// ============================================================================
// SCENARIO 11: Multi-step Tool Execution & Progress Streaming (Level 5)
// ============================================================================
const SCENARIO_11_THREAD: Thread = {
  id: 'thread-s11-tool-progress',
  teamId: 'team-ops-s11',
  title: 'Build & Benchmark Pipeline Execution',
  projectId: 'workspace-demo-1',
  ownerAgent: 'cody',
  threadType: 'mind',
  mode: 'standalone_specialist',
  agentScope: 'cody',
  specialistId: 'cody',
  assignedSpecialists: ['cody'],
  createdAt: NOW - 60 * MIN,
  updatedAt: NOW - 10 * MIN,
  model: 'Claude 3.7 Sonnet',
  turns: [
    {
      id: 'turn-s11-1',
      threadId: 'thread-s11-tool-progress',
      prompt: 'Run full test suite with memory telemetry and compile production assets.',
      status: 'completed',
      createdAt: NOW - 50 * MIN,
      completedAt: NOW - 10 * MIN,
      items: [
        {
          id: 'item-s11-u1',
          turnId: 'turn-s11-1',
          type: 'user_message',
          actor: { type: 'user', name: 'Lead Architect' },
          timestamp: NOW - 50 * MIN,
          text: 'Run full test suite with memory telemetry and compile production assets.',
        },
        {
          id: 'item-s11-tool-run',
          turnId: 'turn-s11-1',
          type: 'tool_execution',
          actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
          timestamp: NOW - 40 * MIN,
          text: 'terminal.run bun test --coverage',
          tool: {
            toolName: 'terminal.run',
            command: 'bun test --coverage',
            status: 'success',
            startedAt: NOW - 40 * MIN,
            durationMs: 2340,
            exitCode: 0,
            stdoutBytes: 4096,
            outputLog: '✔ 142 pass, 0 fail. Coverage: 94.8% statements, 91.2% branches.\nPASS all suites.',
          },
        },
      ],
    },
  ],
};

// ============================================================================
// SCENARIO 12: Task Failure and Self-Recovery (Level 5)
// ============================================================================
const SCENARIO_12_THREAD: Thread = {
  id: 'thread-s12-failure-recovery',
  teamId: 'team-ops-s12',
  title: 'Adaptive Recovery from Configuration Failure',
  projectId: 'workspace-demo-1',
  ownerAgent: 'cody',
  threadType: 'mind',
  mode: 'standalone_specialist',
  agentScope: 'cody',
  specialistId: 'cody',
  assignedSpecialists: ['cody'],
  createdAt: NOW - 70 * MIN,
  updatedAt: NOW - 15 * MIN,
  model: 'Claude 3.7 Sonnet',
  turns: [
    {
      id: 'turn-s12-1',
      threadId: 'thread-s12-failure-recovery',
      prompt: 'Load database migration manifest and execute pending migrations.',
      status: 'completed',
      createdAt: NOW - 60 * MIN,
      completedAt: NOW - 15 * MIN,
      items: [
        {
          id: 'item-s12-u1',
          turnId: 'turn-s12-1',
          type: 'user_message',
          actor: { type: 'user', name: 'DevOps Engineer' },
          timestamp: NOW - 60 * MIN,
          text: 'Load database migration manifest and execute pending migrations.',
        },
        {
          id: 'item-s12-tool-fail',
          turnId: 'turn-s12-1',
          type: 'tool_execution',
          actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
          timestamp: NOW - 50 * MIN,
          text: 'filesystem.read migrations/manifest.json',
          tool: {
            toolName: 'filesystem.read',
            command: 'filesystem.read migrations/manifest.json',
            status: 'failed',
            startedAt: NOW - 50 * MIN,
            durationMs: 35,
            exitCode: 1,
            error: 'ENOENT: no such file or directory, open "migrations/manifest.json"',
            stderrBytes: 84,
            failureCategory: 'filesystem',
          },
        },
        {
          id: 'item-s12-recovery-msg',
          turnId: 'turn-s12-1',
          type: 'agent_message',
          actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
          timestamp: NOW - 45 * MIN,
          text: 'Recovering from missing file error: `migrations/manifest.json` was absent. Scanning `migrations/` directory directly to discover migration files.',
        },
        {
          id: 'item-s12-tool-recovered',
          turnId: 'turn-s12-1',
          type: 'tool_execution',
          actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
          timestamp: NOW - 40 * MIN,
          text: 'filesystem.list migrations/',
          tool: {
            toolName: 'filesystem.list',
            command: 'filesystem.list migrations/',
            status: 'success',
            startedAt: NOW - 40 * MIN,
            durationMs: 22,
            exitCode: 0,
            recoveredFromExecution: true,
            outputLog: 'Found 4 migration files: 001_init.sql, 002_users.sql, 003_billing.sql, 004_indices.sql',
          },
        },
      ],
    },
  ],
};

// ============================================================================
// SCENARIO 13: Tester Independent Verification (Level 5)
// ============================================================================
const SCENARIO_13_THREAD: Thread = {
  id: 'thread-s13-tester-verification',
  teamId: 'team-ops-s13',
  title: 'Tester Independent Quality Gate & Proof Assertion',
  projectId: 'workspace-demo-1',
  ownerAgent: 'tester',
  threadType: 'mind',
  mode: 'standalone_specialist',
  agentScope: 'tester',
  specialistId: 'tester',
  assignedSpecialists: ['tester'],
  createdAt: NOW - 50 * MIN,
  updatedAt: NOW - 5 * MIN,
  model: 'Gemini 3.6 Flash',
  turns: [
    {
      id: 'turn-s13-1',
      threadId: 'thread-s13-tester-verification',
      prompt: 'Execute full independent verification gate for Release 2.4.',
      status: 'completed',
      createdAt: NOW - 40 * MIN,
      completedAt: NOW - 5 * MIN,
      items: [
        {
          id: 'item-s13-u1',
          turnId: 'turn-s13-1',
          type: 'user_message',
          actor: { type: 'user', name: 'Release Manager' },
          timestamp: NOW - 40 * MIN,
          text: 'Execute full independent verification gate for Release 2.4.',
        },
        {
          id: 'item-s13-verify-tool',
          turnId: 'turn-s13-1',
          type: 'tool_execution',
          actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester' },
          timestamp: NOW - 25 * MIN,
          text: 'terminal.run node --test tests/release-gate.test.js',
          tool: {
            toolName: 'terminal.run',
            command: 'node --test tests/release-gate.test.js',
            status: 'success',
            startedAt: NOW - 25 * MIN,
            durationMs: 3100,
            exitCode: 0,
            isVerification: true,
            verificationStatus: 'command-succeeded',
            outcomeBadge: 'VERIFICATION PROOF: ACCEPTED',
            outputLog: '✔ Quality Gate 1: Security Scan passed (0 vulnerabilities)\n✔ Quality Gate 2: Concurrency Invariants passed\n✔ Quality Gate 3: Regression Matrix passed (24/24)',
          },
        },
        {
          id: 'item-s13-verify-msg',
          turnId: 'turn-s13-1',
          type: 'agent_message',
          actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
          timestamp: NOW - 5 * MIN,
          text: 'VERIFICATION PROOF: ACCEPTED. All 3 release gates passed unconditionally. Zero regressions detected.',
        },
      ],
    },
  ],
};

// ============================================================================
// ALL 15 MOCK SCENARIO DEFINITIONS
// ============================================================================
export const MOCK_SCENARIOS: MockScenarioMeta[] = [
  {
    id: 'scenario-1',
    number: 1,
    name: 'New Team Workspace',
    description: 'Fresh team workspace with idle new chat standby and clean empty specialist deck.',
    conversationLevel: 'LEVEL 2 - TEAM WORKSPACE',
    relevantThreads: [SCENARIO_1_THREAD],
    initialActiveThreadId: SCENARIO_1_THREAD.id,
    activeTeamId: 'team-phoenix-s1',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-2',
    number: 2,
    name: 'Multiple Main Team Conversations',
    description: 'Two concurrent Main Team conversations in the same active team workspace.',
    conversationLevel: 'LEVEL 3 - MAIN TEAM',
    relevantThreads: [SCENARIO_2_THREAD_A, SCENARIO_2_THREAD_B],
    initialActiveThreadId: SCENARIO_2_THREAD_A.id,
    activeTeamId: 'team-apollo-s2',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-3',
    number: 3,
    name: 'Independent Specialist Side Chats',
    description: 'Cody direct specialist chat associated with team workspace without leaking to other teams.',
    conversationLevel: 'LEVEL 4 - SPECIALISTS',
    relevantThreads: [SCENARIO_3_THREAD_CODY_SIDECHAT],
    initialActiveThreadId: SCENARIO_3_THREAD_CODY_SIDECHAT.id,
    activeTeamId: 'team-apollo-s2',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-4',
    number: 4,
    name: 'Dynamic Specialist Recruitment',
    description: 'Maestro analyzing task and dynamically mounting Cody, Tester, and Doc into active dock.',
    conversationLevel: 'LEVEL 5 - COLLABORATION',
    relevantThreads: [SCENARIO_4_THREAD],
    initialActiveThreadId: SCENARIO_4_THREAD.id,
    activeTeamId: 'team-nova-s4',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-5',
    number: 5,
    name: 'Cody Leading Coding Subteam',
    description: 'Cody orchestrating code changes, requesting Doc reviews, and triggering Tester verification.',
    conversationLevel: 'LEVEL 5 - COLLABORATION',
    relevantThreads: [SCENARIO_10_THREAD],
    initialActiveThreadId: SCENARIO_10_THREAD.id,
    activeTeamId: 'team-ops-s10',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-6',
    number: 6,
    name: 'Research and Doc Collaboration',
    description: 'Specialist-to-specialist peer messaging exchanging technical findings and synthesis.',
    conversationLevel: 'LEVEL 5 - COLLABORATION',
    relevantThreads: [SCENARIO_6_THREAD],
    initialActiveThreadId: SCENARIO_6_THREAD.id,
    activeTeamId: 'team-research-s6',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-7',
    number: 7,
    name: 'Scraapy Web Data Extraction',
    description: 'Scraapy executing headless web retrieval, cleaning DOM artifacts, and saving markdown.',
    conversationLevel: 'LEVEL 5 - COLLABORATION',
    relevantThreads: [SCENARIO_6_THREAD],
    initialActiveThreadId: SCENARIO_6_THREAD.id,
    activeTeamId: 'team-research-s6',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-8',
    number: 8,
    name: 'Parallel Specialist Execution',
    description: 'Cody compiling code while Tester runs tests in parallel, monitored via guidance strip.',
    conversationLevel: 'LEVEL 5 - COLLABORATION',
    relevantThreads: [SCENARIO_4_THREAD],
    initialActiveThreadId: SCENARIO_4_THREAD.id,
    activeTeamId: 'team-nova-s4',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-9',
    number: 9,
    name: 'Multi-Provider Model Routing',
    description: 'Maestro on Gemini 3.6, Cody on Claude 3.7, and Doc on DeepSeek R1 simultaneously.',
    conversationLevel: 'LEVEL 1 - ORGANIZATION',
    relevantThreads: [SCENARIO_10_THREAD],
    initialActiveThreadId: SCENARIO_10_THREAD.id,
    activeTeamId: 'team-ops-s10',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-10',
    number: 10,
    name: 'Specialist Peer Messaging',
    description: 'Collapsible collaboration stream showing live request/response peer messages.',
    conversationLevel: 'LEVEL 5 - COLLABORATION',
    relevantThreads: [SCENARIO_6_THREAD],
    initialActiveThreadId: SCENARIO_6_THREAD.id,
    activeTeamId: 'team-research-s6',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-11',
    number: 11,
    name: 'Tool Execution & Progress Streaming',
    description: 'Detailed tool cards with duration, exit codes, bytes, and monospace terminal logs.',
    conversationLevel: 'LEVEL 5 - COLLABORATION',
    relevantThreads: [SCENARIO_11_THREAD],
    initialActiveThreadId: SCENARIO_11_THREAD.id,
    activeTeamId: 'team-ops-s11',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-12',
    number: 12,
    name: 'Task Failure and Self-Recovery',
    description: 'Tool failure (ENOENT) caught and recovered with adaptive file search query.',
    conversationLevel: 'LEVEL 5 - COLLABORATION',
    relevantThreads: [SCENARIO_12_THREAD],
    initialActiveThreadId: SCENARIO_12_THREAD.id,
    activeTeamId: 'team-ops-s12',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-13',
    number: 13,
    name: 'Tester Independent Verification',
    description: 'Strict verification proof badge asserting genuine test command success.',
    conversationLevel: 'LEVEL 5 - COLLABORATION',
    relevantThreads: [SCENARIO_13_THREAD],
    initialActiveThreadId: SCENARIO_13_THREAD.id,
    activeTeamId: 'team-ops-s13',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-14',
    number: 14,
    name: 'Project Switching Isolation',
    description: 'Switching active project workspace re-binds file trees and tabs cleanly.',
    conversationLevel: 'LEVEL 1 - ORGANIZATION',
    relevantThreads: [SCENARIO_2_THREAD_A],
    initialActiveThreadId: SCENARIO_2_THREAD_A.id,
    activeTeamId: 'team-apollo-s2',
    activeProjectId: 'workspace-demo-1',
  },
  {
    id: 'scenario-15',
    number: 15,
    name: 'Conversation Switching & History Restoration',
    description: 'Rapid tab switching restoring exact conversation state and active scroll position.',
    conversationLevel: 'LEVEL 3 - MAIN TEAM',
    relevantThreads: [SCENARIO_2_THREAD_A, SCENARIO_2_THREAD_B, SCENARIO_3_THREAD_CODY_SIDECHAT],
    initialActiveThreadId: SCENARIO_2_THREAD_B.id,
    activeTeamId: 'team-apollo-s2',
    activeProjectId: 'workspace-demo-1',
  },
];

