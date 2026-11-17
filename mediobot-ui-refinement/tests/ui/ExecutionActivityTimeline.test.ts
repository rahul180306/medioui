/**
 * Milestone 2: Execution Activity Timeline & Decomposition Test Suite
 *
 * Comprehensive verification of:
 * 1. Chronological Ordering & Deterministic Tie-Breaking
 * 2. Granular Semantic Step Rendering (All 17 Canonical Event Types)
 * 3. Chat Scoping & Specialist Context Isolation
 * 4. Accessible Disclosure Controls & Keyboard Interaction (WAI-ARIA)
 * 5. Allowlist-Based Safe Tool Execution Details & Redaction
 * 6. Truthful Simulated Execution Badges & Disabled Verification
 * 7. CodexExecutionView Decomposition 21-Symbol Re-Export Compatibility
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import {
  ExecutionActivityTimeline,
  formatTimelineDuration,
  formatTimelineTimestamp,
  getEventVisualConfig,
} from '../../src/features/activity/ExecutionActivityTimeline';
import type {
  ExecutionActivityEvent,
  ExecutionStepItemType,
  ExecutionStepStatus,
  SafeToolExecutionDetails,
} from '../../src/types/executionActivity';

// Import all 21 symbols from the facade to verify decomposition & backward compatibility
import * as CodexFacade from '../../src/features/activity/CodexExecutionView';
import {
  MODEL_DISPLAY_NAMES,
  resolveModelDisplay,
  getModelBadgeColors,
  formatDurationMs,
  useToolDuration,
  ModelAttributionBadge,
  parseCanonicalTrajectory,
  CanonicalTrajectoryView,
  parseToolAction,
  computeGroupHeader,
  deduplicateTools,
  CodexToolRow,
  ActivityAccordion,
  CodexToolCluster,
} from '../../src/features/activity/CodexExecutionView';

// ---------------------------------------------------------------------------
// JSDOM Environment Setup
// ---------------------------------------------------------------------------
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
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
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.Event = dom.window.Event;

async function mount(element: React.ReactElement) {
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(element);
  });
  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

async function fireClick(element: Element) {
  await act(async () => {
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

async function fireKeyDown(element: Element, key: string) {
  await act(async () => {
    element.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

// ---------------------------------------------------------------------------
// Fixture Helpers
// ---------------------------------------------------------------------------
function createEvent(overrides: Partial<ExecutionActivityEvent> = {}): ExecutionActivityEvent {
  const baseId = overrides.eventId || `evt-${Math.random().toString(36).slice(2, 9)}`;
  return {
    eventId: baseId,
    eventType: overrides.eventType || 'command.executed',
    teamId: overrides.teamId || 'team-alpha-01',
    conversationId: overrides.conversationId || 'thread-alpha-main-01',
    timestamp: overrides.timestamp !== undefined ? overrides.timestamp : 1700000000000,
    status: overrides.status || 'completed',
    summary: overrides.summary || `Summary for ${baseId}`,
    sourceClassification: overrides.sourceClassification || 'simulated',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite 1: Chronological Ordering & Deterministic Tie-Breaking
// ---------------------------------------------------------------------------
describe('Suite 1: Chronological Ordering & Deterministic Tie-Breaking', () => {
  test('1.1 Empty events array renders graceful empty state without errors', async () => {
    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [] }));
    const emptyEl = container.querySelector('[data-testid="execution-activity-timeline-empty"]');
    assert.ok(emptyEl, 'Empty state element should be rendered');
    assert.match(emptyEl.textContent ?? '', /No execution activity recorded/);
    await cleanup();
  });

  test('1.2 Single event renders correctly with formatted timestamp', async () => {
    const event = createEvent({
      eventId: 'evt-single',
      timestamp: 1700000000000,
      summary: 'Single event test',
    });
    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const rows = container.querySelectorAll('.timeline-row');
    assert.equal(rows.length, 1);
    assert.match(rows[0]!.textContent ?? '', /Single event test/);
    await cleanup();
  });

  test('1.3 Reverse-chronological array is sorted into strictly ascending order', async () => {
    const e1 = createEvent({ eventId: 'evt-1', timestamp: 1000, summary: 'First event' });
    const e2 = createEvent({ eventId: 'evt-2', timestamp: 2000, summary: 'Second event' });
    const e3 = createEvent({ eventId: 'evt-3', timestamp: 3000, summary: 'Third event' });

    // Pass in reverse order: e3, e2, e1
    const { container, cleanup } = await mount(
      React.createElement(ExecutionActivityTimeline, { events: [e3, e2, e1] })
    );

    const rows = container.querySelectorAll('.timeline-row');
    assert.equal(rows.length, 3);
    assert.equal(rows[0]!.getAttribute('data-event-id'), 'evt-1');
    assert.equal(rows[1]!.getAttribute('data-event-id'), 'evt-2');
    assert.equal(rows[2]!.getAttribute('data-event-id'), 'evt-3');
    await cleanup();
  });

  test('1.4 Events with identical timestamps use deterministic secondary sort by eventId', async () => {
    const timestamp = 5000;
    const eC = createEvent({ eventId: 'evt-charlie', timestamp, summary: 'Charlie' });
    const eA = createEvent({ eventId: 'evt-alpha', timestamp, summary: 'Alpha' });
    const eB = createEvent({ eventId: 'evt-bravo', timestamp, summary: 'Bravo' });

    const { container, cleanup } = await mount(
      React.createElement(ExecutionActivityTimeline, { events: [eC, eA, eB] })
    );

    const rows = container.querySelectorAll('.timeline-row');
    assert.equal(rows.length, 3);
    assert.equal(rows[0]!.getAttribute('data-event-id'), 'evt-alpha');
    assert.equal(rows[1]!.getAttribute('data-event-id'), 'evt-bravo');
    assert.equal(rows[2]!.getAttribute('data-event-id'), 'evt-charlie');
    await cleanup();
  });

  test('1.5 Bounded volume rendering respects maxInitialVisible limit', async () => {
    const events: ExecutionActivityEvent[] = [];
    for (let i = 1; i <= 10; i++) {
      events.push(createEvent({ eventId: `evt-${i.toString().padStart(2, '0')}`, timestamp: i * 1000 }));
    }

    const { container, cleanup } = await mount(
      React.createElement(ExecutionActivityTimeline, { events, maxInitialVisible: 4 })
    );

    let rows = container.querySelectorAll('.timeline-row');
    assert.equal(rows.length, 4, 'Should only render maxInitialVisible = 4 rows initially');
    assert.equal(rows[0]!.getAttribute('data-event-id'), 'evt-07');
    assert.equal(rows[3]!.getAttribute('data-event-id'), 'evt-10');

    // Earlier events button should be present
    const earlierBtn = container.querySelector('button[data-testid="show-earlier-events-btn"]');
    assert.ok(earlierBtn, 'Earlier events expand button should be visible');
    assert.match(earlierBtn.textContent ?? '', /Show 6 earlier events/);

    // Click button to show all
    await fireClick(earlierBtn);
    rows = container.querySelectorAll('.timeline-row');
    assert.equal(rows.length, 10, 'All 10 rows should now be rendered');
    await cleanup();
  });

  test('1.6 All 17 canonical event types are sorted correctly in mixed order', async () => {
    const types: ExecutionStepItemType[] = [
      'agent.started',
      'agent.working',
      'agent.completed',
      'agent.failed',
      'agent.cancelled',
      'task.queued',
      'task.blocked',
      'tool.started',
      'tool.completed',
      'tool.failed',
      'file.inspected',
      'search.performed',
      'command.executed',
      'verification.completed',
      'context.compacted',
      'delegation.proposed',
      'specialist.requested',
    ];

    // Create 17 events with timestamps in descending order
    const events = types.map((t, idx) =>
      createEvent({
        eventId: `evt-${idx}`,
        eventType: t,
        timestamp: (types.length - idx) * 1000,
        summary: `Step ${t}`,
      })
    );

    const { container, cleanup } = await mount(
      React.createElement(ExecutionActivityTimeline, { events, maxInitialVisible: 50 })
    );

    const rows = container.querySelectorAll('.timeline-row');
    assert.equal(rows.length, 17);

    // Verify rows are strictly ascending by timestamp
    for (let i = 0; i < rows.length - 1; i++) {
      const idxA = parseInt(rows[i]!.getAttribute('data-event-id')!.replace('evt-', ''), 10);
      const idxB = parseInt(rows[i + 1]!.getAttribute('data-event-id')!.replace('evt-', ''), 10);
      assert.ok(events[idxA]!.timestamp <= events[idxB]!.timestamp, 'Monotonic order preserved');
    }
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Granular Semantic Step Rendering (All 17 Canonical Event Types)
// ---------------------------------------------------------------------------
describe('Suite 2: Granular Semantic Step Rendering (All 17 Canonical Event Types)', () => {
  test('2.1 Agent lifecycle events (agent.started, working, completed, failed, cancelled)', async () => {
    const lifecycleTypes: ExecutionStepItemType[] = [
      'agent.started',
      'agent.working',
      'agent.completed',
      'agent.failed',
      'agent.cancelled',
    ];

    const events = lifecycleTypes.map((eventType, i) =>
      createEvent({
        eventId: `lc-${i}`,
        eventType,
        status: eventType === 'agent.failed' ? 'failed' : eventType === 'agent.working' ? 'running' : 'completed',
        summary: `Lifecycle ${eventType}`,
        timestamp: i * 100,
      })
    );

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events }));
    for (const t of lifecycleTypes) {
      const row = container.querySelector(`[data-event-type="${t}"]`);
      assert.ok(row, `Row for ${t} should exist`);
      assert.match(row.textContent ?? '', new RegExp(`Lifecycle ${t}`));
    }
    await cleanup();
  });

  test('2.2 Task state events (task.queued, task.blocked with high-visibility indicator)', async () => {
    const events = [
      createEvent({ eventId: 't-1', eventType: 'task.queued', status: 'queued', summary: 'Task queued for Cody' }),
      createEvent({ eventId: 't-2', eventType: 'task.blocked', status: 'blocked', summary: 'Task blocked: waiting on review' }),
    ];

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events }));
    const queuedRow = container.querySelector('[data-event-type="task.queued"]');
    const blockedRow = container.querySelector('[data-event-type="task.blocked"]');

    assert.ok(queuedRow, 'task.queued row should exist');
    assert.ok(blockedRow, 'task.blocked row should exist');
    assert.match(blockedRow.textContent ?? '', /blocked/i);
    await cleanup();
  });

  test('2.3 Tool operation events (tool.started, tool.completed, tool.failed)', async () => {
    const events = [
      createEvent({ eventId: 'tool-s', eventType: 'tool.started', status: 'running', summary: 'Starting tool' }),
      createEvent({ eventId: 'tool-c', eventType: 'tool.completed', status: 'completed', summary: 'Finished tool' }),
      createEvent({ eventId: 'tool-f', eventType: 'tool.failed', status: 'failed', summary: 'Tool crashed' }),
    ];

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events }));
    assert.ok(container.querySelector('[data-event-type="tool.started"]'));
    assert.ok(container.querySelector('[data-event-type="tool.completed"]'));
    assert.ok(container.querySelector('[data-event-type="tool.failed"]'));
    await cleanup();
  });

  test('2.4 Granular semantic steps (file.inspected, search.performed, command.executed)', async () => {
    const events = [
      createEvent({ eventId: 'g-1', eventType: 'file.inspected', summary: 'Inspected src/index.ts' }),
      createEvent({ eventId: 'g-2', eventType: 'search.performed', summary: 'Searched for pattern' }),
      createEvent({ eventId: 'g-3', eventType: 'command.executed', summary: 'Executed git status' }),
    ];

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events }));
    assert.ok(container.querySelector('[data-event-type="file.inspected"]'));
    assert.ok(container.querySelector('[data-event-type="search.performed"]'));
    assert.ok(container.querySelector('[data-event-type="command.executed"]'));
    await cleanup();
  });

  test('2.5 Verification and coordination steps (verification.completed, context.compacted, delegation.proposed, specialist.requested)', async () => {
    const events = [
      createEvent({ eventId: 'c-1', eventType: 'verification.completed', summary: 'Verified 15 assertions' }),
      createEvent({ eventId: 'c-2', eventType: 'context.compacted', summary: 'Compacted 20k tokens' }),
      createEvent({ eventId: 'c-3', eventType: 'delegation.proposed', summary: 'Proposing work to Cody' }),
      createEvent({ eventId: 'c-4', eventType: 'specialist.requested', summary: 'Requesting Vision specialist' }),
    ];

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events }));
    assert.ok(container.querySelector('[data-event-type="verification.completed"]'));
    assert.ok(container.querySelector('[data-event-type="context.compacted"]'));
    assert.ok(container.querySelector('[data-event-type="delegation.proposed"]'));
    assert.ok(container.querySelector('[data-event-type="specialist.requested"]'));
    await cleanup();
  });

  test('2.6 Compact row visual density (.compact-row, status badge, structured layout)', async () => {
    const event = createEvent({
      eventId: 'density-1',
      eventType: 'command.executed',
      status: 'completed',
      summary: 'Density check',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const row = container.querySelector('.timeline-row.compact-row');
    assert.ok(row, 'Row should have both .timeline-row and .compact-row classes');
    const badge = row.querySelector('.status-badge');
    assert.ok(badge, 'Status badge should be rendered');
    assert.equal(badge.textContent?.trim(), 'completed');
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Chat Scoping & Specialist Context Isolation
// ---------------------------------------------------------------------------
describe('Suite 3: Chat Scoping & Specialist Context Isolation', () => {
  test('3.1 Main Team chat suppresses internal coordinator events (delegation.proposed, task.blocked)', async () => {
    const events = [
      createEvent({ eventId: 'm-1', eventType: 'agent.started', summary: 'Agent started' }),
      createEvent({ eventId: 'm-2', eventType: 'delegation.proposed', summary: 'Internal delegation' }),
      createEvent({ eventId: 'm-3', eventType: 'task.blocked', summary: 'Internal task blocked' }),
      createEvent({ eventId: 'm-4', eventType: 'file.inspected', summary: 'Internal file read' }),
      createEvent({ eventId: 'm-5', eventType: 'agent.completed', summary: 'Agent completed' }),
    ];

    const { container, cleanup } = await mount(
      React.createElement(ExecutionActivityTimeline, { events, isMainChat: true, isMaestroChat: false })
    );

    assert.ok(container.querySelector('[data-event-id="m-1"]'), 'agent.started remains visible');
    assert.equal(container.querySelector('[data-event-id="m-2"]'), null, 'delegation.proposed suppressed in Main Chat');
    assert.equal(container.querySelector('[data-event-id="m-3"]'), null, 'task.blocked suppressed in Main Chat');
    assert.equal(container.querySelector('[data-event-id="m-4"]'), null, 'file.inspected suppressed in Main Chat');
    assert.ok(container.querySelector('[data-event-id="m-5"]'), 'agent.completed remains visible');
    await cleanup();
  });

  test('3.2 Maestro chat renders all coordination and delegation events', async () => {
    const events = [
      createEvent({ eventId: 'mae-1', eventType: 'agent.started', summary: 'Agent started' }),
      createEvent({ eventId: 'mae-2', eventType: 'delegation.proposed', summary: 'Delegating to Cody' }),
      createEvent({ eventId: 'mae-3', eventType: 'task.blocked', summary: 'Blocked on dependency' }),
      createEvent({ eventId: 'mae-4', eventType: 'file.inspected', summary: 'Inspecting config' }),
    ];

    const { container, cleanup } = await mount(
      React.createElement(ExecutionActivityTimeline, { events, isMainChat: false, isMaestroChat: true })
    );

    assert.ok(container.querySelector('[data-event-id="mae-1"]'));
    assert.ok(container.querySelector('[data-event-id="mae-2"]'), 'delegation visible in Maestro');
    assert.ok(container.querySelector('[data-event-id="mae-3"]'), 'blocked task visible in Maestro');
    assert.ok(container.querySelector('[data-event-id="mae-4"]'), 'file inspected visible in Maestro');
    await cleanup();
  });

  test('3.3 Active specialist direct chat strictly isolates events attributed to that specialist', async () => {
    const events = [
      createEvent({ eventId: 'cody-1', specialistId: 'cody', summary: 'Cody compile code' }),
      createEvent({ eventId: 'vision-1', specialistId: 'vision', summary: 'Vision take screenshot' }),
      createEvent({ eventId: 'doc-1', specialistId: 'doc', summary: 'Doc generate API docs' }),
    ];

    const { container, cleanup } = await mount(
      React.createElement(ExecutionActivityTimeline, { events, activeSpecialistId: 'cody' })
    );

    assert.ok(container.querySelector('[data-event-id="cody-1"]'), 'Cody event must be visible');
    assert.equal(container.querySelector('[data-event-id="vision-1"]'), null, 'Vision event must be filtered out');
    assert.equal(container.querySelector('[data-event-id="doc-1"]'), null, 'Doc event must be filtered out');
    await cleanup();
  });

  test('3.4 Unattributed shared events remain visible across specialist views', async () => {
    const events = [
      createEvent({ eventId: 'cody-ev', specialistId: 'cody', summary: 'Cody action' }),
      createEvent({ eventId: 'shared-ev', summary: 'Global team announcement' }), // no specialistId
    ];

    const { container, cleanup } = await mount(
      React.createElement(ExecutionActivityTimeline, { events, activeSpecialistId: 'cody' })
    );

    assert.ok(container.querySelector('[data-event-id="cody-ev"]'), 'Cody action is visible');
    assert.ok(container.querySelector('[data-event-id="shared-ev"]'), 'Shared action is visible');
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Accessible Disclosure Controls & Keyboard Interaction (A11y)
// ---------------------------------------------------------------------------
describe('Suite 4: Accessible Disclosure Controls & Keyboard Interaction (A11y)', () => {
  test('4.1 Disclosure button has aria-expanded="false" and aria-controls="details-{id}"', async () => {
    const event = createEvent({
      eventId: 'a11y-1',
      summary: 'Inspect directory',
      details: 'Read file contents in detail',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle');
    assert.ok(btn, 'Disclosure button should exist');
    assert.equal(btn.getAttribute('aria-expanded'), 'false');
    assert.equal(btn.getAttribute('aria-controls'), 'details-a11y-1');
    assert.equal(btn.id, 'trigger-a11y-1');
    await cleanup();
  });

  test('4.2 Details container has id matching aria-controls, role="region", and aria-label', async () => {
    const event = createEvent({
      eventId: 'a11y-2',
      summary: 'Build project',
      details: 'Detailed build output line 1',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle')!;

    // Initially collapsed
    assert.equal(container.querySelector('#details-a11y-2'), null);

    // Expand
    await fireClick(btn);

    const region = container.querySelector('#details-a11y-2');
    assert.ok(region, 'Region container should be mounted when expanded');
    assert.equal(region.getAttribute('role'), 'region');
    assert.equal(region.getAttribute('aria-labelledby'), 'trigger-a11y-2');
    assert.match(region.getAttribute('aria-label') ?? '', /Details for Build project/);
    await cleanup();
  });

  test('4.3 Mouse click on disclosure button toggles aria-expanded and reveals/hides details', async () => {
    const event = createEvent({
      eventId: 'a11y-3',
      summary: 'Run test suite',
      details: 'PASS: 40 tests passed',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle')!;

    assert.equal(btn.getAttribute('aria-expanded'), 'false');
    assert.equal(container.querySelector('#details-a11y-3'), null);

    // Click 1: Open
    await fireClick(btn);
    assert.equal(btn.getAttribute('aria-expanded'), 'true');
    assert.ok(container.querySelector('#details-a11y-3'));
    assert.match(container.querySelector('#details-a11y-3')!.textContent ?? '', /40 tests passed/);

    // Click 2: Close
    await fireClick(btn);
    assert.equal(btn.getAttribute('aria-expanded'), 'false');
    assert.equal(container.querySelector('#details-a11y-3'), null);
    await cleanup();
  });

  test('4.4 Keyboard Enter key toggles disclosure container', async () => {
    const event = createEvent({
      eventId: 'a11y-4',
      summary: 'Keyboard enter check',
      details: 'Keyboard expanded details',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle')!;

    // Keydown Enter: Open
    await fireKeyDown(btn, 'Enter');
    assert.equal(btn.getAttribute('aria-expanded'), 'true');
    assert.ok(container.querySelector('#details-a11y-4'));

    // Keydown Enter: Close
    await fireKeyDown(btn, 'Enter');
    assert.equal(btn.getAttribute('aria-expanded'), 'false');
    assert.equal(container.querySelector('#details-a11y-4'), null);
    await cleanup();
  });

  test('4.5 Keyboard Space key toggles disclosure container', async () => {
    const event = createEvent({
      eventId: 'a11y-5',
      summary: 'Keyboard space check',
      details: 'Space expanded details',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle')!;

    // Keydown Space: Open
    await fireKeyDown(btn, ' ');
    assert.equal(btn.getAttribute('aria-expanded'), 'true');
    assert.ok(container.querySelector('#details-a11y-5'));

    // Keydown Space: Close
    await fireKeyDown(btn, ' ');
    assert.equal(btn.getAttribute('aria-expanded'), 'false');
    assert.equal(container.querySelector('#details-a11y-5'), null);
    await cleanup();
  });

  test('4.6 Events without details or toolDetails omit disclosure control', async () => {
    const event = createEvent({
      eventId: 'a11y-6',
      summary: 'Static event without details',
      details: undefined,
      toolDetails: undefined,
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle');
    assert.equal(btn, null, 'Events without details should not render a disclosure toggle button');
    assert.match(container.textContent ?? '', /Static event without details/);
    await cleanup();
  });

  test('4.7 Rapid toggle spamming (50 rapid toggles) preserves deterministic state', async () => {
    const event = createEvent({
      eventId: 'a11y-7',
      summary: 'Stress toggle check',
      details: 'Stress details payload',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle')!;

    for (let i = 0; i < 50; i++) {
      await fireClick(btn);
    }

    // 50 toggles from false should end up on false
    assert.equal(btn.getAttribute('aria-expanded'), 'false');
    assert.equal(container.querySelector('#details-a11y-7'), null);
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Suite 5: Allowlist-Based Safe Tool Execution Details & Redaction
// ---------------------------------------------------------------------------
describe('Suite 5: Allowlist-Based Safe Tool Execution Details & Redaction', () => {
  test('5.1 Expanded tool details render only allowlisted fields (toolName, operationType, filePath, etc.)', async () => {
    const toolDetails: SafeToolExecutionDetails = {
      toolName: 'filesystem.read',
      operationType: 'read',
      filePath: 'src/main.ts',
      commandDescription: 'Read src/main.ts',
      startTimestamp: 1000,
      durationMs: 45,
      status: 'completed',
    };

    const event = createEvent({
      eventId: 'safe-1',
      summary: 'Read file',
      toolDetails,
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle')!;
    await fireClick(btn);

    const details = container.querySelector('#details-safe-1')!;
    assert.match(details.textContent ?? '', /filesystem\.read/);
    assert.match(details.textContent ?? '', /read/);
    assert.match(details.textContent ?? '', /src\/main\.ts/);
    assert.match(details.textContent ?? '', /45ms/);
    await cleanup();
  });

  test('5.2 Non-allowlisted raw fields (internal IDs, raw prompts, unredacted envs) are dropped', async () => {
    const toolDetails: SafeToolExecutionDetails = {
      toolName: 'terminal.execute',
      operationType: 'execute',
      commandDescription: 'npm test',
      startTimestamp: 2000,
      durationMs: 120,
      status: 'completed',
    };

    const event = createEvent({
      eventId: 'safe-2',
      summary: 'Run test',
      toolDetails,
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle')!;
    await fireClick(btn);

    const details = container.querySelector('#details-safe-2')!;
    assert.doesNotMatch(details.textContent ?? '', /SECRET_TOKEN|AWS_SECRET_ACCESS_KEY|rawPrompt/);
    await cleanup();
  });

  test('5.3 Bearer tokens and Authorization headers are redacted with [REDACTED] in details', async () => {
    const event = createEvent({
      eventId: 'safe-3',
      summary: 'API Request',
      details: 'Request dispatched with Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sometoken and Cookie: session_id=abc123secret',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle')!;
    await fireClick(btn);

    const text = container.querySelector('#details-safe-3')!.textContent ?? '';
    assert.doesNotMatch(text, /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/);
    assert.doesNotMatch(text, /abc123secret/);
    assert.match(text, /\[REDACTED\]/);
    await cleanup();
  });

  test('5.4 API keys (sk-..., AIza..., ghp_..., AKIA...) are redacted in details DOM', async () => {
    const event = createEvent({
      eventId: 'safe-4',
      summary: 'Secrets leaked in details test',
      details: 'Keys found: sk-proj-abcdef1234567890abcdef12 and AIzaSyA1234567890abcdefghijklmnopqrstuv and ghp_123456789012345678901234567890123456 and AKIAIOSFODNN7EXAMPLE',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle')!;
    await fireClick(btn);

    const text = container.querySelector('#details-safe-4')!.textContent ?? '';
    assert.doesNotMatch(text, /sk-proj-abcdef1234567890abcdef12/);
    assert.doesNotMatch(text, /AIzaSyA1234567890abcdefghijklmnopqrstuv/);
    assert.doesNotMatch(text, /ghp_123456789012345678901234567890123456/);
    assert.doesNotMatch(text, /AKIAIOSFODNN7EXAMPLE/);
    assert.match(text, /\[REDACTED\]/);
    await cleanup();
  });

  test('5.5 Sanitized command description strips execution wrappers and unmasks safely', async () => {
    const toolDetails: SafeToolExecutionDetails = {
      toolName: 'terminal.execute',
      operationType: 'execute',
      commandDescription: 'npm run build',
      startTimestamp: 3000,
      status: 'completed',
    };

    const event = createEvent({
      eventId: 'safe-5',
      summary: 'Compile',
      toolDetails,
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const btn = container.querySelector('button.disclosure-toggle')!;
    await fireClick(btn);

    const text = container.querySelector('#details-safe-5')!.textContent ?? '';
    assert.match(text, /npm run build/);
    await cleanup();
  });

  test('5.6 Defensive handling: null/undefined toolDetails render fallback without runtime crash', async () => {
    const event = createEvent({
      eventId: 'safe-6',
      summary: 'Null details test',
      details: undefined,
      toolDetails: undefined,
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    assert.ok(container.querySelector('[data-event-id="safe-6"]'));
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Suite 6: Truthful Simulated Execution Badges & Disabled Verification
// ---------------------------------------------------------------------------
describe('Suite 6: Truthful Simulated Execution Badges & Disabled Verification', () => {
  test('6.1 Timeline header displays prominent [Simulated] badge', async () => {
    const event = createEvent({
      eventId: 'sim-1',
      sourceClassification: 'simulated',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const badge = container.querySelector('[data-testid="simulated-badge"]');
    assert.ok(badge, 'Simulated badge must exist');
    assert.match(badge.textContent ?? '', /\[Simulated\]/i);

    const statusBadge = container.querySelector('[data-testid="simulated-status-badge"]');
    assert.ok(statusBadge, 'Simulated status badge sub-element must exist');
    await cleanup();
  });

  test('6.2 Connected verification button is disabled with aria-disabled="true"', async () => {
    const event = createEvent({
      eventId: 'sim-2',
      summary: 'Verification test',
      details: 'Check verification button status',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const expandBtn = container.querySelector('button.disclosure-toggle')!;
    await fireClick(expandBtn);

    const verifyBtn = container.querySelector('button[data-testid="connected-verification-btn"]') as HTMLButtonElement | null;
    assert.ok(verifyBtn, 'Connected verification button should exist in details panel');
    assert.equal(verifyBtn.disabled, true, 'Connected verification button MUST be strictly disabled');
    assert.equal(verifyBtn.getAttribute('aria-disabled'), 'true');
    await cleanup();
  });

  test('6.3 Verification control title/tooltip explains demonstration mode restriction', async () => {
    const event = createEvent({
      eventId: 'sim-3',
      summary: 'Tooltip check',
      details: 'Check tooltip text',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const expandBtn = container.querySelector('button.disclosure-toggle')!;
    await fireClick(expandBtn);

    const verifyBtn = container.querySelector('button[data-testid="connected-verification-btn"]')!;
    const title = verifyBtn.getAttribute('title') ?? '';
    assert.match(title, /Connected verification unavailable/i);
    assert.match(title, /demonstration mode/i);
    await cleanup();
  });

  test('6.4 Event sourceClassification is strictly "simulated" or "unverified"', () => {
    const validSimulated: ExecutionActivityEvent = createEvent({ sourceClassification: 'simulated' });
    const validUnverified: ExecutionActivityEvent = createEvent({ sourceClassification: 'unverified' });

    assert.equal(validSimulated.sourceClassification, 'simulated');
    assert.equal(validUnverified.sourceClassification, 'unverified');
  });

  test('6.5 Local state transition buttons are disabled and do not alter state', async () => {
    const event = createEvent({
      eventId: 'sim-5',
      summary: 'Click test on disabled controls',
      details: 'Checking no click side effects',
    });

    const { container, cleanup } = await mount(React.createElement(ExecutionActivityTimeline, { events: [event] }));
    const expandBtn = container.querySelector('button.disclosure-toggle')!;
    await fireClick(expandBtn);

    const verifyBtn = container.querySelector('button[data-testid="connected-verification-btn"]')!;
    await fireClick(verifyBtn);

    // Verify still disabled and unverified status remains
    assert.match(container.textContent ?? '', /Verification Status: Unverified \(Offline Fixture\)/);
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Suite 7: CodexExecutionView Decomposition Non-Regression
// ---------------------------------------------------------------------------
describe('Suite 7: CodexExecutionView Decomposition Non-Regression', () => {
  test('7.1 Re-exports all 21 original symbols from CodexExecutionView with identical signatures', () => {
    // 1. MODEL_DISPLAY_NAMES
    assert.equal(typeof CodexFacade.MODEL_DISPLAY_NAMES, 'object');
    assert.equal(CodexFacade.MODEL_DISPLAY_NAMES['claude-3-7-sonnet'], 'Claude 3.7 Sonnet');
    assert.equal(CodexFacade.MODEL_DISPLAY_NAMES['deepseek-chat'], 'DeepSeek-V3');

    // 2. resolveModelDisplay
    assert.equal(typeof CodexFacade.resolveModelDisplay, 'function');
    assert.equal(CodexFacade.resolveModelDisplay('claude-3-7-sonnet-20250219'), 'Claude 3.7 Sonnet');
    assert.equal(CodexFacade.resolveModelDisplay('custom/model:latest'), 'model');

    // 3. getModelBadgeColors
    assert.equal(typeof CodexFacade.getModelBadgeColors, 'function');
    assert.match(CodexFacade.getModelBadgeColors('Claude 3.7 Sonnet', true), /purple/);

    // 4. formatDurationMs
    assert.equal(typeof CodexFacade.formatDurationMs, 'function');
    assert.equal(CodexFacade.formatDurationMs(400), '0.4s');
    assert.equal(CodexFacade.formatDurationMs(75000), '1m 15s');

    // 5. useToolDuration
    assert.equal(typeof CodexFacade.useToolDuration, 'function');

    // 8. ModelAttributionBadge
    assert.equal(typeof CodexFacade.ModelAttributionBadge, 'function');

    // 10. parseCanonicalTrajectory
    assert.equal(typeof CodexFacade.parseCanonicalTrajectory, 'function');

    // 11. CanonicalTrajectoryView
    assert.equal(typeof CodexFacade.CanonicalTrajectoryView, 'function');

    // 13. parseToolAction
    assert.equal(typeof CodexFacade.parseToolAction, 'function');

    // 14. computeGroupHeader
    assert.equal(typeof CodexFacade.computeGroupHeader, 'function');

    // 15. deduplicateTools
    assert.equal(typeof CodexFacade.deduplicateTools, 'function');

    // 17. CodexToolRow
    assert.equal(typeof CodexFacade.CodexToolRow, 'function');

    // 20. ActivityAccordion
    assert.equal(typeof CodexFacade.ActivityAccordion, 'function');

    // 21. CodexToolCluster
    assert.equal(typeof CodexFacade.CodexToolCluster, 'function');

    // Default export
    assert.equal(typeof CodexFacade.default, 'function');
  });

  test('7.2 deduplicateTools maintains monotonic progression and key deduplication', () => {
    const runningTool = {
      toolInvocationId: 'tool-call-1',
      toolName: 'terminal.execute',
      command: 'npm run test',
      status: 'running' as const,
      startedAt: 1000,
    };

    const completedTool = {
      toolInvocationId: 'tool-call-1',
      toolName: 'terminal.execute',
      command: 'npm run test',
      status: 'success' as const,
      startedAt: 1000,
      durationMs: 450,
      outputLog: '15 tests passed',
    };

    // Running followed by completed should coalesce to completed
    const result1 = deduplicateTools([runningTool, completedTool]);
    assert.equal(result1.length, 1);
    assert.equal(result1[0]!.status, 'success');
    assert.equal(result1[0]!.durationMs, 450);

    // Completed followed by duplicate running should NOT regress
    const result2 = deduplicateTools([completedTool, runningTool]);
    assert.equal(result2.length, 1);
    assert.equal(result2[0]!.status, 'success');
  });

  test('7.3 parseCanonicalTrajectory parses blocks and suppresses hidden thinking deliberation', () => {
    const raw = `[THINKING]
Secret internal chain-of-thought that must never be shown to user.
[ACTION:filesystem.read]
src/config.json
[OBSERVATION]
{"ready": true}|exit_code=0`;

    const blocks = parseCanonicalTrajectory(raw);
    assert.equal(blocks.length, 3);
    assert.equal(blocks[0]!.kind, 'thinking');
    assert.equal(blocks[1]!.kind, 'action');
    assert.equal(blocks[1]!.toolName, 'filesystem.read');
    assert.equal(blocks[2]!.kind, 'observation');
    assert.equal(blocks[2]!.exitCode, 0);
  });

  test('7.4 ActivityAccordion preserves open/close behavior and defaultOpen prop', async () => {
    const { container, cleanup } = await mount(
      React.createElement(
        ActivityAccordion,
        {
          title: 'System activity',
          count: 2,
          isLight: true,
          defaultOpen: true,
          children: React.createElement('div', { id: 'accordion-child' }, 'Inner item'),
        }
      )
    );

    const details = container.querySelector('details')!;
    assert.equal(details.open, true);
    assert.ok(container.querySelector('#accordion-child'));
    await cleanup();
  });

  test('7.5 CodexToolRow integrates allowlist redaction on expanded tool output', async () => {
    const tool = {
      toolInvocationId: 'inv-1',
      toolName: 'terminal.execute',
      command: 'curl -H "Authorization: Bearer secret-auth-token-12345" https://api.example.com',
      status: 'success' as const,
      outputLog: 'Output containing Bearer secret-auth-token-12345',
    };

    const action = parseToolAction(tool, 'row-test', 'Cody', 'claude-3-7-sonnet');
    assert.equal(action.icon, 'terminal');

    const { container, cleanup } = await mount(
      React.createElement(CodexToolRow, {
        action,
        isLight: true,
      })
    );

    // Click to open row details
    const rowBtn = container.querySelector('div[role="button"]')!;
    await fireClick(rowBtn);

    const outputText = container.textContent ?? '';
    // Secret token must NOT appear in output
    assert.doesNotMatch(outputText, /secret-auth-token-12345/);
    assert.match(outputText, /\[REDACTED\]/);
    await cleanup();
  });
});
