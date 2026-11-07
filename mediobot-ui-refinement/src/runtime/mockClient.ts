import type {
  IMediobotRuntime,
  RuntimeEvent,
  TurnOptions,
  WorkspaceStatus,
  WorkspaceSession,
  PersistedWorkspaceUIState,
  WorkspaceWatchEvent,
  PersistedWorkbenchTab,
} from './types';
import type {
  FileNode,
  ProjectInfo,
  Thread,
  Turn,
  ThreadItem,
  TurnAttachment,
  ProviderConfig,
  CatalogProviderItem,
} from '../types';
import {
  MOCK_SESSION,
  MOCK_PROJECTS,
  MOCK_FILES,
  MOCK_FILE_NODES,
  MOCK_THREADS,
  MOCK_PROVIDERS,
  MOCK_CATALOG,
  MOCK_DEFINITIONS,
} from './mockData.ts';

type Listener = (event: RuntimeEvent) => void;
type WorkspaceListener = (event: {
  type: 'state' | 'fs';
  state?: { status: WorkspaceStatus; session: WorkspaceSession | null };
  fsEvents?: WorkspaceWatchEvent[];
}) => void;

/**
 * MockMediobotRuntime
 *
 * Full in-memory demonstration runtime for the MedioBot V2 Frontend UI.
 * Allows testing and redesigning all UI surfaces (workbench, file explorer,
 * code editor, chat timeline, live execution cards, diff viewers, and settings)
 * without requiring the live Node.js/SQLite MedioBot backend.
 */
export class MockMediobotRuntime implements IMediobotRuntime {
  private readonly listeners = new Set<Listener>();
  private readonly workspaceListeners = new Set<WorkspaceListener>();

  private projects: ProjectInfo[] = [...MOCK_PROJECTS];
  private threads: Thread[] = (() => {
    try {
      const saved = localStorage.getItem('mediobot_mock_threads');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((t) => t.id === 'thread-dashboard-vision') && parsed.some((t) => t.id === 'thread-getting-started-maestro')) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return JSON.parse(JSON.stringify(MOCK_THREADS));
  })();
  private persistThreads(): void {
    try {
      localStorage.setItem('mediobot_mock_threads', JSON.stringify(this.threads));
    } catch {
      // ignore
    }
  }
  private files: Record<string, string> = { ...MOCK_FILES };
  private fileNodes: FileNode[] = JSON.parse(JSON.stringify(MOCK_FILE_NODES));
  private providers: ProviderConfig[] = JSON.parse(JSON.stringify(MOCK_PROVIDERS));
  private session: WorkspaceSession | null = { ...MOCK_SESSION };
  private status: WorkspaceStatus = 'OPEN';
  private uiState: PersistedWorkspaceUIState | null = (() => {
    try {
      const saved = localStorage.getItem('mediobot_runtime_ui_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedTabId = localStorage.getItem('mediobot_active_workbench_tab_id');
        if (savedTabId) {
          parsed.activeWorkbenchTabId = savedTabId;
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    const savedActiveTabId = (() => {
      try {
        return localStorage.getItem('mediobot_active_workbench_tab_id');
      } catch {
        return null;
      }
    })();
    const savedTabs = (() => {
      try {
        const raw = localStorage.getItem('mediobot_workbench_tabs');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
      return null;
    })();

    const initialTabs = savedTabs ?? [
      { id: 'tab-chat-1', kind: 'chat' as const, threadId: 'thread-demo-1', title: 'Fix calculator division by zero defect' },
      { id: 'tab-file-1', kind: 'file' as const, path: 'src/calculator.js', name: 'calculator.js' },
    ];

    return {
      workspaceId: MOCK_SESSION.workspaceId,
      activeFile: 'src/calculator.js',
      openTabs: [{ path: 'src/calculator.js', name: 'calculator.js' }],
      expandedPaths: ['src', 'tests'],
      updatedAt: Date.now(),
      workbenchTabs: initialTabs,
      activeWorkbenchTabId: savedActiveTabId || initialTabs[0]?.id || 'tab-chat-1',
    };
  })();

  setCustomWorkspace(folderName: string, nodes: FileNode[], fileContents?: Record<string, string>): void {
    this.fileNodes = nodes;
    if (fileContents) {
      this.files = { ...this.files, ...fileContents };
    }
    this.session = {
      workspaceId: `workspace-${Date.now()}`,
      canonicalRootPath: `/workspace/${folderName}`,
      displayName: folderName,
      openedAt: Date.now(),
    };
    this.status = 'OPEN';
    this.notifyWorkspaceState();
  }

  private activeSimulationTimeouts: NodeJS.Timeout[] = [];

  getInitialProjects(): ProjectInfo[] {
    return this.projects;
  }

  getInitialThreads(): Thread[] {
    const seen = new Set<string>();
    return this.threads.filter((t) => {
      if (!t.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }

  async getWorkspace(): Promise<{
    status: WorkspaceStatus;
    session: WorkspaceSession | null;
    uiState: PersistedWorkspaceUIState | null;
  }> {
    return {
      status: this.status,
      session: this.session,
      uiState: this.uiState,
    };
  }

  async openWorkspace(path?: string): Promise<{
    session?: WorkspaceSession;
    uiState?: PersistedWorkspaceUIState | null;
    cancelled: boolean;
  }> {
    this.status = 'OPEN';
    const folderName = path ? path.split('/').filter(Boolean).pop() ?? 'project' : 'mediobot-demo';
    this.session = {
      workspaceId: `workspace-${Date.now()}`,
      canonicalRootPath: path ?? '/workspace/mediobot-demo',
      displayName: folderName,
      openedAt: Date.now(),
    };
    this.notifyWorkspaceState();
    return { session: this.session, uiState: this.uiState, cancelled: false };
  }

  async closeWorkspace(): Promise<void> {
    this.status = 'EMPTY';
    this.session = null;
    this.notifyWorkspaceState();
  }

  async saveUIState(
    activeFile: string | null,
    openTabs: Array<{ path: string; name: string }>,
    expandedPaths: string[],
    workbenchTabs?: PersistedWorkbenchTab[],
    activeWorkbenchTabId?: string | null,
    workspaceId?: string | null
  ): Promise<void> {
    if (!this.session) return;
    this.uiState = {
      workspaceId: this.session.workspaceId,
      activeFile,
      openTabs,
      expandedPaths,
      updatedAt: Date.now(),
      workbenchTabs: workbenchTabs ?? [],
      activeWorkbenchTabId: activeWorkbenchTabId ?? null,
    };
    try {
      localStorage.setItem('mediobot_runtime_ui_state', JSON.stringify(this.uiState));
      if (activeWorkbenchTabId) {
        localStorage.setItem('mediobot_active_workbench_tab_id', activeWorkbenchTabId);
      }
    } catch {
      // ignore
    }
  }

  onWorkspaceEvent(listener: WorkspaceListener): () => void {
    this.workspaceListeners.add(listener);
    return () => {
      this.workspaceListeners.delete(listener);
    };
  }

  private notifyWorkspaceState(): void {
    for (const listener of this.workspaceListeners) {
      listener({
        type: 'state',
        state: { status: this.status, session: this.session },
      });
    }
  }

  async loadProjects(): Promise<ProjectInfo[]> {
    return this.projects;
  }

  async loadThreads(_workspaceId?: string | null): Promise<Thread[]> {
    const seen = new Set<string>();
    return this.threads.filter((t) => {
      if (!t.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }

  async loadThread(threadId: string): Promise<Thread> {
    const thread = this.threads.find((t) => t.id === threadId);
    if (!thread) throw new Error("Thread not found");
    return thread;
  }

  async saveThread(thread: Thread): Promise<Thread> {
    const idx = this.threads.findIndex((t) => t.id === thread.id);
    if (idx >= 0) {
      const existing = this.threads[idx]!;
      const turns = thread.turns && thread.turns.length > 0 ? thread.turns : (existing.turns || []);
      this.threads[idx] = { ...existing, ...thread, turns };
    } else {
      this.threads.unshift(thread);
    }
    this.persistThreads();
    return this.threads.find((t) => t.id === thread.id) ?? thread;
  }

  async deleteThread(threadId: string): Promise<void> {
    this.threads = this.threads.filter((t) => t.id !== threadId);
    this.persistThreads();
  }

  async renameThread(threadId: string, title: string): Promise<void> {
    const thread = this.threads.find((t) => t.id === threadId);
    if (thread) {
      thread.title = title;
      this.persistThreads();
    }
  }

  async listFiles(_projectId: string, _path = ''): Promise<FileNode[]> {
    return this.fileNodes;
  }

  async readFile(_projectId: string, path: string): Promise<string> {
    return this.files[path] ?? `// File: ${path}\n// [Mock file content]`;
  }

  async readFileVersioned(projectId: string, path: string): Promise<{ content: string; hash: string }> {
    const content = await this.readFile(projectId, path);
    return { content, hash: `mock-hash-${content.length}` };
  }

  async saveFile(_projectId: string, path: string, content: string, _expectedHash: string): Promise<string> {
    this.files[path] = content;
    return `mock-hash-${content.length}`;
  }

  async createFileEntry(_projectId: string, parentPath: string, name: string, type: 'file' | 'folder'): Promise<void> {
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    if (type === 'file') {
      this.files[fullPath] = `// ${name}\n`;
    }
    const newNode: FileNode = { name, path: fullPath, type, children: type === 'folder' ? [] : undefined };
    this.fileNodes.push(newNode);
  }

  async renameFileEntry(_projectId: string, path: string, name: string): Promise<void> {
    if (this.files[path]) {
      const content = this.files[path];
      delete this.files[path];
      const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      const newPath = dir ? `${dir}/${name}` : name;
      this.files[newPath] = content;
    }
  }

  async deleteFileEntry(_projectId: string, path: string): Promise<void> {
    delete this.files[path];
    this.fileNodes = this.fileNodes.filter((node) => node.path !== path);
  }

  async addProject(projectPath: string): Promise<ProjectInfo> {
    const name = projectPath.split('/').filter(Boolean).pop() ?? 'new-project';
    const project: ProjectInfo = {
      id: `project-${Date.now()}`,
      name,
      path: projectPath,
      branch: 'main',
      branches: ['main'],
      environment: 'Local',
    };
    this.projects.push(project);
    return project;
  }

  async pickProjectDirectory(preferredPath?: string): Promise<{ project?: ProjectInfo; cancelled: boolean }> {
    const proj = await this.addProject(preferredPath ?? '/workspace/new-mock-project');
    return { project: proj, cancelled: false };
  }

  async uploadAttachment(file: { readonly name: string; readonly type: string; readonly base64: string }): Promise<TurnAttachment> {
    return {
      id: `att-${Date.now()}`,
      name: file.name,
      mimeType: file.type,
      size: Math.round(file.base64.length * 0.75),
    };
  }

  async removeAttachment(_id: string): Promise<void> {}

  async respondToApproval(_turnId: string, _approvalId: string, _approved: boolean): Promise<void> {}

  setActiveThreadId(_id: string | null): void {}

  async cancelTurn(threadId: string, turnId?: string, _isExplicit?: boolean): Promise<void> {
    this.clearSimulations();
    this.emitEvent({
      type: 'turn.cancelled',
      threadId,
      turnId: turnId || 'active-turn',
      timestamp: Date.now(),
      payload: { message: 'Turn was cancelled by user.' },
    });
  }

  onEvent(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitEvent(event: RuntimeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Mock runtime listener error:', err);
      }
    }
  }

  private clearSimulations(): void {
    for (const t of this.activeSimulationTimeouts) {
      clearTimeout(t);
    }
    this.activeSimulationTimeouts = [];
  }

  /**
   * Simulates realistic live execution turn with streaming step cards,
   * tool execution cards, verified badges, diff view, and assistant summary.
   */
  async startTurn(
    threadId: string,
    prompt: string,
    options: TurnOptions,
    turnId = `turn-${Date.now()}`
  ): Promise<string> {
    this.clearSimulations();

    let thread = this.threads.find((t) => t.id === threadId);
    if (!thread) {
      thread = {
        id: threadId,
        title: prompt.slice(0, 40) || 'New chat',
        projectId: this.session?.workspaceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: 'Auto',
        branch: 'main',
        approvalMode: 'Approve for me',
        turns: [],
      };
      this.threads.unshift(thread);
    }

    // Ensure the turn exists in thread.turns
    let turn = thread.turns.find((t) => t.id === turnId);
    if (!turn) {
      turn = {
        id: turnId,
        threadId,
        prompt,
        status: 'running',
        currentActivity: 'thinking',
        createdAt: Date.now(),
        items: [
          {
            id: `user-${Date.now()}`,
            turnId,
            type: 'user_message',
            actor: { type: 'user' },
            timestamp: Date.now(),
            text: prompt,
          },
        ],
      };
      thread.turns.push(turn);
    }
    this.persistThreads();

    const targetSpecialistId = options.specialistId || thread.specialistId;
    const cleanSpecialistId = targetSpecialistId
      ? targetSpecialistId.replace(/^(definition-|msg-|turn-)/, '').toLowerCase()
      : '';
    const isSpecialist = Boolean(cleanSpecialistId && cleanSpecialistId !== 'maestro');
    const specialistName = isSpecialist
      ? cleanSpecialistId.charAt(0).toUpperCase() + cleanSpecialistId.slice(1)
      : 'Cody';
    const specialistRole =
      cleanSpecialistId === 'vision'
        ? 'Browser and visual work'
        : cleanSpecialistId === 'research'
        ? 'Web research'
        : cleanSpecialistId === 'doc'
        ? 'Documentation intelligence'
        : cleanSpecialistId === 'tester'
        ? 'Independent verification'
        : cleanSpecialistId === 'deployer'
        ? 'Deployment'
        : 'Software engineering';

    const schedule = (ms: number, fn: () => void) => {
      const timer = setTimeout(fn, ms);
      this.activeSimulationTimeouts.push(timer);
    };

    const addTurnItem = (item: ThreadItem) => {
      const current = this.threads.find((t) => t.id === threadId);
      const t = current?.turns.find((x) => x.id === turnId);
      if (t) {
        const idx = t.items.findIndex((it) => it.id === item.id);
        if (idx >= 0) {
          t.items[idx] = { ...t.items[idx]!, ...item };
        } else {
          t.items.push(item);
        }
      }
      this.persistThreads();
    };

    // Step 1 (200ms): Orchestration / Initial specialist acknowledgment with selected Gemini Model
    const activeModelName = options.model && options.model !== 'Auto' && options.model !== 'No configured model'
      ? options.model
      : 'Gemini 3.6 Flash';

    const isCodeTask = /\b(code|fix|test|edit|calculator|bug|build|file|create|divide|add|subtract|multiply|script|run|refactor|function|class)\b/i.test(prompt);

    // Call real server-side Gemini endpoint via @google/genai with timeout guard
    const executePromise = (async () => {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 7000) : null;
        const res = await fetch('/api/gemini/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller?.signal,
          body: JSON.stringify({
            prompt,
            modelId:
              options.modelSelection?.modelId === 'deepseek-v4.1-flash' ||
              activeModelName.toLowerCase().includes('deepseek')
                ? 'deepseek-v4.1-flash'
                : (options.modelSelection?.modelId || 'gemini-3.6-flash'),
            modelName: activeModelName,
            specialistId: cleanSpecialistId || 'maestro',
          }),
        });
        if (timer) clearTimeout(timer);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('Could not call /api/gemini/execute:', err);
      }
      return null;
    })();

    // Run the execution pipeline sequentially and await Gemini API response before completion
    (async () => {
      // Step 1: Initial acknowledgment
      await new Promise((resolve) => setTimeout(resolve, 100));
      const item: ThreadItem = isSpecialist
        ? {
            id: `msg-${cleanSpecialistId}-${Date.now()}`,
            turnId,
            type: 'agent_message',
            actor: { type: 'mediobot', mediobotId: cleanSpecialistId, presentationId: cleanSpecialistId, name: specialistName, role: specialistRole },
            timestamp: Date.now(),
            text: isCodeTask
              ? `Analyzing request: "${prompt}" using **${activeModelName}** on **dummy-project**.`
              : `Responding using **${activeModelName}**...`,
          }
        : {
            id: `msg-maestro-${Date.now()}`,
            turnId,
            type: 'agent_message',
            actor: { type: 'mediobot', name: 'Maestro', role: 'Team orchestration' },
            timestamp: Date.now(),
            text: isCodeTask
              ? `Using **${activeModelName}** to coordinate request: "${prompt}". Delegating execution to **${specialistName}** against **dummy-project**.`
              : `Using **${activeModelName}** to answer request.`,
          };

      addTurnItem(item);
      this.emitEvent({
        type: 'agent.progress',
        threadId,
        turnId,
        timestamp: Date.now(),
        payload: { item, activityState: 'inspecting' },
      });

      if (isCodeTask) {
        // Step 2: Activity
        await new Promise((resolve) => setTimeout(resolve, 250));
        const actItem: ThreadItem = {
          id: `act-1-${Date.now()}`,
          turnId,
          type: 'activity',
          actor: { type: 'mediobot', name: specialistName, role: specialistRole },
          timestamp: Date.now(),
          activityState: 'inspecting',
          activityLabel: `${specialistName} inspecting dummy-project files`,
          text: `${specialistName} inspected dummy-project/src/calculator.js`,
        };
        addTurnItem(actItem);
        this.emitEvent({
          type: 'agent.progress',
          threadId,
          turnId,
          timestamp: Date.now(),
          payload: { item: actItem },
        });

        // Step 3: Tool started & completed
        await new Promise((resolve) => setTimeout(resolve, 250));
        const toolName =
          targetSpecialistId === 'vision'
            ? 'vision.perceive'
            : targetSpecialistId === 'research'
            ? 'web.search'
            : 'filesystem.read';
        const command =
          targetSpecialistId === 'vision'
            ? 'vision.perceive viewport --scan-dom'
            : targetSpecialistId === 'research'
            ? `web.search "${prompt.slice(0, 30)}"`
            : 'filesystem.read dummy-project/src/calculator.js';

        const completedToolItem: ThreadItem = {
          id: `tool-step-${Date.now()}`,
          turnId,
          type: 'tool_execution',
          actor: { type: 'mediobot', name: specialistName, role: specialistRole },
          timestamp: Date.now(),
          text: command,
          tool: {
            toolName,
            command,
            status: 'success',
            startedAt: Date.now() - 300,
            durationMs: 300,
            outcomeBadge: 'success',
            outputLog: 'Analyzed dummy-project/src/calculator.js (28 lines). AST valid.',
          },
        };
        addTurnItem(completedToolItem);
        this.emitEvent({
          type: 'tool.completed',
          threadId,
          turnId,
          timestamp: Date.now(),
          payload: { item: completedToolItem },
        });
      }

      // Await real Gemini execution from server
      const apiResult = await executePromise;

      if (isCodeTask && apiResult?.diff) {
        const diffItem: ThreadItem = {
          id: `diff-${Date.now()}`,
          turnId,
          type: 'diff',
          actor: { type: 'mediobot', name: specialistName, role: specialistRole },
          timestamp: Date.now(),
          diff: apiResult.diff,
        };
        addTurnItem(diffItem);
        this.emitEvent({
          type: 'diff.created',
          threadId,
          turnId,
          timestamp: Date.now(),
          payload: { item: diffItem },
        });

        const testItem: ThreadItem = {
          id: `tool-test-${Date.now()}`,
          turnId,
          type: 'tool_execution',
          actor: { type: 'mediobot', name: specialistName, role: specialistRole },
          timestamp: Date.now(),
          text: 'terminal.execute node --test tests/calculator.test.js',
          tool: {
            toolName: 'terminal.execute',
            command: 'node --test tests/calculator.test.js',
            status: 'success',
            startedAt: Date.now() - 300,
            durationMs: 300,
            isVerification: true,
            verificationStatus: 'command-succeeded',
            outcomeBadge: '✓ verified (exit 0)',
            outputLog:
              '✔ calculator arithmetic operations (1.4ms)\n✔ divide by zero guard passed (0.6ms)\n\nℹ tests 2\nℹ suites 0\nℹ pass 2\nℹ fail 0\nℹ duration_ms 46.2',
          },
        };
        addTurnItem(testItem);
        this.emitEvent({
          type: 'tool.completed',
          threadId,
          turnId,
          timestamp: Date.now(),
          payload: { item: testItem },
        });
      }

      // Final Step: Assistant response message with Gemini AI content
      const responseText = apiResult?.content ||
        `Hello! I am ${specialistName}, the ${specialistRole} specialist in the Mediobot multi-agent framework. How can I assist you with your project today?`;

      const responseItem: ThreadItem = {
        id: `msg-resp-${cleanSpecialistId || 'specialist'}-${Date.now()}`,
        turnId,
        type: 'agent_message',
        actor: { type: 'mediobot', mediobotId: cleanSpecialistId, presentationId: cleanSpecialistId, name: specialistName, role: specialistRole },
        timestamp: Date.now(),
        text: responseText,
      };
      addTurnItem(responseItem);
      this.emitEvent({
        type: 'agent.progress',
        threadId,
        turnId,
        timestamp: Date.now(),
        payload: { item: responseItem },
      });

      // Complete turn ONLY AFTER response message has been emitted
      const current = this.threads.find((t) => t.id === threadId);
      const t = current?.turns.find((x) => x.id === turnId);
      if (t) {
        t.status = 'completed';
        t.completedAt = Date.now();
      }
      this.persistThreads();
      this.emitEvent({
        type: 'turn.completed',
        threadId,
        turnId,
        timestamp: Date.now(),
        payload: { summary: 'Turn completed successfully' },
      });
    })();

    return turnId;
  }

  // Provider & Model management methods
  async getProviders(): Promise<ProviderConfig[]> {
    return this.providers;
  }

  async getCatalog(): Promise<CatalogProviderItem[]> {
    return MOCK_CATALOG;
  }

  async getEnabledModels(): Promise<any[]> {
    const list: any[] = [];
    for (const p of this.providers) {
      if (p.connected && p.enabled) {
        for (const m of p.models) {
          if (m.enabled) {
            list.push({
              id: m.id,
              name: m.name,
              providerId: p.id,
              providerName: p.name,
              badge: p.badge,
              tag: m.tag,
              description: m.description,
            });
          }
        }
      }
    }
    return list;
  }

  async getConnectedProviders(): Promise<any[]> {
    return this.providers;
  }

  async getProviderCatalog(): Promise<any[]> {
    return MOCK_CATALOG;
  }

  async getDefinitions(): Promise<any[]> {
    return MOCK_DEFINITIONS;
  }

  async getTasks(): Promise<[]> { return []; }

  async getSpecialistGroupHistory(_specialistId: string): Promise<[]> { return []; }

  async toggleProvider(providerId: string, enabled: boolean): Promise<boolean> {
    return this.toggleProviderEnabled(providerId, enabled);
  }

  async toggleModel(providerId: string, modelId: string, enabled: boolean): Promise<boolean> {
    return this.toggleModelEnabled(providerId, modelId, enabled);
  }

  async toggleProviderEnabled(providerId: string, enabled: boolean): Promise<boolean> {
    const p = this.providers.find((prov) => prov.id === providerId);
    if (p) {
      p.enabled = enabled;
      return true;
    }
    return false;
  }

  async toggleModelEnabled(providerId: string, modelId: string, enabled: boolean): Promise<boolean> {
    const p = this.providers.find((prov) => prov.id === providerId);
    if (p) {
      const m = p.models.find((mod) => mod.id === modelId);
      if (m) {
        m.enabled = enabled;
        return true;
      }
    }
    return false;
  }

  async connectProvider(config: Record<string, unknown>): Promise<ProviderConfig> {
    const id = String(config.providerId || config.id || `custom-${Date.now()}`);
    const name = String(config.name || id);
    const existing = this.providers.find((p) => p.id === id);
    if (existing) {
      existing.connected = true;
      existing.enabled = true;
      return existing;
    }
    const newProv: ProviderConfig = {
      id,
      name,
      type: 'custom',
      iconType: 'custom',
      connected: true,
      enabled: true,
      baseUrl: typeof config.baseUrl === 'string' ? config.baseUrl : undefined,
      models: [{ id: `${id}-model`, name: `${name} Model`, enabled: true }],
    };
    this.providers.push(newProv);
    return newProv;
  }

  async disconnectProvider(providerId: string): Promise<boolean> {
    const p = this.providers.find((prov) => prov.id === providerId);
    if (p) {
      p.connected = false;
      p.enabled = false;
      return true;
    }
    return false;
  }

  async updateThreadModel(threadId: string, modelSelection: import('../types').ThreadModelSelection | null, modelName?: string): Promise<void> {
    const t = this.threads.find((th) => th.id === threadId);
    if (t) {
      t.modelSelection = modelSelection ?? undefined;
      if (modelName) t.model = modelName;
    }
  }
}
