/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Safe Deterministic Offline Fixture Adapter for Mediobot UI Refinement.
 *
 * Mandatory Security & Isolation Guarantees:
 * 1. Zero provider requests (no Gemini, Anthropic, or OpenAI network calls).
 * 2. Zero external network calls (purely in-memory / isolated storage).
 * 3. Zero shell, terminal, or subprocess execution.
 * 4. Zero filesystem modification on the host workspace.
 * 5. Zero access to real user projects.
 * 6. Isolated storage key ('mediobot_fixture_offline_threads') — never merges with user history.
 * 7. Every synthetic activity, status, and turn is explicitly marked "Controlled demonstration".
 * 8. Never silently substitutes or switches models.
 * 9. Rejects unexpected network requests with explicit errors.
 * 10. Does not present simulated tool outcomes as real execution.
 */

import type {
  IMediobotRuntime,
  RuntimeEvent,
  TurnOptions,
  WorkspaceStatus,
  WorkspaceSession,
  PersistedWorkspaceUIState,
  WorkspaceWatchEvent,
  RuntimeTaskSummary,
  RuntimeSpecialistGroupHistory,
  PersistedWorkbenchTab,
} from './types';
import type {
  FileNode,
  ProjectInfo,
  Thread,
  Turn,
  ThreadItem,
  FileDiff,
  ToolExecutionData,
  TurnAttachment,
  CatalogProviderItem,
} from '../types';
import { build10DemonstrationChats, SEED_DIFF } from './demonstrationChats.js';

export { SEED_DIFF };

type Listener = (event: RuntimeEvent) => void;
type WorkspaceListener = (event: {
  type: 'state' | 'fs';
  state?: { status: WorkspaceStatus; session: WorkspaceSession | null };
  fsEvents?: WorkspaceWatchEvent[];
}) => void;

const FIXTURE_STORAGE_KEY = 'mediobot_fixture_offline_threads_v2';
export const FIXTURE_ISOLATED_FILES_KEY = 'mediobot_fixture_offline_files_v1';

export const FIXTURE_DEMO_PROJECT: ProjectInfo = {
  id: 'fixture-project-offline',
  name: 'Mediobot UI Demonstration Workspace',
  path: '/controlled-demo/mediobot-workspace',
  branch: 'main',
  branches: ['main', 'feature/isolated-ui'],
  environment: 'Local',
};

export const FIXTURE_DEMO_SESSION: WorkspaceSession = {
  workspaceId: FIXTURE_DEMO_PROJECT.id,
  displayName: FIXTURE_DEMO_PROJECT.name,
  canonicalRootPath: FIXTURE_DEMO_PROJECT.path,
  openedAt: 1731110400000,
};

function createInitialFixtureThreads(): Thread[] {
  const teamAlphaId = 'team-alpha-01';
  const teamBetaId = 'team-beta-02';

  const demoChats = build10DemonstrationChats(teamAlphaId);

  // Associated Maestro for Alpha Main Chat 1 (Chat 1)
  const maestroAlpha1: Thread = {
    id: 'thread-alpha-maestro-01',
    teamId: teamAlphaId,
    title: 'Maestro · Architectural Planning',
    projectId: FIXTURE_DEMO_PROJECT.id,
    ownerAgent: 'maestro',
    specialistId: 'maestro',
    threadType: 'mind',
    agentScope: 'maestro',
    mode: 'standalone_specialist',
    originatingMainThreadId: 'thread-alpha-main-01',
    assignedSpecialists: ['maestro'],
    createdAt: 1731110400000,
    updatedAt: 1731110500000,
    model: 'Gemini 3.6 Flash',
    branch: 'main',
    approvalMode: 'Approve for me',
    turns: [
      {
        id: 'turn-maestro-alpha-1',
        threadId: 'thread-alpha-maestro-01',
        prompt: 'Decompose website and calculator requirements',
        status: 'completed',
        createdAt: 1731110402000,
        completedAt: 1731110410000,
        items: [
          {
            id: 'item-m-plan',
            turnId: 'turn-maestro-alpha-1',
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: 'maestro', name: 'Maestro', role: 'Team orchestration' },
            timestamp: 1731110405000,
            text: 'Orchestration plan: (1) Cody implements guard clause in `src/calculator.ts` and responsive landing components. (2) Tester executes independent unit suite to confirm boundary error. (3) Report back to Main Team.',
          },
        ],
      },
    ],
  };

  // Associated Maestro for Alpha Main Chat 2 (Chat 2)
  const maestroAlpha2: Thread = {
    id: 'thread-alpha-maestro-02',
    teamId: teamAlphaId,
    title: 'Maestro · Application Triage',
    projectId: FIXTURE_DEMO_PROJECT.id,
    ownerAgent: 'maestro',
    specialistId: 'maestro',
    threadType: 'mind',
    agentScope: 'maestro',
    mode: 'standalone_specialist',
    originatingMainThreadId: 'thread-alpha-main-02',
    assignedSpecialists: ['maestro'],
    createdAt: 1731110600000,
    updatedAt: 1731110650000,
    model: 'Gemini 3.6 Flash',
    branch: 'main',
    approvalMode: 'Approve for me',
    turns: [],
  };

  // Team Beta Main Chat 1
  const mainBeta1: Thread = {
    id: 'thread-beta-main-01',
    teamId: teamBetaId,
    title: 'Analytics Main Chat',
    projectId: FIXTURE_DEMO_PROJECT.id,
    ownerAgent: 'team',
    threadType: 'team',
    assignedSpecialists: ['maestro', 'research'],
    mode: 'connected_main',
    agentScope: 'team',
    createdAt: 1731110800000,
    updatedAt: 1731110850000,
    model: 'GPT-4o',
    branch: 'main',
    approvalMode: 'Approve for me',
    associatedMaestroThreadId: 'thread-beta-maestro-01',
    turns: [],
  };

  // Associated Maestro for Beta Main Chat 1
  const maestroBeta1: Thread = {
    id: 'thread-beta-maestro-01',
    teamId: teamBetaId,
    title: 'Maestro · Analytics Main Chat',
    projectId: FIXTURE_DEMO_PROJECT.id,
    ownerAgent: 'maestro',
    specialistId: 'maestro',
    threadType: 'mind',
    agentScope: 'maestro',
    mode: 'standalone_specialist',
    originatingMainThreadId: 'thread-beta-main-01',
    assignedSpecialists: ['maestro'],
    createdAt: 1731110800000,
    updatedAt: 1731110850000,
    model: 'Gemini 3.6 Flash',
    branch: 'main',
    approvalMode: 'Approve for me',
    turns: [],
  };

  // Team Beta Private Specialist Thread (Tester)
  const testerBeta: Thread = {
    id: 'thread-beta-tester-01',
    teamId: teamBetaId,
    title: 'Tester · QA Suite',
    projectId: FIXTURE_DEMO_PROJECT.id,
    ownerAgent: 'tester',
    specialistId: 'tester',
    threadType: 'mind',
    agentScope: 'tester',
    mode: 'standalone_specialist',
    assignedSpecialists: ['tester'],
    createdAt: 1731110900000,
    updatedAt: 1731110950000,
    model: 'DeepSeek-V3',
    branch: 'main',
    approvalMode: 'Approve for me',
    turns: [],
  };

  return [
    ...demoChats,
    maestroAlpha1,
    maestroAlpha2,
    mainBeta1,
    maestroBeta1,
    testerBeta,
  ];
}

export interface PersistedFixtureEnvelope {
  version: 1;
  schema: 'mediobot-offline-fixture-v1' | 'mediobot-offline-fixture-v2';
  savedAt: number;
  threads: Thread[];
}

export class OfflineFixtureRuntime implements IMediobotRuntime {
  readonly runtimeKind = 'offline-fixture' as const;
  private readonly listeners = new Set<Listener>();
  private readonly workspaceListeners = new Set<WorkspaceListener>();
  private threads: Thread[];
  private activeThreadId: string | null = null;
  private readonly isolatedFiles = new Map<string, string>();
  private readonly dynamicFileEntries = new Map<string, { name: string; path: string; type: 'file' | 'folder' }>();
  private readonly deletedPaths = new Set<string>();
  private readonly pendingTurnTimers = new Map<string, Set<ReturnType<typeof setTimeout>>>();

  /**
   * Alias exposing the isolated simulated file store for external verification and inspection.
   */
  public get simulatedFileStore(): Map<string, string> {
    return this.isolatedFiles;
  }

  constructor() {
    this.threads = this.loadStoredFixtureThreads();
    this.loadIsolatedStorage();
  }

  public validatePersistedThreads(raw: unknown): Thread[] | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;

    let candidates: unknown;
    if ((obj.schema === 'mediobot-offline-fixture-v1' || obj.schema === 'mediobot-offline-fixture-v2') && Array.isArray(obj.threads)) {
      candidates = obj.threads;
    } else if (Array.isArray(raw)) {
      candidates = raw;
    } else {
      return null;
    }

    if (!Array.isArray(candidates)) return null;

    const validThreads: Thread[] = [];
    for (const item of candidates) {
      if (
        item &&
        typeof item === 'object' &&
        typeof (item as any).id === 'string' &&
        typeof (item as any).title === 'string' &&
        Array.isArray((item as any).turns)
      ) {
        validThreads.push(item as Thread);
      }
    }

    if (validThreads.length === 0) return null;

    // Clean dangling association pointers on reload
    const validThreadIds = new Set(validThreads.map((t) => t.id));
    for (const thread of validThreads) {
      if (thread.associatedMaestroThreadId && !validThreadIds.has(thread.associatedMaestroThreadId)) {
        thread.associatedMaestroThreadId = undefined;
      }
      if (thread.originatingMainThreadId && !validThreadIds.has(thread.originatingMainThreadId)) {
        thread.originatingMainThreadId = undefined;
      }
    }

    return validThreads;
  }

  private loadStoredFixtureThreads(): Thread[] {
    const initial = createInitialFixtureThreads();
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(FIXTURE_STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const validated = this.validatePersistedThreads(parsed);
            if (validated && validated.length >= initial.length) {
              return validated;
            } else {
              console.warn('[OfflineFixture] Corrupted or older fixture storage schema detected. Refreshing with full demonstration showcase.');
            }
          } catch (parseErr) {
            console.warn('[OfflineFixture] Failed to parse stored fixture threads (malformed JSON). Preserving backup key.');
            try {
              localStorage.setItem(`${FIXTURE_STORAGE_KEY}_corrupted_backup_${Date.now()}`, stored);
            } catch {}
          }
        }
      } catch {
        // Fall back to initial seeds if localStorage is inaccessible
      }
    }
    try {
      this.persistThreads(initial);
    } catch {}
    return initial;
  }

  private persistThreads(threads: Thread[]): void {
    this.threads = threads;
    if (typeof localStorage !== 'undefined') {
      try {
        const envelope: PersistedFixtureEnvelope = {
          version: 1,
          schema: 'mediobot-offline-fixture-v1',
          savedAt: Date.now(),
          threads,
        };
        localStorage.setItem(FIXTURE_STORAGE_KEY, JSON.stringify(envelope));
      } catch (err) {
        // Do NOT silently swallow storage errors (QuotaExceededError).
        // Rethrow storage errors so saveThread and saveThreadsAtomic reject.
        throw err;
      }
    }
  }

  getInitialProjects(): ProjectInfo[] {
    return [FIXTURE_DEMO_PROJECT];
  }

  getInitialThreads(): Thread[] {
    return this.threads;
  }

  async loadProjects(): Promise<ProjectInfo[]> {
    return [FIXTURE_DEMO_PROJECT];
  }

  async loadThreads(_workspaceId?: string | null): Promise<Thread[]> {
    return [...this.threads];
  }

  async loadThread(threadId: string): Promise<Thread> {
    const thread = this.threads.find((t) => t.id === threadId);
    if (!thread) {
      throw new Error(`[OfflineFixture] Thread not found: ${threadId}`);
    }
    return thread;
  }

  async saveThread(thread: Thread): Promise<Thread> {
    const next = this.threads.map((t) => (t.id === thread.id ? { ...t, ...thread } : t));
    if (!next.some((t) => t.id === thread.id)) {
      next.unshift(thread);
    }
    this.persistThreads(next);
    return thread;
  }

  async saveThreadsAtomic(threadsToSave: Thread[]): Promise<void> {
    const saveMap = new Map(threadsToSave.map((t) => [t.id, t]));
    const next = this.threads.map((t) => saveMap.get(t.id) || t);
    for (const t of threadsToSave) {
      if (!next.some((existing) => existing.id === t.id)) {
        next.unshift(t);
      }
    }
    this.persistThreads(next);
  }

  async deleteThread(threadId: string): Promise<void> {
    const next = this.threads.filter((t) => t.id !== threadId);
    this.persistThreads(next);
  }

  async renameThread(threadId: string, title: string): Promise<void> {
    const next = this.threads.map((t) => (t.id === threadId ? { ...t, title, updatedAt: Date.now() } : t));
    this.persistThreads(next);
  }

  setActiveThreadId(id: string | null): void {
    this.activeThreadId = id;
  }

  onEvent(listener: (event: RuntimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitEvent(event: RuntimeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener error ignored
      }
    }
  }

  /**
   * Safe, deterministic offline turn execution.
   * Zero network calls, zero shell processes, zero host file mutations.
   * All results visibly designated as "Controlled demonstration".
   */
  async startTurn(
    threadId: string,
    prompt: string,
    options: TurnOptions,
    turnId = `turn-${Date.now()}`
  ): Promise<string> {
    let thread = this.threads.find((t) => t.id === threadId);
    if (!thread) {
      thread = {
        id: threadId,
        title: prompt.slice(0, 36) || 'New chat',
        projectId: FIXTURE_DEMO_PROJECT.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: options.model,
        modelSelection: options.modelSelection,
        branch: options.branch || 'main',
        approvalMode: options.approvalMode,
        turns: [],
      };
      this.threads.unshift(thread);
    }

    const userItem: ThreadItem = {
      id: `user-msg-${Date.now()}`,
      turnId,
      type: 'user_message',
      actor: { type: 'user', name: 'User' },
      timestamp: Date.now(),
      text: prompt,
    };

    const turn: Turn = {
      id: turnId,
      threadId,
      prompt,
      status: 'running',
      currentActivity: 'thinking',
      createdAt: Date.now(),
      items: [userItem],
    };

    thread.turns.push(turn);
    this.persistThreads([...this.threads]);

    // Respect exact requested model without silent substitution
    const requestedModelName = options.model || options.modelSelection?.modelId || 'Selected Model';
    const cleanSpec = options.specialistId ? options.specialistId.toLowerCase() : (thread.specialistId || 'cody');
    const specialistName = cleanSpec === 'tester' ? 'Tester' : cleanSpec === 'research' ? 'Research' : cleanSpec === 'doc' ? 'Doc' : 'Cody';

    // Emit turn snapshot event
    this.emitEvent({
      type: 'turn.snapshot',
      threadId,
      turnId,
      timestamp: Date.now(),
      payload: { turn },
    });

    // Schedule deterministic sequence (simulated timeline in memory)
    const timerKey = `${threadId}\u0000${turnId}`;
    const scheduleDemoStep = (delayMs: number, action: () => void) => {
      const timers = this.pendingTurnTimers.get(timerKey) ?? new Set<ReturnType<typeof setTimeout>>();
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (timers.size === 0) this.pendingTurnTimers.delete(timerKey);
        if (turn.status !== 'running') return;
        action();
      }, delayMs);
      timers.add(timer);
      this.pendingTurnTimers.set(timerKey, timers);
    };

    scheduleDemoStep(50, () => {
      // Step 1: System Demonstration Guard Banner
      const guardItem: ThreadItem = {
        id: `demo-guard-${Date.now()}`,
        turnId,
        type: 'agent_message',
        actor: { type: 'system', name: 'Demonstration Guard' },
        timestamp: Date.now(),
        text: `Controlled demonstration · Safe offline turn (${requestedModelName}). No external provider requests or host process execution.`,
      };
      turn.items.push(guardItem);
      this.persistThreads([...this.threads]);
      this.emitEvent({
        type: 'worker.message',
        threadId,
        turnId,
        timestamp: Date.now(),
        payload: { item: guardItem },
      });
    });

    scheduleDemoStep(120, () => {
      // Step 2: Tool execution
      const toolItem: ThreadItem = {
        id: `demo-tool-${Date.now()}`,
        turnId,
        type: 'tool_execution',
        actor: { type: 'mediobot', mediobotId: cleanSpec, name: specialistName },
        timestamp: Date.now(),
        tool: {
          toolInvocationId: `inv-${Date.now()}`,
          toolName: 'filesystem.read',
          command: 'filesystem.read src/module.ts',
          status: 'success',
          startedAt: Date.now() - 150,
          durationMs: 150,
          outcomeBadge: 'Controlled demonstration',
          outputLog: `[Controlled demonstration] Analyzed module safely in offline memory.`,
        },
      };
      turn.items.push(toolItem);
      this.persistThreads([...this.threads]);
      this.emitEvent({
        type: 'tool.completed',
        threadId,
        turnId,
        timestamp: Date.now(),
        payload: { item: toolItem },
      });
    });

    scheduleDemoStep(200, () => {
      // Step 3: Verified Diff Review Item
      const diffItem: ThreadItem = {
        id: `demo-diff-${Date.now()}`,
        turnId,
        type: 'diff',
        actor: { type: 'mediobot', mediobotId: cleanSpec, name: specialistName },
        timestamp: Date.now(),
        diff: {
          filePath: 'src/demo-change.ts',
          language: 'typescript',
          additions: 5,
          deletions: 1,
          state: 'verified',
          verificationEvidence: 'Controlled demonstration · Verified by deterministic assertion',
          verifiedBy: 'Simulated assertion',
          isControlledDemonstration: true,
          hunks: [
            {
              header: '@@ -1,4 +1,8 @@',
              oldStart: 1,
              oldLines: 4,
              newStart: 1,
              newLines: 8,
              lines: [
                { type: 'context', content: 'export function run() {', oldLineNo: 1, newLineNo: 1 },
                { type: 'remove', content: '  return false;', oldLineNo: 2 },
                { type: 'add', content: '  // Controlled demonstration logic', newLineNo: 2 },
                { type: 'add', content: '  return true;', newLineNo: 3 },
                { type: 'context', content: '}', oldLineNo: 3, newLineNo: 4 },
              ],
            },
          ],
        },
      };
      turn.items.push(diffItem);
      this.persistThreads([...this.threads]);
      this.emitEvent({
        type: 'diff.created',
        threadId,
        turnId,
        timestamp: Date.now(),
        payload: { item: diffItem },
      });
    });

    scheduleDemoStep(280, () => {
      // Step 4: Assistant Summary & Turn Completion
      const summaryItem: ThreadItem = {
        id: `demo-summary-${Date.now()}`,
        turnId,
        type: 'agent_message',
        actor: { type: 'mediobot', mediobotId: cleanSpec, name: specialistName },
        timestamp: Date.now(),
        text: `Controlled demonstration only for "${prompt}" using the display label ${requestedModelName}. No project files were changed; no provider request or verification command ran.`,
      };
      turn.items.push(summaryItem);
      turn.status = 'completed';
      turn.completedAt = Date.now();
      this.pendingTurnTimers.delete(timerKey);
      this.persistThreads([...this.threads]);
      this.emitEvent({
        type: 'turn.completed',
        threadId,
        turnId,
        timestamp: Date.now(),
        payload: { turn },
      });
    });

    return turnId;
  }

  async cancelTurn(threadId: string, turnId?: string): Promise<void> {
    const thread = this.threads.find((t) => t.id === threadId);
    if (!thread) return;
    const turn = turnId ? thread.turns.find((t) => t.id === turnId) : thread.turns[thread.turns.length - 1];
    if (turn && turn.status === 'running') {
      const timerKey = `${threadId}\u0000${turn.id}`;
      for (const timer of this.pendingTurnTimers.get(timerKey) ?? []) clearTimeout(timer);
      this.pendingTurnTimers.delete(timerKey);
      turn.status = 'cancelled';
      turn.completedAt = Date.now();
      this.persistThreads([...this.threads]);
      this.emitEvent({
        type: 'turn.cancelled',
        threadId,
        turnId: turn.id,
        timestamp: Date.now(),
        payload: { turn },
      });
    }
  }

  async respondToApproval(_turnId: string, _approvalId: string, _approved: boolean): Promise<void> {
    // In-memory no-op for controlled demonstration
  }

  async uploadAttachment(file: { readonly name: string; readonly type: string; readonly base64: string }): Promise<TurnAttachment> {
    return {
      id: `att-demo-${Date.now()}`,
      name: file.name,
      mimeType: file.type,
      size: Math.round(file.base64.length * 0.75),
    };
  }

  async removeAttachment(_id: string): Promise<void> {
    // In-memory no-op
  }

  async getWorkspace(): Promise<{ status: WorkspaceStatus; session: WorkspaceSession | null; uiState: PersistedWorkspaceUIState | null }> {
    return {
      status: 'OPEN',
      session: FIXTURE_DEMO_SESSION,
      uiState: null,
    };
  }

  async openWorkspace(_path?: string): Promise<{ session?: WorkspaceSession; uiState?: PersistedWorkspaceUIState | null; cancelled: boolean }> {
    return {
      session: FIXTURE_DEMO_SESSION,
      uiState: null,
      cancelled: false,
    };
  }

  async closeWorkspace(): Promise<void> {
    // No-op
  }

  async saveUIState(
    _activeFile: string | null,
    _openTabs: Array<{ path: string; name: string }>,
    _expandedPaths: string[],
    _workbenchTabs?: PersistedWorkbenchTab[],
    _activeWorkbenchTabId?: string | null,
    _workspaceId?: string | null
  ): Promise<void> {
    // In-memory state
  }

  private loadIsolatedStorage(): void {
    const storage =
      typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : typeof localStorage !== 'undefined'
        ? localStorage
        : null;
    if (!storage) return;

    try {
      const raw = storage.getItem(FIXTURE_ISOLATED_FILES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.files && typeof parsed.files === 'object') {
          for (const [k, v] of Object.entries(parsed.files)) {
            if (typeof v === 'string') {
              this.isolatedFiles.set(k, v);
            }
          }
        }
        if (Array.isArray(parsed.dynamicEntries)) {
          for (const entry of parsed.dynamicEntries) {
            if (entry && typeof entry.path === 'string') {
              this.dynamicFileEntries.set(entry.path, entry);
            }
          }
        }
        if (Array.isArray(parsed.deletedPaths)) {
          for (const p of parsed.deletedPaths) {
            if (typeof p === 'string') {
              this.deletedPaths.add(p);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[OfflineFixture] Failed to load isolated storage:', e);
      try {
        const raw = storage.getItem(FIXTURE_ISOLATED_FILES_KEY);
        if (raw) {
          storage.setItem(`${FIXTURE_ISOLATED_FILES_KEY}_corrupted_backup_${Date.now()}`, raw);
        }
      } catch {
        // Ignore backup save error
      }
    }
  }

  private persistIsolatedStorage(): void {
    const storage =
      typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : typeof localStorage !== 'undefined'
        ? localStorage
        : null;
    if (!storage) return;

    try {
      const filesObj: Record<string, string> = {};
      for (const [k, v] of this.isolatedFiles.entries()) {
        filesObj[k] = v;
      }
      const dynamicEntries = Array.from(this.dynamicFileEntries.values());
      const deletedPaths = Array.from(this.deletedPaths.values());
      storage.setItem(
        FIXTURE_ISOLATED_FILES_KEY,
        JSON.stringify({ files: filesObj, dynamicEntries, deletedPaths })
      );
    } catch (e) {
      console.warn('[OfflineFixture] Failed to persist isolated storage:', e);
      // Do NOT silently swallow storage errors (e.g. QuotaExceededError or security block).
      // Rethrow storage errors so callers (saveFile) reject cleanly.
      throw e;
    }
  }

  private emitWorkspaceFsEvent(event: Partial<WorkspaceWatchEvent> & { type: 'create' | 'modify' | 'delete'; relativePath: string }): void {
    const fullEvent: WorkspaceWatchEvent = {
      path: event.relativePath,
      relativePath: event.relativePath,
      type: event.type,
      isDirectory: event.isDirectory ?? false,
      timestamp: Date.now(),
      origin: event.origin ?? 'fixture-isolated',
      contentHash: event.contentHash,
    };
    for (const listener of this.workspaceListeners) {
      try {
        listener({ type: 'fs', fsEvents: [fullEvent] });
      } catch (e) {
        console.warn('[OfflineFixture] Error in workspace listener:', e);
      }
    }
  }

  onWorkspaceEvent(listener: WorkspaceListener): () => void {
    this.workspaceListeners.add(listener);
    return () => this.workspaceListeners.delete(listener);
  }

  async listFiles(_projectId: string, _path?: string): Promise<FileNode[]> {
    const baseNodes: FileNode[] = [
      { name: 'src', path: 'src', type: 'folder' },
      { name: 'calculator.ts', path: 'src/calculator.ts', type: 'file' },
      { name: 'README.md', path: 'README.md', type: 'file' },
    ];

    const filtered = baseNodes.filter((node) => !this.deletedPaths.has(node.path));

    for (const entry of this.dynamicFileEntries.values()) {
      if (!this.deletedPaths.has(entry.path) && !filtered.some((n) => n.path === entry.path)) {
        filtered.push({
          name: entry.name,
          path: entry.path,
          type: entry.type,
        });
      }
    }

    return filtered;
  }

  async readFile(projectId: string, path: string): Promise<string> {
    const normalizedPath = path.replace(/^\/+/, '');
    if (this.deletedPaths.has(path) || this.deletedPaths.has(normalizedPath)) {
      throw new Error(`File not found: ${path} (deleted in isolated fixture)`);
    }

    const key = `${projectId}:${normalizedPath}`;
    if (this.simulatedFileStore.has(key)) {
      return this.simulatedFileStore.get(key)!;
    }

    const rawKey = `${projectId}:${path}`;
    if (this.simulatedFileStore.has(rawKey)) {
      return this.simulatedFileStore.get(rawKey)!;
    }

    for (const [k, v] of this.simulatedFileStore.entries()) {
      if (
        k === key ||
        k === rawKey ||
        k === path ||
        k === normalizedPath ||
        k.endsWith(`:${normalizedPath}`) ||
        k.endsWith(`:${path}`)
      ) {
        return v;
      }
    }

    if (path.includes('calculator')) {
      return `// Controlled demonstration file\nexport function calculate(op: string, a: number, b: number): number {\n  switch (op) {\n    case "add": return a + b;\n    case "divide":\n      if (b === 0) throw new Error("Division by zero guard");\n      return a / b;\n    default: throw new Error("Unsupported");\n  }\n}\n`;
    }
    return `# Controlled Demonstration Workspace\n\nThis workspace operates purely in-memory under safe offline fixture constraints.\n`;
  }

  private computeDemoHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `simulated-isolated-sha256-${hex}`;
  }

  async readFileVersioned(projectId: string, path: string): Promise<{ content: string; hash: string }> {
    const content = await this.readFile(projectId, path);
    return { content, hash: this.computeDemoHash(content) };
  }

  async saveFile(projectId: string, path: string, content: string, _expectedHash?: string): Promise<string> {
    // Controlled demonstration: persists ONLY to the isolated in-memory + Web Storage fixture.
    // The host filesystem is NEVER touched. The hash explicitly declares simulated-isolated.
    const normalizedPath = path.replace(/^\/+/, '');
    const key = `${projectId}:${normalizedPath}`;
    const previousContent = this.isolatedFiles.get(key);
    const wasDeleted = this.deletedPaths.has(path) || this.deletedPaths.has(normalizedPath);

    this.isolatedFiles.set(key, content);
    this.deletedPaths.delete(path);
    this.deletedPaths.delete(normalizedPath);

    try {
      this.persistIsolatedStorage();
    } catch (err) {
      // Revert in-memory mutations on persistence failure so state remains consistent
      if (previousContent !== undefined) {
        this.isolatedFiles.set(key, previousContent);
      } else {
        this.isolatedFiles.delete(key);
      }
      if (wasDeleted) {
        this.deletedPaths.add(path);
      }
      throw err;
    }

    const hash = this.computeDemoHash(content);

    this.emitWorkspaceFsEvent({
      type: 'modify',
      relativePath: path,
      origin: 'fixture-isolated',
      contentHash: hash,
    });

    return hash;
  }

  async createFileEntry(projectId: string, parentPath: string, name: string, type: 'file' | 'folder'): Promise<void> {
    const normalizedParent = parentPath ? parentPath.replace(/^\/+|\/+$/g, '') : '';
    const fullPath = normalizedParent ? `${normalizedParent}/${name}` : name;
    this.dynamicFileEntries.set(fullPath, { name, path: fullPath, type });
    this.deletedPaths.delete(fullPath);
    if (type === 'file') {
      const key = `${projectId}:${fullPath}`;
      this.isolatedFiles.set(key, '');
    }
    this.persistIsolatedStorage();
    this.emitWorkspaceFsEvent({
      type: 'create',
      relativePath: fullPath,
      origin: 'fixture-isolated',
    });
  }

  async renameFileEntry(projectId: string, oldPath: string, newName: string): Promise<void> {
    const normalizedOld = oldPath.replace(/^\/+/, '');
    const parts = normalizedOld.split('/');
    parts.pop();
    const parentPath = parts.join('/');
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    const oldKey = `${projectId}:${normalizedOld}`;
    const rawOldKey = `${projectId}:${oldPath}`;
    let content = '';
    if (this.isolatedFiles.has(oldKey)) {
      content = this.isolatedFiles.get(oldKey)!;
      this.isolatedFiles.delete(oldKey);
    } else if (this.isolatedFiles.has(rawOldKey)) {
      content = this.isolatedFiles.get(rawOldKey)!;
      this.isolatedFiles.delete(rawOldKey);
    }
    this.isolatedFiles.set(`${projectId}:${newPath}`, content);
    this.deletedPaths.add(oldPath);
    this.deletedPaths.add(normalizedOld);
    this.deletedPaths.delete(newPath);

    const oldDynamic = this.dynamicFileEntries.get(normalizedOld) || this.dynamicFileEntries.get(oldPath);
    if (oldDynamic) {
      this.dynamicFileEntries.delete(oldPath);
      this.dynamicFileEntries.delete(normalizedOld);
      this.dynamicFileEntries.set(newPath, { name: newName, path: newPath, type: oldDynamic.type });
    } else {
      this.dynamicFileEntries.set(newPath, { name: newName, path: newPath, type: 'file' });
    }

    this.persistIsolatedStorage();
    this.emitWorkspaceFsEvent({
      type: 'create',
      relativePath: newPath,
      origin: 'fixture-isolated',
    });
  }

  async deleteFileEntry(projectId: string, path: string): Promise<void> {
    const normalizedPath = path.replace(/^\/+/, '');
    this.deletedPaths.add(path);
    this.deletedPaths.add(normalizedPath);
    const key = `${projectId}:${normalizedPath}`;
    const rawKey = `${projectId}:${path}`;
    this.isolatedFiles.delete(key);
    this.isolatedFiles.delete(rawKey);
    this.dynamicFileEntries.delete(path);
    this.dynamicFileEntries.delete(normalizedPath);
    this.persistIsolatedStorage();
    this.emitWorkspaceFsEvent({
      type: 'delete',
      relativePath: path,
      origin: 'fixture-isolated',
    });
  }

  async addProject(_path: string): Promise<ProjectInfo> {
    return FIXTURE_DEMO_PROJECT;
  }

  async pickProjectDirectory(_path?: string): Promise<{ project?: ProjectInfo; cancelled: boolean }> {
    return { project: FIXTURE_DEMO_PROJECT, cancelled: false };
  }

  async getConnectedProviders(): Promise<any[]> {
    // A fixture is not a provider connection. Returning a connected demo entry
    // made model pickers and status surfaces imply live inference was available.
    return [];
  }

  async getProviderCatalog(): Promise<any[]> {
    return [];
  }

  async getDefinitions(): Promise<any[]> {
    return [];
  }

  async getTasks(): Promise<RuntimeTaskSummary[]> {
    return [];
  }

  async getSpecialistGroupHistory(_specialistId: string): Promise<RuntimeSpecialistGroupHistory[]> {
    return [];
  }

  async connectProvider(_data: any): Promise<any> {
    return {
      success: false,
      unsupported: true,
      error: 'Provider configuration unsupported in controlled demonstration',
    };
  }

  async disconnectProvider(_id: string): Promise<boolean> {
    return false;
  }

  async toggleProvider(_id: string, _enabled: boolean): Promise<boolean> {
    return false;
  }

  async toggleModel(_providerId: string, _modelId: string, _enabled: boolean): Promise<boolean> {
    return false;
  }

  async getEnabledModels(): Promise<any[]> {
    // Display labels may still appear in the offline demo, but none is an
    // enabled inference model or may be selected as a connected provider.
    return [];
  }

  async updateThreadModel(threadId: string, modelSelection: import('../types').ThreadModelSelection | null, modelName?: string): Promise<void> {
    const next = this.threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            modelSelection: modelSelection ?? undefined,
            model: modelName ?? t.model,
            updatedAt: Date.now(),
          }
        : t
    );
    this.persistThreads(next);
  }
}
