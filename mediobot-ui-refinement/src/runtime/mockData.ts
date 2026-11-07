import type {
  ProjectInfo,
  FileNode,
  Thread,
  ProviderConfig,
  CatalogProviderItem,
  MedioBotAgent,
} from '../types';

export const MOCK_PROJECTS: ProjectInfo[] = [
  {
    id: 'workspace-demo-1',
    name: 'nik',
    path: '/Users/rahulkarthikt/Documents/nik',
    branch: 'main',
    branches: ['main', 'feature/calculator', 'feat/dashboard'],
    environment: 'Local',
  },
];

export const MOCK_SESSION = {
  workspaceId: 'workspace-demo-1',
  canonicalRootPath: '/Users/rahulkarthikt/Documents/nik',
  displayName: 'nik',
  openedAt: Date.now() - 86400000,
};

export const MOCK_FILES: Record<string, string> = {
  'src/calculator.js': `export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

export function multiply(a, b) {
  return a * b;
}

export function divide(a, b) {
  if (b === 0) {
    throw new Error('Division by zero is not allowed');
  }
  return a / b;
}
`,
  'tests/calculator.test.js': `import test from 'node:test';
import assert from 'node:assert/strict';
import { add, subtract, multiply, divide } from '../src/calculator.js';

test('arithmetic operations', () => {
  assert.equal(add(2, 3), 5);
  assert.equal(subtract(10, 4), 6);
  assert.equal(multiply(6, 7), 42);
  assert.equal(divide(20, 5), 4);
});

test('divide by zero guard', () => {
  assert.throws(() => divide(10, 0), /Division by zero is not allowed/);
});
`,
  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Calculator Demo</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/calculator.js"></script>
</body>
</html>
`,
  'package.json': `{
  "name": "calculator-demo",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "node --test tests/calculator.test.js",
    "build": "vite build",
    "dev": "vite"
  }
}
`,
  'README.md': `# Calculator Application

Built autonomously by Mediobot.

## Features
- Basic arithmetic (add, subtract, multiply, divide)
- Division by zero error guards
- Node.js native test suite
`,
};

export const MOCK_FILE_NODES: FileNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'folder',
    children: [
      { name: 'calculator.js', path: 'src/calculator.js', type: 'file' },
    ],
  },
  {
    name: 'tests',
    path: 'tests',
    type: 'folder',
    children: [
      { name: 'calculator.test.js', path: 'tests/calculator.test.js', type: 'file' },
    ],
  },
  { name: 'index.html', path: 'index.html', type: 'file' },
  { name: 'package.json', path: 'package.json', type: 'file' },
  { name: 'README.md', path: 'README.md', type: 'file' },
];

export const MOCK_PROVIDERS: ProviderConfig[] = [
  {
    id: 'google-gemini',
    name: 'Google Gemini',
    type: 'builtin',
    iconType: 'gemini',
    connected: true,
    enabled: true,
    models: [
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', enabled: true, tag: 'Default', context: '1M' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', enabled: true, tag: 'Fast', context: '1M' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'builtin',
    iconType: 'anthropic',
    connected: true,
    enabled: true,
    models: [
      { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', enabled: true, tag: 'Thinking', context: '200K' },
    ],
  },
  {
    id: 'deepseek-local',
    name: 'DeepSeek Local Engine',
    type: 'builtin',
    iconType: 'ollama',
    connected: true,
    enabled: true,
    models: [
      { id: 'deepseek-r1-local', name: 'DeepSeek R1 (Local)', enabled: true, tag: 'Reasoning', context: '64K' },
    ],
  },
];

export const MOCK_CATALOG: CatalogProviderItem[] = [
  { id: 'google-ai-studio', name: 'Google Gemini API', description: 'Next-gen multimodal reasoning models.', group: 'cloud', iconType: 'gemini' },
  { id: 'anthropic', name: 'Anthropic Claude', description: 'Advanced coding & agentic capabilities.', group: 'cloud', iconType: 'anthropic' },
  { id: 'deepseek', name: 'DeepSeek Reasoner', description: 'High-efficiency open reasoning models.', group: 'local', iconType: 'ollama' },
];

export const MOCK_DEFINITIONS: MedioBotAgent[] = [
  { id: 'maestro', name: 'Maestro', group: 'orchestrator', role: 'Team orchestration & Goal decomposition', status: 'idle', directConversationAvailable: true },
  { id: 'cody', name: 'Cody', group: 'specialist', role: 'Software architecture & Implementation', status: 'idle', directConversationAvailable: true },
  { id: 'tester', name: 'Tester', group: 'specialist', role: 'Independent verification & Quality gates', status: 'idle', directConversationAvailable: true },
  { id: 'research', name: 'Research', group: 'specialist', role: 'Deep research & Web intelligence', status: 'idle', directConversationAvailable: true },
  { id: 'doc', name: 'Doc', group: 'specialist', role: 'Documentation & Architecture synthesis', status: 'idle', directConversationAvailable: true },
  { id: 'scraapy', name: 'Scraapy', group: 'specialist', role: 'Web scraping & Extraction pipeline', status: 'idle', directConversationAvailable: true },
  { id: 'vision', name: 'Vision', group: 'specialist', role: 'Visual UX inspection & Browser workflows', status: 'development', directConversationAvailable: true },
];

const NOW = Date.now();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// ============================================================================
// THE 5 CANONICAL PRELOADED CONVERSATIONS AND SPECIALIST SESSIONS
// ============================================================================

export const MOCK_THREADS: Thread[] = [
  // --------------------------------------------------------------------------
  // CONVERSATION 1: Normal Maestro Conversation
  // Title: "Getting Started with Mediobot"
  // Team: team-getting-started
  // Assigned: [] (Empty deck; simple greeting must not trigger specialists)
  // --------------------------------------------------------------------------
  {
    id: 'thread-getting-started-main',
    teamId: 'team-getting-started',
    title: 'Getting Started with Mediobot',
    projectId: 'workspace-demo-1',
    ownerAgent: 'team',
    threadType: 'team',
    mode: 'connected_main',
    agentScope: 'team',
    assignedSpecialists: [],
    createdAt: NOW - 12 * HOUR,
    updatedAt: NOW - 11 * HOUR,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-gs-1',
        threadId: 'thread-getting-started-main',
        prompt: 'Hi',
        status: 'completed',
        createdAt: NOW - 12 * HOUR,
        completedAt: NOW - 12 * HOUR + 1200,
        items: [
          {
            id: 'item-gs-u1',
            turnId: 'turn-gs-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: NOW - 12 * HOUR,
            text: 'Hi',
          },
          {
            id: 'item-gs-m1',
            turnId: 'turn-gs-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 12 * HOUR + 1200,
            text: 'Hello! I am Maestro, your autonomous AI organization coordinator. How can I assist you with your software projects today?',
          },
        ],
      },
      {
        id: 'turn-gs-2',
        threadId: 'thread-getting-started-main',
        prompt: 'What can you do?',
        status: 'completed',
        createdAt: NOW - 11.5 * HOUR,
        completedAt: NOW - 11.5 * HOUR + 2400,
        items: [
          {
            id: 'item-gs-u2',
            turnId: 'turn-gs-2',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: NOW - 11.5 * HOUR,
            text: 'What can you do?',
          },
          {
            id: 'item-gs-m2',
            turnId: 'turn-gs-2',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 11.5 * HOUR + 2400,
            text: `I coordinate an autonomous team of specialized AI agents designed to handle complete engineering lifecycles locally on your machine:

1. **Understand Objectives**: I break down software goals into clear, verifiable technical milestones.
2. **Assemble Specialist Teams**: Based on your requirements, I recruit specialists from the Mediobots Library:
   - **Cody**: Software architecture, implementation, refactoring, and build execution.
   - **Tester**: Independent verification, test suite generation, and regression gates.
   - **Research**: Framework evaluation, technical precedent discovery, and documentation lookup.
   - **Doc**: Architecture decision records (ADRs), READMEs, and technical documentation.
   - **Scraapy**: High-performance web intelligence and documentation extraction.
3. **Parallel Execution**: Specialists operate concurrently with sandboxed permissions and real tool access.
4. **Independent Quality Gates**: Implementations must be verified by Tester before being marked complete.`,
          },
        ],
      },
      {
        id: 'turn-gs-3',
        threadId: 'thread-getting-started-main',
        prompt: 'Explain how your specialist teams work.',
        status: 'completed',
        createdAt: NOW - 11 * HOUR,
        completedAt: NOW - 11 * HOUR + 2800,
        items: [
          {
            id: 'item-gs-u3',
            turnId: 'turn-gs-3',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: NOW - 11 * HOUR,
            text: 'Explain how your specialist teams work.',
          },
          {
            id: 'item-gs-m3',
            turnId: 'turn-gs-3',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 11 * HOUR + 2800,
            text: `Our architecture enforces **strict organizational separation**:

* **Main Team vs. Side Chats**: This Main Team conversation is where we align on high-level goals and review verified deliverables. Each recruited specialist also maintains an independent, dedicated side-chat channel for focused 1-on-1 collaboration.
* **Separation of Concerns**: Cody cannot approve his own pull requests or mark tests passed; Tester runs an independent execution sandbox to verify code truth.
* **Truthful Observation**: Every inspection or test assertion records authentic execution provenance with tool exit codes and output logs rather than hallucinated claims.
* **Deterministic Isolation**: When you start a simple greeting or general inquiry like this, no background specialists or terminal processes are activated. Specialists are assembled only when an actual technical assignment justifies them.`,
          },
        ],
      },
    ],
  },
  // Maestro Direct Chat: Organization & Architectural Advisory
  {
    id: 'thread-getting-started-maestro',
    teamId: 'team-getting-started',
    title: 'Maestro · Architectural Advisory',
    projectId: 'workspace-demo-1',
    ownerAgent: 'maestro',
    specialistId: 'maestro',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'maestro',
    assignedSpecialists: ['maestro'],
    createdAt: NOW - 10 * HOUR,
    updatedAt: NOW - 9.5 * HOUR,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-gs-maestro-1',
        threadId: 'thread-getting-started-maestro',
        prompt: 'How do you coordinate autonomous specialist teams while keeping verification truthful?',
        status: 'completed',
        createdAt: NOW - 10 * HOUR,
        completedAt: NOW - 10 * HOUR + 2400,
        items: [
          {
            id: 'item-gsm-u1',
            turnId: 'turn-gs-maestro-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: NOW - 10 * HOUR,
            text: 'How do you coordinate autonomous specialist teams while keeping verification truthful?',
          },
          {
            id: 'item-gsm-tool-1',
            turnId: 'turn-gs-maestro-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 10 * HOUR + 800,
            tool: {
              toolName: 'organization.policy_inspect',
              command: 'organization.policy_inspect --scope verification_gates',
              status: 'success',
              output: 'Active policy: Dual-specialist isolation enforced. Builder cannot verify own deliverables.',
            },
          },
          {
            id: 'item-gsm-m1',
            turnId: 'turn-gs-maestro-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 10 * HOUR + 2400,
            text: `As the Team Leader, my role is to maintain **rigorous architectural boundaries** across the entire project lifecycle:

1. **Strict Builder-Verifier Separation**: A specialist who writes code (such as Cody) is never permitted to approve or certify that implementation. Verification is assigned exclusively to Tester, who executes assertions independently in a clean sandbox.
2. **Explicit Observation Provenance**: I reject self-reported claims of completion. Deliverables require real process outputs (terminal exit codes, test report streams, or filesystem diffs).
3. **Dedicated Communication Channels**: Main Team remains the shared meeting room for whole-team alignment and milestone sign-offs. In this direct channel, you and I can conduct 1-on-1 strategic planning, adjust resource allocations, and define bespoke verification criteria without cluttering the team room.`,
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // CONVERSATION 2: Autonomous Coding Task
  // Title: "Build a Calculator Application"
  // Team: team-calculator
  // Recruits: ['cody', 'tester', 'doc']
  // --------------------------------------------------------------------------
  {
    id: 'thread-calculator-main',
    teamId: 'team-calculator',
    title: 'Build a Calculator Application',
    projectId: 'workspace-demo-1',
    ownerAgent: 'team',
    threadType: 'team',
    mode: 'connected_main',
    agentScope: 'team',
    assignedSpecialists: ['cody', 'tester', 'doc'],
    createdAt: NOW - 8 * HOUR,
    updatedAt: NOW - 7 * HOUR,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-calc-1',
        threadId: 'thread-calculator-main',
        prompt: 'Build a calculator application with a frontend, backend, and automated tests.',
        status: 'completed',
        createdAt: NOW - 8 * HOUR,
        completedAt: NOW - 7.5 * HOUR,
        items: [
          {
            id: 'item-calc-u1',
            turnId: 'turn-calc-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: NOW - 8 * HOUR,
            text: 'Build a calculator application with a frontend, backend, and automated tests.',
          },
          {
            id: 'item-calc-m1',
            turnId: 'turn-calc-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 7.9 * HOUR,
            text: `I have analyzed the objective and formed an autonomous delivery team:

### Delivery Plan
1. **Architecture & Implementation (Cody)**: Scaffold arithmetic primitives in \`src/calculator.js\` with division-by-zero bounds, plus \`index.html\` UI.
2. **Independent Verification (Tester)**: Author \`tests/calculator.test.js\` with full edge-case coverage and verify execution.
3. **Documentation (Doc)**: Prepare \`README.md\` and API usage documentation.

Recruiting **Cody**, **Tester**, and **Doc** to this workspace team.`,
          },
          {
            id: 'item-calc-collab-cody',
            turnId: 'turn-calc-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software architecture' },
            timestamp: NOW - 7.7 * HOUR,
            text: 'Implementation complete in `src/calculator.js`. Implemented `add`, `subtract`, `multiply`, and guarded `divide`. Transferred build to Tester for verification.',
          },
          {
            id: 'item-calc-collab-tester',
            turnId: 'turn-calc-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: NOW - 7.6 * HOUR,
            text: 'Verified: 14 test cases passed cleanly (`node --test tests/calculator.test.js`). Division by zero guard asserted with exit code 0.',
          },
          {
            id: 'item-calc-collab-doc',
            turnId: 'turn-calc-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'doc', name: 'Doc', role: 'Documentation' },
            timestamp: NOW - 7.55 * HOUR,
            text: 'Synthesized `README.md` with installation commands, test instructions, and API function signatures.',
          },
          {
            id: 'item-calc-m2',
            turnId: 'turn-calc-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 7.5 * HOUR,
            text: `### Verified Deliverable Summary: Calculator Application

* **Core Engine**: \`src/calculator.js\` exported with \`add\`, \`subtract\`, \`multiply\`, \`divide\`.
* **Frontend Entry**: \`index.html\` connected to the ESM calculator module.
* **Independent Quality Proof**: 100% test pass rate in \`tests/calculator.test.js\` (exit code 0).
* **Documentation**: Complete \`README.md\` published.

You can inspect Cody's step-by-step implementation, Tester's assertion logs, and Doc's drafts in their respective specialist channels in the sidebar.`,
          },
        ],
      },
    ],
  },
  // Maestro Direct Chat: Calculator Architecture & Task Sequencing
  {
    id: 'thread-calculator-maestro',
    teamId: 'team-calculator',
    title: 'Maestro · Calculator Task Delegation',
    projectId: 'workspace-demo-1',
    ownerAgent: 'maestro',
    specialistId: 'maestro',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'maestro',
    assignedSpecialists: ['maestro'],
    createdAt: NOW - 7.95 * HOUR,
    updatedAt: NOW - 7.4 * HOUR,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-calc-maestro-1',
        threadId: 'thread-calculator-maestro',
        prompt: 'Review the calculator task dependencies, quality gates, and milestone sequencing.',
        status: 'completed',
        createdAt: NOW - 7.95 * HOUR,
        completedAt: NOW - 7.95 * HOUR + 2100,
        items: [
          {
            id: 'item-cm-u1',
            turnId: 'turn-calc-maestro-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: NOW - 7.95 * HOUR,
            text: 'Review the calculator task dependencies, quality gates, and milestone sequencing.',
          },
          {
            id: 'item-cm-tool-plan',
            turnId: 'turn-calc-maestro-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 7.95 * HOUR + 600,
            tool: {
              toolName: 'maestro.dependency_graph',
              command: 'maestro.dependency_graph --project calculator-demo',
              status: 'success',
              output: 'Milestone 1: Cody [src/calculator.js] -> Milestone 2: Tester [tests/calculator.test.js] -> Milestone 3: Doc [README.md]',
            },
          },
          {
            id: 'item-cm-m1',
            turnId: 'turn-calc-maestro-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 7.95 * HOUR + 2100,
            text: `Here is the execution blueprint for the Calculator application:

* **Track A — Implementation (Cody)**: Scaffold pure arithmetic operations with input validation. Specifically mandated: division-by-zero throw guard.
* **Track B — Verification Gate (Tester)**: Author \`tests/calculator.test.js\` testing nominal and edge boundary conditions. Gate threshold: zero regressions with exit code 0.
* **Track C — Documentation (Doc)**: Produce API signatures and installation instructions once Track B certifies the build.

I am monitoring the handoff between Cody and Tester. All milestone summaries are being projected to the shared Main Team room.`,
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Cody for Calculator
  {
    id: 'thread-calculator-cody',
    teamId: 'team-calculator',
    title: 'Cody · Calculator Implementation',
    projectId: 'workspace-demo-1',
    ownerAgent: 'cody',
    specialistId: 'cody',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'cody',
    assignedSpecialists: ['cody'],
    createdAt: NOW - 7.9 * HOUR,
    updatedAt: NOW - 7.7 * HOUR,
    model: 'Claude 3.7 Sonnet',
    turns: [
      {
        id: 'turn-calc-cody-1',
        threadId: 'thread-calculator-cody',
        prompt: 'Implement calculator arithmetic core and UI entry point.',
        status: 'completed',
        createdAt: NOW - 7.9 * HOUR,
        completedAt: NOW - 7.7 * HOUR,
        items: [
          {
            id: 'item-cc-1',
            turnId: 'turn-calc-cody-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software architecture' },
            timestamp: NOW - 7.85 * HOUR,
            text: 'Assignment accepted from Maestro. Inspecting workspace directory and scaffolding `src/calculator.js`.',
          },
          {
            id: 'item-cc-tool1',
            turnId: 'turn-calc-cody-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
            timestamp: NOW - 7.82 * HOUR,
            text: 'filesystem.read package.json',
            tool: {
              toolName: 'filesystem.read',
              command: 'filesystem.read package.json',
              status: 'success',
              startedAt: NOW - 7.82 * HOUR,
              durationMs: 42,
              output: '{"name": "calculator-demo", "type": "module"}',
            },
          },
          {
            id: 'item-cc-diff1',
            turnId: 'turn-calc-cody-1',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
            timestamp: NOW - 7.78 * HOUR,
            diff: {
              filePath: 'src/calculator.js',
              additions: 19,
              deletions: 0,
              lines: [
                { type: 'add', content: 'export function add(a, b) { return a + b; }', newLineNo: 1 },
                { type: 'add', content: 'export function subtract(a, b) { return a - b; }', newLineNo: 2 },
                { type: 'add', content: 'export function multiply(a, b) { return a * b; }', newLineNo: 3 },
                { type: 'add', content: 'export function divide(a, b) {', newLineNo: 4 },
                { type: 'add', content: '  if (b === 0) throw new Error("Division by zero is not allowed");', newLineNo: 5 },
                { type: 'add', content: '  return a / b;', newLineNo: 6 },
                { type: 'add', content: '}', newLineNo: 7 },
              ],
            },
          },
          {
            id: 'item-cc-peer',
            turnId: 'turn-calc-cody-1',
            type: 'peer_message',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
            timestamp: NOW - 7.72 * HOUR,
            text: 'Tester, core arithmetic primitives implemented in `src/calculator.js`. Please build the independent assertion suite.',
            peerMessage: {
              messageId: 'peer-cody-calc-1',
              messageKind: 'finding',
              scope: 'direct',
              senderId: 'cody',
              senderName: 'Cody',
              recipientId: 'tester',
              recipientName: 'Tester',
              sequenceNumber: 1,
              status: 'delivered',
              text: 'Tester, core arithmetic primitives implemented in `src/calculator.js`. Please build the independent assertion suite.',
            },
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Tester for Calculator
  {
    id: 'thread-calculator-tester',
    teamId: 'team-calculator',
    title: 'Tester · Test Verification Suite',
    projectId: 'workspace-demo-1',
    ownerAgent: 'tester',
    specialistId: 'tester',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'tester',
    assignedSpecialists: ['tester'],
    createdAt: NOW - 7.75 * HOUR,
    updatedAt: NOW - 7.6 * HOUR,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-calc-test-1',
        threadId: 'thread-calculator-tester',
        prompt: 'Author independent tests and run quality gate for calculator.js.',
        status: 'completed',
        createdAt: NOW - 7.75 * HOUR,
        completedAt: NOW - 7.6 * HOUR,
        items: [
          {
            id: 'item-ct-1',
            turnId: 'turn-calc-test-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: NOW - 7.74 * HOUR,
            text: 'Received handover from Cody. Creating independent unit test suite in `tests/calculator.test.js` targeting standard arithmetic and zero-divisor boundaries.',
          },
          {
            id: 'item-ct-diff',
            turnId: 'turn-calc-test-1',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester' },
            timestamp: NOW - 7.68 * HOUR,
            diff: {
              filePath: 'tests/calculator.test.js',
              additions: 15,
              deletions: 0,
              lines: [
                { type: 'add', content: 'import test from "node:test";', newLineNo: 1 },
                { type: 'add', content: 'import assert from "node:assert/strict";', newLineNo: 2 },
                { type: 'add', content: 'import { add, divide } from "../src/calculator.js";', newLineNo: 3 },
                { type: 'add', content: 'test("divide by zero guard", () => {', newLineNo: 4 },
                { type: 'add', content: '  assert.throws(() => divide(10, 0), /Division by zero is not allowed/);', newLineNo: 5 },
                { type: 'add', content: '});', newLineNo: 6 },
              ],
            },
          },
          {
            id: 'item-ct-tool',
            turnId: 'turn-calc-test-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester' },
            timestamp: NOW - 7.63 * HOUR,
            text: 'terminal.run node --test tests/calculator.test.js',
            tool: {
              toolName: 'terminal.run',
              command: 'node --test tests/calculator.test.js',
              status: 'success',
              startedAt: NOW - 7.63 * HOUR,
              durationMs: 240,
              exitCode: 0,
              isVerification: true,
              verificationStatus: 'command-succeeded',
              outcomeBadge: 'VERIFICATION PROOF: ACCEPTED',
              outputLog: '✔ arithmetic operations (1.2ms)\n✔ divide by zero guard (0.9ms)\nℹ tests 2, pass 2, fail 0',
            },
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Doc for Calculator
  {
    id: 'thread-calculator-doc',
    teamId: 'team-calculator',
    title: 'Doc · Calculator Architecture & API',
    projectId: 'workspace-demo-1',
    ownerAgent: 'doc',
    specialistId: 'doc',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'doc',
    assignedSpecialists: ['doc'],
    createdAt: NOW - 7.7 * HOUR,
    updatedAt: NOW - 7.55 * HOUR,
    model: 'Gemini 3.5 Flash Lite',
    turns: [
      {
        id: 'turn-calc-doc-1',
        threadId: 'thread-calculator-doc',
        prompt: 'Author comprehensive README and API specifications.',
        status: 'completed',
        createdAt: NOW - 7.7 * HOUR,
        completedAt: NOW - 7.55 * HOUR,
        items: [
          {
            id: 'item-cd-1',
            turnId: 'turn-calc-doc-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'doc', name: 'Doc', role: 'Documentation' },
            timestamp: NOW - 7.68 * HOUR,
            text: 'Documenting architecture and usage in `README.md`. Outlining prerequisite commands, exports, and error behavior.',
          },
          {
            id: 'item-cd-diff',
            turnId: 'turn-calc-doc-1',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'doc', name: 'Doc' },
            timestamp: NOW - 7.6 * HOUR,
            diff: {
              filePath: 'README.md',
              additions: 12,
              deletions: 0,
              lines: [
                { type: 'add', content: '# Calculator Application', newLineNo: 1 },
                { type: 'add', content: 'Autonomous verified build by Mediobot.', newLineNo: 2 },
                { type: 'add', content: '### Commands', newLineNo: 3 },
                { type: 'add', content: '- `npm test`: Runs test suite', newLineNo: 4 },
                { type: 'add', content: '- `npm run dev`: Starts Vite preview', newLineNo: 5 },
              ],
            },
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // CONVERSATION 3: Research and Collaboration
  // Title: "Research AI Agent Frameworks"
  // Team: team-research
  // Recruits: ['research', 'scraapy', 'doc']
  // --------------------------------------------------------------------------
  {
    id: 'thread-research-main',
    teamId: 'team-research',
    title: 'Research AI Agent Frameworks',
    projectId: 'workspace-demo-1',
    ownerAgent: 'team',
    threadType: 'team',
    mode: 'connected_main',
    agentScope: 'team',
    assignedSpecialists: ['research', 'scraapy', 'doc'],
    createdAt: NOW - 5 * HOUR,
    updatedAt: NOW - 4 * HOUR,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-res-1',
        threadId: 'thread-research-main',
        prompt: 'Research the best frameworks for building autonomous multi-agent systems and prepare a technical comparison.',
        status: 'completed',
        createdAt: NOW - 5 * HOUR,
        completedAt: NOW - 4.2 * HOUR,
        items: [
          {
            id: 'item-res-u1',
            turnId: 'turn-res-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: NOW - 5 * HOUR,
            text: 'Research the best frameworks for building autonomous multi-agent systems and prepare a technical comparison.',
          },
          {
            id: 'item-res-m1',
            turnId: 'turn-res-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 4.95 * HOUR,
            text: `Objective received. Assembling our research swarms:

1. **Research (Intelligence Lead)**: Map architectural paradigms across LangGraph, CrewAI, AutoGen, and Semantic Kernel.
2. **Scraapy (Extraction Pipeline)**: Retrieve structured documentation, GitHub telemetry, and memory persistence models.
3. **Doc (Technical Synthesis)**: Produce a publication-grade markdown evaluation matrix in \`docs/architecture/framework-comparison.md\`.

Recruiting **Research**, **Scraapy**, and **Doc**.`,
          },
          {
            id: 'item-res-update-scraapy',
            turnId: 'turn-res-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'scraapy', name: 'Scraapy', role: 'Web extraction pipeline' },
            timestamp: NOW - 4.7 * HOUR,
            text: 'Extracted architectural specifications from 4 framework repositories. Emitted parsed schemas to Research.',
          },
          {
            id: 'item-res-update-research',
            turnId: 'turn-res-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'research', name: 'Research', role: 'Deep research' },
            timestamp: NOW - 4.4 * HOUR,
            text: 'Completed architectural analysis. LangGraph provides cyclic graph state resilience; CrewAI excels at sequential role-playing; AutoGen leads in dynamic group conversation.',
          },
          {
            id: 'item-res-m2',
            turnId: 'turn-res-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 4.2 * HOUR,
            text: `### Multi-Agent Framework Recommendation Matrix

| Framework | State Architecture | Concurrency Support | Fault Tolerance | Ideal Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **LangGraph** | Cyclic graph with checkpointing | Native multi-actor threads | High (Time-travel / SQLite) | Complex autonomous workflows |
| **CrewAI** | Role-based hierarchical / sequential | Process-pool delegation | Moderate | Standard sequential agency pipelines |
| **AutoGen** | Conversational group chats | Multi-agent dialogue loops | Moderate (Session state) | Dynamic collaborative brainstorming |
| **Semantic Kernel** | Pipeline plugin orchestration | Asynchronous step runners | High | Enterprise ERP / Service integration |

*Full whitepaper published by Doc to \`docs/architecture/framework-comparison.md\`.*`,
          },
        ],
      },
    ],
  },
  // Maestro Direct Chat: Research Scoping & Quality Gates
  {
    id: 'thread-research-maestro',
    teamId: 'team-research',
    title: 'Maestro · Research Scoping & Quality Gates',
    projectId: 'workspace-demo-1',
    ownerAgent: 'maestro',
    specialistId: 'maestro',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'maestro',
    assignedSpecialists: ['maestro'],
    createdAt: NOW - 4.95 * HOUR,
    updatedAt: NOW - 4.2 * HOUR,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-fr-maestro-1',
        threadId: 'thread-research-maestro',
        prompt: 'Scope evaluation criteria and quality gates for the AI agent framework research sprint.',
        status: 'completed',
        createdAt: NOW - 4.95 * HOUR,
        completedAt: NOW - 4.95 * HOUR + 1900,
        items: [
          {
            id: 'item-frm-u1',
            turnId: 'turn-fr-maestro-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: NOW - 4.95 * HOUR,
            text: 'Scope evaluation criteria and quality gates for the AI agent framework research sprint.',
          },
          {
            id: 'item-frm-tool-1',
            turnId: 'turn-fr-maestro-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 4.95 * HOUR + 500,
            tool: {
              toolName: 'research.scope_dimensions',
              command: 'research.scope_dimensions --categories ["state_persistence", "latency", "subagent_delegation", "tool_sandboxing"]',
              status: 'success',
              output: 'Scoping validated: 4 dimensions defined for comparison against LangGraph, CrewAI, AutoGen.',
            },
          },
          {
            id: 'item-frm-m1',
            turnId: 'turn-fr-maestro-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 4.95 * HOUR + 1900,
            text: `I have scoped the research parameters across three parallel streams:

1. **Extraction (Scraapy)**: Crawling raw technical docs, rate-limiting policies, and schema structures.
2. **Analysis (Research)**: Benchmarking state graph cyclic loop handling, execution latencies, and fault tolerance.
3. **Consolidation (Doc)**: Formatting a structured decision matrix with actionable recommendations for our engineering team.

I am reviewing Scraapy's crawl yields and will reconcile Research's findings before publishing the final executive synthesis in Main Team.`,
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Research
  {
    id: 'thread-research-research',
    teamId: 'team-research',
    title: 'Research · Framework Investigation',
    projectId: 'workspace-demo-1',
    ownerAgent: 'research',
    specialistId: 'research',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'research',
    assignedSpecialists: ['research'],
    createdAt: NOW - 4.9 * HOUR,
    updatedAt: NOW - 4.4 * HOUR,
    model: 'Claude 3.7 Sonnet',
    turns: [
      {
        id: 'turn-rr-1',
        threadId: 'thread-research-research',
        prompt: 'Investigate multi-agent framework architectures.',
        status: 'completed',
        createdAt: NOW - 4.9 * HOUR,
        completedAt: NOW - 4.4 * HOUR,
        items: [
          {
            id: 'item-rr-1',
            turnId: 'turn-rr-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'research', name: 'Research' },
            timestamp: NOW - 4.85 * HOUR,
            text: 'Requesting Scraapy to crawl framework documentation and token consumption benchmarks.',
          },
          {
            id: 'item-rr-peer',
            turnId: 'turn-rr-1',
            type: 'peer_message',
            actor: { type: 'mediobot', mediobotId: 'research', name: 'Research' },
            timestamp: NOW - 4.8 * HOUR,
            text: 'Scraapy, please fetch state checkpointing specs for LangGraph v0.3 and CrewAI v0.84.',
            peerMessage: {
              messageId: 'peer-res-1',
              messageKind: 'request',
              scope: 'direct',
              senderId: 'research',
              senderName: 'Research',
              recipientId: 'scraapy',
              recipientName: 'Scraapy',
              sequenceNumber: 1,
              status: 'delivered',
              text: 'Scraapy, please fetch state checkpointing specs for LangGraph v0.3 and CrewAI v0.84.',
            },
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Scraapy
  {
    id: 'thread-research-scraapy',
    teamId: 'team-research',
    title: 'Scraapy · Web Documentation Extraction',
    projectId: 'workspace-demo-1',
    ownerAgent: 'scraapy',
    specialistId: 'scraapy',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'scraapy',
    assignedSpecialists: ['scraapy'],
    createdAt: NOW - 4.8 * HOUR,
    updatedAt: NOW - 4.6 * HOUR,
    model: 'DeepSeek R1 (Local)',
    turns: [
      {
        id: 'turn-rs-1',
        threadId: 'thread-research-scraapy',
        prompt: 'Fetch framework documentation and benchmarks.',
        status: 'completed',
        createdAt: NOW - 4.8 * HOUR,
        completedAt: NOW - 4.6 * HOUR,
        items: [
          {
            id: 'item-rs-tool',
            turnId: 'turn-rs-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'scraapy', name: 'Scraapy' },
            timestamp: NOW - 4.75 * HOUR,
            text: 'scraapy.fetch https://langchain-ai.github.io/langgraph/concepts/persistence/',
            tool: {
              toolName: 'scraapy.fetch',
              command: 'scraapy.fetch https://langchain-ai.github.io/langgraph/concepts/persistence/',
              status: 'success',
              startedAt: NOW - 4.75 * HOUR,
              durationMs: 820,
              stdoutBytes: 14200,
              outputLog: '✔ 200 OK. Extracted BaseCheckpointSaver, MemorySaver, and SqliteSaver specs.',
            },
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Doc for Research
  {
    id: 'thread-research-doc',
    teamId: 'team-research',
    title: 'Doc · Comparison Matrix & Whitepaper',
    projectId: 'workspace-demo-1',
    ownerAgent: 'doc',
    specialistId: 'doc',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'doc',
    assignedSpecialists: ['doc'],
    createdAt: NOW - 4.6 * HOUR,
    updatedAt: NOW - 4.2 * HOUR,
    model: 'Gemini 3.5 Flash Lite',
    turns: [
      {
        id: 'turn-rd-1',
        threadId: 'thread-research-doc',
        prompt: 'Compile technical evaluation whitepaper.',
        status: 'completed',
        createdAt: NOW - 4.6 * HOUR,
        completedAt: NOW - 4.2 * HOUR,
        items: [
          {
            id: 'item-rd-1',
            turnId: 'turn-rd-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'doc', name: 'Doc' },
            timestamp: NOW - 4.3 * HOUR,
            text: 'Synthesizing evaluation whitepaper with architecture trade-offs in `docs/architecture/framework-comparison.md`.',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // CONVERSATION 4: Parallel Multi-Agent Execution
  // Title: "Develop a Full-Stack Dashboard"
  // Team: team-dashboard
  // Recruits: ['cody', 'tester', 'research', 'doc', 'vision']
  // --------------------------------------------------------------------------
  {
    id: 'thread-dashboard-main',
    teamId: 'team-dashboard',
    title: 'Develop a Full-Stack Dashboard',
    projectId: 'workspace-demo-1',
    ownerAgent: 'team',
    threadType: 'team',
    mode: 'connected_main',
    agentScope: 'team',
    assignedSpecialists: ['cody', 'tester', 'research', 'doc', 'vision'],
    createdAt: NOW - 3 * HOUR,
    updatedAt: NOW - 1.5 * HOUR,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-dash-1',
        threadId: 'thread-dashboard-main',
        prompt: 'Build a dashboard application with authentication, analytics, responsive UI, and automated tests.',
        status: 'completed',
        createdAt: NOW - 3 * HOUR,
        completedAt: NOW - 1.5 * HOUR,
        items: [
          {
            id: 'item-dash-u1',
            turnId: 'turn-dash-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Product Lead' },
            timestamp: NOW - 3 * HOUR,
            text: 'Build a dashboard application with authentication, analytics, responsive UI, and automated tests.',
          },
          {
            id: 'item-dash-m1',
            turnId: 'turn-dash-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 2.95 * HOUR,
            text: `Initiating parallel multi-specialist delivery workflow across 5 specialist tracks:

* **Stage 1 (Concurrent Research & Specs)**:
  - **Research**: Benchmarking chart visualization rendering performance (Canvas vs. SVG).
  - **Doc**: Drafting OpenAPI 3.1 specification for analytics metrics endpoints.
* **Stage 2 (Concurrent Implementation & UI Review)**:
  - **Cody**: Building React dashboard widgets with JWT session protection.
  - **Vision**: Conducting layout review on rendered mobile and desktop viewports.
* **Stage 3 (Verification Gate)**:
  - **Tester**: Developing and running Playwright integration test suite.

Recruiting **Cody**, **Tester**, **Research**, **Doc**, and **Vision** to active lanes.`,
          },
          {
            id: 'item-dash-research-prog',
            turnId: 'turn-dash-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'research', name: 'Research', role: 'Web research' },
            timestamp: NOW - 2.6 * HOUR,
            text: 'Chart visualization benchmarks complete: Chart.js canvas renderer delivers 58 FPS on low-end test profiles (vs 24 FPS for SVG). Recommended for Cody’s metric chart widget.',
          },
          {
            id: 'item-dash-cody-prog',
            turnId: 'turn-dash-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software architecture' },
            timestamp: NOW - 2.4 * HOUR,
            text: 'Implemented `src/components/Dashboard.tsx` with responsive grid, Canvas KPI chart, and JWT middleware in `src/api/auth.ts`. Build passed cleanly.',
          },
          {
            id: 'item-dash-vision-prog',
            turnId: 'turn-dash-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'vision', name: 'Vision', role: 'UI inspection & visual review' },
            timestamp: NOW - 2.2 * HOUR,
            text: 'Visual inspection complete: Detected 4px tap-target badge overlap on 375px mobile viewports. Cody applied CSS wrap adjustments; layout is now certified pixel-clean.',
          },
          {
            id: 'item-dash-tester-prog',
            turnId: 'turn-dash-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: NOW - 2.0 * HOUR,
            text: 'Executed integration test run: 8 passed across authentication, session resilience, and analytics charts (`npx playwright test`). Zero regressions.',
          },
          {
            id: 'item-dash-doc-prog',
            turnId: 'turn-dash-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'doc', name: 'Doc', role: 'Documentation' },
            timestamp: NOW - 1.8 * HOUR,
            text: 'Published OpenAPI 3.1 specification at `specs/dashboard-api.yaml` with schema definitions for all 4 metrics endpoints.',
          },
          {
            id: 'item-dash-m2',
            turnId: 'turn-dash-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 1.5 * HOUR,
            text: `### Verified Deliverable: Full-Stack Dashboard

1. **Frontend**: Responsive KPI metric cards, theme toggling, and interactive canvas charts verified by Vision.
2. **Backend**: Express API with JWT verification and token refresh route.
3. **Quality Gates**: All 8 Playwright integration tests passed (exit code 0).
4. **Documentation**: OpenAPI 3.1 specification published at \`specs/dashboard-api.yaml\`.`,
          },
        ],
      },
    ],
  },
  // Maestro Direct Chat: Parallel Sprint Roadmap
  {
    id: 'thread-dashboard-maestro',
    teamId: 'team-dashboard',
    title: 'Maestro · Parallel Sprint Roadmap',
    projectId: 'workspace-demo-1',
    ownerAgent: 'maestro',
    specialistId: 'maestro',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'maestro',
    assignedSpecialists: ['maestro'],
    createdAt: NOW - 2.95 * HOUR,
    updatedAt: NOW - 1.5 * HOUR,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-dash-maestro-1',
        threadId: 'thread-dashboard-maestro',
        prompt: 'How are you sequencing the parallel work streams across Cody, Tester, Research, Doc, and Vision?',
        status: 'completed',
        createdAt: NOW - 2.95 * HOUR,
        completedAt: NOW - 2.95 * HOUR + 2200,
        items: [
          {
            id: 'item-dsm-u1',
            turnId: 'turn-dash-maestro-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Product Lead' },
            timestamp: NOW - 2.95 * HOUR,
            text: 'How are you sequencing the parallel work streams across Cody, Tester, Research, Doc, and Vision?',
          },
          {
            id: 'item-dsm-tool-1',
            turnId: 'turn-dash-maestro-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 2.95 * HOUR + 600,
            tool: {
              toolName: 'maestro.lease_scheduler',
              command: 'maestro.lease_scheduler --concurrency 5 --tracks ["ui", "tests", "benchmarks", "specs", "visual_audit"]',
              status: 'success',
              output: 'Leases allocated: 5 concurrent sandboxes operating with read-isolated workspace checkpoints.',
            },
          },
          {
            id: 'item-dsm-m1',
            turnId: 'turn-dash-maestro-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 2.95 * HOUR + 2200,
            text: `Our multi-track parallel pipeline executes under strict dependency bounds:

1. **Track 1 & 2 (Research & Doc)**: Kick off first to establish performance ceilings (Research) and interface contracts (Doc).
2. **Track 3 (Cody)**: Ingests the API contract and chart recommendation to build the UI components and server routes.
3. **Track 4 (Vision)**: Performs automated headless viewport inspection on Cody's dev server to catch visual clipping before test suites lock in.
4. **Track 5 (Tester)**: Runs automated Playwright assertions across auth and metrics flows once Vision approves the visual render.

I actively reconcile cross-track findings in real-time so specialists do not block each other while maintaining independent verification gates.`,
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Cody for Dashboard
  {
    id: 'thread-dashboard-cody',
    teamId: 'team-dashboard',
    title: 'Cody · Dashboard Components & API',
    projectId: 'workspace-demo-1',
    ownerAgent: 'cody',
    specialistId: 'cody',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'cody',
    assignedSpecialists: ['cody'],
    createdAt: NOW - 2.9 * HOUR,
    updatedAt: NOW - 2.2 * HOUR,
    model: 'Claude 3.7 Sonnet',
    turns: [
      {
        id: 'turn-dc-1',
        threadId: 'thread-dashboard-cody',
        prompt: 'Implement responsive dashboard grid and KPI cards.',
        status: 'completed',
        createdAt: NOW - 2.9 * HOUR,
        completedAt: NOW - 2.2 * HOUR,
        items: [
          {
            id: 'item-dc-msg',
            turnId: 'turn-dc-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
            timestamp: NOW - 2.8 * HOUR,
            text: 'Scaffolding Tailwind grid and MetricCard components in `src/components/Dashboard.tsx`.',
          },
          {
            id: 'item-dc-tool',
            turnId: 'turn-dc-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
            timestamp: NOW - 2.4 * HOUR,
            text: 'terminal.run npm run build',
            tool: {
              toolName: 'terminal.run',
              command: 'npm run build',
              status: 'success',
              startedAt: NOW - 2.4 * HOUR,
              durationMs: 1420,
              exitCode: 0,
              outputLog: '✔ Built in 1.42s with zero bundle warnings.',
            },
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Tester for Dashboard
  {
    id: 'thread-dashboard-tester',
    teamId: 'team-dashboard',
    title: 'Tester · Integration & Playwright Suite',
    projectId: 'workspace-demo-1',
    ownerAgent: 'tester',
    specialistId: 'tester',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'tester',
    assignedSpecialists: ['tester'],
    createdAt: NOW - 2.5 * HOUR,
    updatedAt: NOW - 1.8 * HOUR,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-dt-1',
        threadId: 'thread-dashboard-tester',
        prompt: 'Author Playwright integration tests for dashboard views.',
        status: 'completed',
        createdAt: NOW - 2.5 * HOUR,
        completedAt: NOW - 1.8 * HOUR,
        items: [
          {
            id: 'item-dt-tool',
            turnId: 'turn-dt-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester' },
            timestamp: NOW - 2.1 * HOUR,
            text: 'terminal.run npx playwright test',
            tool: {
              toolName: 'terminal.run',
              command: 'npx playwright test',
              status: 'success',
              startedAt: NOW - 2.1 * HOUR,
              durationMs: 3100,
              exitCode: 0,
              isVerification: true,
              verificationStatus: 'command-succeeded',
              outcomeBadge: 'VERIFICATION PROOF: ACCEPTED',
              outputLog: '✔ auth.spec.ts (320ms)\n✔ dashboard.spec.ts (410ms)\n✔ analytics.spec.ts (280ms)\n8 passed (1.8s)',
            },
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Research for Dashboard
  {
    id: 'thread-dashboard-research',
    teamId: 'team-dashboard',
    title: 'Research · Chart Library Benchmarking',
    projectId: 'workspace-demo-1',
    ownerAgent: 'research',
    specialistId: 'research',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'research',
    assignedSpecialists: ['research'],
    createdAt: NOW - 2.8 * HOUR,
    updatedAt: NOW - 2.5 * HOUR,
    model: 'Claude 3.7 Sonnet',
    turns: [
      {
        id: 'turn-dr-1',
        threadId: 'thread-dashboard-research',
        prompt: 'Benchmark lightweight charting libraries.',
        status: 'completed',
        createdAt: NOW - 2.8 * HOUR,
        completedAt: NOW - 2.5 * HOUR,
        items: [
          {
            id: 'item-dr-msg',
            turnId: 'turn-dr-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'research', name: 'Research' },
            timestamp: NOW - 2.6 * HOUR,
            text: 'Evaluating bundle sizes: Chart.js (64 KB gzip) vs Recharts (140 KB gzip). Recommending Chart.js canvas renderer for optimal low-end device performance.',
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Doc for Dashboard
  {
    id: 'thread-dashboard-doc',
    teamId: 'team-dashboard',
    title: 'Doc · OpenAPI 3.1 & Metrics Spec',
    projectId: 'workspace-demo-1',
    ownerAgent: 'doc',
    specialistId: 'doc',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'doc',
    assignedSpecialists: ['doc'],
    createdAt: NOW - 2.6 * HOUR,
    updatedAt: NOW - 2.0 * HOUR,
    model: 'Gemini 3.5 Flash Lite',
    turns: [
      {
        id: 'turn-dd-1',
        threadId: 'thread-dashboard-doc',
        prompt: 'Draft OpenAPI 3.1 schema for dashboard metrics endpoints.',
        status: 'completed',
        createdAt: NOW - 2.6 * HOUR,
        completedAt: NOW - 2.0 * HOUR,
        items: [
          {
            id: 'item-dd-msg',
            turnId: 'turn-dd-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'doc', name: 'Doc' },
            timestamp: NOW - 2.2 * HOUR,
            text: 'Published OpenAPI specification in `specs/dashboard-api.yaml` detailing `/api/metrics/summary` and `/api/auth/token`.',
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Vision for Dashboard
  {
    id: 'thread-dashboard-vision',
    teamId: 'team-dashboard',
    title: 'Vision · UI Layout Inspection & Visual Review',
    projectId: 'workspace-demo-1',
    ownerAgent: 'vision',
    specialistId: 'vision',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'vision',
    assignedSpecialists: ['vision'],
    createdAt: NOW - 2.4 * HOUR,
    updatedAt: NOW - 1.9 * HOUR,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-dvis-1',
        threadId: 'thread-dashboard-vision',
        prompt: 'Inspect rendered dashboard preview for visual clipping, alignment, and mobile viewport issues.',
        status: 'completed',
        createdAt: NOW - 2.4 * HOUR,
        completedAt: NOW - 2.2 * HOUR,
        items: [
          {
            id: 'item-dvis-u1',
            turnId: 'turn-dvis-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Product Lead' },
            timestamp: NOW - 2.4 * HOUR,
            text: 'Inspect rendered dashboard preview for visual clipping, alignment, and mobile viewport issues.',
          },
          {
            id: 'item-dvis-tool-1',
            turnId: 'turn-dvis-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'vision', name: 'Vision', role: 'UI inspection & visual review' },
            timestamp: NOW - 2.35 * HOUR,
            text: 'perception.snapshot --target http://localhost:3000 --viewports ["1280x800", "375x667"]',
            tool: {
              toolName: 'perception.snapshot',
              command: 'perception.snapshot --target http://localhost:3000 --viewports ["1280x800", "375x667"]',
              status: 'success',
              startedAt: NOW - 2.35 * HOUR,
              durationMs: 820,
              exitCode: 0,
              outputLog: '✔ Captured 2 rendered viewport frames (Desktop 1280x800, Mobile 375x667). 1 layout overlap detected.',
            },
          },
          {
            id: 'item-dvis-msg-1',
            turnId: 'turn-dvis-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'vision', name: 'Vision', role: 'UI inspection & visual review' },
            timestamp: NOW - 2.3 * HOUR,
            text: `Visual review report:

1. **Desktop Viewport (1280x800)**: Clean layout alignment. Grid margins match 24px token specifications.
2. **Mobile Viewport (375x667)**: Detected issue: Metric card trend badge overlaps the KPI title by 4px on narrow widths due to missing \`flex-wrap\`.
3. **Action Sent to Cody**: Recommended \`flex-wrap: wrap; gap: 0.5rem;\` on \`.metric-header\`.`,
          },
          {
            id: 'item-dvis-peer-1',
            turnId: 'turn-dvis-1',
            type: 'peer_message',
            actor: { type: 'mediobot', mediobotId: 'vision', name: 'Vision' },
            timestamp: NOW - 2.25 * HOUR,
            text: 'Cody, please add flex-wrap to .metric-card header to prevent mobile badge clipping.',
            peerMessage: {
              messageId: 'peer-vis-cody-1',
              messageKind: 'finding',
              scope: 'direct',
              senderId: 'vision',
              senderName: 'Vision',
              recipientId: 'cody',
              recipientName: 'Cody',
              sequenceNumber: 1,
              status: 'delivered',
              text: 'Cody, please add flex-wrap to .metric-card header to prevent mobile badge clipping.',
            },
          },
          {
            id: 'item-dvis-msg-2',
            turnId: 'turn-dvis-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'vision', name: 'Vision', role: 'UI inspection & visual review' },
            timestamp: NOW - 2.2 * HOUR,
            text: 'Re-evaluated snapshot after Cody’s patch: Layout certified pixel-clean across both viewports. Verification proof passed to Main Team.',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // CONVERSATION 5: Failure, Recovery, and Verification
  // Title: "Debug a Failing Application"
  // Team: team-debug
  // Recruits: ['cody', 'tester']
  // --------------------------------------------------------------------------
  {
    id: 'thread-debug-main',
    teamId: 'team-debug',
    title: 'Debug a Failing Application',
    projectId: 'workspace-demo-1',
    ownerAgent: 'team',
    threadType: 'team',
    mode: 'connected_main',
    agentScope: 'team',
    assignedSpecialists: ['cody', 'tester'],
    createdAt: NOW - 75 * MIN,
    updatedAt: NOW - 10 * MIN,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-dbg-1',
        threadId: 'thread-debug-main',
        prompt: 'The application is crashing. Investigate the problem, fix it, and verify the solution.',
        status: 'completed',
        createdAt: NOW - 75 * MIN,
        completedAt: NOW - 10 * MIN,
        items: [
          {
            id: 'item-dbg-u1',
            turnId: 'turn-dbg-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Site Reliability Lead' },
            timestamp: NOW - 75 * MIN,
            text: 'The application is crashing. Investigate the problem, fix it, and verify the solution.',
          },
          {
            id: 'item-dbg-m1',
            turnId: 'turn-dbg-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 70 * MIN,
            text: 'Assigning Cody to capture crash telemetry, isolate the root cause, and implement a hotfix. Tester is on standby for regression evaluation.',
          },
          {
            id: 'item-dbg-cody-fail',
            turnId: 'turn-dbg-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
            timestamp: NOW - 55 * MIN,
            text: 'Reproduced crash: process exits with code 1 due to `TypeError: Cannot read properties of undefined (reading "token")` in `src/auth/session.ts:42`. Diagnosing null authorization header handling.',
          },
          {
            id: 'item-dbg-cody-fix',
            turnId: 'turn-dbg-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
            timestamp: NOW - 35 * MIN,
            text: 'Applied defensive null check and fallback guest session in `src/auth/session.ts`. Passing hotfix to Tester.',
          },
          {
            id: 'item-dbg-tester-verif',
            turnId: 'turn-dbg-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester' },
            timestamp: NOW - 20 * MIN,
            text: 'Local regression tests passed. Verified that null or malformed authorization headers no longer crash the process.',
          },
          {
            id: 'item-dbg-m2',
            turnId: 'turn-dbg-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 10 * MIN,
            text: `### Debugging Report & Resolution Status

1. **Resolved Issue (Local Crash)**:
   - Root cause: Missing guard on \`req.headers.authorization\` threw an unhandled TypeError.
   - Fix: Added optional chaining and safe fallback to guest session.
   - Verification: All local test cases passed cleanly (exit code 0).

2. **Unresolved Blocker (Upstream Dependency)**:
   - Status: **BLOCKED (External Dependency)**
   - Detail: Upstream OAuth provider endpoint \`https://api.auth-upstream.internal/health\` returned \`HTTP 503 Service Unavailable\`.
   - Action Required: External synchronization cannot complete until the upstream authentication server recovers. Not marked as completed.`,
          },
        ],
      },
    ],
  },
  // Maestro Direct Chat: Emergency Triage & Blocker Escalation
  {
    id: 'thread-debug-maestro',
    teamId: 'team-debug',
    title: 'Maestro · Emergency Triage & Blocker Escalation',
    projectId: 'workspace-demo-1',
    ownerAgent: 'maestro',
    specialistId: 'maestro',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'maestro',
    assignedSpecialists: ['maestro'],
    createdAt: NOW - 72 * MIN,
    updatedAt: NOW - 10 * MIN,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-dbg-maestro-1',
        threadId: 'thread-debug-maestro',
        prompt: 'Assess system impact of the auth crash and outline blocker escalation procedures.',
        status: 'completed',
        createdAt: NOW - 72 * MIN,
        completedAt: NOW - 72 * MIN + 1800,
        items: [
          {
            id: 'item-dbgm-u1',
            turnId: 'turn-dbg-maestro-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Site Reliability Lead' },
            timestamp: NOW - 72 * MIN,
            text: 'Assess system impact of the auth crash and outline blocker escalation procedures.',
          },
          {
            id: 'item-dbgm-tool-1',
            turnId: 'turn-dbg-maestro-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 72 * MIN + 500,
            tool: {
              toolName: 'incident.blast_radius_audit',
              command: 'incident.blast_radius_audit --service auth-api --severity SEV-2',
              status: 'success',
              output: 'Blast radius contained to incoming unauthenticated requests. Core database and background jobs unaffected.',
            },
          },
          {
            id: 'item-dbgm-m1',
            turnId: 'turn-dbg-maestro-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: NOW - 72 * MIN + 1800,
            text: `Triage evaluation and operational escalation summary:

* **Triage Stage**: Cody isolated the unhandled exception in session token splitting. Hotfix deployed to the test environment.
* **Verification Stage**: Tester verified null authorization header resilience (100% pass rate).
* **Escalation**: Tester discovered upstream OAuth 503 during external federated handshake. Under organizational policy, I have logged this external dependency as **BLOCKED** rather than marking the assignment falsely completed.
* **Next Steps**: Awaiting upstream recovery before executing final production deployment sign-off.`,
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Cody for Debug
  {
    id: 'thread-debug-cody',
    teamId: 'team-debug',
    title: 'Cody · Exception Investigation & Hotfix',
    projectId: 'workspace-demo-1',
    ownerAgent: 'cody',
    specialistId: 'cody',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'cody',
    assignedSpecialists: ['cody'],
    createdAt: NOW - 65 * MIN,
    updatedAt: NOW - 30 * MIN,
    model: 'Claude 3.7 Sonnet',
    turns: [
      {
        id: 'turn-dbc-1',
        threadId: 'thread-debug-cody',
        prompt: 'Isolate crashing stack trace and implement defensive patch.',
        status: 'completed',
        createdAt: NOW - 65 * MIN,
        completedAt: NOW - 30 * MIN,
        items: [
          {
            id: 'item-dbc-tool-fail',
            turnId: 'turn-dbc-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
            timestamp: NOW - 60 * MIN,
            text: 'terminal.run npm start',
            tool: {
              toolName: 'terminal.run',
              command: 'npm start',
              status: 'failed',
              startedAt: NOW - 60 * MIN,
              durationMs: 310,
              exitCode: 1,
              error: 'TypeError: Cannot read properties of undefined (reading "token")',
              outputLog: '[FATAL] Process crashed: TypeError: Cannot read properties of undefined (reading "token") at /workspace/src/auth/session.ts:42:28',
              failureCategory: 'runtime_exception',
            },
          },
          {
            id: 'item-dbc-diff',
            turnId: 'turn-dbc-1',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
            timestamp: NOW - 45 * MIN,
            diff: {
              filePath: 'src/auth/session.ts',
              additions: 8,
              deletions: 2,
              lines: [
                { type: 'context', content: 'export function parseSession(req) {', oldLineNo: 40, newLineNo: 40 },
                { type: 'remove', content: '- const token = req.headers.authorization.split(" ")[1];', oldLineNo: 41 },
                { type: 'add', content: '+ const authHeader = req.headers?.authorization;', newLineNo: 41 },
                { type: 'add', content: '+ if (!authHeader) return createGuestSession();', newLineNo: 42 },
                { type: 'add', content: '+ const token = authHeader.split(" ")[1];', newLineNo: 43 },
              ],
            },
          },
          {
            id: 'item-dbc-tool-retest',
            turnId: 'turn-dbc-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody' },
            timestamp: NOW - 35 * MIN,
            text: 'terminal.run npm test',
            tool: {
              toolName: 'terminal.run',
              command: 'npm test',
              status: 'success',
              startedAt: NOW - 35 * MIN,
              durationMs: 190,
              exitCode: 0,
              recoveredFromExecution: true,
              outputLog: '✔ handle undefined authorization header (2.1ms)\n✔ fallback to guest session (1.8ms)\n3 passed, 0 failed',
            },
          },
        ],
      },
    ],
  },
  // Specialist Side Chat: Tester for Debug
  {
    id: 'thread-debug-tester',
    teamId: 'team-debug',
    title: 'Tester · Regression & Fuzz Verification',
    projectId: 'workspace-demo-1',
    ownerAgent: 'tester',
    specialistId: 'tester',
    threadType: 'mind',
    mode: 'standalone_specialist',
    agentScope: 'tester',
    assignedSpecialists: ['tester'],
    createdAt: NOW - 30 * MIN,
    updatedAt: NOW - 15 * MIN,
    model: 'Gemini 3.6 Flash',
    turns: [
      {
        id: 'turn-dbt-1',
        threadId: 'thread-debug-tester',
        prompt: 'Verify session resilience against malformed auth payloads.',
        status: 'completed',
        createdAt: NOW - 30 * MIN,
        completedAt: NOW - 15 * MIN,
        items: [
          {
            id: 'item-dbt-tool',
            turnId: 'turn-dbt-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester' },
            timestamp: NOW - 25 * MIN,
            text: 'terminal.run node --test tests/session-resilience.test.js',
            tool: {
              toolName: 'terminal.run',
              command: 'node --test tests/session-resilience.test.js',
              status: 'success',
              startedAt: NOW - 25 * MIN,
              durationMs: 410,
              exitCode: 0,
              isVerification: true,
              verificationStatus: 'command-succeeded',
              outcomeBadge: 'VERIFIED FOR LOCAL SESSION (UPSTREAM BLOCKED)',
              outputLog: '✔ undefined header handled (1.1ms)\n✔ empty string header handled (0.8ms)\n✔ null token handled (0.9ms)',
            },
          },
        ],
      },
    ],
  },
];

// ============================================================================
// CONVERSATION-SPECIFIC SIMULATED TERMINAL SESSIONS
// ============================================================================

export interface MockTerminalLine {
  id: string;
  type: 'prompt' | 'stdout' | 'stderr' | 'system' | 'success' | 'warn';
  text: string;
  timestamp?: number;
}

export interface MockTerminalSession {
  id: string;
  name: string;
  shell: 'zsh' | 'bash' | 'mediobot';
  lines: MockTerminalLine[];
  history: string[];
  historyIndex: number;
}

export const MOCK_TERMINAL_SESSIONS_BY_TEAM: Record<string, MockTerminalSession[]> = {
  'team-getting-started': [
    {
      id: 'session-gs-1',
      name: 'zsh: sandbox',
      shell: 'zsh',
      history: ['mediobot status', 'help'],
      historyIndex: -1,
      lines: [
        { id: 'l-gs-1', type: 'system', text: 'Mediobot Sandbox CLI v2.4.0 (darwin-arm64)' },
        { id: 'l-gs-2', type: 'prompt', text: 'dev@mediobot-sandbox:~/workspace$ mediobot status' },
        { id: 'l-gs-3', type: 'stdout', text: 'Mediobot Swarm Engine: IDLE (Standby mode)' },
        { id: 'l-gs-4', type: 'stdout', text: 'Active Workspace: /Users/rahulkarthikt/Documents/nik' },
        { id: 'l-gs-5', type: 'stdout', text: 'Active Team: Team 1 (Getting Started with Mediobot)' },
        { id: 'l-gs-6', type: 'success', text: 'Assigned Specialists: 0 (No background processes spawned)' },
      ],
    },
    {
      id: 'session-gs-2',
      name: 'zsh: help',
      shell: 'zsh',
      history: ['help'],
      historyIndex: -1,
      lines: [
        { id: 'l-gs-h1', type: 'prompt', text: 'dev@mediobot-sandbox:~/workspace$ help' },
        { id: 'l-gs-h2', type: 'stdout', text: 'Built-in commands: mediobot status, mediobot list, clear, help' },
      ],
    },
  ],

  'team-calculator': [
    {
      id: 'session-calc-1',
      name: 'npm: install',
      shell: 'bash',
      history: ['npm install'],
      historyIndex: -1,
      lines: [
        { id: 'l-c1-1', type: 'prompt', text: 'cody@mediobot:~/workspace$ npm install' },
        { id: 'l-c1-2', type: 'stdout', text: 'added 42 packages, and audited 43 packages in 1.4s' },
        { id: 'l-c1-3', type: 'success', text: 'found 0 vulnerabilities' },
      ],
    },
    {
      id: 'session-calc-2',
      name: 'npm: test',
      shell: 'bash',
      history: ['npm test'],
      historyIndex: -1,
      lines: [
        { id: 'l-c2-1', type: 'prompt', text: 'tester@mediobot:~/workspace$ npm test' },
        { id: 'l-c2-2', type: 'stdout', text: '> calculator-demo@1.0.0 test\n> node --test tests/calculator.test.js' },
        { id: 'l-c2-3', type: 'success', text: '✔ arithmetic operations (1.2ms)' },
        { id: 'l-c2-4', type: 'success', text: '✔ divide by zero guard (0.9ms)' },
        { id: 'l-c2-5', type: 'stdout', text: 'ℹ tests 2\nℹ pass 2\nℹ fail 0\nℹ duration_ms 48.2' },
        { id: 'l-c2-6', type: 'success', text: '✔ Test suite passed cleanly (exit code 0)' },
      ],
    },
    {
      id: 'session-calc-3',
      name: 'vite: dev',
      shell: 'bash',
      history: ['npm run dev'],
      historyIndex: -1,
      lines: [
        { id: 'l-c3-1', type: 'prompt', text: 'dev@mediobot:~/workspace$ npm run dev' },
        { id: 'l-c3-2', type: 'stdout', text: '> calculator-demo@1.0.0 dev\n> vite --port 5173' },
        { id: 'l-c3-3', type: 'success', text: '  VITE v6.2.0  ready in 184 ms' },
        { id: 'l-c3-4', type: 'stdout', text: '  ➜  Local:   http://localhost:5173/' },
        { id: 'l-c3-5', type: 'stdout', text: '  ➜  Network: use --host to expose' },
      ],
    },
  ],

  'team-research': [
    {
      id: 'session-res-1',
      name: 'scraapy: crawl',
      shell: 'mediobot',
      history: ['scraapy fetch --target https://frameworks.benchmarks.internal/agents'],
      historyIndex: -1,
      lines: [
        { id: 'l-r1-1', type: 'system', text: '[Scraapy Worker] Headless Extraction Subsystem Initialized' },
        { id: 'l-r1-2', type: 'prompt', text: 'scraapy@mediobot:~$ scraapy fetch --target https://frameworks.benchmarks.internal/agents' },
        { id: 'l-r1-3', type: 'stdout', text: '[2026-11-07 14:10:02] Resolving target: LangGraph, CrewAI, AutoGen, Semantic Kernel' },
        { id: 'l-r1-4', type: 'stdout', text: '[2026-11-07 14:10:03] Extracted 4 specification schemas (14.2 KB)' },
        { id: 'l-r1-5', type: 'success', text: '[2026-11-07 14:10:04] Delivered payload to specialist:research (Status: DELIVERED)' },
      ],
    },
    {
      id: 'session-res-2',
      name: 'doc: markdown-lint',
      shell: 'bash',
      history: ['npx markdownlint docs/research/*.md'],
      historyIndex: -1,
      lines: [
        { id: 'l-r2-1', type: 'prompt', text: 'doc@mediobot:~/workspace$ npx markdownlint docs/research/*.md' },
        { id: 'l-r2-2', type: 'success', text: '✔ docs/research/agent-frameworks-comparison.md: 0 errors' },
        { id: 'l-r2-3', type: 'stdout', text: 'All table headers and citation anchors verified.' },
      ],
    },
  ],

  'team-dashboard': [
    {
      id: 'session-dash-1',
      name: 'vite: dashboard-ui',
      shell: 'bash',
      history: ['npm run dev -- --port 3000'],
      historyIndex: -1,
      lines: [
        { id: 'l-d1-1', type: 'prompt', text: 'cody@mediobot:~/dashboard$ npm run dev -- --port 3000' },
        { id: 'l-d1-2', type: 'success', text: '  VITE v6.2.0  ready in 240 ms' },
        { id: 'l-d1-3', type: 'stdout', text: '  ➜  Local:   http://localhost:3000/' },
      ],
    },
    {
      id: 'session-dash-2',
      name: 'test: playwright',
      shell: 'bash',
      history: ['npx playwright test'],
      historyIndex: -1,
      lines: [
        { id: 'l-d2-1', type: 'prompt', text: 'tester@mediobot:~/dashboard$ npx playwright test' },
        { id: 'l-d2-2', type: 'stdout', text: 'Running 8 tests using 4 workers' },
        { id: 'l-d2-3', type: 'success', text: '  ✓ auth.spec.ts:12: login with valid credentials (320ms)' },
        { id: 'l-d2-4', type: 'success', text: '  ✓ auth.spec.ts:28: reject invalid JWT token (140ms)' },
        { id: 'l-d2-5', type: 'success', text: '  ✓ dashboard.spec.ts:15: render active KPI metrics (410ms)' },
        { id: 'l-d2-6', type: 'success', text: '  ✓ dashboard.spec.ts:35: toggle dark/light theme (190ms)' },
        { id: 'l-d2-7', type: 'success', text: '8 passed (1.8s)' },
      ],
    },
    {
      id: 'session-dash-3',
      name: 'api: backend',
      shell: 'bash',
      history: ['node dist/server.js'],
      historyIndex: -1,
      lines: [
        { id: 'l-d3-1', type: 'prompt', text: 'dev@mediobot:~/dashboard$ node dist/server.js' },
        { id: 'l-d3-2', type: 'stdout', text: '[Auth Service] JWT public key loaded' },
        { id: 'l-d3-3', type: 'stdout', text: '[Analytics API] listening on port 4000' },
      ],
    },
  ],

  'team-debug': [
    {
      id: 'session-dbg-1',
      name: 'bash: crash-log',
      shell: 'bash',
      history: ['npm start'],
      historyIndex: -1,
      lines: [
        { id: 'l-db1-1', type: 'prompt', text: 'cody@mediobot:~/app$ npm start' },
        { id: 'l-db1-2', type: 'stdout', text: '> production-api@2.0.0 start\n> node dist/index.js' },
        { id: 'l-db1-3', type: 'stderr', text: '[ERROR] 14:22:01 UnhandledPromiseRejection:' },
        { id: 'l-db1-4', type: 'stderr', text: 'TypeError: Cannot read properties of undefined (reading "token")' },
        { id: 'l-db1-5', type: 'stderr', text: '    at validateSession (/workspace/src/auth/session.ts:42:28)' },
        { id: 'l-db1-6', type: 'stderr', text: '    at authenticateRequest (/workspace/src/middleware/auth.ts:18:12)' },
        { id: 'l-db1-7', type: 'warn', text: '[FATAL] Process exited with code 1' },
      ],
    },
    {
      id: 'session-dbg-2',
      name: 'bash: recovery-retest',
      shell: 'bash',
      history: ['npm test'],
      historyIndex: -1,
      lines: [
        { id: 'l-db2-1', type: 'prompt', text: 'cody@mediobot:~/app$ npm test' },
        { id: 'l-db2-2', type: 'stdout', text: '> test\n> node --test tests/session-resilience.test.js' },
        { id: 'l-db2-3', type: 'success', text: '✔ handle undefined authorization header gracefully (2.1ms)' },
        { id: 'l-db2-4', type: 'success', text: '✔ fallback to guest session when token is null (1.8ms)' },
        { id: 'l-db2-5', type: 'success', text: '✔ validate valid bearer JWT token (3.4ms)' },
        { id: 'l-db2-6', type: 'success', text: '✔ Local session crash resolved (exit code 0)' },
      ],
    },
    {
      id: 'session-dbg-3',
      name: 'bash: upstream-health',
      shell: 'bash',
      history: ['curl -I https://api.auth-upstream.internal/health'],
      historyIndex: -1,
      lines: [
        { id: 'l-db3-1', type: 'prompt', text: 'dev@mediobot:~/app$ curl -I https://api.auth-upstream.internal/health' },
        { id: 'l-db3-2', type: 'stderr', text: 'HTTP/2 503 Service Unavailable' },
        { id: 'l-db3-3', type: 'stderr', text: 'content-type: application/json' },
        { id: 'l-db3-4', type: 'stderr', text: 'retry-after: 300' },
        { id: 'l-db3-5', type: 'warn', text: '{"status": "degraded", "error": "upstream database timeout"}' },
        { id: 'l-db3-6', type: 'warn', text: '[STATUS: BLOCKED] Upstream provider is temporarily offline.' },
      ],
    },
  ],
};

export function getTerminalSessionsForTeam(teamId?: string | null): MockTerminalSession[] {
  if (teamId && MOCK_TERMINAL_SESSIONS_BY_TEAM[teamId]) {
    return MOCK_TERMINAL_SESSIONS_BY_TEAM[teamId];
  }
  // Default fallback
  return MOCK_TERMINAL_SESSIONS_BY_TEAM['team-calculator'] || [];
}
