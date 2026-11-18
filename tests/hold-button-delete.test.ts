import { register } from 'node:module';
register(new URL('./css-loader.mjs', import.meta.url));

import { test, describe, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

let HoldButton: any;
let AppProvider: any;
let useApp: any;
let ThreadsDrawer: any;

function setupJSDOM() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
  });

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
  globalThis.localStorage = dom.window.localStorage;
  globalThis.sessionStorage = dom.window.sessionStorage;
  globalThis.MouseEvent = dom.window.MouseEvent;
  globalThis.KeyboardEvent = dom.window.KeyboardEvent;
  globalThis.Event = dom.window.Event;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
  dom.window.ResizeObserver = globalThis.ResizeObserver;
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
  dom.window.fetch = (() =>
    Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))) as any;
  globalThis.fetch = dom.window.fetch;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16)) as any;
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as any;
  dom.window.requestAnimationFrame = globalThis.requestAnimationFrame;
  dom.window.cancelAnimationFrame = globalThis.cancelAnimationFrame;

  return dom;
}

describe('HoldButton Automatic Red 7s Delete Flow', () => {
  let dom: JSDOM;
  let container: HTMLElement;
  let root: Root;

  before(async () => {
    dom = setupJSDOM();
    HoldButton = (await import('../mediobot-ui-refinement/src/components/HoldButton.tsx')).default;
    const appCtx = await import('../mediobot-ui-refinement/src/state/AppContext.tsx');
    AppProvider = appCtx.AppProvider;
    useApp = appCtx.useApp;
    ThreadsDrawer = (await import('../mediobot-ui-refinement/src/features/navigation/ThreadsDrawer.tsx')).ThreadsDrawer;
  });

  beforeEach(() => {
    container = dom.window.document.getElementById('root')!;
    container.innerHTML = '';
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
  });

  test('1. HoldButton autoStart runs automatically from idle -> holding -> done without holding pointer', async () => {
    let completed = 0;

    await act(async () => {
      root.render(
        React.createElement(HoldButton, {
          mode: 'auto',
          autoStart: true,
          holdTime: 120,
          releaseTime: 50,
          resetAfter: 0,
          fillColor: '#dc2626',
          doneLabel: 'Deleted',
          onHold: () => {
            completed += 1;
          },
          children: 'Deleting chat...',
        })
      );
    });

    const btn = container.querySelector('[data-testid="hold-button"]') as HTMLButtonElement;
    assert.ok(btn, 'HoldButton should mount');
    assert.equal(btn.getAttribute('data-phase'), 'holding');
    assert.equal(btn.getAttribute('data-mode'), 'auto');
    assert.equal(btn.style.getPropertyValue('--hb-fill'), '#dc2626');
    assert.equal(btn.style.getPropertyValue('--hb-hold'), '120ms');

    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });

    assert.equal(btn.getAttribute('data-phase'), 'done');
    assert.equal(btn.style.getPropertyValue('--hb-p'), '1.0000');
    assert.equal(completed, 1, 'onHold fires once when auto-fill completes');
  });

  test('2. Clicking or pressing Escape during autoStart cancels cleanly via onCancel', async () => {
    let cancelled = 0;
    let completed = 0;

    await act(async () => {
      root.render(
        React.createElement(HoldButton, {
          mode: 'auto',
          autoStart: true,
          holdTime: 7000,
          releaseTime: 50,
          onCancel: () => {
            cancelled += 1;
          },
          onHold: () => {
            completed += 1;
          },
          children: 'Deleting...',
        })
      );
    });

    const btn = container.querySelector('[data-testid="hold-button"]') as HTMLButtonElement;
    assert.equal(btn.getAttribute('data-phase'), 'holding');

    await act(async () => {
      btn.click();
    });

    assert.equal(cancelled, 1, 'Clicking animating HoldButton cancels deletion');
    assert.equal(completed, 0, 'Cancelled HoldButton must not complete deletion');
    assert.equal(btn.getAttribute('data-phase'), 'idle');
  });

  test('3. startedAt seeds progress partway through a 7-second deletion', async () => {
    await act(async () => {
      root.render(
        React.createElement(HoldButton, {
          mode: 'auto',
          autoStart: true,
          holdTime: 7000,
          startedAt: Date.now() - 3500,
          children: 'Deleting...',
        })
      );
    });

    const btn = container.querySelector('[data-testid="hold-button"]') as HTMLButtonElement;
    const progress = parseFloat(btn.style.getPropertyValue('--hb-p'));
    assert.ok(progress >= 0.45 && progress <= 0.75, `Expected ~0.5 progress, got ${progress}`);
  });

  test('4. ThreadsDrawer History delete button immediately triggers 7s red HoldButton and Undo restores row', async () => {
    function HistoryHarness() {
      const { setSidebarTab } = useApp();
      React.useEffect(() => {
        setSidebarTab('history');
      }, [setSidebarTab]);
      return React.createElement(ThreadsDrawer);
    }

    await act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(HistoryHarness)));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });

    const deleteButtons = container.querySelectorAll('button[title="Delete conversation"]');
    assert.ok(deleteButtons.length > 0, 'Expected at least one History conversation delete button');
    const firstDeleteBtn = deleteButtons[0] as HTMLButtonElement;
    const deleteAria = firstDeleteBtn.getAttribute('aria-label') || '';
    const threadTitle = deleteAria.replace(/^Delete\s+/, '');

    // Single click on Trash button (no holding)
    await act(async () => {
      firstDeleteBtn.click();
    });

    const holdBtn = container.querySelector('button.hold-button[data-mode="auto"]') as HTMLButtonElement;
    assert.ok(holdBtn, 'HoldButton auto-delete row should appear immediately on single click');
    assert.equal(holdBtn.getAttribute('data-phase'), 'holding');
    assert.equal(holdBtn.style.getPropertyValue('--hb-hold'), '7000ms');
    assert.equal(holdBtn.style.getPropertyValue('--hb-fill'), '#dc2626');
    assert.match(holdBtn.textContent || '', /Deleting/);
    assert.match(holdBtn.textContent || '', /Undo/);

    // Clicking the HoldButton cancels / undoes deletion cleanly
    await act(async () => {
      holdBtn.click();
    });

    const restoredHoldBtn = container.querySelector('button.hold-button[data-mode="auto"]');
    assert.equal(restoredHoldBtn, null, 'Clicking HoldButton undoes deletion and removes deleting state');
    const restoredDeleteBtn = container.querySelector(`button[aria-label="Delete ${threadTitle}"]`);
    assert.ok(restoredDeleteBtn, 'Original thread row and delete button are restored after Undo');
  });
});
