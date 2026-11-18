import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import ThoughtLine from '../mediobot-ui-refinement/src/components/ThoughtLine.tsx';
import { CodexToolCluster } from '../mediobot-ui-refinement/src/features/activity/subcomponents/CodexToolCluster.tsx';
import type { ToolExecutionData } from '../mediobot-ui-refinement/src/types/index.ts';

describe('ThoughtLine & Cluster Execution Integration', () => {
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
    global.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16)) as unknown as typeof requestAnimationFrame;
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

  test('1. ThoughtLine renders live working trace and settles into collapsed doneLabel', async () => {
    let settledCalls = 0;

    await act(async () => {
      root.render(
        React.createElement(ThoughtLine, {
          working: true,
          label: 'Thinking…',
          doneLabel: 'Thought for',
          glyph: 'sparkle',
          steps: ['Inspecting files', 'Drafting architecture', 'Verifying build'],
          collapsible: true,
          collapseOnSettle: true,
          showTimer: true,
          onSettle: () => {
            settledCalls += 1;
          },
        })
      );
    });

    const el = container.querySelector('[data-testid="thought-line"]');
    assert.ok(el, 'ThoughtLine mounts');
    assert.equal(el.getAttribute('data-working'), '');
    assert.equal(el.getAttribute('data-open'), '');
    const steps = container.querySelectorAll('.thought-line__step');
    assert.equal(steps.length, 3);
    assert.equal(steps[0]!.getAttribute('data-done'), '');
    assert.equal(steps[1]!.getAttribute('data-done'), '');
    assert.equal(steps[2]!.getAttribute('data-done'), null, 'Latest active step pulses');

    // Settle transition
    await act(async () => {
      root.render(
        React.createElement(ThoughtLine, {
          working: false,
          label: 'Thinking…',
          doneLabel: 'Thought for',
          glyph: 'sparkle',
          steps: ['Inspecting files', 'Drafting architecture', 'Verifying build'],
          collapsible: true,
          collapseOnSettle: true,
          elapsed: 2.4,
          showTimer: true,
          onSettle: () => {
            settledCalls += 1;
          },
        })
      );
    });

    assert.equal(el.getAttribute('data-working'), null, 'Cleared data-working after settle');
    assert.equal(el.getAttribute('data-open'), null, 'Trace folds closed on settle');
    assert.ok(settledCalls >= 1, 'onSettle invoked cleanly');
    assert.match(el.textContent || '', /Thought for/);
    assert.match(el.textContent || '', /2\.4s/);
  });

  test('2. CodexToolCluster shows live ThoughtLine trace while reading files and settles into expandable filterable drawer', async () => {
    const activeTools: ToolExecutionData[] = [
      {
        toolInvocationId: 'r1',
        toolName: 'filesystem.read',
        command: 'filesystem.read package.json',
        status: 'success',
        durationMs: 120,
      },
      {
        toolInvocationId: 'r2',
        toolName: 'filesystem.read',
        command: 'filesystem.read ThreadView.tsx',
        status: 'running',
        startedAt: Date.now() - 300,
      },
    ];

    await act(async () => {
      root.render(React.createElement(CodexToolCluster, { tools: activeTools }));
    });

    const cluster = container.querySelector('[data-testid="codex-tool-cluster"]');
    assert.ok(cluster, 'Cluster mounts');
    const thoughtLine = cluster.querySelector('[data-testid="thought-line"]');
    assert.ok(thoughtLine, 'Cluster uses ThoughtLine');
    assert.equal(thoughtLine.getAttribute('data-working'), '');
    assert.match(thoughtLine.textContent || '', /Reading files…/);
    assert.match(thoughtLine.textContent || '', /Read package\.json/);
    assert.match(thoughtLine.textContent || '', /Reading ThreadView\.tsx/);

    // Complete second read + add a terminal run -> settled
    const settledTools: ToolExecutionData[] = [
      {
        toolInvocationId: 'r1',
        toolName: 'filesystem.read',
        command: 'filesystem.read package.json',
        status: 'success',
        durationMs: 120,
      },
      {
        toolInvocationId: 'r2',
        toolName: 'filesystem.read',
        command: 'filesystem.read ThreadView.tsx',
        status: 'success',
        durationMs: 240,
      },
      {
        toolInvocationId: 'c1',
        toolName: 'terminal.execute',
        command: 'terminal.execute npm test',
        status: 'success',
        durationMs: 900,
      },
    ];

    await act(async () => {
      root.render(React.createElement(CodexToolCluster, { tools: settledTools }));
    });

    assert.equal(thoughtLine.getAttribute('data-working'), null, 'Cluster settles cleanly');
    assert.match(thoughtLine.textContent || '', /Read files, ran a command/);
    assert.match(thoughtLine.textContent || '', /1\.3s|1\.2s/);

    // Click ThoughtLine toggle button to open filterable CodexToolRow list
    const toggleBtn = cluster.querySelector('button.thought-line__head') as HTMLButtonElement | null;
    assert.ok(toggleBtn, 'Cluster toggle button exists');
    await act(async () => {
      toggleBtn.click();
    });
    assert.equal(thoughtLine.getAttribute('data-open'), '');
    assert.match(cluster.textContent || '', /Files \(2\)/);
    assert.match(cluster.textContent || '', /Commands \(1\)/);
  });

  test('3. CodexToolCluster shows live CallChip inside ThoughtLine fold when running terminal command alongside reads', async () => {
    const mixedActiveTools: ToolExecutionData[] = [
      {
        toolInvocationId: 'r1',
        toolName: 'filesystem.read',
        command: 'filesystem.read package.json',
        status: 'success',
        durationMs: 80,
      },
      {
        toolInvocationId: 'c1',
        toolName: 'terminal.execute',
        command: 'terminal.execute npm run typecheck',
        status: 'running',
        startedAt: Date.now() - 250,
      },
    ];

    await act(async () => {
      root.render(React.createElement(CodexToolCluster, { tools: mixedActiveTools }));
    });

    const thoughtLine = container.querySelector('[data-testid="thought-line"]');
    assert.ok(thoughtLine, 'Cluster ThoughtLine mounts');
    assert.match(thoughtLine.textContent || '', /Running command…/);
    const steps = container.querySelectorAll('.thought-line__step');
    assert.equal(steps[0]?.getAttribute('data-done'), '', 'Completed file read step is ticked');

    const activeChip = container.querySelector('[data-testid="call-chip"][data-status="running"]');
    assert.ok(activeChip, 'Active running terminal command also renders live CallChip inside the fold');
  });
});
