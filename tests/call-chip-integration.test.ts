import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import CallChip from '../mediobot-ui-refinement/src/components/CallChip.tsx';
import { CodexToolRow, parseToolAction } from '../mediobot-ui-refinement/src/features/activity/subcomponents/CodexToolRow.tsx';
import type { ToolExecutionData } from '../mediobot-ui-refinement/src/types/index.ts';

describe('CallChip & Execution UI Integration', () => {
  let dom: JSDOM;
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost:3000',
    });
    global.window = dom.window as unknown as Window & typeof globalThis;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.requestAnimationFrame = ((cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16)) as unknown as typeof requestAnimationFrame;
    global.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as unknown as typeof cancelAnimationFrame;
    container = document.getElementById('root')!;
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    dom.window.close();
  });

  test('1. CallChip renders running status, done durationMs, and clickable retry on error', async () => {
    let retries = 0;

    await act(async () => {
      root.render(
        React.createElement(CallChip, {
          icon: 'terminal',
          name: 'bash',
          argument: 'npm test',
          status: 'done',
          durationMs: 920,
          showTimer: true,
        })
      );
    });

    const doneChip = container.querySelector('[data-testid="call-chip"]');
    assert.ok(doneChip, 'Done CallChip should mount');
    assert.equal(doneChip.getAttribute('data-status'), 'done');
    assert.match(doneChip.textContent || '', /920 ms/);

    await act(async () => {
      root.render(
        React.createElement(CallChip, {
          icon: 'terminal',
          name: 'bash',
          argument: 'npm run build',
          status: 'error',
          durationMs: 1450,
          showTimer: true,
          onRetry: () => {
            retries += 1;
          },
        })
      );
    });

    const errChip = container.querySelector('button[data-testid="call-chip"]') as HTMLButtonElement | null;
    assert.ok(errChip, 'Failed CallChip with onRetry should render as a button');
    assert.equal(errChip.getAttribute('data-status'), 'error');
    assert.match(errChip.textContent || '', /Retry/);
    assert.match(errChip.textContent || '', /1\.5 s|1\.4 s/);

    await act(async () => {
      errChip.click();
    });
    assert.equal(retries, 1, 'Clicking failed CallChip triggers onRetry');
  });

  test('2. CodexToolRow renders CallChip for running and failed tools, keeps passive reads unboxed', async () => {
    const readTool: ToolExecutionData = {
      toolInvocationId: 'inv-read-1',
      toolName: 'filesystem.read',
      command: 'filesystem.read package.json',
      status: 'success',
      durationMs: 45,
      outputLog: '{"name":"mediobot"}',
    };

    await act(async () => {
      root.render(
        React.createElement(CodexToolRow, {
          action: parseToolAction(readTool),
          isLight: false,
        })
      );
    });

    assert.equal(
      container.querySelector('[data-testid="call-chip"]'),
      null,
      'Completed passive file read must remain quiet unboxed text without CallChip'
    );
    assert.match(container.textContent || '', /Read package\.json/);

    const runningTool: ToolExecutionData = {
      toolInvocationId: 'inv-run-1',
      toolName: 'terminal.execute',
      command: 'terminal.execute npm test',
      status: 'running',
      startedAt: Date.now() - 400,
    };

    await act(async () => {
      root.render(
        React.createElement(CodexToolRow, {
          action: parseToolAction(runningTool),
          isLight: false,
        })
      );
    });

    const liveChip = container.querySelector('[data-testid="call-chip"][data-status="running"]');
    assert.ok(liveChip, 'Running tool row renders CallChip in running state');
    assert.ok(container.querySelector('[data-testid="tool-live-duration"]'), 'Preserves tool-live-duration selector');

    let retried = 0;
    const failedTool: ToolExecutionData = {
      toolInvocationId: 'inv-fail-1',
      toolName: 'terminal.execute',
      command: 'terminal.execute npm run typecheck',
      status: 'failed',
      durationMs: 1200,
      exitCode: 1,
      error: 'TS2322: Type mismatch',
    };

    await act(async () => {
      root.render(
        React.createElement(CodexToolRow, {
          action: parseToolAction(failedTool),
          isLight: true,
          onRetry: () => {
            retried += 1;
          },
        })
      );
    });

    const retryBtn = container.querySelector('button[data-testid="call-chip"][data-status="error"]') as HTMLButtonElement | null;
    assert.ok(retryBtn, 'Failed tool row renders clickable retry CallChip');
    await act(async () => {
      retryBtn.click();
    });
    assert.equal(retried, 1, 'Clicking CallChip retry invokes onRetry without breaking row');
  });
});
