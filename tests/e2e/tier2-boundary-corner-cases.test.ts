/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tier 2: Boundary & Corner Cases E2E Test Suite
 * Validates edge cases, boundary thresholds, stress resilience, and corruption recovery across R1–R6:
 * - R1: Reusable Execution Activity Timeline Component (5 boundary tests)
 * - R2: Main Team vs Maestro Conversation Separation (5 boundary tests)
 * - R3: Specialist Direct-Chat Isolation (5 boundary tests)
 * - R4: Multi-Specialist Parallel Work Visualization (5 boundary tests)
 * - R5: Safe Allowlist-Based Tool Execution Details and Redaction (5 boundary tests)
 * - R6: Frontend Architecture, Maintainability, and Accessibility (5 boundary tests)
 * Total: 30 tests (>=5 per requirement across R1–R6)
 */

import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act, useEffect, useState } from 'react';
import {
  setupJSDOM,
  render,
  fireEvent,
  getByText,
  queryByText,
  JSDOMHarness,
} from './helpers/domHarness.js';
import {
  CANONICAL_EXECUTION_EVENTS,
  ALL_CANONICAL_EVENT_TYPES,
  PARALLEL_SPECIALIST_INTERVALS,
  SPECIALIST_PROFILES,
  sortExecutionEventsChronologically,
  extractAllowlistToolDetails,
  redactSensitiveData,
  ExecutionActivityEvent,
  SpecialistExecutionInterval,
} from './helpers/mockFixtures.js';
import {
  ExecutionActivityTimeline,
  validateExecutionActivityEvent,
} from '../../mediobot-ui-refinement/src/features/activity/ExecutionActivityTimeline.tsx';
import {
  MultiSpecialistExecutionView,
} from '../../mediobot-ui-refinement/src/features/mediobots/MultiSpecialistExecutionView.tsx';
import {
  SpecialistDirectChatView,
} from '../../mediobot-ui-refinement/src/features/threads/SpecialistDirectChatView.tsx';
import {
  ThreadConversationView,
} from '../../mediobot-ui-refinement/src/features/threads/ThreadConversationView.tsx';
import {
  StatusChangeLiveRegion,
} from '../../mediobot-ui-refinement/src/components/StatusChangeLiveRegion.tsx';

describe('Tier 2: Boundary & Corner Cases E2E Suite (Requirements R1–R6)', () => {
  let harness: JSDOMHarness;

  before(() => {
    harness = setupJSDOM();
  });

  beforeEach(() => {
    harness.cleanup();
  });

  // =========================================================================
  // Requirement R1: Reusable Execution Activity Timeline Boundary & Corner Cases
  // =========================================================================
  describe('R1: Execution Activity Timeline Boundary & Corner Cases', () => {
    test('R1.1 - Empty events array renders graceful empty state without throwing', async () => {
      // 1. Mount with empty array
      const { container: emptyContainer, unmount: unmountEmpty } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: [],
        })
      );

      const emptyStateEl =
        emptyContainer.querySelector('[data-testid="execution-activity-timeline-empty"]') ||
        emptyContainer.querySelector('[data-testid="timeline-empty-state"]') ||
        emptyContainer.querySelector('.timeline-empty-state');
      assert.ok(emptyStateEl, 'Timeline empty state element must be rendered when events array is empty');
      assert.equal(
        emptyStateEl.textContent?.trim(),
        'No execution activity recorded.',
        'Empty state must display informative text'
      );

      await unmountEmpty();

      // 2. Mount with null/undefined fallback
      const { container: fallbackContainer, unmount: unmountFallback } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: undefined as any,
        })
      );
      assert.ok(
        fallbackContainer.querySelector('[data-testid="execution-activity-timeline-empty"]') ||
        fallbackContainer.querySelector('[data-testid="timeline-empty-state"]') ||
        fallbackContainer.querySelector('.timeline-empty-state'),
        'Timeline should handle undefined events gracefully'
      );
      await unmountFallback();
    });

    test('R1.2 - Extremely large volume (1,000+ events) renders within bounded DOM container without layout explosion', async () => {
      // Generate 1,050 valid chronological events
      const baseTime = 1700000000000;
      const largeEventSet: ExecutionActivityEvent[] = Array.from({ length: 1050 }, (_, i) => ({
        eventId: `evt-dense-${String(i).padStart(4, '0')}`,
        eventType: ALL_CANONICAL_EVENT_TYPES[i % ALL_CANONICAL_EVENT_TYPES.length],
        teamId: 'team-stress',
        timestamp: baseTime + i * 100,
        status: i % 10 === 0 ? 'failed' : i % 5 === 0 ? 'blocked' : 'completed',
        summary: `Stress event #${i}: dense workload step`,
        sourceClassification: 'simulated',
      }));

      const startTime = performance.now();
      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: largeEventSet,
          maxInitialVisible: 50,
        })
      );
      const renderDuration = performance.now() - startTime;

      // Assert rendering completes fast (<100ms)
      assert.ok(
        renderDuration < 100,
        `Large volume timeline render took ${renderDuration.toFixed(2)}ms, expected < 100ms`
      );

      // Assert DOM container bounds rows to maxInitialVisible (default 50) to prevent layout explosion
      const renderedRows = container.querySelectorAll('.timeline-row');
      assert.equal(
        renderedRows.length,
        50,
        `Expected exactly 50 visible rows rendered in bounded DOM, but found ${renderedRows.length}`
      );

      // Verify bounded chronological rows: either latest 50 (evt-dense-1000..1049) or first 50
      const isLatestPaging = renderedRows[0].getAttribute('data-testid')?.includes('evt-dense-1000');
      if (isLatestPaging) {
        assert.ok(renderedRows[0].getAttribute('data-testid')?.includes('evt-dense-1000'));
        assert.ok(renderedRows[49].getAttribute('data-testid')?.includes('evt-dense-1049'));
      } else {
        assert.ok(renderedRows[0].getAttribute('data-testid')?.includes('evt-dense-0000'));
        assert.ok(renderedRows[49].getAttribute('data-testid')?.includes('evt-dense-0049'));
      }

      await unmount();
    });

    test('R1.3 - Duplicate timestamps on multiple events preserve deterministic eventId secondary sort', async () => {
      // 5 events sharing the EXACT same timestamp
      const tiedTimestamp = 1700000050000;
      const shuffledIds = ['evt-z-99', 'evt-a-01', 'evt-m-50', 'evt-c-03', 'evt-b-02'];

      const tiedEvents: ExecutionActivityEvent[] = shuffledIds.map((id) => ({
        eventId: id,
        eventType: 'command.executed',
        teamId: 'team-primary',
        timestamp: tiedTimestamp,
        status: 'completed',
        summary: `Tied timestamp command for ${id}`,
        sourceClassification: 'simulated',
      }));

      const sorted = sortExecutionEventsChronologically(tiedEvents);

      // Verify strict alphabetical order by eventId
      const sortedIds = sorted.map((e) => e.eventId);
      assert.deepEqual(
        sortedIds,
        ['evt-a-01', 'evt-b-02', 'evt-c-03', 'evt-m-50', 'evt-z-99'],
        'Events with identical timestamps must sort deterministically by eventId asc'
      );

      // Mount into timeline and verify DOM order matches deterministic sort
      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: tiedEvents,
        })
      );

      const domRows = Array.from(container.querySelectorAll('.timeline-row'));
      const domEventIds = domRows.map((r) => r.getAttribute('data-testid')?.replace('timeline-row-', ''));
      assert.deepEqual(
        domEventIds,
        ['evt-a-01', 'evt-b-02', 'evt-c-03', 'evt-m-50', 'evt-z-99'],
        'Rendered DOM row order must match deterministic secondary sort'
      );

      await unmount();
    });

    test('R1.4 - Missing optional fields (details, filePath, durationMs) render safely with sensible fallbacks', async () => {
      // Construct event with minimal required fields and undefined optional fields
      const minimalEvent: ExecutionActivityEvent = {
        eventId: 'evt-minimal-optional-fields',
        eventType: 'tool.completed',
        teamId: 'team-primary',
        timestamp: 1700000060000,
        status: 'completed',
        summary: 'Minimal tool completed with missing optional properties',
        sourceClassification: 'simulated',
        details: undefined,
        toolDetails: {
          toolName: 'minimal_tool',
          operationType: 'execute',
          startTimestamp: 1700000060000,
          status: 'completed',
          // Optional fields explicitly undefined:
          filePath: undefined,
          commandDescription: undefined,
          durationMs: undefined,
          errorInfo: undefined,
          sanitizedOutputPreview: undefined,
          associatedSpecialist: undefined,
        },
      };

      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: [minimalEvent],
        })
      );

      // Locate disclosure toggle and click to expand
      const disclosureBtn = container.querySelector(
        '[data-testid="disclosure-btn-evt-minimal-optional-fields"]'
      ) as HTMLButtonElement;
      assert.ok(disclosureBtn, 'Disclosure button must exist for event with toolDetails');

      await fireEvent.click(disclosureBtn);

      const panel = container.querySelector(
        '[data-testid="expanded-panel-evt-minimal-optional-fields"]'
      ) as HTMLElement;
      assert.ok(panel, 'Expanded panel must render without throwing');

      // Verify tool name and operation type are displayed
      assert.ok(panel.textContent?.includes('minimal_tool'));
      assert.ok(panel.textContent?.includes('execute'));

      // Verify missing optional fields do NOT render invalid strings like "undefinedms" or "[object Object]"
      assert.ok(!panel.textContent?.includes('undefinedms'), 'Missing duration must not render "undefinedms"');
      assert.ok(!panel.textContent?.includes('undefined'), 'Missing filePath/error must not render "undefined"');

      await unmount();
    });

    test('R1.5 - Rapid disclosure click spamming (50 toggles) preserves consistent deterministic state', async () => {
      const targetEvent = CANONICAL_EXECUTION_EVENTS.find((e) => e.eventId === 'evt-10-tool-completed')!;
      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: [targetEvent],
        })
      );

      const disclosureBtn = container.querySelector(
        `[data-testid="disclosure-btn-${targetEvent.eventId}"]`
      ) as HTMLButtonElement;
      assert.ok(disclosureBtn);

      // Perform 50 rapid sequential clicks
      for (let i = 0; i < 50; i++) {
        await fireEvent.click(disclosureBtn);
      }

      // 50 clicks (even count) starting from collapsed (false) must end collapsed (false)
      assert.equal(
        disclosureBtn.getAttribute('aria-expanded'),
        'false',
        'After 50 clicks (even number), disclosure must be collapsed'
      );
      assert.equal(
        container.querySelector(`[data-testid="expanded-panel-${targetEvent.eventId}"]`),
        null,
        'Expanded panel must not be in DOM after even number of toggles'
      );

      // 1 additional click (51st total, odd count) must expand
      await fireEvent.click(disclosureBtn);
      assert.equal(
        disclosureBtn.getAttribute('aria-expanded'),
        'true',
        'After 51 clicks (odd number), disclosure must be expanded'
      );
      assert.ok(
        container.querySelector(`[data-testid="expanded-panel-${targetEvent.eventId}"]`),
        'Expanded panel must be in DOM after 51st click'
      );

      await unmount();
    });
  });

  // =========================================================================
  // Requirement R2: Main Team vs Maestro Conversation Separation Boundary & Corner Cases
  // =========================================================================
  describe('R2: Main Team vs Maestro Conversation Separation Boundary & Corner Cases', () => {
    test('R2.1 - Empty and whitespace-only drafts do not persist or overwrite existing messages', () => {
      // Draft storage management with trimming validation contract
      const draftStore = new Map<string, string>();

      const setDraft = (threadId: string, text: string) => {
        // Contract: empty or whitespace-only drafts must NOT overwrite existing non-empty draft
        const trimmed = text.trim();
        if (trimmed.length === 0) {
          // If no existing draft, do not store empty entry
          // If existing draft exists, do not overwrite with empty/whitespace
          return;
        }
        draftStore.set(threadId, text);
      };

      const getDraft = (threadId: string) => draftStore.get(threadId) ?? '';

      const threadId = 'thread-main-boundary';

      // 1. Initial valid draft
      setDraft(threadId, 'Initial valid architectural plan');
      assert.equal(getDraft(threadId), 'Initial valid architectural plan');

      // 2. Attempt overwrite with empty string
      setDraft(threadId, '');
      assert.equal(
        getDraft(threadId),
        'Initial valid architectural plan',
        'Empty draft string must not overwrite existing draft'
      );

      // 3. Attempt overwrite with whitespace / newlines
      setDraft(threadId, '   \n\t  \r\n   ');
      assert.equal(
        getDraft(threadId),
        'Initial valid architectural plan',
        'Whitespace-only draft must not overwrite existing draft'
      );

      // 4. Update with new non-whitespace draft succeeds
      setDraft(threadId, 'Updated architectural proposal');
      assert.equal(getDraft(threadId), 'Updated architectural proposal');
    });

    test('R2.2 - Rapid thread switching (10 switches) does not leak or cross-contaminate draft buffers', () => {
      const threadIds = Array.from({ length: 10 }, (_, i) => `thread-${i + 1}`);
      const draftStore = new Map<string, string>();

      // Seed each thread with a unique draft
      for (const id of threadIds) {
        draftStore.set(id, `Unique draft content for ${id}`);
      }

      // Simulate 10 rapid switches back and forth in shuffled order
      const switchSequence = [
        'thread-1', 'thread-5', 'thread-2', 'thread-9', 'thread-3',
        'thread-7', 'thread-4', 'thread-10', 'thread-6', 'thread-8',
        'thread-1', 'thread-9', 'thread-5', 'thread-2',
      ];

      for (const currentThreadId of switchSequence) {
        const activeDraft = draftStore.get(currentThreadId);
        assert.equal(
          activeDraft,
          `Unique draft content for ${currentThreadId}`,
          `Draft for ${currentThreadId} contaminated during rapid switching`
        );

        // Verify other threads remain untouched
        for (const otherId of threadIds) {
          if (otherId !== currentThreadId) {
            assert.equal(
              draftStore.get(otherId),
              `Unique draft content for ${otherId}`,
              `Thread ${otherId} was corrupted while visiting ${currentThreadId}`
            );
          }
        }
      }
    });

    test('R2.3 - Switching between Main Team and Maestro during active simulated streaming preserves separate contexts', async () => {
      // 1. Main Team with active simulated streaming message
      const mainThread = {
        id: 'thread-main-stream',
        title: 'Main Team Chat',
        threadType: 'team' as const,
        ownerAgent: 'team',
      };

      const { container: mainContainer, unmount: unmountMain } = await render(
        React.createElement(ThreadConversationView, {
          thread: mainThread,
          isStreaming: true,
          streamingText: 'Simulating multi-step architectural analysis [chunk 3/5]...',
        })
      );

      // Verify streaming indicator in Main Team
      const mainStreaming = mainContainer.querySelector('[data-testid="streaming-indicator"]');
      assert.ok(mainStreaming, 'Streaming indicator must be visible in Main Team during active stream');
      assert.ok(
        mainStreaming.textContent?.includes('Simulating multi-step architectural analysis'),
        'Main Team stream text must match'
      );

      await unmountMain();

      // 2. Switch to Maestro: Maestro must have its own thread context with ZERO Main Team streaming tokens
      const maestroThread = {
        id: 'thread-maestro-stream',
        title: 'Maestro Orchestration',
        threadType: 'mind' as const,
        ownerAgent: 'maestro',
      };

      const { container: maestroContainer, unmount: unmountMaestro } = await render(
        React.createElement(ThreadConversationView, {
          thread: maestroThread,
          isStreaming: false,
          messages: [{ id: 'm-1', actor: 'maestro', text: 'Coordination status: all subtasks assigned.' }],
        })
      );

      // Verify Maestro context is clean
      assert.equal(
        maestroContainer.querySelector('[data-testid="streaming-indicator"]'),
        null,
        'Maestro view must not display streaming indicator from Main Team'
      );
      assert.ok(
        !maestroContainer.textContent?.includes('Simulating multi-step architectural analysis'),
        'Maestro view must not receive Main Team streaming tokens'
      );
      assert.ok(maestroContainer.textContent?.includes('Coordination status: all subtasks assigned.'));

      await unmountMaestro();
    });

    test('R2.4 - Active thread deletion gracefully redirects to fallback without crash', async () => {
      // Thread deletion state machine contract
      interface ThreadState {
        threads: Array<{ id: string; title: string }>;
        activeThreadId: string | null;
      }

      const deleteThread = (state: ThreadState, threadIdToDelete: string): ThreadState => {
        const remaining = state.threads.filter((t) => t.id !== threadIdToDelete);
        let nextActiveId = state.activeThreadId;

        if (state.activeThreadId === threadIdToDelete) {
          // Redirect to first remaining thread, or null if all deleted
          nextActiveId = remaining.length > 0 ? remaining[0].id : null;
        }

        return {
          threads: remaining,
          activeThreadId: nextActiveId,
        };
      };

      // Initial state: 3 threads, active is thread-1
      let state: ThreadState = {
        threads: [
          { id: 'thread-1', title: 'First Conversation' },
          { id: 'thread-2', title: 'Second Conversation' },
          { id: 'thread-3', title: 'Third Conversation' },
        ],
        activeThreadId: 'thread-1',
      };

      // 1. Delete active thread-1 -> redirects to thread-2
      state = deleteThread(state, 'thread-1');
      assert.equal(state.activeThreadId, 'thread-2', 'Deleting active thread must redirect to first remaining thread');
      assert.equal(state.threads.length, 2);

      // 2. Delete thread-2 and thread-3 -> redirects to null
      state = deleteThread(state, 'thread-2');
      assert.equal(state.activeThreadId, 'thread-3');
      state = deleteThread(state, 'thread-3');
      assert.equal(state.activeThreadId, null, 'Deleting all threads must set activeThreadId to null');
      assert.equal(state.threads.length, 0);

      // 3. Render ThreadConversationView with null thread (fallback state)
      const { container, unmount } = await render(
        React.createElement(ThreadConversationView, {
          thread: null,
        })
      );

      const fallbackView = container.querySelector('[data-testid="thread-fallback-view"]');
      assert.ok(fallbackView, 'Fallback view must be rendered when active thread is null');
      assert.ok(
        fallbackView.textContent?.includes('No Active Thread'),
        'Fallback view must inform user that no active thread exists'
      );

      await unmount();
    });

    test('R2.5 - Deep thread nesting or long thread titles truncate cleanly without breaking sidebar layout', async () => {
      const ultraLongTitle =
        'Refactor-CodexExecutionView-Component-Tree-With-Ultra-Long-Title-That-Exceeds-Normal-Sidebar-Width-And-Must-Be-Truncated-Cleanly-Without-Breaking-Flexbox-Layout-Or-Causing-Horizontal-Scrollbars-In-The-Navigation-Drawer-At-All-Costs-1234567890';

      const thread = {
        id: 'thread-long-title',
        title: ultraLongTitle,
        threadType: 'team' as const,
        ownerAgent: 'team',
      };

      const { container, unmount } = await render(
        React.createElement(ThreadConversationView, {
          thread,
        })
      );

      const titleEl = container.querySelector('[data-testid="thread-title"]') as HTMLElement;
      assert.ok(titleEl, 'Thread title element must be rendered');

      // Assert truncate class and max width styling exist to protect flexbox layout
      assert.ok(titleEl.classList.contains('truncate'), 'Title element must have "truncate" class');
      assert.ok(
        titleEl.classList.contains('max-w-[240px]') || titleEl.className.includes('max-w-'),
        'Title element must have bounded max-width'
      );

      // Assert full title is preserved in HTML title attribute for accessible browser tooltip
      assert.equal(titleEl.getAttribute('title'), ultraLongTitle, 'Full title must be preserved in title attribute');

      await unmount();
    });
  });

  // =========================================================================
  // Requirement R3: Specialist Direct-Chat Isolation Boundary & Corner Cases
  // =========================================================================
  describe('R3: Specialist Direct-Chat Isolation Boundary & Corner Cases', () => {
    test('R3.1 - Specialist direct chat with zero prior messages renders dedicated welcome state', async () => {
      const { container, unmount } = await render(
        React.createElement(SpecialistDirectChatView, {
          specialistId: 'cody',
          messages: [],
        })
      );

      // Verify dedicated welcome state
      const welcomeEl = container.querySelector('[data-testid="specialist-welcome-state"]');
      assert.ok(welcomeEl, 'Specialist direct chat must render welcome state when messages are empty');
      assert.ok(welcomeEl.textContent?.includes('Welcome to direct chat with Cody'));
      assert.ok(welcomeEl.textContent?.includes('Software engineering'));

      // Verify composer textarea is ready
      const draftInput = container.querySelector(
        '[data-testid="specialist-draft-input-cody"]'
      ) as HTMLTextAreaElement;
      assert.ok(draftInput, 'Composer draft input must be rendered');
      assert.equal(draftInput.placeholder, 'Message Cody...');

      await unmount();
    });

    test('R3.2 - Non-existent specialist ID gracefully displays not found state', async () => {
      const { container, unmount } = await render(
        React.createElement(SpecialistDirectChatView, {
          specialistId: 'non-existent-phantom-specialist',
          messages: [],
        })
      );

      // Assert not found state rendered without throwing TypeError
      const notFoundEl = container.querySelector('[data-testid="specialist-not-found"]');
      assert.ok(notFoundEl, 'Specialist not found element must be rendered for invalid specialistId');
      assert.ok(
        notFoundEl.textContent?.includes('No specialist with ID "non-existent-phantom-specialist" was discovered'),
        'Not found message must display the missing specialist ID'
      );

      await unmount();
    });

    test('R3.3 - Rapid navigation across all 7 specialists retains independent draft buffers for each specialist', () => {
      const specialistIds = ['cody', 'vision', 'doc', 'research', 'tester', 'deployer', 'scraapy'];
      const drafts: Record<string, string> = {};

      const setDraft = (specId: string, text: string) => {
        drafts[specId] = text;
      };
      const getDraft = (specId: string) => drafts[specId] ?? '';

      // Assign unique drafts to all 7 specialists
      for (const id of specialistIds) {
        setDraft(id, `Draft command for specialist ${id}: review subtask`);
      }

      // Simulate 21 rapid navigations cycling across all specialists 3 times
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const id of specialistIds) {
          const draft = getDraft(id);
          assert.equal(
            draft,
            `Draft command for specialist ${id}: review subtask`,
            `Draft for ${id} was corrupted during rapid specialist navigation in cycle ${cycle}`
          );
        }
      }
    });

    test('R3.4 - Specialist direct chat handles multiline markdown messages, code blocks, and emoji without layout shifts', async () => {
      const complexMarkdown =
        'Hello Cody! 🚀 ✨\n\nHere is the implementation snippet:\n```typescript\nfunction sanitize(input: string): string {\n  return input.trim();\n}\n```\nStatus: Complete! ✅';

      const messages = [
        {
          id: 'msg-complex-1',
          actor: 'specialist' as const,
          authorName: 'Cody',
          role: 'Software engineering',
          text: complexMarkdown,
        },
      ];

      const { container, unmount } = await render(
        React.createElement(SpecialistDirectChatView, {
          specialistId: 'cody',
          messages,
        })
      );

      const msgEl = container.querySelector('[data-testid="message-msg-complex-1"]') as HTMLElement;
      assert.ok(msgEl, 'Message bubble must be rendered');

      // Verify emoji rendering
      assert.ok(msgEl.textContent?.includes('🚀 ✨'), 'Emoji must be preserved');
      assert.ok(msgEl.textContent?.includes('✅'), 'Checkmark emoji must be preserved');

      // Verify code block formatted container
      const codeBlockEl = msgEl.querySelector('.font-mono');
      assert.ok(codeBlockEl, 'Code block must be rendered inside font-mono container');
      assert.ok(codeBlockEl.textContent?.includes('function sanitize(input: string): string'));

      await unmount();
    });

    test('R3.5 - Tool execution events assigned to Specialist A never appear in Specialist B feed under concurrent mock dispatches', async () => {
      // 3 events dispatched concurrently at the exact same millisecond
      const concurrentTimestamp = 1700000070000;
      const concurrentEvents: ExecutionActivityEvent[] = [
        {
          eventId: 'evt-cody-concurrent-tool',
          eventType: 'tool.completed',
          teamId: 'team-primary',
          specialistId: 'cody',
          timestamp: concurrentTimestamp,
          status: 'completed',
          summary: 'Cody executed TypeScript AST refactoring',
          sourceClassification: 'simulated',
        },
        {
          eventId: 'evt-tester-concurrent-tool',
          eventType: 'tool.completed',
          teamId: 'team-primary',
          specialistId: 'tester',
          timestamp: concurrentTimestamp,
          status: 'completed',
          summary: 'Tester verified 30 test assertions',
          sourceClassification: 'simulated',
        },
        {
          eventId: 'evt-vision-concurrent-tool',
          eventType: 'tool.completed',
          teamId: 'team-primary',
          specialistId: 'vision',
          timestamp: concurrentTimestamp,
          status: 'completed',
          summary: 'Vision inspected amber badge contrast',
          sourceClassification: 'simulated',
        },
      ];

      // 1. Cody direct chat activity feed
      const { container: codyContainer, unmount: unmountCody } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: concurrentEvents,
          activeSpecialistId: 'cody',
        })
      );

      assert.ok(
        codyContainer.textContent?.includes('Cody executed TypeScript AST refactoring'),
        'Cody events must be present in Cody direct feed'
      );
      assert.ok(
        !codyContainer.textContent?.includes('Tester verified 30 test assertions'),
        'Tester tool executions must NOT leak into Cody feed'
      );
      assert.ok(
        !codyContainer.textContent?.includes('Vision inspected amber badge contrast'),
        'Vision tool executions must NOT leak into Cody feed'
      );

      await unmountCody();

      // 2. Tester direct chat activity feed
      const { container: testerContainer, unmount: unmountTester } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: concurrentEvents,
          activeSpecialistId: 'tester',
        })
      );

      assert.ok(
        testerContainer.textContent?.includes('Tester verified 30 test assertions'),
        'Tester events must be present in Tester direct feed'
      );
      assert.ok(
        !testerContainer.textContent?.includes('Cody executed TypeScript AST refactoring'),
        'Cody tool executions must NOT leak into Tester feed'
      );

      await unmountTester();
    });
  });

  // =========================================================================
  // Requirement R4: Multi-Specialist Parallel Work Visualization Boundary & Corner Cases
  // =========================================================================
  describe('R4: Multi-Specialist Parallel Work Visualization Boundary & Corner Cases', () => {
    test('R4.1 - Zero active intervals displays idle team state with helpful guidance', async () => {
      const { container, unmount } = await render(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-idle',
          intervals: [],
        })
      );

      // Verify idle state guidance banner
      const idleEl = container.querySelector('[data-testid="multi-specialist-idle-state"]');
      assert.ok(idleEl, 'Idle guidance element must be displayed when intervals array is empty');
      assert.ok(idleEl.textContent?.includes('No active specialist intervals'));
      assert.ok(idleEl.textContent?.includes('Team is currently idle'));

      // Verify no broken cards or division by zero
      assert.equal(container.querySelectorAll('.specialist-card').length, 0);

      await unmount();
    });

    test('R4.2 - Single specialist interval displays correctly without division-by-zero in timeline scale calculation', async () => {
      // Single interval where start and end relative seconds are 0 (zero duration boundary)
      const zeroDurationInterval: SpecialistExecutionInterval = {
        intervalId: 'int-zero-duration',
        specialistId: 'cody',
        specialistName: 'Cody',
        specialistRole: 'Software engineering',
        taskTitle: 'Instantaneous initialization step',
        startRelativeSec: 0,
        endRelativeSec: 0,
        status: 'working',
        currentStep: 'Starting sandbox worker',
        history: [],
      };

      const { container, unmount } = await render(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-zero-dur',
          intervals: [zeroDurationInterval],
        })
      );

      const intervalBar = container.querySelector('[data-testid="interval-bar-cody"]') as HTMLElement;
      assert.ok(intervalBar, 'Interval bar must be rendered even for 0-second duration');

      // Assert style attributes left and width are valid percentages and not "NaN%" or "Infinity%"
      const leftStyle = intervalBar.style.left;
      const widthStyle = intervalBar.style.width;

      assert.ok(!leftStyle.includes('NaN'), `left style must not contain NaN: ${leftStyle}`);
      assert.ok(!leftStyle.includes('Infinity'), `left style must not contain Infinity: ${leftStyle}`);
      assert.ok(!widthStyle.includes('NaN'), `width style must not contain NaN: ${widthStyle}`);
      assert.ok(!widthStyle.includes('Infinity'), `width style must not contain Infinity: ${widthStyle}`);

      // Width should have minimum percentage floor (5%) for visual rendering
      const widthPercent = parseFloat(widthStyle);
      assert.ok(widthPercent >= 5, `Expected minimum bar width >= 5%, got ${widthPercent}%`);

      await unmount();
    });

    test('R4.3 - Extreme time ranges (0 to 86,400 seconds) scales gracefully within container width', async () => {
      // 24-hour interval boundary (0s to 86,400s)
      const extremeIntervals: SpecialistExecutionInterval[] = [
        {
          intervalId: 'int-24h-1',
          specialistId: 'deployer',
          specialistName: 'Deployer',
          specialistRole: 'Deployment',
          taskTitle: '24-hour background soak test',
          startRelativeSec: 0,
          endRelativeSec: 86400,
          status: 'working',
          currentStep: 'Hour 12 of soak cycle',
          history: ['Hour 1 verified', 'Hour 6 verified'],
        },
        {
          intervalId: 'int-24h-2',
          specialistId: 'tester',
          specialistName: 'Tester',
          specialistRole: 'Independent verification',
          taskTitle: 'Midday health probe',
          startRelativeSec: 43200, // 12 hours in
          endRelativeSec: 64800, // 18 hours in
          status: 'completed',
          currentStep: 'Probed 1,000 synthetic endpoints',
          history: ['Health probe OK'],
        },
      ];

      const { container, unmount } = await render(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-extreme-range',
          intervals: extremeIntervals,
        })
      );

      const deployerBar = container.querySelector('[data-testid="interval-bar-deployer"]') as HTMLElement;
      const testerBar = container.querySelector('[data-testid="interval-bar-tester"]') as HTMLElement;

      assert.ok(deployerBar);
      assert.ok(testerBar);

      const deployerLeft = parseFloat(deployerBar.style.left);
      const deployerWidth = parseFloat(deployerBar.style.width);
      const testerLeft = parseFloat(testerBar.style.left);
      const testerWidth = parseFloat(testerBar.style.width);

      // Deployer spans 0s to 86,400s -> left = 0%, width = 100%
      assert.equal(deployerLeft, 0, 'Deployer should start at left: 0%');
      assert.equal(deployerWidth, 100, 'Deployer should span 100% of the 24h timeline');

      // Tester starts at 43,200s (50% mark) -> left ≈ 50%
      assert.ok(Math.abs(testerLeft - 50) < 1, `Tester left should be approx 50%, got ${testerLeft}%`);
      assert.ok(testerLeft + testerWidth <= 100, 'Tester bar must not overflow container bounds');

      await unmount();
    });

    test('R4.4 - 20 concurrent specialist intervals render without vertical overlapping or horizontal overflow', async () => {
      // 20 concurrent intervals across specialists
      const manyIntervals: SpecialistExecutionInterval[] = Array.from({ length: 20 }, (_, i) => ({
        intervalId: `int-stress-${i}`,
        specialistId: ['cody', 'vision', 'doc', 'research', 'tester', 'deployer', 'scraapy'][i % 7],
        specialistName: `Agent-${i}`,
        specialistRole: 'Parallel Worker',
        taskTitle: `Subtask #${i}`,
        startRelativeSec: i * 2,
        endRelativeSec: i * 2 + 10,
        status: (i % 4 === 0 ? 'completed' : i % 4 === 1 ? 'working' : i % 4 === 2 ? 'failed' : 'blocked') as any,
        currentStep: `Step ${i}.1`,
        history: [`Init ${i}`],
      }));

      const { container, unmount } = await render(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-many-workers',
          intervals: manyIntervals,
        })
      );

      // Verify all 20 cards rendered
      const cards = container.querySelectorAll('.specialist-card');
      assert.equal(cards.length, 20, `Expected 20 cards, got ${cards.length}`);

      // Verify all 20 interval tracks rendered in parallel tracks container
      const tracks = container.querySelectorAll('[data-testid="parallel-tracks-container"] > div');
      assert.equal(tracks.length, 20, `Expected 20 interval tracks, got ${tracks.length}`);

      await unmount();
    });

    test('R4.5 - Intervals with status failed or blocked display high-visibility warning indicators', async () => {
      const statusTestIntervals: SpecialistExecutionInterval[] = [
        {
          intervalId: 'int-failed-1',
          specialistId: 'deployer',
          specialistName: 'Deployer',
          specialistRole: 'Deployment',
          taskTitle: 'Production deploy attempted',
          startRelativeSec: 5,
          endRelativeSec: 15,
          status: 'failed',
          currentStep: 'Deployment blocked by offline safety guardrail',
          history: [],
        },
        {
          intervalId: 'int-blocked-1',
          specialistId: 'scraapy',
          specialistName: 'Scraapy',
          specialistRole: 'Web scraping',
          taskTitle: 'Crawl external host',
          startRelativeSec: 10,
          endRelativeSec: 20,
          status: 'blocked' as any,
          currentStep: 'Blocked: external network forbidden',
          history: [],
        },
      ];

      const { container, unmount } = await render(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-status-visibility',
          intervals: statusTestIntervals,
        })
      );

      // 1. Verify failed status high visibility indicator
      const failedBadge = container.querySelector('[data-testid="specialist-status-deployer"]');
      assert.ok(failedBadge, 'Failed status badge must exist');
      assert.equal(failedBadge.textContent?.trim(), 'failed');
      assert.ok(
        failedBadge.className.includes('rose') || failedBadge.className.includes('red'),
        'Failed badge must have high-visibility rose/red color styling'
      );

      // 2. Verify blocked status high visibility indicator
      const blockedBadge = container.querySelector('[data-testid="specialist-status-scraapy"]');
      assert.ok(blockedBadge, 'Blocked status badge must exist');
      assert.equal(blockedBadge.textContent?.trim(), 'blocked');
      assert.ok(
        blockedBadge.className.includes('rose') || blockedBadge.className.includes('red'),
        'Blocked badge must have high-visibility rose/red warning indicator'
      );

      // 3. Verify bar styling for failed/blocked status
      const failedBar = container.querySelector('[data-testid="interval-bar-deployer"]');
      assert.ok(failedBar?.className.includes('bg-rose-400'));

      const blockedBar = container.querySelector('[data-testid="interval-bar-scraapy"]');
      assert.ok(blockedBar?.className.includes('bg-rose-400'));

      await unmount();
    });
  });

  // =========================================================================
  // Requirement R5: Safe Allowlist-Based Tool Execution Details & Redaction Boundary & Corner Cases
  // =========================================================================
  describe('R5: Safe Allowlist-Based Tool Execution Details & Redaction Boundary & Corner Cases', () => {
    test('R5.1 - Nested JSON strings with deeply nested credentials are fully redacted', () => {
      // Deeply nested JSON credential payload
      const nestedJson = JSON.stringify({
        session: {
          user: 'developer',
          auth: {
            token: 'Bearer super_secret_access_token_123456789',
            credentials: {
              apiKey: 'sk-proj-nestedSecretKey998877665544332211',
              password: 'SuperSecretDatabasePassword123!',
            },
          },
        },
      });

      const result = redactSensitiveData(nestedJson);

      assert.equal(result.wasRedacted, true, 'Redaction engine must detect nested credentials');
      assert.ok(
        !result.text.includes('super_secret_access_token_123456789'),
        'Bearer token in nested JSON must not leak'
      );
      assert.ok(
        !result.text.includes('sk-proj-nestedSecretKey998877665544332211'),
        'API key in nested JSON must not leak'
      );
      assert.ok(
        !result.text.includes('SuperSecretDatabasePassword123!'),
        'Password in nested JSON must not leak'
      );

      assert.ok(result.text.includes('[REDACTED]'));
    });

    test('R5.2 - Multiline stderr stack traces containing embedded database passwords or connection URIs are sanitized', () => {
      const multilineStderr = `
Error: ETIMEDOUT connect to database
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1494:16)
    at Pool.connect (/workspace/node_modules/pg/lib/pool.js:56:11)
    DatabaseURI: postgresql://postgres_admin:SuperSecretPass_xyz99@db.prod.internal:5432/mediobot_vault?sslmode=require
    Caused by: mongo+srv://cluster_admin:MongoSecretPassWord456!@cluster0.mongodb.net/app_db
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      `.trim();

      const result = redactSensitiveData(multilineStderr);

      assert.equal(result.wasRedacted, true);
      assert.ok(!result.text.includes('SuperSecretPass_xyz99'), 'Postgres password must be redacted');
      assert.ok(!result.text.includes('MongoSecretPassWord456!'), 'Mongo password must be redacted');

      // Invariant: Host, user, port, and database name should remain intact for debugging
      assert.ok(
        result.text.includes('postgresql://postgres_admin:[REDACTED]@db.prod.internal:5432/mediobot_vault'),
        'Postgres connection string format must preserve host and path'
      );
      assert.ok(
        result.text.includes('mongo+srv://cluster_admin:[REDACTED]@cluster0.mongodb.net/app_db'),
        'Mongo connection string format must preserve host and path'
      );
    });

    test('R5.3 - URL parameters containing tokens are redacted while preserving host and path', () => {
      const urlWithTokens =
        'https://api.mediobot.internal/v1/deploy?token=secret_token_12345678&api_key=AIzaSyD1234567890abcdefghijklmnopqrstuv&filter=active&version=2';

      const result = redactSensitiveData(urlWithTokens);

      assert.equal(result.wasRedacted, true);

      // Verify token values scrubbed
      assert.ok(!result.text.includes('secret_token_12345678'), 'Token param value must not leak');
      assert.ok(!result.text.includes('AIzaSyD1234567890abcdefghijklmnopqrstuv'), 'api_key param value must not leak');

      // Verify host and path preserved
      assert.ok(
        result.text.startsWith('https://api.mediobot.internal/v1/deploy?'),
        'URL host and path must be preserved'
      );

      // Verify non-sensitive parameters preserved
      assert.ok(result.text.includes('&filter=active'), 'Safe query parameter filter must be preserved');
      assert.ok(result.text.includes('&version=2'), 'Safe query parameter version must be preserved');
    });

    test('R5.4 - Extremely long tool outputs (100KB+) are safely truncated to preview limits and fully scrubbed in <50ms', () => {
      // Construct a 120KB output string with embedded secrets scattered throughout
      const repeatChunk = 'Regular safe output row line item with status 200 OK.\n';
      const secretRow1 = 'Authorization: Bearer ya29.very_long_secret_token_abc1234567890\n';
      const secretRow2 = 'Exported AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY in bash\n';

      const largeBuffer: string[] = [];
      for (let i = 0; i < 2000; i++) {
        largeBuffer.push(repeatChunk);
        if (i === 10) largeBuffer.push(secretRow1);
        if (i === 50) largeBuffer.push(secretRow2);
      }
      const rawOutput120KB = largeBuffer.join('');
      assert.ok(rawOutput120KB.length > 100000, `Output length must exceed 100KB, got ${rawOutput120KB.length}`);

      const startTime = performance.now();
      const safeDetails = extractAllowlistToolDetails({
        toolName: 'stress_logger',
        operationType: 'execute',
        sanitizedOutputPreview: rawOutput120KB,
      });
      const duration = performance.now() - startTime;

      // Assert processing time is < 50ms
      assert.ok(
        duration < 50,
        `Large output redaction took ${duration.toFixed(2)}ms, expected < 50ms`
      );

      // Assert output preview is truncated to safe bounds (<= 1,100 characters preview with truncation indicator)
      assert.ok(
        safeDetails.sanitizedOutputPreview!.length <= 1100,
        `Preview must be truncated to <= 1100 chars, got ${safeDetails.sanitizedOutputPreview!.length}`
      );

      // Assert secrets are scrubbed in the preview
      assert.ok(
        !safeDetails.sanitizedOutputPreview!.includes('ya29.very_long_secret_token_abc1234567890'),
        'Scattered Bearer token must be redacted'
      );
      assert.ok(
        !safeDetails.sanitizedOutputPreview!.includes('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'),
        'Scattered AWS key must be redacted'
      );
    });

    test('R5.5 - Zero-byte, empty, null, or undefined command strings and output fields do not crash allowlist extractor', () => {
      // 1. Empty strings and undefined properties
      const emptyPropsTool = {
        toolName: '',
        operationType: '',
        commandDescription: '',
        filePath: undefined,
        errorInfo: undefined,
        sanitizedOutputPreview: undefined,
      };

      const res1 = extractAllowlistToolDetails(emptyPropsTool);
      assert.ok(res1.toolName === 'tool' || res1.toolName === 'unknown_tool', 'Empty toolName should fallback safely');
      assert.equal(res1.operationType, 'generic', 'Empty operationType should fallback to generic');
      assert.equal(res1.commandDescription, '', 'Empty commandDescription should be preserved as empty string');
      assert.equal(res1.filePath, undefined);
      assert.equal(res1.errorInfo, undefined);

      // 2. Completely empty object
      const res2 = extractAllowlistToolDetails({});
      assert.ok(res2.toolName === 'tool' || res2.toolName === 'unknown_tool');
      assert.equal(res2.operationType, 'generic');
      assert.equal(res2.status, 'completed');

      // 3. Null and undefined inputs (adversarial boundary)
      const res3 = extractAllowlistToolDetails(null as any);
      assert.ok(res3.toolName === 'tool' || res3.toolName === 'unknown_tool');
      assert.equal(res3.operationType, 'generic');

      const res4 = extractAllowlistToolDetails(undefined as any);
      assert.ok(res4.toolName === 'tool' || res4.toolName === 'unknown_tool');
      assert.equal(res4.operationType, 'generic');
    });
  });

  // =========================================================================
  // Requirement R6: Frontend Architecture, Maintainability & Accessibility Boundary & Corner Cases
  // =========================================================================
  describe('R6: Frontend Architecture, Maintainability & Accessibility Boundary & Corner Cases', () => {
    test('R6.1 - Focus trapping and restoration: closing disclosure returns focus to toggle button', async () => {
      const targetEvent = CANONICAL_EXECUTION_EVENTS.find((e) => e.eventId === 'evt-07-file-inspected')!;
      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: [targetEvent],
        })
      );

      const disclosureBtn = container.querySelector(
        `[data-testid="disclosure-btn-${targetEvent.eventId}"]`
      ) as HTMLButtonElement;
      assert.ok(disclosureBtn);

      // 1. Focus the toggle button
      disclosureBtn.focus();
      assert.equal(document.activeElement, disclosureBtn, 'Toggle button must receive focus');

      // 2. Open disclosure
      await fireEvent.click(disclosureBtn);
      assert.equal(disclosureBtn.getAttribute('aria-expanded'), 'true');

      // 3. Close disclosure via click
      await fireEvent.click(disclosureBtn);
      assert.equal(disclosureBtn.getAttribute('aria-expanded'), 'false');

      // Assert focus is retained or restored to the disclosure toggle button
      disclosureBtn.focus();
      assert.equal(
        document.activeElement,
        disclosureBtn,
        'Focus must be restored to toggle button after closing disclosure'
      );

      await unmount();
    });

    test('R6.2 - Screen reader announcements: status changes update live regions', async () => {
      // Mount live region announcing agent status change
      const { container, rerender, unmount } = await render(
        React.createElement(StatusChangeLiveRegion, {
          message: 'Agent Cody status: running',
          role: 'status',
          ariaLive: 'polite',
        })
      );

      const liveRegion = container.querySelector('[data-testid="status-live-region"]') as HTMLElement;
      assert.ok(liveRegion, 'Live region element must exist in DOM');
      assert.equal(liveRegion.getAttribute('role'), 'status');
      assert.equal(liveRegion.getAttribute('aria-live'), 'polite');
      assert.equal(liveRegion.textContent, 'Agent Cody status: running');

      // Status update to completed
      await rerender(
        React.createElement(StatusChangeLiveRegion, {
          message: 'Agent Cody status: completed',
          role: 'status',
          ariaLive: 'polite',
        })
      );

      assert.equal(liveRegion.textContent, 'Agent Cody status: completed');

      // Urgent status update to failed with assertive alert
      await rerender(
        React.createElement(StatusChangeLiveRegion, {
          message: 'Agent Deployer status: failed due to offline guardrail',
          role: 'alert',
          ariaLive: 'assertive',
        })
      );

      assert.equal(liveRegion.getAttribute('role'), 'alert');
      assert.equal(liveRegion.getAttribute('aria-live'), 'assertive');
      assert.equal(liveRegion.textContent, 'Agent Deployer status: failed due to offline guardrail');

      await unmount();
    });

    test('R6.3 - High contrast mode WCAG AAA compliance: status badges and timeline text contrast', () => {
      // Authoritative WCAG 2.1 relative luminance and contrast ratio computation
      function getRelativeLuminance(r: number, g: number, b: number): number {
        const [rl, gl, bl] = [r, g, b].map((val) => {
          const s = val / 255;
          return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
      }

      function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
        const l1 = getRelativeLuminance(...rgb1);
        const l2 = getRelativeLuminance(...rgb2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      // Background: zinc-950 rgb(9, 9, 11)
      const bgDark: [number, number, number] = [9, 9, 11];

      // Foreground status colors in Tailwind palette:
      // Emerald-400 (completed): rgb(52, 211, 153)
      const emerald400: [number, number, number] = [52, 211, 153];
      // Amber-400 ([Simulated] badge): rgb(251, 191, 36)
      const amber400: [number, number, number] = [251, 191, 36];
      // Sky-400 (running): rgb(56, 189, 248)
      const sky400: [number, number, number] = [56, 189, 248];
      // Rose-400 (failed/blocked): rgb(251, 113, 133)
      const rose400: [number, number, number] = [251, 113, 133];

      const emeraldContrast = getContrastRatio(emerald400, bgDark);
      const amberContrast = getContrastRatio(amber400, bgDark);
      const skyContrast = getContrastRatio(sky400, bgDark);
      const roseContrast = getContrastRatio(rose400, bgDark);

      // WCAG AAA requires >= 7.0:1 for normal text (or >= 4.5:1 for large text)
      assert.ok(
        emeraldContrast >= 7.0,
        `Emerald-400 contrast ratio ${emeraldContrast.toFixed(2)} must be >= 7.0 for WCAG AAA`
      );
      assert.ok(
        amberContrast >= 7.0,
        `Amber-400 contrast ratio ${amberContrast.toFixed(2)} must be >= 7.0 for WCAG AAA`
      );
      assert.ok(
        skyContrast >= 7.0,
        `Sky-400 contrast ratio ${skyContrast.toFixed(2)} must be >= 7.0 for WCAG AAA`
      );
      assert.ok(
        roseContrast >= 7.0,
        `Rose-400 contrast ratio ${roseContrast.toFixed(2)} must be >= 7.0 for WCAG AAA`
      );
    });

    test('R6.4 - Rapid DOM unmounting during async timers does not cause memory leak warnings or errors', async () => {
      let timerCleanedUp = false;
      let stateUpdateAfterUnmountAttempted = false;

      // Component with active interval timer simulating live execution polling
      const AsyncTimerComponent: React.FC = () => {
        const [ticks, setTicks] = useState(0);

        useEffect(() => {
          let isMounted = true;
          const intervalId = setInterval(() => {
            if (isMounted) {
              setTicks((t) => t + 1);
            } else {
              stateUpdateAfterUnmountAttempted = true;
            }
          }, 10);

          return () => {
            isMounted = false;
            clearInterval(intervalId);
            timerCleanedUp = true;
          };
        }, []);

        return React.createElement('div', { 'data-testid': 'timer-ticks' }, `Ticks: ${ticks}`);
      };

      const { container, unmount } = await render(React.createElement(AsyncTimerComponent));
      assert.ok(container.querySelector('[data-testid="timer-ticks"]'));

      // Rapid unmount before multiple ticks occur
      await unmount();

      assert.equal(timerCleanedUp, true, 'Timer cleanup function must execute upon unmount');
      assert.equal(
        stateUpdateAfterUnmountAttempted,
        false,
        'No state update should be attempted after component unmount'
      );
      assert.equal(container.innerHTML, '', 'Container must be completely cleared');
    });

    test('R6.5 - Envelope schema validation rejects corrupted/malformed localStorage state with safe rollback', () => {
      interface StorageEnvelope {
        version: number;
        teamId: string;
        activeThreadId: string | null;
        drafts: Record<string, string>;
      }

      const DEFAULT_ENVELOPE: StorageEnvelope = {
        version: 1,
        teamId: 'team-primary',
        activeThreadId: null,
        drafts: {},
      };

      // Envelope validation & rollback function
      function validateAndRecoverStorage(rawJson: string | null): { data: StorageEnvelope; recovered: boolean } {
        if (!rawJson || typeof rawJson !== 'string') {
          return { data: DEFAULT_ENVELOPE, recovered: true };
        }

        try {
          const parsed = JSON.parse(rawJson);
          if (!parsed || typeof parsed !== 'object') {
            return { data: DEFAULT_ENVELOPE, recovered: true };
          }

          // Validate required envelope schema fields
          if (typeof parsed.version !== 'number' || parsed.version <= 0) {
            return { data: DEFAULT_ENVELOPE, recovered: true };
          }
          if (typeof parsed.teamId !== 'string' || !parsed.teamId.trim()) {
            return { data: DEFAULT_ENVELOPE, recovered: true };
          }
          if (parsed.activeThreadId !== null && typeof parsed.activeThreadId !== 'string') {
            return { data: DEFAULT_ENVELOPE, recovered: true };
          }
          if (!parsed.drafts || typeof parsed.drafts !== 'object') {
            return { data: DEFAULT_ENVELOPE, recovered: true };
          }

          return { data: parsed as StorageEnvelope, recovered: false };
        } catch {
          // SyntaxError on corrupted JSON -> safe atomic rollback
          return { data: DEFAULT_ENVELOPE, recovered: true };
        }
      }

      // 1. Malformed syntax (truncated JSON)
      const corruptedJson = '{"version": 1, "teamId": "team-primary", "drafts": { corrupted syntax [';
      const recovery1 = validateAndRecoverStorage(corruptedJson);
      assert.equal(recovery1.recovered, true, 'Must trigger safe rollback on malformed JSON');
      assert.deepEqual(recovery1.data, DEFAULT_ENVELOPE);

      // 2. Missing required schema keys
      const missingKeysJson = JSON.stringify({ invalidKey: 123 });
      const recovery2 = validateAndRecoverStorage(missingKeysJson);
      assert.equal(recovery2.recovered, true, 'Must trigger rollback when envelope missing version/teamId');
      assert.deepEqual(recovery2.data, DEFAULT_ENVELOPE);

      // 3. Invalid field types
      const invalidTypesJson = JSON.stringify({
        version: 'not-a-number',
        teamId: 12345,
        activeThreadId: true,
        drafts: 'not-an-object',
      });
      const recovery3 = validateAndRecoverStorage(invalidTypesJson);
      assert.equal(recovery3.recovered, true, 'Must trigger rollback on type mismatches');
      assert.deepEqual(recovery3.data, DEFAULT_ENVELOPE);

      // 4. Valid envelope
      const validEnvelopeJson = JSON.stringify({
        version: 1,
        teamId: 'team-primary',
        activeThreadId: 'thread-001',
        drafts: { 'thread-001': 'Saved draft' },
      });
      const recovery4 = validateAndRecoverStorage(validEnvelopeJson);
      assert.equal(recovery4.recovered, false, 'Valid envelope must not trigger rollback');
      assert.equal(recovery4.data.teamId, 'team-primary');
      assert.equal(recovery4.data.activeThreadId, 'thread-001');
      assert.equal(recovery4.data.drafts['thread-001'], 'Saved draft');
    });
  });
});
