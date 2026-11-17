/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 10 Interactive Demonstration Chats for Mediobot UI Showcase.
 *
 * Mandatory Truthfulness & Security Invariants:
 * 1. Zero provider / cloud LLM requests ($0.00 spend).
 * 2. Zero shell, terminal, or subprocess execution.
 * 3. Zero host filesystem modification.
 * 4. Every simulated activity is explicitly marked "[Controlled demonstration]" or "[Simulated]".
 * 5. Deterministic fixture data exercising all 16 existing UI execution components.
 */

import type { Thread, FileDiff, ThreadItem, Turn } from '../types';

export const SEED_DIFF: FileDiff = {
  filePath: 'src/calculator.ts',
  language: 'typescript',
  additions: 5,
  deletions: 2,
  state: 'verified',
  verificationEvidence: 'Controlled demonstration · Simulated in-memory assertion suite (0 exit code)',
  verifiedBy: 'Simulated assertion',
  isControlledDemonstration: true,
  hunks: [
    {
      header: '@@ -14,6 +14,16 @@ export function calculate(op: string, a: number, b: number): number {',
      oldStart: 14,
      oldLines: 6,
      newStart: 14,
      newLines: 16,
      lines: [
        { type: 'context', content: '    case "add":', oldLineNo: 14, newLineNo: 14 },
        { type: 'context', content: '      return a + b;', oldLineNo: 15, newLineNo: 15 },
        { type: 'remove', content: '    case "divide":', oldLineNo: 16 },
        { type: 'remove', content: '      return a / b;', oldLineNo: 17 },
        { type: 'add', content: '    case "divide":', newLineNo: 16 },
        { type: 'add', content: '      if (b === 0) {', newLineNo: 17 },
        { type: 'add', content: '        throw new Error("Division by zero guard");', newLineNo: 18 },
        { type: 'add', content: '      }', newLineNo: 19 },
        { type: 'add', content: '      return a / b;', newLineNo: 20 },
        { type: 'context', content: '    default:', oldLineNo: 18, newLineNo: 21 },
        { type: 'context', content: '      throw new Error(`Unsupported operation: ${op}`);', oldLineNo: 19, newLineNo: 22 },
      ],
    },
  ],
};

const WEBSITE_DIFF: FileDiff = {
  filePath: 'src/App.tsx',
  language: 'typescript',
  additions: 38,
  deletions: 4,
  state: 'verified',
  verificationEvidence: 'Controlled demonstration · Build verification passed with 0 exit code',
  verifiedBy: 'Simulated assertion',
  isControlledDemonstration: true,
  hunks: [
    {
      header: '@@ -1,12 +1,46 @@',
      oldStart: 1,
      oldLines: 12,
      newStart: 1,
      newLines: 46,
      lines: [
        { type: 'context', content: 'import React from "react";', oldLineNo: 1, newLineNo: 1 },
        { type: 'remove', content: 'import { OldHeader } from "./components/OldHeader";', oldLineNo: 2 },
        { type: 'add', content: 'import { Hero } from "./components/Hero";', newLineNo: 2 },
        { type: 'add', content: 'import { FeaturesGrid } from "./components/FeaturesGrid";', newLineNo: 3 },
        { type: 'add', content: 'import { CallToAction } from "./components/CallToAction";', newLineNo: 4 },
        { type: 'context', content: 'export function App() {', oldLineNo: 3, newLineNo: 5 },
        { type: 'context', content: '  return (', oldLineNo: 4, newLineNo: 6 },
        { type: 'remove', content: '    <div className="container"><OldHeader /></div>', oldLineNo: 5 },
        { type: 'add', content: '    <main className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30">', newLineNo: 7 },
        { type: 'add', content: '      <Hero title="Build Autonomous AI Software" subtitle="Local-first autonomous AI engineering organization." />', newLineNo: 8 },
        { type: 'add', content: '      <FeaturesGrid items={FEATURES} />', newLineNo: 9 },
        { type: 'add', content: '      <CallToAction href="/download" />', newLineNo: 10 },
        { type: 'add', content: '    </main>', newLineNo: 11 },
        { type: 'context', content: '  );', oldLineNo: 6, newLineNo: 12 },
        { type: 'context', content: '}', oldLineNo: 7, newLineNo: 13 },
      ],
    },
  ],
};

const DEBUG_DIFF: FileDiff = {
  filePath: 'src/middleware/auth.ts',
  language: 'typescript',
  additions: 12,
  deletions: 2,
  state: 'verified',
  verificationEvidence: 'Controlled demonstration · Vitest auth regression suite passed (8/8)',
  verifiedBy: 'Simulated assertion',
  isControlledDemonstration: true,
  hunks: [
    {
      header: '@@ -32,8 +32,18 @@ export async function authMiddleware(req: Request, res: Response, next: Next) {',
      oldStart: 32,
      oldLines: 8,
      newStart: 32,
      newLines: 18,
      lines: [
        { type: 'context', content: '  const sessionToken = req.headers["authorization"]?.replace("Bearer ", "");', oldLineNo: 32, newLineNo: 32 },
        { type: 'remove', content: '  const user = sessionToken.user;', oldLineNo: 33 },
        { type: 'remove', content: '  req.userId = user.id;', oldLineNo: 34 },
        { type: 'add', content: '  if (!sessionToken) {', newLineNo: 33 },
        { type: 'add', content: '    return res.status(401).json({ error: "Missing authorization token" });', newLineNo: 34 },
        { type: 'add', content: '  }', newLineNo: 35 },
        { type: 'add', content: '  const session = await verifySessionToken(sessionToken);', newLineNo: 36 },
        { type: 'add', content: '  if (!session || !session.userId) {', newLineNo: 37 },
        { type: 'add', content: '    return res.status(401).json({ error: "Invalid or expired session" });', newLineNo: 38 },
        { type: 'add', content: '  }', newLineNo: 39 },
        { type: 'add', content: '  req.userId = session.userId;', newLineNo: 40 },
        { type: 'context', content: '  return next();', oldLineNo: 35, newLineNo: 41 },
      ],
    },
  ],
};

const DATASETS_API_DIFF: FileDiff = {
  filePath: 'src/api/datasets.ts',
  language: 'typescript',
  additions: 26,
  deletions: 1,
  state: 'verified',
  verificationEvidence: 'Controlled demonstration · Integration tests passed (12/12)',
  verifiedBy: 'Simulated assertion',
  isControlledDemonstration: true,
  hunks: [
    {
      header: '@@ -45,3 +45,28 @@ export function registerDatasetRoutes(router: Router) {',
      oldStart: 45,
      oldLines: 3,
      newStart: 45,
      newLines: 28,
      lines: [
        { type: 'context', content: '  router.get("/datasets", listDatasetsHandler);', oldLineNo: 45, newLineNo: 45 },
        { type: 'add', content: '  router.post("/datasets", async (req, res) => {', newLineNo: 46 },
        { type: 'add', content: '    const parsed = DatasetCreateSchema.safeParse(req.body);', newLineNo: 47 },
        { type: 'add', content: '    if (!parsed.success) return res.status(400).json({ error: parsed.error });', newLineNo: 48 },
        { type: 'add', content: '    const dataset = await datasetService.create(parsed.data);', newLineNo: 49 },
        { type: 'add', content: '    return res.status(201).json({ dataset });', newLineNo: 50 },
        { type: 'add', content: '  });', newLineNo: 51 },
        { type: 'context', content: '}', oldLineNo: 46, newLineNo: 52 },
      ],
    },
  ],
};

const SECURITY_DIFF: FileDiff = {
  filePath: 'src/auth/tokenService.ts',
  language: 'typescript',
  additions: 15,
  deletions: 5,
  state: 'verified',
  verificationEvidence: 'Controlled demonstration · Cryptographic randomness verified with crypto.randomBytes()',
  verifiedBy: 'Simulated assertion',
  isControlledDemonstration: true,
  hunks: [
    {
      header: '@@ -12,8 +12,18 @@ import * as crypto from "node:crypto";',
      oldStart: 12,
      oldLines: 8,
      newStart: 12,
      newLines: 18,
      lines: [
        { type: 'context', content: 'export function generateSecureToken(): string {', oldLineNo: 12, newLineNo: 12 },
        { type: 'remove', content: '  // Insecure: Math.random() is predictable', oldLineNo: 13 },
        { type: 'remove', content: '  return Math.random().toString(36).substring(2) + Date.now().toString(36);', oldLineNo: 14 },
        { type: 'add', content: '  // Cryptographically secure 256-bit entropy token', newLineNo: 13 },
        { type: 'add', content: '  const buffer = crypto.randomBytes(32);', newLineNo: 14 },
        { type: 'add', content: '  return buffer.toString("base64url");', newLineNo: 15 },
        { type: 'context', content: '}', oldLineNo: 15, newLineNo: 16 },
      ],
    },
  ],
};

const BATCH_DIFF: FileDiff = {
  filePath: 'src/pipeline/batch.ts',
  language: 'typescript',
  additions: 19,
  deletions: 3,
  state: 'verified',
  verificationEvidence: 'Controlled demonstration · 14/14 tests passing after retry backoff patch',
  verifiedBy: 'Simulated assertion',
  isControlledDemonstration: true,
  hunks: [
    {
      header: '@@ -68,6 +68,22 @@ export async function processBatch(items: BatchItem[]): Promise<BatchResult> {',
      oldStart: 68,
      oldLines: 6,
      newStart: 68,
      newLines: 22,
      lines: [
        { type: 'context', content: '  for (const item of items) {', oldLineNo: 68, newLineNo: 68 },
        { type: 'remove', content: '    await executeSingle(item);', oldLineNo: 69 },
        { type: 'add', content: '    let attempt = 0;', newLineNo: 69 },
        { type: 'add', content: '    while (attempt < 3) {', newLineNo: 70 },
        { type: 'add', content: '      try {', newLineNo: 71 },
        { type: 'add', content: '        await executeSingle(item);', newLineNo: 72 },
        { type: 'add', content: '        break;', newLineNo: 73 },
        { type: 'add', content: '      } catch (err) {', newLineNo: 74 },
        { type: 'add', content: '        attempt++;', newLineNo: 75 },
        { type: 'add', content: '        if (attempt >= 3) throw err;', newLineNo: 76 },
        { type: 'add', content: '        await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));', newLineNo: 77 },
        { type: 'add', content: '      }', newLineNo: 78 },
        { type: 'add', content: '    }', newLineNo: 79 },
        { type: 'context', content: '  }', oldLineNo: 70, newLineNo: 80 },
      ],
    },
  ],
};

const AST_PARSER_DIFF: FileDiff = {
  filePath: 'packages/core/parser.ts',
  language: 'typescript',
  additions: 21,
  deletions: 11,
  state: 'verified',
  verificationEvidence: 'Controlled demonstration · Tree-sitter AST benchmark 3.8x throughput improvement',
  verifiedBy: 'Simulated assertion',
  isControlledDemonstration: true,
  hunks: [
    {
      header: '@@ -24,15 +24,25 @@ export function traverseSyntaxTree(rootNode: SyntaxNode): SymbolNode[] {',
      oldStart: 24,
      oldLines: 15,
      newStart: 24,
      newLines: 25,
      lines: [
        { type: 'context', content: '  const symbols: SymbolNode[] = [];', oldLineNo: 24, newLineNo: 24 },
        { type: 'remove', content: '  function visit(node: SyntaxNode) {', oldLineNo: 25 },
        { type: 'remove', content: '    if (isSymbolDeclaration(node)) symbols.push(extract(node));', oldLineNo: 26 },
        { type: 'remove', content: '    node.children.forEach(visit);', oldLineNo: 27 },
        { type: 'remove', content: '  }', oldLineNo: 28 },
        { type: 'remove', content: '  visit(rootNode);', oldLineNo: 29 },
        { type: 'add', content: '  // Iterative BFS traversal prevents call-stack overflow on deep ASTs', newLineNo: 25 },
        { type: 'add', content: '  const queue: SyntaxNode[] = [rootNode];', newLineNo: 26 },
        { type: 'add', content: '  while (queue.length > 0) {', newLineNo: 27 },
        { type: 'add', content: '    const current = queue.shift()!;', newLineNo: 28 },
        { type: 'add', content: '    if (isSymbolDeclaration(current)) symbols.push(extract(current));', newLineNo: 29 },
        { type: 'add', content: '    for (let i = 0; i < current.childCount; i++) {', newLineNo: 30 },
        { type: 'add', content: '      queue.push(current.child(i)!);', newLineNo: 31 },
        { type: 'add', content: '    }', newLineNo: 32 },
        { type: 'add', content: '  }', newLineNo: 33 },
        { type: 'context', content: '  return symbols;', oldLineNo: 30, newLineNo: 34 },
      ],
    },
  ],
};

const FULL_AUTH_DIFF: FileDiff = {
  filePath: 'src/auth/service.ts',
  language: 'typescript',
  additions: 44,
  deletions: 4,
  state: 'verified',
  verificationEvidence: 'Controlled demonstration · Complete microservice test suite (18/18 passed)',
  verifiedBy: 'Simulated assertion',
  isControlledDemonstration: true,
  hunks: [
    {
      header: '@@ -1,10 +1,50 @@',
      oldStart: 1,
      oldLines: 10,
      newStart: 1,
      newLines: 50,
      lines: [
        { type: 'context', content: 'import { DatabaseSync } from "node:sqlite";', oldLineNo: 1, newLineNo: 1 },
        { type: 'add', content: 'import { signJwt, verifyJwt } from "./jwt";', newLineNo: 2 },
        { type: 'add', content: 'export class AuthService {', newLineNo: 3 },
        { type: 'add', content: '  constructor(private readonly db: DatabaseSync) {}', newLineNo: 4 },
        { type: 'add', content: '  async authenticateUser(email: string, passwordHash: string): Promise<string> {', newLineNo: 5 },
        { type: 'add', content: '    const user = this.db.prepare("SELECT * FROM users WHERE email = ?").get(email);', newLineNo: 6 },
        { type: 'add', content: '    if (!user) throw new Error("Invalid credentials");', newLineNo: 7 },
        { type: 'add', content: '    return signJwt({ sub: user.id, email: user.email });', newLineNo: 8 },
        { type: 'add', content: '  }', newLineNo: 9 },
        { type: 'add', content: '}', newLineNo: 10 },
      ],
    },
  ],
};

const BASE_TIMESTAMP = 1731110400000;

export function build10DemonstrationChats(teamAlphaId: string): Thread[] {
  // --------------------------------------------------------------------------
  // Chat 1 — Build a Website
  // --------------------------------------------------------------------------
  const chat1: Thread = {
    id: 'thread-alpha-main-01',
    teamId: teamAlphaId,
    title: 'Chat 1 — Build a Website',
    projectId: 'fixture-project-offline',
    ownerAgent: 'team',
    threadType: 'team',
    assignedSpecialists: ['maestro', 'cody', 'tester', 'doc'],
    mode: 'connected_main',
    agentScope: 'team',
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP + 120000,
    model: 'Claude 3.7 Sonnet',
    branch: 'main',
    approvalMode: 'Approve for me',
    associatedMaestroThreadId: 'thread-alpha-maestro-01',
    turns: [
      {
        id: 'turn-alpha-1',
        threadId: 'thread-alpha-main-01',
        prompt: 'Implement zero-division protection in calculator.ts and verify independently.',
        status: 'completed',
        createdAt: BASE_TIMESTAMP,
        completedAt: BASE_TIMESTAMP + 35000,
        items: [
          {
            id: 'item-c1-u1',
            turnId: 'turn-alpha-1',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: BASE_TIMESTAMP,
            text: 'Implement zero-division protection in calculator.ts and build a modern responsive landing page component. Verify everything independently.',
          },
          {
            id: 'item-c1-sys',
            turnId: 'turn-alpha-1',
            type: 'agent_message',
            actor: { type: 'system', name: 'Demonstration Guard' },
            timestamp: BASE_TIMESTAMP + 1000,
            text: 'Controlled demonstration · Safe offline mode active. Zero external network calls, zero shell execution, and zero host filesystem writes.',
          },
          {
            id: 'item-c1-m-plan',
            turnId: 'turn-alpha-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: BASE_TIMESTAMP + 3000,
            text: `### Orchestration Plan · Website & Calculator Module
1. **Architecture Planning**: Decompose website layout into semantic components (\`Hero\`, \`FeaturesGrid\`, \`CallToAction\`).
2. **Specialist Delegation**: Assign Cody to implement zero-division error guards in \`src/calculator.ts\` and integrate landing page in \`src/App.tsx\`.
3. **Verification**: Assign Tester to run independent regression tests with zero model involvement.`,
          },
          {
            id: 'item-c1-cody-read',
            turnId: 'turn-alpha-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 6000,
            tool: {
              toolInvocationId: 'tool-c1-cody-read',
              toolName: 'filesystem.read',
              command: 'filesystem.read src/calculator.ts',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 6000,
              durationMs: 240,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] File inspected safely in memory. Identified unguarded division operation.',
            },
          },
          {
            id: 'item-c1-diff-calc',
            turnId: 'turn-alpha-1',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 12000,
            diff: SEED_DIFF,
          },
          {
            id: 'item-c1-diff-web',
            turnId: 'turn-alpha-1',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 18000,
            diff: WEBSITE_DIFF,
          },
          {
            id: 'item-c1-build',
            turnId: 'turn-alpha-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 22000,
            tool: {
              toolInvocationId: 'tool-c1-build',
              toolName: 'terminal.execute',
              command: 'pnpm run build [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 22000,
              durationMs: 1420,
              exitCode: 0,
              verificationStatus: 'unverified',
              outcomeBadge: 'Controlled demonstration · Simulated',
              outputLog: `[Controlled demonstration] vite v6.2.0 building for production...
✓ built in 1.42s
dist/index.html 1.33 kB
dist/assets/index.js 574 kB gzip`,
            },
          },
          {
            id: 'item-c1-verify',
            turnId: 'turn-alpha-1',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: BASE_TIMESTAMP + 26000,
            tool: {
              toolInvocationId: 'tool-c1-verify',
              toolName: 'terminal.execute (simulated)',
              command: 'pnpm test -- --filter calculator [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 26000,
              durationMs: 840,
              isVerification: true,
              verificationStatus: 'unverified',
              outcomeBadge: 'Controlled demonstration · Verified',
              outputLog: '[Controlled demonstration] Simulated verification test suite (no terminal subprocess executed). Division by zero asserted via in-memory fixture model.',
            },
          },
          {
            id: 'item-c1-summary',
            turnId: 'turn-alpha-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 35000,
            text: `Controlled demonstration · No host files were changed.

### Delivery Summary · Website & Calculator
1. **Zero-Division Guard**: Patched \`src/calculator.ts\` with throw-guard on zero denominator.
2. **Modern Landing Page**: Integrated \`Hero\`, \`FeaturesGrid\`, and \`CallToAction\` in \`src/App.tsx\` with responsive Tailwind v4 classes.
3. **Build & Test Verification**: Production bundle compiled in 1.42s; unit tests verified 100% passing assertions.`,
          },
        ],
      },
    ],
  };

  // --------------------------------------------------------------------------
  // Chat 2 — Debug an Application
  // --------------------------------------------------------------------------
  const chat2: Thread = {
    id: 'thread-alpha-main-02',
    teamId: teamAlphaId,
    title: 'Chat 2 — Debug an Application',
    projectId: 'fixture-project-offline',
    ownerAgent: 'team',
    threadType: 'team',
    assignedSpecialists: ['maestro', 'cody', 'tester'],
    mode: 'connected_main',
    agentScope: 'team',
    createdAt: BASE_TIMESTAMP + 60000,
    updatedAt: BASE_TIMESTAMP + 180000,
    model: 'Claude 3.7 Sonnet',
    branch: 'main',
    approvalMode: 'Approve for me',
    associatedMaestroThreadId: 'thread-alpha-maestro-02',
    turns: [
      {
        id: 'turn-alpha-2',
        threadId: 'thread-alpha-main-02',
        prompt: 'Investigate runtime exception TypeError: Cannot read properties of undefined in auth/middleware.ts',
        status: 'completed',
        createdAt: BASE_TIMESTAMP + 60000,
        completedAt: BASE_TIMESTAMP + 95000,
        items: [
          {
            id: 'item-c2-u1',
            turnId: 'turn-alpha-2',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: BASE_TIMESTAMP + 60000,
            text: 'Our staging server crashed with `TypeError: Cannot read properties of undefined (reading "session")` in `src/middleware/auth.ts`. Investigate the error, fix the bug, and verify with tests.',
          },
          {
            id: 'item-c2-sys',
            turnId: 'turn-alpha-2',
            type: 'agent_message',
            actor: { type: 'system', name: 'Demonstration Guard' },
            timestamp: BASE_TIMESTAMP + 61000,
            text: 'Controlled demonstration · Safe offline mode active. Zero external network calls, zero shell execution, and zero host filesystem writes.',
          },
          {
            id: 'item-c2-inspect',
            turnId: 'turn-alpha-2',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 64000,
            tool: {
              toolInvocationId: 'tool-c2-inspect',
              toolName: 'filesystem.read',
              command: 'filesystem.read src/middleware/auth.ts',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 64000,
              durationMs: 310,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] File inspected safely. Root cause located: Line 33 assumed sessionToken.user exists without null-checking authorization header.',
            },
          },
          {
            id: 'item-c2-diff',
            turnId: 'turn-alpha-2',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 72000,
            diff: DEBUG_DIFF,
          },
          {
            id: 'item-c2-verify',
            turnId: 'turn-alpha-2',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: BASE_TIMESTAMP + 80000,
            tool: {
              toolInvocationId: 'tool-c2-verify',
              toolName: 'terminal.execute',
              command: 'pnpm test -- --filter auth.test.ts [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 80000,
              durationMs: 920,
              exitCode: 0,
              isVerification: true,
              verificationStatus: 'unverified',
              outcomeBadge: 'Controlled demonstration · Verified',
              outputLog: `[Controlled demonstration] Running auth middleware test suite:
✓ unauthenticated request returns HTTP 401 Missing token
✓ expired token returns HTTP 401 Invalid session
✓ authenticated request attaches userId and calls next()
8/8 tests passed in 92ms`,
            },
          },
          {
            id: 'item-c2-summary',
            turnId: 'turn-alpha-2',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 95000,
            text: `### Bug Triage & Resolution Report
**Root Cause**: In \`src/middleware/auth.ts\`, the handler directly dereferenced \`sessionToken.user\` without validating that the \`Authorization\` header was provided. Unauthenticated requests triggered an unhandled \`TypeError\`.

**Fix Applied**:
- Added explicit null check: returns \`HTTP 401 Missing authorization token\` if header is absent.
- Wrapped session resolution with \`verifySessionToken()\` and verified user existence before attaching \`req.userId\`.
- All 8 unit tests in \`auth.test.ts\` verified passing.`,
          },
        ],
      },
    ],
  };

  // --------------------------------------------------------------------------
  // Chat 3 — Parallel Specialist Collaboration
  // --------------------------------------------------------------------------
  const chat3: Thread = {
    id: 'thread-demo-03-parallel-collab',
    teamId: teamAlphaId,
    title: 'Chat 3 — Parallel Specialist Collaboration',
    projectId: 'fixture-project-offline',
    ownerAgent: 'team',
    threadType: 'team',
    assignedSpecialists: ['maestro', 'cody', 'tester', 'research', 'doc'],
    mode: 'connected_main',
    agentScope: 'team',
    createdAt: BASE_TIMESTAMP + 120000,
    updatedAt: BASE_TIMESTAMP + 240000,
    model: 'Claude 3.7 Sonnet',
    branch: 'main',
    approvalMode: 'Approve for me',
    turns: [
      {
        id: 'turn-alpha-3',
        threadId: 'thread-demo-03-parallel-collab',
        prompt: 'Simultaneously implement POST /api/datasets, write integration tests, benchmark latency, and generate OpenAPI docs.',
        status: 'completed',
        createdAt: BASE_TIMESTAMP + 120000,
        completedAt: BASE_TIMESTAMP + 165000,
        items: [
          {
            id: 'item-c3-u1',
            turnId: 'turn-alpha-3',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: BASE_TIMESTAMP + 120000,
            text: 'We need to implement `POST /api/datasets` with Zod validation, create a full integration test suite, benchmark JSON vs. Protobuf serialization, and update the OpenAPI 3.1 specification. Run specialists in parallel.',
          },
          {
            id: 'item-c3-sys',
            turnId: 'turn-alpha-3',
            type: 'agent_message',
            actor: { type: 'system', name: 'Demonstration Guard' },
            timestamp: BASE_TIMESTAMP + 121000,
            text: 'Controlled demonstration · Multi-specialist parallel execution active. Hardware governor enforces bounded worker concurrency.',
          },
          {
            id: 'item-c3-maestro',
            turnId: 'turn-alpha-3',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: BASE_TIMESTAMP + 123000,
            text: `### Maestro Parallel Sprint Plan
Decomposing task into concurrent execution streams:
- **Stream A (Cody)**: Implement \`POST /api/datasets\` endpoint in \`src/api/datasets.ts\`.
- **Stream B (Tester)**: Author Vitest integration test suite with synthetic fixtures.
- **Stream C (Research)**: Benchmark serialization throughput ($N = 5,000$ iterations).
- **Stream D (Doc)**: Generate OpenAPI 3.1 YAML schema with schema definitions.`,
          },
          {
            id: 'item-c3-cody-tool',
            turnId: 'turn-alpha-3',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 128000,
            tool: {
              toolInvocationId: 'tool-c3-cody-write',
              toolName: 'filesystem.write',
              command: 'filesystem.write src/api/datasets.ts',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 128000,
              durationMs: 450,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] File written: src/api/datasets.ts (+26 lines).',
            },
          },
          {
            id: 'item-c3-cody-diff',
            turnId: 'turn-alpha-3',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 132000,
            diff: DATASETS_API_DIFF,
          },
          {
            id: 'item-c3-research-tool',
            turnId: 'turn-alpha-3',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'research', name: 'Research', role: 'Technical research' },
            timestamp: BASE_TIMESTAMP + 135000,
            tool: {
              toolInvocationId: 'tool-c3-research-bench',
              toolName: 'benchmark.run',
              command: 'benchmark.run --target serialization --iterations 5000 [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 135000,
              durationMs: 1850,
              outcomeBadge: 'Controlled demonstration',
              outputLog: `[Controlled demonstration] Serialization Benchmark Results (5,000 iterations):
- JSON.stringify: 1.82ms P50, 4.10ms P95 (Payload: 42 KB)
- Protobuf encode: 0.54ms P50, 1.15ms P95 (Payload: 18 KB)
Protobuf is 3.4x faster; recommended for high-throughput internal streaming.`,
            },
          },
          {
            id: 'item-c3-tester-tool',
            turnId: 'turn-alpha-3',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: BASE_TIMESTAMP + 142000,
            tool: {
              toolInvocationId: 'tool-c3-tester-run',
              toolName: 'terminal.execute',
              command: 'pnpm test tests/integration/datasets.test.ts [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 142000,
              durationMs: 1100,
              exitCode: 0,
              isVerification: true,
              verificationStatus: 'unverified',
              outcomeBadge: 'Controlled demonstration · Verified',
              outputLog: `[Controlled demonstration] Integration Test Suite:
✓ POST /datasets with valid body returns 201 Created
✓ POST /datasets with missing name returns 400 Bad Request
✓ POST /datasets with duplicate key returns 409 Conflict
12/12 tests passed in 184ms`,
            },
          },
          {
            id: 'item-c3-doc-tool',
            turnId: 'turn-alpha-3',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'doc', name: 'Doc', role: 'Technical documentation' },
            timestamp: BASE_TIMESTAMP + 148000,
            tool: {
              toolInvocationId: 'tool-c3-doc-write',
              toolName: 'filesystem.write',
              command: 'filesystem.write docs/openapi-datasets.yaml',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 148000,
              durationMs: 380,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] File written: docs/openapi-datasets.yaml (OpenAPI 3.1 schema generated).',
            },
          },
          {
            id: 'item-c3-summary',
            turnId: 'turn-alpha-3',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: BASE_TIMESTAMP + 165000,
            text: `### Combined Multi-Specialist Delivery
All 4 parallel execution streams completed cleanly under hardware governor limits:

| Specialist | Deliverable | Status | Verification |
|:---|:---|:---|:---|
| **Cody** | \`src/api/datasets.ts\` | Completed | Code diff reviewed |
| **Tester** | \`tests/integration/datasets.test.ts\` | Completed | 12/12 tests passed |
| **Research**| Serialization Benchmark Report | Completed | Protobuf 3.4x faster |
| **Doc** | \`docs/openapi-datasets.yaml\` | Completed | OpenAPI 3.1 validated |`,
          },
        ],
      },
    ],
  };

  // --------------------------------------------------------------------------
  // Chat 4 — Code Review
  // --------------------------------------------------------------------------
  const chat4: Thread = {
    id: 'thread-demo-04-code-review',
    teamId: teamAlphaId,
    title: 'Chat 4 — Code Review & Security Audit',
    projectId: 'fixture-project-offline',
    ownerAgent: 'team',
    threadType: 'team',
    assignedSpecialists: ['maestro', 'cody', 'tester'],
    mode: 'connected_main',
    agentScope: 'team',
    createdAt: BASE_TIMESTAMP + 180000,
    updatedAt: BASE_TIMESTAMP + 300000,
    model: 'Claude 3.7 Sonnet',
    branch: 'main',
    approvalMode: 'Ask for approval',
    turns: [
      {
        id: 'turn-alpha-4',
        threadId: 'thread-demo-04-code-review',
        prompt: 'Review proposed authentication PR #142 for security flaws and require policy approval.',
        status: 'waiting_approval',
        createdAt: BASE_TIMESTAMP + 180000,
        completedAt: BASE_TIMESTAMP + 225000,
        items: [
          {
            id: 'item-c4-u1',
            turnId: 'turn-alpha-4',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: BASE_TIMESTAMP + 180000,
            text: 'Conduct a thorough code review and security audit on PR #142 (session token generation refactor). Flag vulnerabilities and request deployment approval.',
          },
          {
            id: 'item-c4-sys',
            turnId: 'turn-alpha-4',
            type: 'agent_message',
            actor: { type: 'system', name: 'Demonstration Guard' },
            timestamp: BASE_TIMESTAMP + 181000,
            text: 'Controlled demonstration · Security audit mode active. Requires human approval for cryptographic changes.',
          },
          {
            id: 'item-c4-read1',
            turnId: 'turn-alpha-4',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 185000,
            tool: {
              toolInvocationId: 'tool-c4-read1',
              toolName: 'filesystem.read',
              command: 'filesystem.read src/auth/tokenService.ts',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 185000,
              durationMs: 220,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] File inspected: Discovered Math.random() pseudorandom token generator vulnerability (CWE-338).',
            },
          },
          {
            id: 'item-c4-diff',
            turnId: 'turn-alpha-4',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 192000,
            diff: SECURITY_DIFF,
          },
          {
            id: 'item-c4-approval',
            turnId: 'turn-alpha-4',
            type: 'approval_request',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: BASE_TIMESTAMP + 200000,
            approval: {
              approvalId: 'appr-sec-001',
              title: 'Cryptographic Security Policy Override',
              description: 'Approve production deployment of crypto.randomBytes(32) entropy generator replacing Math.random() in tokenService.ts.',
              risk: 'high',
              status: 'pending',
              mediobotName: 'Tester',
              workspace: '/controlled-demo/mediobot-workspace',
              reason: 'CWE-338 Remediation requires cryptographic authorization.',
              actionPayload: {
                type: 'file_write',
                detail: 'Overwrite src/auth/tokenService.ts with 256-bit entropy token implementation',
              },
            },
          },
          {
            id: 'item-c4-findings',
            turnId: 'turn-alpha-4',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: BASE_TIMESTAMP + 225000,
            text: `### Code Review Findings · PR #142

| Severity | Category | File | Description |
|:---|:---|:---|:---|
| 🔴 **CRITICAL** | Security (CWE-338) | \`tokenService.ts:14\` | \`Math.random()\` is cryptographically insecure. Replaced with \`crypto.randomBytes(32)\`. |
| 🟡 **WARNING** | Concurrency | \`sessionStore.ts:42\` | Missing optimistic lock on token invalidation; risk of TOCTOU race. |
| 🟢 **INFO** | Performance | \`tokenService.ts:15\` | Using \`base64url\` avoids URL-encoding overhead in cookies. |

*Action Required: Please click **Approve** on the security policy banner above to confirm deployment.*`,
          },
        ],
      },
    ],
  };

  // --------------------------------------------------------------------------
  // Chat 5 — Research Task
  // --------------------------------------------------------------------------
  const chat5: Thread = {
    id: 'thread-demo-05-research-task',
    teamId: teamAlphaId,
    title: 'Chat 5 — Research Task & Intelligence',
    projectId: 'fixture-project-offline',
    ownerAgent: 'team',
    threadType: 'team',
    assignedSpecialists: ['maestro', 'research', 'scraapy'],
    mode: 'connected_main',
    agentScope: 'team',
    createdAt: BASE_TIMESTAMP + 240000,
    updatedAt: BASE_TIMESTAMP + 360000,
    model: 'Gemini 3.8 Flash',
    branch: 'main',
    approvalMode: 'Approve for me',
    turns: [
      {
        id: 'turn-alpha-5',
        threadId: 'thread-demo-05-research-task',
        prompt: 'Research embedded local vector databases: compare sqlite-vec, DuckDB VSS, and LibSQL for multi-agent memory.',
        status: 'completed',
        createdAt: BASE_TIMESTAMP + 240000,
        completedAt: BASE_TIMESTAMP + 285000,
        items: [
          {
            id: 'item-c5-u1',
            turnId: 'turn-alpha-5',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: BASE_TIMESTAMP + 240000,
            text: 'Conduct an in-depth research investigation comparing local vector databases: SQLite-vec, DuckDB VSS, and LibSQL for embedded multi-agent memory. Provide latency metrics, memory footprints, and architectural trade-offs.',
          },
          {
            id: 'item-c5-sys',
            turnId: 'turn-alpha-5',
            type: 'agent_message',
            actor: { type: 'system', name: 'Demonstration Guard' },
            timestamp: BASE_TIMESTAMP + 241000,
            text: 'Controlled demonstration · Research specialist and Scraapy web intelligence active with local synthetic citations.',
          },
          {
            id: 'item-c5-tool1',
            turnId: 'turn-alpha-5',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'scraapy', name: 'Scraapy', role: 'Web extraction & crawling' },
            timestamp: BASE_TIMESTAMP + 245000,
            tool: {
              toolInvocationId: 'tool-c5-scraapy',
              toolName: 'web.search',
              command: 'web.search "sqlite-vec vs duckdb vss embedded vector benchmarks 2026"',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 245000,
              durationMs: 820,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] 4 technical documentation sources indexed: sqlite-vec v0.1.6, duckdb vss v1.1, libsql vector docs, and IEEE SQuaRE benchmarks.',
            },
          },
          {
            id: 'item-c5-tool2',
            turnId: 'turn-alpha-5',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'research', name: 'Research', role: 'Technical research' },
            timestamp: BASE_TIMESTAMP + 252000,
            tool: {
              toolInvocationId: 'tool-c5-research',
              toolName: 'doc.analyze',
              command: 'doc.analyze --corpus vector-storage-architecture [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 252000,
              durationMs: 1450,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] Analyzed SIMD hardware acceleration (Apple Silicon NEON vs x86_64 AVX-512) and memory-mapped page cache efficiency.',
            },
          },
          {
            id: 'item-c5-whitepaper',
            turnId: 'turn-alpha-5',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'research', name: 'Research', role: 'Technical research' },
            timestamp: BASE_TIMESTAMP + 285000,
            text: `### Comparative Whitepaper: Embedded Vector Storage Engines

| Metric / Dimension | SQLite-vec | DuckDB VSS | LibSQL Vector |
|:---|:---|:---|:---|
| **Architecture** | C-extension for SQLite | C++ extension for DuckDB | Native Rust SQLite fork |
| **P50 Query Latency** | **$1.8\\text{ ms}$** | $4.2\\text{ ms}$ | $2.4\\text{ ms}$ |
| **P95 Query Latency** | **$4.5\\text{ ms}$** | $9.8\\text{ ms}$ | $6.1\\text{ ms}$ |
| **Memory Overhead** | **$24\\text{ MB}$ RSS** | $78\\text{ MB}$ RSS | $42\\text{ MB}$ RSS |
| **Apple NEON SIMD** | Native vectorized C | Partial | Native Rust vector |
| **Incremental Updates**| Surgical $O(\\Delta)$ | Batch columnar rebuild | Surgical $O(\\Delta)$ |

#### Recommendation for Mediobot
We recommend **SQLite-vec**:
1. **Zero External Processes**: Embeds directly into Node 22's native \`node:sqlite\` without child process overhead.
2. **Sub-50ms Incremental Invalidation**: Supports fine-grained deletes and inserts during source code AST diffing without re-indexing entire files.
3. **Hardware Alignment**: Runs efficiently under our 16 GB developer host memory ceiling ($< 35\\text{ MB}$ footprint).`,
          },
        ],
      },
    ],
  };

  // --------------------------------------------------------------------------
  // Chat 6 — Testing and Quality Assurance
  // --------------------------------------------------------------------------
  const chat6: Thread = {
    id: 'thread-demo-06-qa-testing',
    teamId: teamAlphaId,
    title: 'Chat 6 — Testing & Quality Assurance',
    projectId: 'fixture-project-offline',
    ownerAgent: 'team',
    threadType: 'team',
    assignedSpecialists: ['maestro', 'cody', 'tester'],
    mode: 'connected_main',
    agentScope: 'team',
    createdAt: BASE_TIMESTAMP + 300000,
    updatedAt: BASE_TIMESTAMP + 420000,
    model: 'Claude 3.7 Sonnet',
    branch: 'main',
    approvalMode: 'Approve for me',
    turns: [
      {
        id: 'turn-alpha-6',
        threadId: 'thread-demo-06-qa-testing',
        prompt: 'Run full regression test suite, identify failing assertions, patch code, and verify 100% pass.',
        status: 'completed',
        createdAt: BASE_TIMESTAMP + 300000,
        completedAt: BASE_TIMESTAMP + 355000,
        items: [
          {
            id: 'item-c6-u1',
            turnId: 'turn-alpha-6',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: BASE_TIMESTAMP + 300000,
            text: 'Execute our full pipeline regression suite, diagnose any failures, apply code fixes, and verify that all test suites pass.',
          },
          {
            id: 'item-c6-sys',
            turnId: 'turn-alpha-6',
            type: 'agent_message',
            actor: { type: 'system', name: 'Demonstration Guard' },
            timestamp: BASE_TIMESTAMP + 301000,
            text: 'Controlled demonstration · QA loop active. Testing initial state before automated diagnosis and patch application.',
          },
          {
            id: 'item-c6-test-fail',
            turnId: 'turn-alpha-6',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: BASE_TIMESTAMP + 306000,
            tool: {
              toolInvocationId: 'tool-c6-fail',
              toolName: 'terminal.execute',
              command: 'pnpm test tests/pipeline/batch.test.ts [Controlled demonstration]',
              status: 'failed',
              startedAt: BASE_TIMESTAMP + 306000,
              durationMs: 1450,
              exitCode: 1,
              isVerification: true,
              verificationStatus: 'unverified',
              outcomeBadge: 'Controlled demonstration · Failed',
              outputLog: `[Controlled demonstration] FAIL tests/pipeline/batch.test.ts
✕ BatchProcessor > handles transient network drops gracefully (380ms)
  AssertionError: expected 'FAILED' to equal 'SUCCESS'
  1 failing test | 13 passing tests (14 total)`,
            },
          },
          {
            id: 'item-c6-cody-patch',
            turnId: 'turn-alpha-6',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 322000,
            diff: BATCH_DIFF,
          },
          {
            id: 'item-c6-test-pass',
            turnId: 'turn-alpha-6',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: BASE_TIMESTAMP + 338000,
            tool: {
              toolInvocationId: 'tool-c6-pass',
              toolName: 'terminal.execute',
              command: 'pnpm test tests/pipeline/batch.test.ts [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 338000,
              durationMs: 980,
              exitCode: 0,
              isVerification: true,
              verificationStatus: 'unverified',
              outcomeBadge: 'Controlled demonstration · Verified',
              outputLog: `[Controlled demonstration] PASS tests/pipeline/batch.test.ts
✓ BatchProcessor > handles transient network drops gracefully (retry backoff verified)
✓ BatchProcessor > flushes batch queue upon reaching highWaterMark
14 passing tests | 0 failing (14 total in 198ms)`,
            },
          },
          {
            id: 'item-c6-qa-cert',
            turnId: 'turn-alpha-6',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: BASE_TIMESTAMP + 355000,
            text: `### QA Verification Certificate
- **Initial Run**: Failed on \`transient network drops\` (exit code 1).
- **Diagnosis**: Cody identified missing retry backoff during network hiccups.
- **Remediation**: Added 3-attempt exponential backoff loop in \`src/pipeline/batch.ts\`.
- **Final Verification**: 14/14 tests passing cleanly (exit code 0). QA gate is **APPROVED**.`,
          },
        ],
      },
    ],
  };

  // --------------------------------------------------------------------------
  // Chat 7 — Terminal Execution
  // --------------------------------------------------------------------------
  const chat7: Thread = {
    id: 'thread-demo-07-terminal-exec',
    teamId: teamAlphaId,
    title: 'Chat 7 — Terminal Command Execution',
    projectId: 'fixture-project-offline',
    ownerAgent: 'team',
    threadType: 'team',
    assignedSpecialists: ['maestro', 'cody'],
    mode: 'connected_main',
    agentScope: 'team',
    createdAt: BASE_TIMESTAMP + 360000,
    updatedAt: BASE_TIMESTAMP + 480000,
    model: 'Claude 3.7 Sonnet',
    branch: 'main',
    approvalMode: 'Approve for me',
    turns: [
      {
        id: 'turn-alpha-7',
        threadId: 'thread-demo-07-terminal-exec',
        prompt: 'Run production pre-flight terminal pipeline: environment check, dependency audit, linter, and asset build.',
        status: 'completed',
        createdAt: BASE_TIMESTAMP + 360000,
        completedAt: BASE_TIMESTAMP + 410000,
        items: [
          {
            id: 'item-c7-u1',
            turnId: 'turn-alpha-7',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: BASE_TIMESTAMP + 360000,
            text: 'Run the production pre-flight checks in terminal: verify runtime versions, check dependency security audit, execute strict linting, and compile production assets.',
          },
          {
            id: 'item-c7-sys',
            turnId: 'turn-alpha-7',
            type: 'agent_message',
            actor: { type: 'system', name: 'Demonstration Guard' },
            timestamp: BASE_TIMESTAMP + 361000,
            text: 'Controlled demonstration · Terminal execution emulator active with sandboxed simulated streams and exit codes.',
          },
          {
            id: 'item-c7-t1',
            turnId: 'turn-alpha-7',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 364000,
            tool: {
              toolInvocationId: 'tool-c7-v',
              toolName: 'terminal.execute',
              command: 'node -v && pnpm -v [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 364000,
              durationMs: 85,
              exitCode: 0,
              outcomeBadge: 'Controlled demonstration',
              outputLog: `[Controlled demonstration]
v22.22.3 (ARM64 Darwin native)
pnpm v9.15.0`,
            },
          },
          {
            id: 'item-c7-t2',
            turnId: 'turn-alpha-7',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 372000,
            tool: {
              toolInvocationId: 'tool-c7-audit',
              toolName: 'terminal.execute',
              command: 'pnpm audit --audit-level=high [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 372000,
              durationMs: 420,
              exitCode: 0,
              outcomeBadge: 'Controlled demonstration',
              outputLog: `[Controlled demonstration]
No known vulnerabilities found across 482 packages scanned.
Audit clean: 0 vulnerabilities (0 low, 0 moderate, 0 high, 0 critical).`,
            },
          },
          {
            id: 'item-c7-t3',
            turnId: 'turn-alpha-7',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 382000,
            tool: {
              toolInvocationId: 'tool-c7-lint',
              toolName: 'terminal.execute',
              command: 'pnpm run lint [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 382000,
              durationMs: 1250,
              exitCode: 0,
              outcomeBadge: 'Controlled demonstration',
              outputLog: `[Controlled demonstration]
✓ ESLint: 0 errors, 0 warnings in 64 files.
✓ Prettier code style verified.
✓ TypeScript typecheck passed cleanly with 0 errors.`,
            },
          },
          {
            id: 'item-c7-t4',
            turnId: 'turn-alpha-7',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 395000,
            tool: {
              toolInvocationId: 'tool-c7-build',
              toolName: 'terminal.execute',
              command: 'pnpm run build [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 395000,
              durationMs: 2850,
              exitCode: 0,
              outcomeBadge: 'Controlled demonstration',
              outputLog: `[Controlled demonstration]
vite v6.2.0 building for production...
✓ 8,467 modules transformed.
dist/index.html                           1.33 kB │ gzip:   0.66 kB
dist/assets/index.css                   193.15 kB │ gzip:  30.68 kB
dist/assets/CodeEditorView.js           808.75 kB │ gzip: 285.95 kB
dist/assets/index.js                  1,875.66 kB │ gzip: 574.54 kB
✓ built in 2.85s`,
            },
          },
          {
            id: 'item-c7-summary',
            turnId: 'turn-alpha-7',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 410000,
            text: `### Pre-Flight Terminal Execution Summary
All 4 pipeline stages executed with **exit code 0**:
1. **Environment**: Node.js v22.22.3, pnpm 9.15.0.
2. **Security Audit**: 0 vulnerabilities detected in supply chain dependencies.
3. **Linter & Typecheck**: 0 ESLint warnings, TypeScript passed cleanly.
4. **Production Build**: Assets compiled in 2.85s; ready for production deployment.`,
          },
        ],
      },
    ],
  };

  // --------------------------------------------------------------------------
  // Chat 8 — Specialist Direct Conversation (Cody)
  // --------------------------------------------------------------------------
  const chat8: Thread = {
    id: 'thread-alpha-cody-01',
    teamId: teamAlphaId,
    title: 'Chat 8 — Cody Specialist Direct Conversation',
    projectId: 'fixture-project-offline',
    ownerAgent: 'cody',
    specialistId: 'cody',
    threadType: 'mind',
    agentScope: 'cody',
    mode: 'standalone_specialist',
    assignedSpecialists: ['cody'],
    createdAt: BASE_TIMESTAMP + 420000,
    updatedAt: BASE_TIMESTAMP + 540000,
    model: 'Claude 3.7 Sonnet',
    branch: 'main',
    approvalMode: 'Approve for me',
    turns: [
      {
        id: 'turn-alpha-8',
        threadId: 'thread-alpha-cody-01',
        prompt: 'Optimize Tree-sitter AST parser in packages/core/parser.ts for 50k LOC repositories.',
        status: 'completed',
        createdAt: BASE_TIMESTAMP + 420000,
        completedAt: BASE_TIMESTAMP + 465000,
        items: [
          {
            id: 'item-c8-u1',
            turnId: 'turn-alpha-8',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: BASE_TIMESTAMP + 420000,
            text: 'Cody, let\'s optimize our Tree-sitter AST parser in `packages/core/parser.ts`. Deep recursive calls cause call-stack pressure on 50k+ LOC repositories. How can we restructure this for maximum speed?',
          },
          {
            id: 'item-c8-sys',
            turnId: 'turn-alpha-8',
            type: 'agent_message',
            actor: { type: 'system', name: 'Demonstration Guard' },
            timestamp: BASE_TIMESTAMP + 421000,
            text: 'Controlled demonstration · Private specialist direct chat with Cody. Completely isolated from Main Team stream.',
          },
          {
            id: 'item-c8-cody-read',
            turnId: 'turn-alpha-8',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 425000,
            tool: {
              toolInvocationId: 'tool-c8-ast-read',
              toolName: 'filesystem.read',
              command: 'filesystem.read packages/core/parser.ts',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 425000,
              durationMs: 290,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] File inspected: Identified recursive function visit(node) vulnerable to maximum call stack size exceeded on deeply nested AST trees.',
            },
          },
          {
            id: 'item-c8-diff',
            turnId: 'turn-alpha-8',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 438000,
            diff: AST_PARSER_DIFF,
          },
          {
            id: 'item-c8-cody-msg',
            turnId: 'turn-alpha-8',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 465000,
            text: `### Direct Engineering Assessment · Tree-sitter Optimization
I've refactored the traversal engine from recursive function calls to an **iterative BFS queue with typed arrays**:

1. **Zero Stack Overflow Risk**: By keeping the queue on the heap, syntax trees of arbitrary depth (including nested JSX or machine-generated SQL) traverse safely without exceeding V8's call stack limit.
2. **3.8x Faster Throughput**: Node children are accessed via direct index pointer offsets (\`current.child(i)\`), eliminating V8 hidden-class transitions and closure allocation overhead.
3. **Memory Profile**: Memory allocations remain strictly $O(\\text{breadth})$, reducing GC scavenger pauses by 68%.`,
          },
        ],
      },
    ],
  };

  // --------------------------------------------------------------------------
  // Chat 9 — Long-Running Task
  // --------------------------------------------------------------------------
  const chat9: Thread = {
    id: 'thread-demo-09-long-running',
    teamId: teamAlphaId,
    title: 'Chat 9 — Long-Running Task & Recovery',
    projectId: 'fixture-project-offline',
    ownerAgent: 'team',
    threadType: 'team',
    assignedSpecialists: ['maestro', 'cody'],
    mode: 'connected_main',
    agentScope: 'team',
    createdAt: BASE_TIMESTAMP + 480000,
    updatedAt: BASE_TIMESTAMP + 600000,
    model: 'Claude 3.7 Sonnet',
    branch: 'main',
    approvalMode: 'Approve for me',
    turns: [
      {
        id: 'turn-alpha-9',
        threadId: 'thread-demo-09-long-running',
        prompt: 'Execute full repository migration from CommonJS to ESM across 120 files with automated checkpoints.',
        status: 'paused',
        taskId: 'task-long-run-9481',
        recoveryState: 'paused',
        createdAt: BASE_TIMESTAMP + 480000,
        completedAt: BASE_TIMESTAMP + 520000,
        items: [
          {
            id: 'item-c9-u1',
            turnId: 'turn-alpha-9',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: BASE_TIMESTAMP + 480000,
            text: 'Execute a full repository migration from CommonJS to modern ESM across 120 files. Ensure intermediate checkpoints are saved in SQLite so execution can be paused and resumed without re-running completed transformations.',
          },
          {
            id: 'item-c9-sys',
            turnId: 'turn-alpha-9',
            type: 'agent_message',
            actor: { type: 'system', name: 'Demonstration Guard' },
            timestamp: BASE_TIMESTAMP + 481000,
            text: 'Controlled demonstration · Checkpointed task execution active. Intermediate states persisted in SQLite checkpoint database.',
          },
          {
            id: 'item-c9-cp1',
            turnId: 'turn-alpha-9',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 488000,
            tool: {
              toolInvocationId: 'tool-c9-cp1',
              toolName: 'task.checkpoint',
              command: 'task.checkpoint --phase 1 --status complete [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 488000,
              durationMs: 120,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] Checkpoint #1 saved: 120/120 files analyzed for require() and module.exports signatures.',
            },
          },
          {
            id: 'item-c9-cp2',
            turnId: 'turn-alpha-9',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 498000,
            tool: {
              toolInvocationId: 'tool-c9-cp2',
              toolName: 'task.checkpoint',
              command: 'task.checkpoint --phase 2 --status complete [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 498000,
              durationMs: 340,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] Checkpoint #2 saved: Transformed 120 files to import/export syntax with .js extension specifiers.',
            },
          },
          {
            id: 'item-c9-cancel-notice',
            turnId: 'turn-alpha-9',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: BASE_TIMESTAMP + 520000,
            text: `### Task Checkpoint Status: Paused at Monotonic Checkpoint #2
- **Phase 1 (AST Analysis)**: ✅ 120/120 files mapped.
- **Phase 2 (Syntax Conversion)**: ✅ 120/120 files rewritten to ESM.
- **Phase 3 (Package & tsconfig)**: ⏸ Paused per user checkpoint request.
- **Durable Task ID**: \`task-long-run-9481\` (Status: \`paused\`).

*Notice: You can click **Resume task** on the recovery banner above at any time to resume execution from Checkpoint #2 without re-analyzing completed files.*`,
          },
        ],
      },
    ],
  };

  // --------------------------------------------------------------------------
  // Chat 10 — Complete Mediobot Project
  // --------------------------------------------------------------------------
  const chat10: Thread = {
    id: 'thread-demo-10-complete-project',
    teamId: teamAlphaId,
    title: 'Chat 10 — Complete Mediobot Project',
    projectId: 'fixture-project-offline',
    ownerAgent: 'team',
    threadType: 'team',
    assignedSpecialists: ['maestro', 'cody', 'tester', 'research', 'doc', 'vision'],
    mode: 'connected_main',
    agentScope: 'team',
    createdAt: BASE_TIMESTAMP + 540000,
    updatedAt: BASE_TIMESTAMP + 720000,
    model: 'Claude 3.7 Sonnet',
    branch: 'main',
    approvalMode: 'Approve for me',
    turns: [
      {
        id: 'turn-alpha-10',
        threadId: 'thread-demo-10-complete-project',
        prompt: 'Orchestrate complete autonomous full-stack authentication microservice with database, tests, docs, and visual UI preview.',
        status: 'completed',
        createdAt: BASE_TIMESTAMP + 540000,
        completedAt: BASE_TIMESTAMP + 674000,
        items: [
          {
            id: 'item-c10-u1',
            turnId: 'turn-alpha-10',
            type: 'user_message',
            actor: { type: 'user', name: 'Lead Architect' },
            timestamp: BASE_TIMESTAMP + 540000,
            text: 'Orchestrate an end-to-end engineering sprint: design an autonomous authentication microservice with JWT tokens, SQLite database storage, full integration test suites, OpenAPI specifications, and visual UI inspection of the login dialog.',
          },
          {
            id: 'item-c10-sys',
            turnId: 'turn-alpha-10',
            type: 'agent_message',
            actor: { type: 'system', name: 'Demonstration Guard' },
            timestamp: BASE_TIMESTAMP + 541000,
            text: 'Controlled demonstration · Full Mediobot Autonomous AI Organization active with 6 coordinated specialists.',
          },
          {
            id: 'item-c10-maestro-sprint',
            turnId: 'turn-alpha-10',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: BASE_TIMESTAMP + 544000,
            text: `### Maestro Full-Stack Sprint Roadmap
Assembling full 6-specialist organization:
1. **Research**: Evaluate token hashing (Argon2id vs. bcrypt).
2. **Cody**: Implement \`AuthService\` with SQLite storage in \`src/auth/service.ts\`.
3. **Tester**: Execute independent test assertions (target: 100% passing).
4. **Vision**: Inspect DOM layout and accessibility contrast for login modal.
5. **Doc**: Author technical ADR and OpenAPI documentation.`,
          },
          {
            id: 'item-c10-research',
            turnId: 'turn-alpha-10',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'research', name: 'Research', role: 'Technical research' },
            timestamp: BASE_TIMESTAMP + 550000,
            tool: {
              toolInvocationId: 'tool-c10-res',
              toolName: 'research.hash_eval',
              command: 'research.hash_eval --algorithm argon2id --params "m=65536,t=3,p=4" [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 550000,
              durationMs: 920,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] Argon2id verified optimal against GPU-based side-channel attacks on local host.',
            },
          },
          {
            id: 'item-c10-cody-write',
            turnId: 'turn-alpha-10',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 560000,
            tool: {
              toolInvocationId: 'tool-c10-cody-write',
              toolName: 'filesystem.write',
              command: 'filesystem.write src/auth/service.ts',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 560000,
              durationMs: 420,
              outcomeBadge: 'Controlled demonstration',
              outputLog: '[Controlled demonstration] File written: src/auth/service.ts (+44 lines).',
            },
          },
          {
            id: 'item-c10-diff',
            turnId: 'turn-alpha-10',
            type: 'diff',
            actor: { type: 'mediobot', mediobotId: 'cody', name: 'Cody', role: 'Software engineering' },
            timestamp: BASE_TIMESTAMP + 575000,
            diff: FULL_AUTH_DIFF,
          },
          {
            id: 'item-c10-tester-verify',
            turnId: 'turn-alpha-10',
            type: 'tool_execution',
            actor: { type: 'mediobot', mediobotId: 'tester', name: 'Tester', role: 'Independent verification' },
            timestamp: BASE_TIMESTAMP + 590000,
            tool: {
              toolInvocationId: 'tool-c10-test',
              toolName: 'terminal.execute',
              command: 'pnpm test tests/auth/service.test.ts [Controlled demonstration]',
              status: 'success',
              startedAt: BASE_TIMESTAMP + 590000,
              durationMs: 1150,
              exitCode: 0,
              isVerification: true,
              verificationStatus: 'unverified',
              outcomeBadge: 'Controlled demonstration · Verified',
              outputLog: `[Controlled demonstration] Running auth microservice test suite:
✓ AuthService > creates new user with hashed password (28ms)
✓ AuthService > authenticates valid credentials and returns JWT (34ms)
✓ AuthService > rejects invalid password with 401 (18ms)
✓ AuthService > verifies JWT signature and validates expiration (15ms)
18/18 tests passed cleanly (0 failures in 182ms)`,
            },
          },
          {
            id: 'item-c10-vision',
            turnId: 'turn-alpha-10',
            type: 'perception_snapshot',
            actor: { type: 'mediobot', mediobotId: 'vision', name: 'Vision', role: 'Visual perception & inspection' },
            timestamp: BASE_TIMESTAMP + 610000,
            perception: {
              windowTitle: 'Login Dialog Preview — Google Chrome',
              focusedApp: 'Google Chrome',
              detectedElementsCount: 14,
              visualSummary: 'Visual analysis confirmed WCAG AAA contrast ratio (7.2:1) on login buttons; form layout is responsive across mobile (375px) and desktop (1440px).',
              confidenceScore: 0.99,
            },
          },
          {
            id: 'item-c10-compact',
            turnId: 'turn-alpha-10',
            type: 'activity',
            actor: { type: 'system', name: 'Context Optimizer' },
            timestamp: BASE_TIMESTAMP + 630000,
            activityState: 'completed',
            activityLabel: 'Context automatically compacted',
            text: 'Context automatically compacted',
          },
          {
            id: 'item-c10-executive-report',
            turnId: 'turn-alpha-10',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: BASE_TIMESTAMP + 674000,
            text: `### Executive Project Delivery · Autonomous Authentication Microservice
The entire autonomous software engineering organization has finalized and certified the project:

1. **Security & Cryptography**: Argon2id hashing evaluated and deployed with constant-time verification.
2. **Implementation**: \`AuthService\` implemented in \`src/auth/service.ts\` with clean SQLite WAL transactional isolation.
3. **Independent Verification**: Tester executed 18/18 integration assertions with 100% pass rate.
4. **Visual & Accessibility Compliance**: Vision verified WCAG AAA contrast compliance and mobile responsiveness.
5. **Context Management**: Intermediate tool execution trajectories compacted cleanly. All deliverables are certified and production-ready.`,
          },
        ],
      },
    ],
  };

  return [
    chat1,
    chat2,
    chat3,
    chat4,
    chat5,
    chat6,
    chat7,
    chat8,
    chat9,
    chat10,
  ];
}
