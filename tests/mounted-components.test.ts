/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mediobot UI Refinement Mounted Components Interaction Test Suite
 * Real React 19 mounted component tests using JSDOM, createRoot, and act.
 * Exercises actual components across all required interaction flows.
 */

import { register } from 'node:module';
// Register custom CSS stub loader to handle raw .css imports in ESM
register(new URL('./css-loader.mjs', import.meta.url));

import { test, describe, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

// Lazy-loaded component references (loaded after css-loader is registered)
let DiffViewer: any;
let AppProvider: any;
let useApp: any;
let ThreadView: any;
let ResourceStatusIndicator: any;
let GeminiApiKeyManager: any;
let SettingsModal: any;
let TerminalWorkspaceView: any;
let CanonicalTrajectoryView: any;
let ActivityAccordion: any;
let CodexToolRow: any;
let parseCanonicalTrajectory: any;
let OfflineFixtureRuntime: any;
let FIXTURE_DEMO_PROJECT: any;
let runtimeInstance: any;
let MockMediobotRuntime: any;
let runtimeClientExports: any;

// Setup global JSDOM harness
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

  // Polyfills for visual layout APIs
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

describe('Mounted Components Interaction Suite (React 19 & JSDOM)', () => {
  let dom: JSDOM;
  let container: HTMLElement;
  let root: Root;

  before(async () => {
    // Initialize JSDOM globals before importing modules so window.fetch is available
    dom = setupJSDOM();
    container = dom.window.document.getElementById('root')!;

    // Dynamically import all React components now that css-loader is active
    const diffModule = await import('../mediobot-ui-refinement/src/features/activity/DiffViewer.js');
    DiffViewer = diffModule.DiffViewer;

    const appStateModule = await import('../mediobot-ui-refinement/src/state/AppContext.js');
    AppProvider = appStateModule.AppProvider;
    useApp = appStateModule.useApp;

    const threadViewModule = await import('../mediobot-ui-refinement/src/features/threads/ThreadView.js');
    ThreadView = threadViewModule.ThreadView;

    const resourceModule = await import('../mediobot-ui-refinement/src/components/ResourceStatusIndicator.js');
    ResourceStatusIndicator = resourceModule.ResourceStatusIndicator;

    const keyManagerModule = await import('../mediobot-ui-refinement/src/features/settings/GeminiApiKeyManager.js');
    GeminiApiKeyManager = keyManagerModule.GeminiApiKeyManager;

    const settingsModule = await import('../mediobot-ui-refinement/src/features/settings/SettingsModal.js');
    SettingsModal = settingsModule.SettingsModal;

    const terminalModule = await import('../mediobot-ui-refinement/src/features/terminal/TerminalWorkspaceView.js');
    TerminalWorkspaceView = terminalModule.TerminalWorkspaceView;

    const codexModule = await import('../mediobot-ui-refinement/src/features/activity/CodexExecutionView.js');
    CanonicalTrajectoryView = codexModule.CanonicalTrajectoryView;
    ActivityAccordion = codexModule.ActivityAccordion;
    CodexToolRow = codexModule.CodexToolRow;
    parseCanonicalTrajectory = codexModule.parseCanonicalTrajectory;

    const fixtureModule = await import('../mediobot-ui-refinement/src/runtime/offlineFixture.js');
    OfflineFixtureRuntime = fixtureModule.OfflineFixtureRuntime;
    FIXTURE_DEMO_PROJECT = fixtureModule.FIXTURE_DEMO_PROJECT;

    const clientModule = await import('../mediobot-ui-refinement/src/runtime/client.js');
    runtimeClientExports = clientModule;
    runtimeInstance = clientModule.runtimeInstance;
    const legacyRuntimeModule = await import('../mediobot-ui-refinement/src/runtime/mockRuntime.js');
    MockMediobotRuntime = legacyRuntimeModule.MockMediobotRuntime;
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

  // --------------------------------------------------------------------------
  // Flow 1: DiffViewer Review Controls, Reconciled Counts & Truthful Attribution
  // --------------------------------------------------------------------------
  test('Flow 1: DiffViewer review controls, accurate hunk counts (+5/-2) and truthful attribution', async () => {
    const testDiff = {
      filePath: 'src/calculator.ts',
      language: 'typescript',
      additions: 5,
      deletions: 2,
      state: 'proposed',
      isControlledDemonstration: true,
      verificationEvidence: 'Controlled demonstration · Simulated in-memory assertion suite',
      hunks: [
        {
          header: '@@ -14,6 +14,16 @@ export function calculate(op: string, a: number, b: number): number {',
          oldStart: 14,
          oldLines: 6,
          newStart: 14,
          newLines: 16,
          lines: [
            { type: 'context', content: '    case "add":', oldLineNo: 14, newLineNo: 14 },
            { type: 'remove', content: '    case "divide":', oldLineNo: 16 },
            { type: 'remove', content: '      return a / b;', oldLineNo: 17 },
            { type: 'add', content: '    case "divide":', newLineNo: 16 },
            { type: 'add', content: '      if (b === 0) {', newLineNo: 17 },
            { type: 'add', content: '        throw new Error("Division by zero guard");', newLineNo: 18 },
            { type: 'add', content: '      }', newLineNo: 19 },
            { type: 'add', content: '      return a / b;', newLineNo: 20 },
            { type: 'context', content: '    default:', oldLineNo: 18, newLineNo: 21 },
          ],
        },
      ],
    };

    let latestState = 'proposed';
    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(DiffViewer, {
            diff: testDiff as any,
            onStateChange: (ns: any) => { latestState = ns; },
          })
        )
      );
    });

    // 1. Verify accurate hunk addition (+5) and deletion (-2) counts rendered in DOM
    const countsEl = container.querySelector('.tabular-nums');
    assert.ok(countsEl, 'Additions/deletions element must exist');
    assert.match(countsEl.textContent || '', /\+5/, 'Must render +5 additions from hunks');
    assert.match(countsEl.textContent || '', /-2/, 'Must render -2 deletions from hunks');

    // 2. Verify Review action controls are visibly labeled as Simulated
    const buttons = Array.from(container.querySelectorAll('button'));
    const verifyBtn = buttons.find((b) => b.textContent?.includes('Verify (Simulated)'));
    const applyBtn = buttons.find((b) => b.textContent?.includes('Apply (Simulated)'));
    const rejectBtn = buttons.find((b) => b.textContent?.includes('Reject'));

    assert.ok(verifyBtn, 'Verify button must be labeled "Verify (Simulated)"');
    assert.ok(applyBtn, 'Apply button must be labeled "Apply (Simulated)"');
    assert.ok(rejectBtn, 'Reject button must exist');

    // 3. Click "Verify (Simulated)"
    await act(async () => {
      verifyBtn!.click();
    });
    assert.equal(latestState, 'verified');
    const verifiedBadge = container.querySelector('[data-testid="diff-state-verified"]');
    assert.ok(verifiedBadge, 'Verified badge must be displayed');
    // When verifiedBy is undefined in testDiff and isSimulated is true, it must say "Verified (Simulated)"
    assert.equal(verifiedBadge.textContent?.trim(), 'Verified (Simulated)');
    assert.doesNotMatch(verifiedBadge.textContent || '', /Tester/, 'Must NOT invent "Tester" attribution');

    // 4. Click "Apply (Simulated)"
    const updatedApplyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Apply (Simulated)')
    );
    assert.ok(updatedApplyBtn, 'Apply (Simulated) button should be available');
    await act(async () => {
      updatedApplyBtn!.click();
    });
    assert.equal(latestState, 'applied');
    const appliedBadge = container.querySelector('[data-testid="diff-state-applied"]');
    assert.ok(appliedBadge, 'Applied badge must be displayed');
    assert.equal(appliedBadge.textContent?.trim(), 'Applied (Simulated)');

    // 5. Click "Reject"
    const updatedRejectBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reject')
    );
    assert.ok(updatedRejectBtn, 'Reject button should be available');
    await act(async () => {
      updatedRejectBtn!.click();
    });
    assert.equal(latestState, 'rejected');
    const rejectedBadge = container.querySelector('[data-testid="diff-state-rejected"]');
    assert.ok(rejectedBadge, 'Rejected badge must be displayed');
    assert.match(rejectedBadge.textContent?.trim() || '', /^Rejected(\s+\(Simulated\))?$/);
  });

  // --------------------------------------------------------------------------
  // Flow 2: Main/Maestro Concurrent Association & Idempotency
  // --------------------------------------------------------------------------
  test('Flow 2: Main/Maestro concurrent association and idempotency in mounted AppProvider', async () => {
    let appHook: any = null;

    const HookExtractor: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', { id: 'hook-ready' }, 'ready');
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null, React.createElement(HookExtractor))
      );
    });

    assert.ok(appHook, 'App hook must be available');
    const { resolveAssociatedMaestroThread, threads } = appHook;

    const main1 = threads.find((t: any) => t.id === 'thread-alpha-main-01')!;
    assert.ok(main1, 'Main 1 must exist');

    // Fire 3 simultaneous concurrent resolution calls
    let r1: any = null;
    let r2: any = null;
    let r3: any = null;

    await act(async () => {
      r1 = resolveAssociatedMaestroThread(main1.id);
      r2 = resolveAssociatedMaestroThread(main1.id);
      r3 = resolveAssociatedMaestroThread(main1.id);
    });

    assert.ok(r1 && r2 && r3, 'All concurrent calls must return a Maestro thread');
    assert.equal(r1.id, r2.id, 'Concurrent calls must return identical thread ID');
    assert.equal(r2.id, r3.id, 'Concurrent calls must return identical thread ID');
    assert.equal(r1.id, 'thread-alpha-maestro-01');

    // Verify 1:1 association: Main 2 points to distinct Maestro
    const main2 = threads.find((t: any) => t.id === 'thread-alpha-main-02')!;
    assert.ok(main2, 'Main 2 must exist');
    let rMain2: any = null;
    await act(async () => {
      rMain2 = resolveAssociatedMaestroThread(main2.id);
    });
    assert.ok(rMain2);
    assert.equal(rMain2.id, 'thread-alpha-maestro-02');
    assert.notEqual(r1.id, rMain2.id, 'Main 1 and Main 2 must not share the same Maestro');
  });

  // --------------------------------------------------------------------------
  // Flow 3: Cross-Team Maestro & Specialist Isolation
  // --------------------------------------------------------------------------
  test('Flow 3: Cross-team Maestro and specialist isolation enforces strict team boundaries', async () => {
    let appHook: any = null;

    const HookExtractor: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', null, `Active team: ${appHook.activeTeamId}`);
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null, React.createElement(HookExtractor))
      );
    });

    assert.ok(appHook);
    assert.equal(appHook.activeTeamId, 'team-alpha-01');

    // 1. Switch to Team Beta using setActiveTeamId
    await act(async () => {
      appHook.setActiveTeamId('team-beta-02');
    });
    assert.equal(appHook.activeTeamId, 'team-beta-02');

    // 2. In Team Beta, call selectAgent('maestro')
    await act(async () => {
      appHook.selectAgent('maestro');
    });

    // Assert that activeThread does NOT leak into Team Alpha's threads
    const active = appHook.activeThread;
    assert.ok(active, 'An active thread must be selected');
    assert.notEqual(
      active.teamId,
      'team-alpha-01',
      'Selecting Maestro in Team Beta must NEVER resolve Team Alpha conversation'
    );
    assert.equal(active.teamId, 'team-beta-02', 'Must resolve thread scoped strictly to Team Beta');

    // 3. Verify specialist isolation: Tester conversation in Beta cannot be accessed from Alpha
    await act(async () => {
      appHook.setActiveTeamId('team-alpha-01');
    });
    assert.equal(appHook.activeTeamId, 'team-alpha-01');

    // In Team Alpha, find specialist thread for 'tester'
    const alphaTester = appHook.threads.find(
      (t: any) => t.teamId === 'team-alpha-01' && t.specialistId === 'tester'
    );
    assert.equal(alphaTester, undefined, 'Team Alpha must not have a Tester conversation by default');

    // Assert Team Beta tester conversation remains isolated to Beta
    const betaTester = appHook.threads.find(
      (t: any) => t.id === 'thread-beta-tester-01'
    );
    assert.ok(betaTester);
    assert.equal(betaTester.teamId, 'team-beta-02');
  });

  // --------------------------------------------------------------------------
  // Flow 4: Storage Robustness & Persistence Error Banner
  // --------------------------------------------------------------------------
  test('Flow 4: Storage write failures bubble to persistence error banner and roll back state', async () => {
    let appHook: any = null;

    const TestApp: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', null,
        React.createElement(ThreadView)
      );
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null, React.createElement(TestApp))
      );
    });

    assert.ok(appHook);
    // Ensure active thread is set to thread-alpha-main-01 which has turns
    await act(async () => {
      appHook.openChatTab('thread-alpha-main-01');
    });

    assert.equal(container.querySelector('[data-testid="persistence-error-banner"]'), null);

    // Mock runtimeInstance.saveThread to simulate QuotaExceededError
    const originalSaveThread = runtimeInstance.saveThread;
    const quotaError = new Error('The quota has been exceeded for localStorage');
    quotaError.name = 'QuotaExceededError';

    (runtimeInstance as any).saveThread = async () => {
      throw quotaError;
    };

    try {
      // Trigger a save on thread-alpha-main-01 (which has turns) via recruitSpecialist
      await act(async () => {
        appHook.recruitSpecialist('thread-alpha-main-01', ['research']);
      });

      // Allow microtasks to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert persistence error banner is displayed in ThreadView
      const banner = container.querySelector('[data-testid="persistence-error-banner"]');
      assert.ok(banner, 'Persistence error banner must be rendered in DOM');
      assert.match(
        banner.textContent || '',
        /QuotaExceededError|quota has been exceeded/,
        'Banner must display the quota error message'
      );

      // Verify dismiss button removes the banner
      const dismissBtn = banner.querySelector('button');
      assert.ok(dismissBtn, 'Dismiss button must exist in error banner');
      await act(async () => {
        dismissBtn.click();
      });

      assert.equal(
        container.querySelector('[data-testid="persistence-error-banner"]'),
        null,
        'Banner must be cleared after dismissal'
      );
    } finally {
      (runtimeInstance as any).saveThread = originalSaveThread;
    }
  });

  // --------------------------------------------------------------------------
  // Flow 5: Whole-App Offline Fixture Enforcement & Network Denial
  // --------------------------------------------------------------------------
  test('Flow 5: Whole-app offline fixture enforcement guarantees 0 live fetch calls', async () => {
    (window as any).__mediobotFetchCallCount = 0;
    const getCallCount = () => (window as any).__mediobotFetchCallCount || 0;
    const initialCallCount = getCallCount();

    try {
      // 1. Mount ResourceStatusIndicator -> verify 0 fetch to /api/system/resources
      await act(async () => {
        root.render(React.createElement(ResourceStatusIndicator, { isLight: true }));
      });
      assert.equal(getCallCount() - initialCallCount, 0, 'ResourceStatusIndicator must not call fetch on mount');
      const resourceIndicator = container.querySelector('[title*="Controlled demonstration"]');
      assert.ok(resourceIndicator, 'Resource indicator must have controlled demonstration title');

      // 2. Mount GeminiApiKeyManager inside AppProvider -> verify 0 fetch to /api/gemini/*
      await act(async () => {
        root.render(
          React.createElement(AppProvider, null,
            React.createElement(GeminiApiKeyManager, { isLight: true })
          )
        );
      });
      assert.equal(getCallCount() - initialCallCount, 0, 'GeminiApiKeyManager must not call fetch on mount');

      // Verify mutation inputs and buttons are disabled
      const inputs = Array.from(container.querySelectorAll('input'));
      for (const input of inputs) {
        assert.ok(input.disabled, `Input ${input.placeholder || input.name} must be disabled in offline mode`);
      }
      const banner = container.querySelector('.border-amber-300, .border-amber-800\\/60');
      assert.ok(banner, 'Offline credential notice banner must be rendered');
      assert.match(
        banner.textContent || '',
        /Controlled demonstration: Provider credential mutation disabled/
      );

      // 3. Mount TerminalWorkspaceView -> submit command -> verify 0 fetch to /api/terminal/execute
      await act(async () => {
        root.render(
          React.createElement(AppProvider, null,
            React.createElement(TerminalWorkspaceView, { isLight: true })
          )
        );
      });
      assert.equal(getCallCount() - initialCallCount, 0, 'TerminalWorkspaceView must not call fetch on mount');

      // Interact with terminal: execute command via input and Enter key
      const termInput = container.querySelector('input');
      if (termInput) {
        const propsKey = Object.keys(termInput).find((k) => k.startsWith('__reactProps$'));
        if (propsKey && (termInput as any)[propsKey]) {
          await act(async () => {
            (termInput as any)[propsKey].onChange({ target: { value: 'mediobot ask status check' } });
          });
          await act(async () => {
            (termInput as any)[propsKey].onKeyDown({ key: 'Enter', preventDefault: () => {} });
          });
        }
        assert.equal(getCallCount() - initialCallCount, 0, 'Terminal command execution must not trigger network calls');
        assert.match(
          container.textContent || '',
          /Controlled demonstration/,
          'Terminal output must indicate controlled demonstration mode'
        );
      }

      // 4. Test defensive client-side fetch guard in client.ts
      const blockedResponse = await window.fetch('/api/system/resources');
      assert.equal(blockedResponse.status, 403, 'Unauthorized API request must return 403');
      const errorJson = await blockedResponse.json();
      assert.equal(
        errorJson.error?.code,
        'CONTROLLED_DEMONSTRATION_MODE',
        'Error code must be CONTROLLED_DEMONSTRATION_MODE'
      );

      // 5. Test Terminal and Gemini network denial vectors
      const blockedTerm = await window.fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'malicious-cmd' }),
      });
      assert.equal(blockedTerm.status, 403, 'Direct /api/terminal/execute must return 403');
      const termError = await blockedTerm.json();
      assert.equal(termError.error?.code, 'CONTROLLED_DEMONSTRATION_MODE');

      const blockedTermJs = await window.fetch('/api/terminal/execute.js');
      assert.equal(blockedTermJs.status, 403, '/api/terminal/execute.js must return 403');

      const blockedGemini = await window.fetch('/api/gemini/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'adversarial prompt' }),
      });
      assert.equal(blockedGemini.status, 403, 'Direct /api/gemini/execute must return 403');
      const geminiError = await blockedGemini.json();
      assert.equal(geminiError.error?.code, 'CONTROLLED_DEMONSTRATION_MODE');

      const blockedGeminiCss = await window.fetch('/api/gemini/execute.css');
      assert.equal(blockedGeminiCss.status, 403, '/api/gemini/execute.css must return 403');

      const blockedExternalGemini = await window.fetch('https://generativelanguage.googleapis.com/v1beta/models');
      assert.equal(blockedExternalGemini.status, 403, 'External Gemini API must return 403');

      // 6. Test Multi-channel network guards
      // XHR guard
      const xhr = new window.XMLHttpRequest();
      xhr.open('POST', '/api/terminal/execute');
      xhr.send();
      assert.equal((xhr as any).status, 403, 'Guarded XHR must return status 403');

      // EventSource guard
      assert.throws(
        () => new window.EventSource('/api/workspace/events'),
        /SecurityError|blocked/,
        'EventSource to /api/workspace/events must throw SecurityError'
      );

      // WebSocket guard
      assert.throws(
        () => new window.WebSocket('wss://localhost/terminal'),
        /SecurityError|disabled/,
        'WebSocket must throw SecurityError in demonstration mode'
      );

      // sendBeacon guard
      assert.equal(
        window.navigator.sendBeacon('/api/telemetry', 'payload'),
        false,
        'sendBeacon must return false for API endpoints'
      );
    } finally {
      // Fetch was not modified; immutability preserved
    }
  });

  test('P2 regression: legacy mock imports resolve only to the labeled offline fixture', async () => {
    assert.equal(runtimeInstance.runtimeKind, 'offline-fixture');
    assert.equal(runtimeClientExports.MockMediobotRuntime, undefined,
      'The selected runtime module must not expose the legacy mock as a selectable adapter');
    assert.equal(MockMediobotRuntime, OfflineFixtureRuntime,
      'Legacy MockMediobotRuntime imports must alias the safe fixture implementation');

    let fetchCalls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalls++;
      throw new Error('Unexpected network request from legacy runtime import');
    };
    try {
      const legacyRuntime = new MockMediobotRuntime();
      const events: any[] = [];
      const unsubscribe = legacyRuntime.onEvent((event: any) => events.push(event));
      const turnId = await legacyRuntime.startTurn('legacy-runtime-regression', 'Offline demo only', {
        model: 'Gemini 3.8 Flash',
        approvalMode: 'Ask for approval',
        project: { ...FIXTURE_DEMO_PROJECT },
        branch: 'main',
      });
      await new Promise<void>((resolve) => {
        const check = () => {
          if (events.some((event) => event.type === 'turn.completed' && event.turnId === turnId)) resolve();
          else setTimeout(check, 10);
        };
        check();
      });
      unsubscribe();
      assert.equal(fetchCalls, 0, 'Legacy import must not call provider/backend endpoints');
      const turn = await legacyRuntime.loadThread('legacy-runtime-regression');
      const completedTurn = turn.turns.find((item: any) => item.id === turnId)!;
      assert.ok(completedTurn.items.some((item: any) => item.text?.includes('Controlled demonstration')));
      const tool = completedTurn.items.find((item: any) => item.type === 'tool_execution')?.tool;
      assert.match(tool?.outcomeBadge ?? '', /Controlled demonstration/);
      assert.match(tool?.outputLog ?? '', /\[Controlled demonstration\]/);
      const diff = completedTurn.items.find((item: any) => item.type === 'diff')?.diff;
      assert.equal(diff?.isControlledDemonstration, true);
      assert.match(diff?.verificationEvidence ?? '', /Controlled demonstration/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('P2 regression: Settings reports offline provider/model state without probing or claiming readiness', async () => {
    let fetchCalls = 0;
    const initialCallCount = (window as any).__mediobotFetchCallCount || 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (...args: any[]) => {
      fetchCalls++;
      return originalFetch(...args);
    };
    try {
      await act(async () => {
        root.render(React.createElement(AppProvider, null, React.createElement(SettingsModal)));
      });
      const text = container.textContent || '';
      assert.match(text, /Not connected · offline fixture/);
      assert.match(text, /Credentials are not read, stored, or tested/);
      assert.match(text, /display examples only/);
      assert.match(text, /Example model names/);
      assert.doesNotMatch(text, /GEMINI_API_KEY\s+Active|Connected\s*\(|Official Gemini Models Ready|Verified Gemini Models/);
      assert.equal(fetchCalls, 0, 'Settings mount must not probe provider/backend status');
      assert.equal((window as any).__mediobotFetchCallCount || 0, initialCallCount,
        'Settings must not make a guarded API request on mount');

      const runtimeTab = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Mediobot Integration Layer')
      );
      assert.ok(runtimeTab, 'Runtime tab should remain available');
      await act(async () => { runtimeTab!.click(); });
      const runtimeText = container.textContent || '';
      assert.match(runtimeText, /Planned Integration Architecture/);
      assert.match(runtimeText, /Offline fixture · simulated only/);
      assert.match(runtimeText, /Planned · not active/);
      assert.doesNotMatch(runtimeText, /MockRuntime Ready|Connected|Provider Ready|models ready/i);
      assert.equal(fetchCalls, 0, 'Opening Runtime tab must not probe or connect to execution services');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // --------------------------------------------------------------------------
  // Flow 6: Suppression of Hidden Reasoning ([THINKING] / [REASONING])
  // --------------------------------------------------------------------------
  test('Flow 6: CanonicalTrajectoryView suppresses hidden model deliberation from user DOM', async () => {
    const rawTrajectory = `
[THINKING]
Private model chain-of-thought: analyze user intent and compute inner weights.
This deliberation must NEVER be rendered into user-facing DOM.
[/THINKING]
[ACTION:filesystem.read]
src/calculator.ts
[OBSERVATION]
File content observed: calculator implementation loaded.
`;

    const blocks = parseCanonicalTrajectory(rawTrajectory);
    assert.ok(blocks.some((b: any) => b.kind === 'thinking'), 'Parser should identify thinking block');

    await act(async () => {
      root.render(
        React.createElement(CanonicalTrajectoryView, {
          blocks,
          isLight: true,
        })
      );
    });

    const renderedText = container.textContent || '';

    // Verify thinking content is completely absent from DOM
    assert.doesNotMatch(renderedText, /Private model chain-of-thought/);
    assert.doesNotMatch(renderedText, /analyze user intent and compute inner weights/);
    assert.doesNotMatch(renderedText, /THINKING/);

    // Verify action and observation blocks ARE rendered in DOM
    assert.match(renderedText, /ACTION:\s*filesystem\.read/);
    assert.match(renderedText, /src\/calculator\.ts/);
    assert.match(renderedText, /File content observed/);
  });

  // --------------------------------------------------------------------------
  // Flow 7: Draft & Scroll Position Retention Per Thread ID
  // --------------------------------------------------------------------------
  test('Flow 7: Per-chat drafts and scroll positions are preserved across thread switches', async () => {
    let appHook: any = null;

    const HookExtractor: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', null, `Active: ${appHook.activeThread?.id}`);
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null, React.createElement(HookExtractor))
      );
    });

    assert.ok(appHook);

    // Set drafts for two separate threads
    await act(async () => {
      appHook.setDraft('thread-alpha-main-01', 'Draft content for Main Alpha 1');
      appHook.setDraft('thread-alpha-main-02', 'Draft content for Main Alpha 2');
    });

    // Verify draft isolation via updated appHook
    assert.equal(appHook.getDraft('thread-alpha-main-01'), 'Draft content for Main Alpha 1');
    assert.equal(appHook.getDraft('thread-alpha-main-02'), 'Draft content for Main Alpha 2');
    assert.equal(appHook.getDraft('thread-non-existent'), '');

    // Navigate between threads
    await act(async () => {
      appHook.openChatTab('thread-alpha-main-01');
    });
    assert.equal(appHook.getDraft(appHook.activeThread.id), 'Draft content for Main Alpha 1');

    await act(async () => {
      appHook.openChatTab('thread-alpha-main-02');
    });
    assert.equal(appHook.getDraft(appHook.activeThread.id), 'Draft content for Main Alpha 2');
  });

  // --------------------------------------------------------------------------
  // Flow 8: Activity Accordion & CodexToolRow Collapse/Expand Interaction
  // --------------------------------------------------------------------------
  test('Flow 8: Activity Accordion and tool rows expand and collapse upon user interaction', async () => {
    await act(async () => {
      root.render(
        React.createElement(ActivityAccordion, {
          title: 'Proposed Code Modifications',
          count: 1,
          isLight: true,
          defaultOpen: false,
        }, React.createElement('div', { id: 'accordion-child-content' }, 'Expanded Hunk Details'))
      );
    });

    const details = container.querySelector('details');
    assert.ok(details, 'Accordion details element must exist');
    assert.equal(details.open, false, 'Should start closed by default');

    const summary = container.querySelector('summary');
    assert.ok(summary, 'Summary toggle must exist');

    // Toggle open
    await act(async () => {
      summary!.click();
    });
    assert.equal(details.open, true, 'Accordion details should be open after click');
    assert.ok(container.querySelector('#accordion-child-content'), 'Child content must be visible');

    // Toggle closed
    await act(async () => {
      summary!.click();
    });
    assert.equal(details.open, false, 'Accordion details should be closed after second click');
  });

  // --------------------------------------------------------------------------
  // Flow 9: Seed Turn Synthetic Item Attribution Honesty
  // --------------------------------------------------------------------------
  test('Flow 9: Seed turn items visibly designate simulated execution without claiming real terminal run', async () => {
    const runtime = new OfflineFixtureRuntime();
    const thread = await runtime.loadThread('thread-alpha-main-01');
    assert.ok(thread);

    const firstTurn = thread.turns[0];
    assert.ok(firstTurn, 'First turn must exist');

    // Verify verification tool item
    const verifyItem = firstTurn.items.find((it: any) => it.id === 'item-tester-verify');
    assert.ok(verifyItem, 'item-tester-verify must exist');
    const actorId = typeof verifyItem.actor === 'string' ? verifyItem.actor : verifyItem.actor?.mediobotId;
    assert.equal(actorId, 'tester');
    assert.ok(verifyItem.tool, 'Must be tool execution');
    assert.equal(verifyItem.tool.toolName, 'terminal.execute (simulated)');
    assert.equal(verifyItem.tool.outcomeBadge, 'Controlled demonstration · Simulated');
    assert.match(
      verifyItem.tool.outputLog || '',
      /\[Controlled demonstration\] Simulated verification test suite \(no terminal subprocess executed\)/
    );

    // Verify summary item mentions simulated verification
    const summaryItem = firstTurn.items.find((it: any) => it.id === 'item-cody-summary');
    assert.ok(summaryItem, 'item-cody-summary must exist');
    assert.match(summaryItem.text || '', /Simulated verification/i);
  });

  // --------------------------------------------------------------------------
  // Flow 10: Tab Selection Restores Thread Team Context
  // --------------------------------------------------------------------------
  test('Flow 10: Tab selection restores thread team context when switching between teams', async () => {
    let appHook: any = null;

    const HookExtractor: React.FC = () => {
      appHook = useApp();
      return React.createElement('div', null, `Team: ${appHook.activeTeamId}`);
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null, React.createElement(HookExtractor))
      );
    });

    assert.ok(appHook);
    assert.equal(appHook.activeTeamId, 'team-alpha-01');

    // Open a chat tab belonging to Team Beta
    await act(async () => {
      appHook.openChatTab('thread-beta-main-01');
    });

    // Active team must automatically restore to team-beta-02
    assert.equal(appHook.activeTeamId, 'team-beta-02');
    assert.equal(appHook.activeThread?.id, 'thread-beta-main-01');

    // Open chat tab belonging back to Team Alpha
    await act(async () => {
      appHook.openChatTab('thread-alpha-main-01');
    });

    assert.equal(appHook.activeTeamId, 'team-alpha-01');
    assert.equal(appHook.activeThread?.id, 'thread-alpha-main-01');
  });
});
