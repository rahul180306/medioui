/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Challenger 1 Adversarial Stress Test Suite
 * Concurrency, Cross-Team Isolation, and Storage Failure Injections
 *
 * Targets:
 * 1. Main/Maestro Concurrency: Parallel calls to resolveAssociatedMaestroThread.
 *    Assert zero duplicate Maestro threads under sync storm & async delay.
 * 2. Cross-Team Isolation: Select Maestro in Team Beta with no active Main.
 *    Assert Team Alpha's Main is NEVER selected or leaked.
 * 3. Storage Failure Injections:
 *    - Inject QuotaExceededError during saveThreadsAtomic; assert rollback & banner.
 *    - Inject corrupted JSON and invalid schemas into validatePersistedThreads.
 *    - Injected storage corruption recovery on initialization.
 */

import { register } from 'node:module';
// Register custom CSS stub loader to handle raw .css imports in ESM
register(new URL('./css-loader.mjs', import.meta.url));

import { test, describe, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

let AppProvider: any;
let useApp: any;
let ThreadView: any;
let OfflineFixtureRuntime: any;
let runtimeInstance: any;

function setupJSDOM() {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
    }
  );

  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = dom.window as any;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
  });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement;
  globalThis.HTMLInputElement = dom.window.HTMLInputElement;
  globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
  globalThis.HTMLDetailsElement = dom.window.HTMLDetailsElement;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.sessionStorage = dom.window.sessionStorage;
  globalThis.MouseEvent = dom.window.MouseEvent;
  globalThis.KeyboardEvent = dom.window.KeyboardEvent;
  globalThis.Event = dom.window.Event;
  globalThis.CustomEvent = dom.window.CustomEvent;

  dom.window.fetch = globalThis.fetch ? globalThis.fetch.bind(globalThis) : ((() => Promise.resolve(new Response('{}'))) as any);
  globalThis.fetch = dom.window.fetch;
  delete (dom.window.document as any).documentMode;
  if (globalThis.document) delete (globalThis.document as any).documentMode;
  (dom.window.Element.prototype as any).attachEvent = () => {};
  (dom.window.HTMLElement.prototype as any).attachEvent = () => {};
  dom.window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as any;

  dom.window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;

  dom.window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;

  dom.window.scrollTo = () => {};
  (dom.window.HTMLElement.prototype as any).scrollIntoView = () => {};
  (dom.window.HTMLElement.prototype as any).scrollTo = () => {};
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as any;
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
  dom.window.requestAnimationFrame = globalThis.requestAnimationFrame;
  dom.window.cancelAnimationFrame = globalThis.cancelAnimationFrame;

  return dom;
}

describe('Challenger 1 Adversarial Stress Suite', () => {
  let dom: JSDOM;
  let container: HTMLElement;
  let root: Root;

  before(async () => {
    dom = setupJSDOM();
    container = dom.window.document.getElementById('root')!;

    const appStateModule = await import('../mediobot-ui-refinement/src/state/AppContext.js');
    AppProvider = appStateModule.AppProvider;
    useApp = appStateModule.useApp;

    const threadViewModule = await import('../mediobot-ui-refinement/src/features/threads/ThreadView.js');
    ThreadView = threadViewModule.ThreadView;

    const fixtureModule = await import('../mediobot-ui-refinement/src/runtime/offlineFixture.js');
    OfflineFixtureRuntime = fixtureModule.OfflineFixtureRuntime;

    const clientModule = await import('../mediobot-ui-refinement/src/runtime/client.js');
    runtimeInstance = clientModule.runtimeInstance;
  });

  beforeEach(() => {
    container.innerHTML = '';
    root = createRoot(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
  });

  // ==========================================================================
  // SECTION 1: CONCURRENCY STRESS TESTS
  // ==========================================================================

  test('1.1 Concurrency: Synchronous storm of 50 parallel resolve calls on an UNASSOCIATED Main thread creates exactly 1 Maestro', async () => {
    let appHook: any = null;

    const Harness: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', { id: 'ready' }, 'ready');
    };

    await act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(Harness)));
    });

    assert.ok(appHook);

    // Create an unassociated Main thread in Team Alpha
    const unassociatedMainId = `thread-test-main-sync-${Date.now()}`;
    const unassociatedMain = {
      id: unassociatedMainId,
      teamId: 'team-alpha-01',
      title: 'Unassociated Main Sync Storm',
      projectId: 'fixture-project-offline',
      ownerAgent: 'team',
      threadType: 'team',
      assignedSpecialists: [],
      mode: 'connected_main',
      agentScope: 'team',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: 'Claude 3.7 Sonnet',
      branch: 'main',
      approvalMode: 'Approve for me',
      turns: [],
    };

    // Save and add to app threads
    await act(async () => {
      await runtimeInstance.saveThread(unassociatedMain);
      await appHook.reloadThreads();
    });

    // Verify main thread exists and has no associated Maestro
    const mainBefore = appHook.threads.find((t: any) => t.id === unassociatedMainId);
    assert.ok(mainBefore, 'Main thread must be registered');
    assert.equal(mainBefore.associatedMaestroThreadId, undefined);

    // Launch 50 synchronous parallel calls to resolveAssociatedMaestroThread in the same tick
    const results: any[] = [];
    await act(async () => {
      for (let i = 0; i < 50; i++) {
        results.push(appHook.resolveAssociatedMaestroThread(unassociatedMainId));
      }
    });

    // Assert: Every call returned a non-null thread
    assert.equal(results.length, 50);
    assert.ok(results.every((r) => r !== null && typeof r === 'object'));

    // Assert: All 50 calls returned the exact same Maestro thread ID
    const firstMaestroId = results[0].id;
    assert.ok(firstMaestroId.startsWith('thread-maestro-'));
    assert.ok(results.every((r) => r.id === firstMaestroId), 'All 50 calls must return identical Maestro thread ID');

    // Assert: Exactly ONE Maestro thread exists in appHook.threads for this Main thread
    const maestroThreadsInStore = appHook.threads.filter(
      (t: any) => t.threadType === 'mind' && t.ownerAgent === 'maestro' && t.originatingMainThreadId === unassociatedMainId
    );
    assert.equal(maestroThreadsInStore.length, 1, 'ZERO duplicate Maestro threads must exist in store');
    assert.equal(maestroThreadsInStore[0].id, firstMaestroId);

    // Assert: The Main thread links back to this Maestro thread
    const mainAfter = appHook.threads.find((t: any) => t.id === unassociatedMainId);
    assert.equal(mainAfter.associatedMaestroThreadId, firstMaestroId);
  });

  test('1.2 Concurrency: Asynchronous race condition with artificially delayed saveThreadsAtomic produces ZERO duplicates', async () => {
    let appHook: any = null;

    const Harness: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', { id: 'ready' }, 'ready');
    };

    await act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(Harness)));
    });

    assert.ok(appHook);

    // Create an unassociated Main thread
    const asyncMainId = `thread-test-main-async-${Date.now()}`;
    const asyncMain = {
      id: asyncMainId,
      teamId: 'team-alpha-01',
      title: 'Unassociated Main Async Race',
      projectId: 'fixture-project-offline',
      ownerAgent: 'team',
      threadType: 'team',
      assignedSpecialists: [],
      mode: 'connected_main',
      agentScope: 'team',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: 'Claude 3.7 Sonnet',
      branch: 'main',
      approvalMode: 'Approve for me',
      turns: [],
    };

    await act(async () => {
      await runtimeInstance.saveThread(asyncMain);
      await appHook.reloadThreads();
    });

    // Intercept saveThreadsAtomic to inject an artificial 35ms asynchronous delay
    const originalSaveThreadsAtomic = runtimeInstance.saveThreadsAtomic;
    let saveCallCount = 0;
    (runtimeInstance as any).saveThreadsAtomic = async (threads: any[]) => {
      saveCallCount++;
      await new Promise((resolve) => setTimeout(resolve, 35));
      return originalSaveThreadsAtomic.call(runtimeInstance, threads);
    };

    try {
      const asyncResults: any[] = [];

      // Fire 20 asynchronous calls across several microtask ticks while the 35ms save is pending
      await act(async () => {
        // First wave (tick 0)
        asyncResults.push(appHook.resolveAssociatedMaestroThread(asyncMainId));
        asyncResults.push(appHook.resolveAssociatedMaestroThread(asyncMainId));

        // Second wave after 5ms
        await new Promise((resolve) => setTimeout(resolve, 5));
        asyncResults.push(appHook.resolveAssociatedMaestroThread(asyncMainId));
        asyncResults.push(appHook.resolveAssociatedMaestroThread(asyncMainId));

        // Third wave after 10ms
        await new Promise((resolve) => setTimeout(resolve, 10));
        for (let i = 0; i < 10; i++) {
          asyncResults.push(appHook.resolveAssociatedMaestroThread(asyncMainId));
        }

        // Fourth wave after save settles (40ms)
        await new Promise((resolve) => setTimeout(resolve, 30));
        asyncResults.push(appHook.resolveAssociatedMaestroThread(asyncMainId));
      });

      // Assert: All waves got a valid Maestro thread with identical ID
      assert.ok(asyncResults.length >= 15);
      const expectedId = asyncResults[0].id;
      assert.ok(expectedId);
      for (const res of asyncResults) {
        assert.equal(res.id, expectedId, 'All async resolution waves must receive the identical Maestro thread');
      }

      // Assert: Store contains strictly ONE Maestro thread for this Main thread
      const matchingMaestros = appHook.threads.filter(
        (t: any) => t.originatingMainThreadId === asyncMainId
      );
      assert.equal(matchingMaestros.length, 1, 'Store must contain exactly 1 Maestro thread without duplicates');
      assert.equal(matchingMaestros[0].id, expectedId);
    } finally {
      (runtimeInstance as any).saveThreadsAtomic = originalSaveThreadsAtomic;
    }
  });

  test('1.3 Concurrency: Simultaneous resolution across 3 distinct Main threads maintains strict 1:1 isolation', async () => {
    let appHook: any = null;

    const Harness: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', { id: 'ready' }, 'ready');
    };

    await act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(Harness)));
    });

    const now = Date.now();
    const mainA = {
      id: `main-A-${now}`,
      teamId: 'team-alpha-01',
      title: 'Main A',
      projectId: 'fixture-project-offline',
      ownerAgent: 'team',
      threadType: 'team',
      assignedSpecialists: [],
      mode: 'connected_main',
      agentScope: 'team',
      createdAt: now,
      updatedAt: now,
      model: 'Claude 3.7 Sonnet',
      branch: 'main',
      approvalMode: 'Approve for me',
      turns: [],
    };
    const mainB = {
      id: `main-B-${now}`,
      teamId: 'team-alpha-01',
      title: 'Main B',
      projectId: 'fixture-project-offline',
      ownerAgent: 'team',
      threadType: 'team',
      assignedSpecialists: [],
      mode: 'connected_main',
      agentScope: 'team',
      createdAt: now,
      updatedAt: now,
      model: 'Claude 3.7 Sonnet',
      branch: 'main',
      approvalMode: 'Approve for me',
      turns: [],
    };
    const mainC = {
      id: `main-C-${now}`,
      teamId: 'team-alpha-01',
      title: 'Main C',
      projectId: 'fixture-project-offline',
      ownerAgent: 'team',
      threadType: 'team',
      assignedSpecialists: [],
      mode: 'connected_main',
      agentScope: 'team',
      createdAt: now,
      updatedAt: now,
      model: 'Claude 3.7 Sonnet',
      branch: 'main',
      approvalMode: 'Approve for me',
      turns: [],
    };

    await act(async () => {
      await runtimeInstance.saveThreadsAtomic([mainA, mainB, mainC]);
      await appHook.reloadThreads();
    });

    let maestroA: any = null;
    let maestroB: any = null;
    let maestroC: any = null;

    await act(async () => {
      maestroA = appHook.resolveAssociatedMaestroThread(mainA.id);
      maestroB = appHook.resolveAssociatedMaestroThread(mainB.id);
      maestroC = appHook.resolveAssociatedMaestroThread(mainC.id);
    });

    assert.ok(maestroA && maestroB && maestroC);
    // Assert: All 3 Maestro threads have distinct IDs
    assert.notEqual(maestroA.id, maestroB.id);
    assert.notEqual(maestroB.id, maestroC.id);
    assert.notEqual(maestroA.id, maestroC.id);

    // Assert: Originating links are 1:1
    assert.equal(maestroA.originatingMainThreadId, mainA.id);
    assert.equal(maestroB.originatingMainThreadId, mainB.id);
    assert.equal(maestroC.originatingMainThreadId, mainC.id);

    // Assert: Main threads link back properly
    const updatedA = appHook.threads.find((t: any) => t.id === mainA.id);
    const updatedB = appHook.threads.find((t: any) => t.id === mainB.id);
    const updatedC = appHook.threads.find((t: any) => t.id === mainC.id);
    assert.equal(updatedA.associatedMaestroThreadId, maestroA.id);
    assert.equal(updatedB.associatedMaestroThreadId, maestroB.id);
    assert.equal(updatedC.associatedMaestroThreadId, maestroC.id);
  });

  test('1.4 Concurrency: Interleaved selectAgent(maestro) and direct resolveAssociatedMaestroThread produces ZERO duplicate tabs or threads', async () => {
    let appHook: any = null;

    const Harness: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', { id: 'ready' }, 'ready');
    };

    await act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(Harness)));
    });

    const unassociatedMain = {
      id: `main-interleaved-${Date.now()}`,
      teamId: 'team-alpha-01',
      title: 'Interleaved Concurrency Main',
      projectId: 'fixture-project-offline',
      ownerAgent: 'team',
      threadType: 'team',
      assignedSpecialists: [],
      mode: 'connected_main',
      agentScope: 'team',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: 'Claude 3.7 Sonnet',
      branch: 'main',
      approvalMode: 'Approve for me',
      turns: [],
    };

    await act(async () => {
      await runtimeInstance.saveThread(unassociatedMain);
      await appHook.reloadThreads();
      appHook.openChatTab(unassociatedMain.id);
    });

    // Fire selectAgent('maestro') and direct resolveAssociatedMaestroThread concurrently
    let directResolveResult: any = null;
    await act(async () => {
      directResolveResult = appHook.resolveAssociatedMaestroThread(unassociatedMain.id);
      appHook.selectAgent('maestro');
    });

    assert.ok(directResolveResult);
    // Assert exactly 1 Maestro thread in store
    const maestros = appHook.threads.filter(
      (t: any) => t.originatingMainThreadId === unassociatedMain.id
    );
    assert.equal(maestros.length, 1, 'Exactly one Maestro thread created');
    assert.equal(maestros[0].id, directResolveResult.id);

    // Assert active tab is the maestro tab
    assert.equal(appHook.activeThreadId, directResolveResult.id);

    // Assert no duplicate workbench tabs exist for the same Maestro chat
    const maestroTabs = appHook.workbenchTabs.filter(
      (tab: any) => tab.threadId === directResolveResult.id
    );
    assert.equal(maestroTabs.length, 1, 'Only one workbench tab must exist for the resolved Maestro');
  });

  // ==========================================================================
  // SECTION 2: CROSS-TEAM ISOLATION STRESS TESTS
  // ==========================================================================

  test('2.1 Cross-Team Isolation: Selecting Maestro in Team Beta with NO active Main NEVER selects Team Alpha Main', async () => {
    let appHook: any = null;

    const Harness: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', { id: 'ready' }, `Active: ${appHook.activeTeamId}`);
    };

    await act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(Harness)));
    });

    assert.ok(appHook);

    // Initial state: in Team Alpha
    assert.equal(appHook.activeTeamId, 'team-alpha-01');
    const alphaMain = appHook.threads.find((t: any) => t.id === 'thread-alpha-main-01')!;
    assert.ok(alphaMain, 'Team Alpha Main must exist');

    // Switch active chat tab to Team Alpha Main
    await act(async () => {
      appHook.openChatTab(alphaMain.id);
    });
    assert.equal(appHook.activeThreadId, alphaMain.id);

    // Define a new team 'team-beta-empty' which has ZERO threads in the store
    const emptyTeamId = `team-beta-empty-${Date.now()}`;

    // Switch to empty Team Beta
    await act(async () => {
      appHook.setActiveTeamId(emptyTeamId);
    });
    assert.equal(appHook.activeTeamId, emptyTeamId);

    // Trigger selectAgent('maestro') in empty Team Beta
    await act(async () => {
      appHook.selectAgent('maestro');
    });

    // Verification:
    // 1. The active thread must NOT be Team Alpha's Main
    assert.notEqual(
      appHook.activeThreadId,
      alphaMain.id,
      'CRITICAL: Selecting Maestro in Team Beta with no active Main must NEVER select Team Alpha Main'
    );

    // 2. The active thread must belong to Team Beta
    assert.ok(appHook.activeThread, 'An active thread must be resolved');
    assert.equal(
      appHook.activeThread.teamId,
      emptyTeamId,
      'Resolved thread must be strictly scoped to Team Beta'
    );
    assert.notEqual(
      appHook.activeThread.teamId,
      'team-alpha-01',
      'CRITICAL: Resolved thread must not have Team Alpha teamId'
    );

    // 3. Team Alpha's threads were not modified or associated with Team Beta
    const freshAlphaMain = appHook.threads.find((t: any) => t.id === alphaMain.id);
    assert.equal(freshAlphaMain.teamId, 'team-alpha-01');
    assert.notEqual(freshAlphaMain.associatedMaestroThreadId, appHook.activeThread.id);
  });

  test('2.2 Cross-Team Isolation: Selecting specialist in Team Beta NEVER returns Team Alpha specialist direct chat', async () => {
    let appHook: any = null;

    const Harness: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', { id: 'ready' }, `Active: ${appHook.activeTeamId}`);
    };

    await act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(Harness)));
    });

    assert.ok(appHook);

    // Cody exists in Team Alpha (thread-alpha-cody-01), but NOT in Team Beta (team-beta-02)
    const alphaCody = appHook.threads.find(
      (t: any) => t.teamId === 'team-alpha-01' && t.ownerAgent === 'cody'
    );
    assert.ok(alphaCody, 'Cody thread must exist in Team Alpha');

    // Switch to Team Beta
    await act(async () => {
      appHook.setActiveTeamId('team-beta-02');
    });
    assert.equal(appHook.activeTeamId, 'team-beta-02');

    // Call selectAgent('cody') while active in Team Beta
    await act(async () => {
      appHook.selectAgent('cody');
    });

    // Assert: activeThread is NOT Team Alpha's Cody thread
    assert.notEqual(
      appHook.activeThreadId,
      alphaCody.id,
      'Selecting Cody in Team Beta must NEVER return Team Alpha Cody thread'
    );
    assert.equal(
      appHook.activeThread?.teamId,
      'team-beta-02',
      'New Cody thread must be strictly scoped to Team Beta'
    );
  });

  test('2.3 Cross-Team Isolation: Tab restoration faithfully updates team context without cross-team pollution', async () => {
    let appHook: any = null;

    const Harness: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', { id: 'ready' }, `Active: ${appHook.activeTeamId}`);
    };

    await act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(Harness)));
    });

    // Open Team Alpha Main
    await act(async () => {
      appHook.openChatTab('thread-alpha-main-01');
    });
    assert.equal(appHook.activeTeamId, 'team-alpha-01');

    // Open Team Beta Main
    await act(async () => {
      appHook.openChatTab('thread-beta-main-01');
    });
    assert.equal(appHook.activeTeamId, 'team-beta-02');

    // Switch back to Team Alpha tab
    await act(async () => {
      appHook.openChatTab('thread-alpha-main-01');
    });
    assert.equal(appHook.activeTeamId, 'team-alpha-01');
    assert.equal(appHook.activeThread?.teamId, 'team-alpha-01');
  });

  test('2.4 Cross-Team Isolation: Rapid multi-team switching before selectAgent strictly respects the final active team', async () => {
    let appHook: any = null;

    const Harness: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', { id: 'ready' }, `Active: ${appHook.activeTeamId}`);
    };

    await act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(Harness)));
    });

    const gammaTeamId = `team-gamma-${Date.now()}`;

    // Rapid sequential team switching
    await act(async () => {
      appHook.setActiveTeamId('team-alpha-01');
      appHook.setActiveTeamId('team-beta-02');
      appHook.setActiveTeamId(gammaTeamId);
    });

    assert.equal(appHook.activeTeamId, gammaTeamId);

    // Call selectAgent('maestro') in gamma
    await act(async () => {
      appHook.selectAgent('maestro');
    });

    // Assert: Thread created is strictly for gammaTeamId
    assert.ok(appHook.activeThread);
    assert.equal(appHook.activeThread.teamId, gammaTeamId);
    assert.notEqual(appHook.activeThread.teamId, 'team-alpha-01');
    assert.notEqual(appHook.activeThread.teamId, 'team-beta-02');
  });

  // ==========================================================================
  // SECTION 3: STORAGE FAILURE INJECTIONS & VALIDATION ROBUSTNESS
  // ==========================================================================

  test('3.1 Storage Failure: Injected QuotaExceededError during saveThreadsAtomic rolls back React state and displays error banner', async () => {
    let appHook: any = null;

    const Harness: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', null,
        React.createElement(ThreadView)
      );
    };

    await act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(Harness)));
    });

    assert.ok(appHook);

    // Set active thread to thread-alpha-main-01 so ThreadView is rendered
    await act(async () => {
      appHook.openChatTab('thread-alpha-main-01');
    });

    // Confirm no error banner currently in DOM
    assert.equal(container.querySelector('[data-testid="persistence-error-banner"]'), null);

    // Create an unassociated Main thread
    const failMainId = `thread-fail-main-${Date.now()}`;
    const failMain = {
      id: failMainId,
      teamId: 'team-alpha-01',
      title: 'Quota Fail Main',
      projectId: 'fixture-project-offline',
      ownerAgent: 'team',
      threadType: 'team',
      assignedSpecialists: [],
      mode: 'connected_main',
      agentScope: 'team',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: 'Claude 3.7 Sonnet',
      branch: 'main',
      approvalMode: 'Approve for me',
      turns: [],
    };

    await act(async () => {
      await runtimeInstance.saveThread(failMain);
      await appHook.reloadThreads();
    });

    const threadCountBefore = appHook.threads.length;

    // Inject QuotaExceededError into saveThreadsAtomic
    const originalSaveThreadsAtomic = runtimeInstance.saveThreadsAtomic;
    const quotaError = new Error('The quota has been exceeded for localStorage storage allocation.');
    quotaError.name = 'QuotaExceededError';

    (runtimeInstance as any).saveThreadsAtomic = async () => {
      throw quotaError;
    };

    try {
      // Attempt Maestro resolution which invokes saveThreadsAtomic
      await act(async () => {
        appHook.resolveAssociatedMaestroThread(failMainId);
      });

      // Allow rejection microtasks to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 1. Assert: React state rolled back — no orphan Maestro thread left in threads
      const orphanMaestro = appHook.threads.find(
        (t: any) => t.originatingMainThreadId === failMainId
      );
      assert.equal(orphanMaestro, undefined, 'Orphan Maestro thread must be rolled back on save failure');
      assert.equal(appHook.threads.length, threadCountBefore, 'Thread count must roll back to original count');

      // 2. Assert: Main thread does NOT retain the associatedMaestroThreadId
      const mainAfterRollback = appHook.threads.find((t: any) => t.id === failMainId);
      assert.equal(mainAfterRollback.associatedMaestroThreadId, undefined, 'Main thread association must roll back');

      // 3. Assert: persistenceError in AppContext is populated
      assert.ok(appHook.persistenceError);
      assert.match(appHook.persistenceError, /QuotaExceededError|quota has been exceeded/);

      // 4. Assert: <div data-testid="persistence-error-banner"> is rendered in the mounted DOM
      const banner = container.querySelector('[data-testid="persistence-error-banner"]');
      assert.ok(banner, 'Persistence error banner must be rendered in DOM');
      assert.match(banner.textContent || '', /QuotaExceededError|quota has been exceeded/);

      // 5. Assert: Dismiss button clears the banner
      const dismissBtn = banner.querySelector('button');
      assert.ok(dismissBtn);
      await act(async () => {
        dismissBtn.click();
      });

      assert.equal(
        container.querySelector('[data-testid="persistence-error-banner"]'),
        null,
        'Banner must disappear after dismissal'
      );
    } finally {
      (runtimeInstance as any).saveThreadsAtomic = originalSaveThreadsAtomic;
    }
  });

  test('3.2 Storage Failure: Injected QuotaExceededError during saveThread bubbles to persistence banner', async () => {
    let appHook: any = null;

    const Harness: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', null,
        React.createElement(ThreadView)
      );
    };

    await act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(Harness)));
    });

    await act(async () => {
      appHook.openChatTab('thread-alpha-main-01');
    });

    const originalSaveThread = runtimeInstance.saveThread;
    const quotaError = new Error('Disk quota exceeded in localStorage partition.');
    quotaError.name = 'QuotaExceededError';

    (runtimeInstance as any).saveThread = async () => {
      throw quotaError;
    };

    try {
      await act(async () => {
        appHook.recruitSpecialist('thread-alpha-main-01', ['tester']);
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const banner = container.querySelector('[data-testid="persistence-error-banner"]');
      assert.ok(banner, 'Persistence error banner must be rendered');
      assert.match(banner.textContent || '', /QuotaExceededError|Disk quota exceeded/);

      // Dismiss
      const dismissBtn = banner.querySelector('button');
      await act(async () => {
        dismissBtn?.click();
      });
      assert.equal(container.querySelector('[data-testid="persistence-error-banner"]'), null);

      // Trigger a second failure: Assert banner reappears
      await act(async () => {
        appHook.recruitSpecialist('thread-alpha-main-01', ['cody']);
      });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const reappearedBanner = container.querySelector('[data-testid="persistence-error-banner"]');
      assert.ok(reappearedBanner, 'Persistence error banner must reappear on subsequent save failure');
    } finally {
      (runtimeInstance as any).saveThread = originalSaveThread;
    }
  });

  test('3.3 Storage Validation: validatePersistedThreads handles corrupted envelopes and malformed JSON safely', () => {
    const runtime = new OfflineFixtureRuntime();

    // Adversarial inputs matrix
    const malformedInputs: unknown[] = [
      null,
      undefined,
      12345,
      'corrupted-string-not-json',
      true,
      false,
      {},
      [],
      { schema: 'unknown-v99', threads: [] },
      { schema: 'mediobot-offline-fixture-v1' }, // missing threads array
      { schema: 'mediobot-offline-fixture-v1', threads: 'not-an-array' },
      { schema: 'mediobot-offline-fixture-v1', threads: null },
      { schema: 'mediobot-offline-fixture-v1', threads: [{}] }, // missing id and title
      { schema: 'mediobot-offline-fixture-v1', threads: [{ id: 123, title: 456 }] }, // invalid types
      { schema: 'mediobot-offline-fixture-v1', threads: [{ id: 't1', title: 'T1' }] }, // missing turns array
      [{ id: 999 }], // array with invalid object
      [null, undefined, 42],
    ];

    for (const input of malformedInputs) {
      assert.doesNotThrow(() => {
        const result = runtime.validatePersistedThreads(input);
        assert.equal(result, null, `Malformed input ${JSON.stringify(input)} must return null`);
      }, `validatePersistedThreads must not throw on malformed input: ${JSON.stringify(input)}`);
    }
  });

  test('3.4 Storage Validation: validatePersistedThreads sanitizes dangling Maestro & Main pointers', () => {
    const runtime = new OfflineFixtureRuntime();

    const envelopeWithDanglingPointers = {
      schema: 'mediobot-offline-fixture-v1',
      version: 1,
      savedAt: Date.now(),
      threads: [
        {
          id: 'thread-main-valid',
          title: 'Main Valid',
          turns: [],
          associatedMaestroThreadId: 'thread-phantom-maestro-nonexistent', // Dangling pointer!
        },
        {
          id: 'thread-maestro-valid',
          title: 'Maestro Valid',
          turns: [],
          originatingMainThreadId: 'thread-phantom-main-nonexistent', // Dangling pointer!
        },
      ],
    };

    const validated = runtime.validatePersistedThreads(envelopeWithDanglingPointers);
    assert.ok(validated);
    assert.equal(validated.length, 2);

    const mainThread = validated.find((t: any) => t.id === 'thread-main-valid');
    assert.ok(mainThread);
    assert.equal(
      mainThread.associatedMaestroThreadId,
      undefined,
      'Dangling associatedMaestroThreadId must be sanitized to undefined'
    );

    const maestroThread = validated.find((t: any) => t.id === 'thread-maestro-valid');
    assert.ok(maestroThread);
    assert.equal(
      maestroThread.originatingMainThreadId,
      undefined,
      'Dangling originatingMainThreadId must be sanitized to undefined'
    );
  });

  test('3.5 Storage Recovery: Corrupted localStorage JSON creates backup key and recovers safely without crash', () => {
    const storageKey = 'mediobot_fixture_offline_threads_v1';
    const originalItem = localStorage.getItem(storageKey);

    try {
      // Intentionally poison localStorage with completely invalid JSON
      localStorage.setItem(storageKey, '{ MALFORMED_JSON_CORRUPT: unclosed syntax [{{');

      // Instantiate new runtime
      let poisonedRuntime: any = null;
      assert.doesNotThrow(() => {
        poisonedRuntime = new OfflineFixtureRuntime();
      }, 'OfflineFixtureRuntime must handle malformed JSON in localStorage gracefully without throwing');

      assert.ok(poisonedRuntime);
      const threads = poisonedRuntime.getInitialThreads();
      assert.ok(Array.isArray(threads) && threads.length > 0, 'Must fall back to clean seed threads');

      // Verify backup key was created
      let backupKeyFound = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${storageKey}_corrupted_backup_`)) {
          backupKeyFound = true;
          assert.equal(localStorage.getItem(key), '{ MALFORMED_JSON_CORRUPT: unclosed syntax [{{');
          break;
        }
      }
      assert.ok(backupKeyFound, 'A corrupted backup key must be preserved in localStorage');
    } finally {
      if (originalItem) {
        localStorage.setItem(storageKey, originalItem);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  });
});
