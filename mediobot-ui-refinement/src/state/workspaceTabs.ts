import type { Thread, WorkbenchTab } from '../types/index.ts';
import type { PersistedWorkspaceUIState } from '../runtime/types.ts';

/** Restore only the active backend workspace's durable tabs, never a global cache. */
export function restoreWorkspaceTabs(state: PersistedWorkspaceUIState | null | undefined,
  threads: readonly Thread[], workspaceId: string): { tabs: WorkbenchTab[]; activeId: string | null } {
  if (!state || state.workspaceId !== workspaceId) return { tabs: [], activeId: null };
  const tabs: WorkbenchTab[] = [];
  const seen = new Set<string>();
  const candidates = state.workbenchTabs?.length ? state.workbenchTabs : state.openTabs.map(tab => ({ ...tab, kind: 'file' as const }));
  for (const tab of candidates) {
    if (tab.kind === 'file' && typeof tab.path === 'string') {
      const filePath = tab.path.replace(/\\/g, '/');
      if (!filePath || filePath.startsWith('/') || /^[a-z]:/i.test(filePath)
        || filePath.split('/').some(part => part === '..' || part === '.' || !part)) continue;
      const id = `file:${filePath}`;
      if (seen.has(id)) continue;
      seen.add(id);
      tabs.push({ id, kind: 'file', path: filePath, name: tab.name || filePath.split('/').pop()! });
    } else if (tab.kind === 'chat' && tab.threadId) {
      const thread = threads.find(thread => thread.id === tab.threadId && thread.projectId === workspaceId);
      if (!thread) continue;
      const id = `chat:${thread.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      tabs.push({ id, kind: 'chat', threadId: thread.id, title: thread.title });
    }
  }
  const desired = state.activeWorkbenchTabId ?? (state.activeFile ? `file:${state.activeFile.replace(/\\/g, '/')}` : null);
  return { tabs, activeId: tabs.find(tab => tab.id === desired)?.id ?? tabs[0]?.id ?? null };
}
