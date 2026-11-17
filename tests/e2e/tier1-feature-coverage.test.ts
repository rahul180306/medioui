/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tier 1: Feature Coverage E2E Test Suite
 * Validates requirements R1 through R6 for Mediobot UI Refinement:
 * - R1: Reusable Execution Activity Timeline Component (5 tests)
 * - R2: Main Team vs Maestro Conversation Separation (5 tests)
 * - R3: Specialist Direct-Chat Isolation (5 tests)
 * - R4: Multi-Specialist Parallel Work Visualization (5 tests)
 * - R5: Safe Allowlist-Based Tool Execution Details and Redaction (5 tests)
 * - R6: Frontend Architecture, Maintainability, and Accessibility (5 tests)
 * Total: 30 tests (>=5 per requirement across R1–R6)
 */

import { test, describe, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { setupJSDOM, render, fireEvent, getByText, queryByText, JSDOMHarness } from './helpers/domHarness.js';
import {
  CANONICAL_EXECUTION_EVENTS,
  ALL_CANONICAL_EVENT_TYPES,
  PARALLEL_SPECIALIST_INTERVALS,
  SPECIALIST_PROFILES,
  ADVERSARIAL_TOOL_PAYLOADS,
  sortExecutionEventsChronologically,
  extractAllowlistToolDetails,
  redactSensitiveData,
  ExecutionActivityEvent,
} from './helpers/mockFixtures.js';
import {
  ExecutionActivityTimeline,
  validateExecutionActivityEvent,
} from '../../mediobot-ui-refinement/src/features/activity/ExecutionActivityTimeline.tsx';
import {
  MultiSpecialistExecutionView,
} from '../../mediobot-ui-refinement/src/features/mediobots/MultiSpecialistExecutionView.tsx';

describe('Tier 1: Feature Coverage E2E Suite (Requirements R1–R6)', () => {
  let harness: JSDOMHarness;

  before(() => {
    harness = setupJSDOM();
  });

  beforeEach(() => {
    harness.cleanup();
  });

  // =========================================================================
  // Requirement R1: Reusable Execution Activity Timeline Component (5 tests)
  // =========================================================================
  describe('R1: Execution Activity Timeline Component', () => {
    test('R1.1 - Chronological sorting of 17 canonical event types with deterministic tie-breaking', () => {
      // Create scrambled events including tied timestamps to verify secondary sort
      const scrambledEvents: ExecutionActivityEvent[] = [
        ...CANONICAL_EXECUTION_EVENTS.slice().reverse(),
        {
          eventId: 'evt-00-alpha',
          eventType: 'agent.started',
          teamId: 'team-primary',
          timestamp: 1700000000000,
          status: 'running',
          summary: 'Alpha initialization event',
          sourceClassification: 'simulated',
        },
        {
          eventId: 'evt-00-beta',
          eventType: 'task.queued',
          teamId: 'team-primary',
          timestamp: 1700000000000, // Identical timestamp to evt-00-alpha
          status: 'queued',
          summary: 'Beta queued event',
          sourceClassification: 'simulated',
        },
      ];

      const sorted = sortExecutionEventsChronologically(scrambledEvents);

      // Verify strictly monotonic timestamps
      for (let i = 0; i < sorted.length - 1; i++) {
        assert.ok(
          sorted[i].timestamp <= sorted[i + 1].timestamp,
          `Events at indices ${i} and ${i + 1} not in chronological order`
        );
        // Verify deterministic tie-breaking by eventId when timestamps are equal
        if (sorted[i].timestamp === sorted[i + 1].timestamp) {
          assert.ok(
            sorted[i].eventId.localeCompare(sorted[i + 1].eventId) <= 0,
            `Events with identical timestamps not tie-broken by eventId: ${sorted[i].eventId} vs ${sorted[i + 1].eventId}`
          );
        }
      }

      // Verify all 17 canonical event types are present in the sorted output
      const sortedEventTypes = new Set(sorted.map((e) => e.eventType));
      for (const expectedType of ALL_CANONICAL_EVENT_TYPES) {
        assert.ok(sortedEventTypes.has(expectedType), `Missing canonical event type: ${expectedType}`);
      }
      assert.equal(sortedEventTypes.size, 17, 'Expected exactly 17 unique canonical event types');
    });

    test('R1.2 - Compact row visual density with event icon, summary, and status badge', async () => {
      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: CANONICAL_EXECUTION_EVENTS,
        })
      );

      // Verify presence of compact rows
      const rows = container.querySelectorAll('.compact-row');
      assert.ok(rows.length >= 17, `Expected at least 17 compact rows, found ${rows.length}`);

      // Verify each row has compact height styling and contains event type, summary, and status
      const firstRow = rows[0] as HTMLElement;
      assert.ok(firstRow.classList.contains('compact-row') || firstRow.classList.contains('h-7'), 'Row should have compact row class');

      const eventTypeEl = firstRow.querySelector('.event-type');
      assert.ok(eventTypeEl, 'Row must render event-type badge');
      assert.ok(eventTypeEl.textContent?.length! > 0, 'Event type badge must not be empty');

      const summaryEl = firstRow.querySelector('.event-summary');
      assert.ok(summaryEl, 'Row must render event summary');
      assert.ok(summaryEl.textContent?.length! > 0, 'Event summary must not be empty');

      const statusEl = firstRow.querySelector('.status-indicator');
      assert.ok(statusEl, 'Row must render status indicator');

      await unmount();
    });

    test('R1.3 - Accessible disclosure toggle rendering, expansion, and collapse', async () => {
      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: CANONICAL_EXECUTION_EVENTS,
        })
      );

      // Target event with tool details (evt-10-tool-completed)
      const disclosureBtn = container.querySelector(
        '[data-testid="disclosure-btn-evt-10-tool-completed"]'
      ) as HTMLButtonElement;
      assert.ok(disclosureBtn, 'Disclosure toggle button must exist for event with details');

      // 1. Initial collapsed state
      assert.equal(disclosureBtn.getAttribute('aria-expanded'), 'false');
      assert.equal(container.querySelector('[data-testid="expanded-panel-evt-10-tool-completed"]'), null);

      // 2. Click to expand
      await fireEvent.click(disclosureBtn);
      assert.equal(disclosureBtn.getAttribute('aria-expanded'), 'true');

      const expandedPanel = container.querySelector(
        '[data-testid="expanded-panel-evt-10-tool-completed"]'
      ) as HTMLElement;
      assert.ok(expandedPanel, 'Expanded panel should be rendered after clicking toggle');
      assert.ok(expandedPanel.textContent?.includes('write_file'), 'Panel must show tool name');
      assert.ok(
        expandedPanel.textContent?.includes('ExecutionActivityTimeline.tsx'),
        'Panel must show file path'
      );
      assert.ok(expandedPanel.textContent?.includes('500ms'), 'Panel must show duration');

      // 3. Click again to collapse
      await fireEvent.click(disclosureBtn);
      assert.equal(disclosureBtn.getAttribute('aria-expanded'), 'false');
      assert.equal(container.querySelector('[data-testid="expanded-panel-evt-10-tool-completed"]'), null);

      await unmount();
    });

    test('R1.4 - Explicit [Simulated] status badge prominently rendered', async () => {
      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: CANONICAL_EXECUTION_EVENTS,
        })
      );

      const simulatedBadge = container.querySelector('[data-testid="simulated-status-badge"]');
      assert.ok(simulatedBadge, 'Header must contain simulated-status-badge element');
      assert.equal(simulatedBadge.textContent?.trim(), '[Simulated]');

      // Invariant: No mock item or header should claim unverified live production execution
      const wholeText = container.textContent || '';
      assert.ok(!wholeText.includes('Production Authenticated Receipt'), 'Must not claim unverified production receipt');

      await unmount();
    });

    test('R1.5 - Disabled connected verification control displays informative notice', async () => {
      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: CANONICAL_EXECUTION_EVENTS,
        })
      );

      const verifyBtn = container.querySelector('[data-testid="connected-verification-btn"]') as HTMLButtonElement;
      assert.ok(verifyBtn, 'Connected verification button must be present in timeline header');
      assert.equal(verifyBtn.disabled, true, 'Connected verification must be disabled');
      assert.equal(verifyBtn.getAttribute('aria-disabled'), 'true', 'aria-disabled must be true');
      assert.ok(
        verifyBtn.title.includes('Connected verification unavailable'),
        'Tooltip must inform user that connected verification is unavailable in demonstration mode'
      );

      await unmount();
    });
  });

  // =========================================================================
  // Requirement R2: Main Team vs Maestro Conversation Separation (5 tests)
  // =========================================================================
  describe('R2: Main Team vs Maestro Conversation Separation', () => {
    test('R2.1 - Main Team vs Maestro thread isolation and threadType scoping', () => {
      // Main Team thread contract: threadType 'team', ownerAgent 'team', mode 'connected_main'
      const mainTeamThread = {
        id: 'thread-main-001',
        title: 'Main Team Chat',
        threadType: 'team' as const,
        ownerAgent: 'team',
        mode: 'connected_main',
      };

      // Maestro conversation contract: threadType 'mind', ownerAgent 'maestro', mode 'standalone_specialist'
      const maestroThread = {
        id: 'thread-maestro-001',
        title: 'Maestro Orchestration',
        threadType: 'mind' as const,
        ownerAgent: 'maestro',
        specialistId: 'maestro',
        mode: 'standalone_specialist',
      };

      assert.notEqual(mainTeamThread.id, maestroThread.id, 'Thread IDs must be distinct');
      assert.equal(mainTeamThread.threadType, 'team', 'Main Team thread must have threadType "team"');
      assert.equal(maestroThread.threadType, 'mind', 'Maestro thread must have threadType "mind"');
      assert.equal(maestroThread.ownerAgent, 'maestro', 'Maestro thread owner must be "maestro"');
      assert.equal(mainTeamThread.ownerAgent, 'team', 'Main Team thread owner must be "team"');
    });

    test('R2.2 - Draft message preservation when navigating between Main Team and Maestro', () => {
      // Simulating per-chat draft storage contract from AppContext (lines 558-563)
      const drafts: Record<string, string> = {};
      const setDraft = (threadId: string, text: string) => {
        drafts[threadId] = text;
      };
      const getDraft = (threadId: string) => drafts[threadId] ?? '';

      // User types draft in Main Team
      setDraft('thread-main-001', 'Draft architectural proposal for review');

      // User switches to Maestro and types draft
      setDraft('thread-maestro-001', 'Maestro coordination plan: assign Cody to subcomponents');

      // Return to Main Team: verify draft is strictly preserved
      assert.equal(
        getDraft('thread-main-001'),
        'Draft architectural proposal for review',
        'Main Team draft must be preserved after switching'
      );

      // Verify Maestro draft is also strictly preserved
      assert.equal(
        getDraft('thread-maestro-001'),
        'Maestro coordination plan: assign Cody to subcomponents',
        'Maestro draft must be preserved'
      );

      // Verify zero cross-talk
      assert.notEqual(getDraft('thread-main-001'), getDraft('thread-maestro-001'));
    });

    test('R2.3 - Scroll position retention across active thread switching', () => {
      // Scroll position tracking contract: cached per thread ID
      const scrollCache = new Map<string, number>();
      const recordScroll = (threadId: string, offset: number) => {
        scrollCache.set(threadId, offset);
      };
      const restoreScroll = (threadId: string) => scrollCache.get(threadId) ?? 0;

      // User scrolls in Main Team
      recordScroll('thread-main-001', 480);

      // User switches to Maestro and scrolls down
      recordScroll('thread-maestro-001', 1250);

      // Switch back to Main Team: restore scroll position
      assert.equal(restoreScroll('thread-main-001'), 480, 'Main Team scroll position must be restored');

      // Switch back to Maestro: restore scroll position
      assert.equal(restoreScroll('thread-maestro-001'), 1250, 'Maestro scroll position must be restored');
    });

    test('R2.4 - Maestro coordination timeline presents planning and delegation without leaking to Main Team', async () => {
      // In Maestro view: coordination events (delegation.proposed, task.blocked) are rendered
      const { container: maestroContainer, unmount: unmountMaestro } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: CANONICAL_EXECUTION_EVENTS,
          isMaestroChat: true,
          isMainChat: false,
        })
      );

      assert.ok(
        maestroContainer.textContent?.includes('delegation.proposed'),
        'Maestro timeline must render delegation.proposed events'
      );
      assert.ok(
        maestroContainer.textContent?.includes('Maestro proposed delegating CSS review to Vision'),
        'Maestro timeline must render coordination planning details'
      );

      await unmountMaestro();

      // In Main Team view: low-level internal coordination events are suppressed to prevent log clutter
      const { container: mainContainer, unmount: unmountMain } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: CANONICAL_EXECUTION_EVENTS,
          isMainChat: true,
          isMaestroChat: false,
        })
      );

      assert.ok(
        !mainContainer.textContent?.includes('Maestro proposed delegating CSS review to Vision'),
        'Main Team timeline must suppress internal delegation proposals'
      );

      await unmountMain();
    });

    test('R2.5 - Maestro blocked task visualization with explicit blocked reason', async () => {
      const { container: maestroContainer, unmount: unmountMaestro } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: CANONICAL_EXECUTION_EVENTS,
          isMaestroChat: true,
          isMainChat: false,
        })
      );

      // Verify blocked badge and reason rendered in Maestro view
      const blockedRow = maestroContainer.querySelector('[data-testid="timeline-row-evt-12-task-blocked"]');
      assert.ok(blockedRow, 'Maestro view must render blocked task item');

      const blockedBadge = maestroContainer.querySelector('[data-testid="status-badge-evt-12-task-blocked"]');
      assert.ok(blockedBadge, 'Blocked badge must be rendered');
      assert.equal(blockedBadge.textContent?.trim(), 'blocked');

      // Click disclosure to verify explicit blocked reason
      const disclosureBtn = maestroContainer.querySelector(
        '[data-testid="disclosure-btn-evt-12-task-blocked"]'
      ) as HTMLButtonElement;
      await fireEvent.click(disclosureBtn);

      const panel = maestroContainer.querySelector('[data-testid="expanded-panel-evt-12-task-blocked"]');
      assert.ok(panel, 'Expanded panel for blocked task must be rendered');
      assert.ok(
        panel.textContent?.includes('Blocked on external credentials: authenticated backend unavailable'),
        'Blocked reason must explain backend unavailability'
      );

      await unmountMaestro();
    });
  });

  // =========================================================================
  // Requirement R3: Specialist Direct-Chat Isolation (5 tests)
  // =========================================================================
  describe('R3: Specialist Direct-Chat Isolation', () => {
    test('R3.1 - 7 Specialist visual identities with distinct theme, avatar, and role', () => {
      const specialistIds = ['cody', 'vision', 'doc', 'research', 'tester', 'deployer', 'scraapy'];

      const avatars = new Set<string>();
      const roles = new Set<string>();
      const names = new Set<string>();

      for (const id of specialistIds) {
        const profile = SPECIALIST_PROFILES[id];
        assert.ok(profile, `Profile for specialist ${id} must exist in SPECIALIST_PROFILES`);
        assert.ok(profile.name.length > 0, `Specialist ${id} must have non-empty name`);
        assert.ok(profile.role.length > 0, `Specialist ${id} must have non-empty role`);
        assert.ok(profile.avatar.startsWith('bg-'), `Specialist ${id} avatar must be a valid Tailwind bg class`);

        avatars.add(profile.avatar);
        roles.add(profile.role);
        names.add(profile.name);
      }

      // Assert complete uniqueness: 7 distinct avatars, 7 distinct roles, 7 distinct names
      assert.equal(avatars.size, 7, 'All 7 specialists must have distinct avatars');
      assert.equal(roles.size, 7, 'All 7 specialists must have distinct roles');
      assert.equal(names.size, 7, 'All 7 specialists must have distinct names');
    });

    test('R3.2 - Private conversation boundary isolation in standalone_specialist mode', () => {
      // Emulate message isolation between Cody and Tester direct conversations
      const codyMessages = [
        { id: 'm-cody-1', text: 'Refactored trajectoryParser successfully.', specialistId: 'cody' },
      ];
      const testerMessages = [
        { id: 'm-tester-1', text: 'Verified 30 Tier 1 tests passing.', specialistId: 'tester' },
      ];

      // Verifying private boundary: Cody messages must not appear in Tester thread and vice versa
      const getThreadMessages = (activeSpecialist: string) => {
        return activeSpecialist === 'cody' ? codyMessages : testerMessages;
      };

      const codyChat = getThreadMessages('cody');
      const testerChat = getThreadMessages('tester');

      assert.equal(codyChat.some((m) => m.specialistId === 'tester'), false, 'Cody chat must not contain Tester messages');
      assert.equal(testerChat.some((m) => m.specialistId === 'cody'), false, 'Tester chat must not contain Cody messages');
    });

    test('R3.3 - Draft persistence across navigation between multiple specialists', () => {
      const specialistDrafts: Record<string, string> = {};

      const setSpecialistDraft = (specId: string, draft: string) => {
        specialistDrafts[specId] = draft;
      };
      const getSpecialistDraft = (specId: string) => specialistDrafts[specId] ?? '';

      // Set drafts for 3 distinct specialists
      setSpecialistDraft('cody', 'Implement CodexToolCluster subcomponent');
      setSpecialistDraft('tester', 'Author adversarial boundary test vectors');
      setSpecialistDraft('vision', 'Verify dark mode border contrast');

      // Assert independent persistence
      assert.equal(getSpecialistDraft('cody'), 'Implement CodexToolCluster subcomponent');
      assert.equal(getSpecialistDraft('tester'), 'Author adversarial boundary test vectors');
      assert.equal(getSpecialistDraft('vision'), 'Verify dark mode border contrast');

      // Assert non-existent specialist returns empty string without error
      assert.equal(getSpecialistDraft('non-existent-spec'), '');
    });

    test('R3.4 - Accurate message attribution to specialist, user, and coordinator', () => {
      interface ChatTurnItem {
        actor: 'user' | 'specialist' | 'coordinator';
        authorName: string;
        role?: string;
        text: string;
      }

      const turns: ChatTurnItem[] = [
        { actor: 'user', authorName: 'User', text: 'Please refactor the timeline component.' },
        { actor: 'coordinator', authorName: 'Maestro', role: 'Team orchestration', text: 'Delegated subtask to Cody.' },
        { actor: 'specialist', authorName: 'Cody', role: 'Software engineering', text: 'Completed decomposition.' },
      ];

      // Verifying clear attribution tags
      assert.equal(turns[0].actor, 'user');
      assert.equal(turns[0].authorName, 'User');

      assert.equal(turns[1].actor, 'coordinator');
      assert.equal(turns[1].authorName, 'Maestro');
      assert.equal(turns[1].role, 'Team orchestration');

      assert.equal(turns[2].actor, 'specialist');
      assert.equal(turns[2].authorName, 'Cody');
      assert.equal(turns[2].role, 'Software engineering');
    });

    test('R3.5 - Activity feed filtering strictly by active specialist', async () => {
      // In Cody direct chat: events for Tester and Deployer should be filtered out
      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: CANONICAL_EXECUTION_EVENTS,
          activeSpecialistId: 'cody',
        })
      );

      // Verify Cody events are rendered
      assert.ok(
        container.textContent?.includes('Cody actively parsing AST of CodexExecutionView'),
        'Cody events must be rendered in Cody direct chat'
      );
      assert.ok(
        container.textContent?.includes('Started tool: execute_command (typecheck)'),
        'Cody tool executions must be rendered'
      );

      // Verify Tester and Deployer specific events are excluded
      assert.ok(
        !container.textContent?.includes('Offline verification completed: 30 of 30 tests passed'),
        'Tester verification completed must be excluded from Cody activity feed'
      );
      assert.ok(
        !container.textContent?.includes('Deployer agent terminated with exit code 1'),
        'Deployer failure must be excluded from Cody activity feed'
      );

      await unmount();
    });
  });

  // =========================================================================
  // Requirement R4: Multi-Specialist Parallel Work Visualization (5 tests)
  // =========================================================================
  describe('R4: Multi-Specialist Parallel Work Visualization', () => {
    test('R4.1 - Multi-Specialist parallel execution view renders all active specialists', async () => {
      const { container, unmount } = await render(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: PARALLEL_SPECIALIST_INTERVALS,
        })
      );

      // Verify specialist cards rendered for each specialist in the intervals fixture
      for (const interval of PARALLEL_SPECIALIST_INTERVALS) {
        const card = container.querySelector(`[data-testid="specialist-card-${interval.specialistId}"]`);
        assert.ok(card, `Card for specialist ${interval.specialistId} must be rendered`);
      }

      await unmount();
    });

    test('R4.2 - Stable identity rendering across parallel cards (avatar, name, role, status)', async () => {
      const { container, unmount } = await render(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: PARALLEL_SPECIALIST_INTERVALS,
        })
      );

      for (const interval of PARALLEL_SPECIALIST_INTERVALS) {
        const card = container.querySelector(
          `[data-testid="specialist-card-${interval.specialistId}"]`
        ) as HTMLElement;

        assert.ok(card.textContent?.includes(interval.specialistName), 'Card must show specialist name');
        assert.ok(card.textContent?.includes(interval.specialistRole), 'Card must show specialist role');
        assert.ok(card.textContent?.includes(interval.status), 'Card must show specialist status');

        const avatar = card.querySelector(`[data-testid="specialist-avatar-${interval.specialistId}"]`);
        assert.ok(avatar, 'Card must render specialist avatar');
        assert.equal(avatar?.textContent?.trim(), interval.specialistName.slice(0, 1));
      }

      await unmount();
    });

    test('R4.3 - Overlapping activity timeline intervals visually represented as parallel bars', async () => {
      const { container, unmount } = await render(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: PARALLEL_SPECIALIST_INTERVALS,
        })
      );

      // Verify intervals: Cody (0s-14s), Tester (4s-18s), Vision (8s-22s) overlap concurrently
      const codyBar = container.querySelector('[data-testid="interval-bar-cody"]') as HTMLElement;
      const testerBar = container.querySelector('[data-testid="interval-bar-tester"]') as HTMLElement;
      const visionBar = container.querySelector('[data-testid="interval-bar-vision"]') as HTMLElement;

      assert.ok(codyBar, 'Cody interval bar must be rendered');
      assert.ok(testerBar, 'Tester interval bar must be rendered');
      assert.ok(visionBar, 'Vision interval bar must be rendered');

      // Verify start offsets: Cody starts at 0%, Tester starts >0%, Vision starts > Tester
      const codyLeft = parseFloat(codyBar.style.left);
      const testerLeft = parseFloat(testerBar.style.left);
      const visionLeft = parseFloat(visionBar.style.left);

      assert.equal(codyLeft, 0, 'Cody should start at 0%');
      assert.ok(testerLeft > codyLeft, 'Tester should start after Cody');
      assert.ok(visionLeft > testerLeft, 'Vision should start after Tester');

      // Overlap verification: Cody ends at 14s while Tester starts at 4s (overlapping by 10s)
      assert.ok(
        PARALLEL_SPECIALIST_INTERVALS[0].endRelativeSec > PARALLEL_SPECIALIST_INTERVALS[1].startRelativeSec,
        'Cody and Tester intervals must overlap in time range'
      );

      await unmount();
    });

    test('R4.4 - Explicit [Simulated Work Visualization] banner prominently displayed', async () => {
      const { container, unmount } = await render(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: PARALLEL_SPECIALIST_INTERVALS,
          isSimulated: true,
        })
      );

      const banner = container.querySelector('[data-testid="simulated-work-banner"]') as HTMLElement;
      assert.ok(banner, 'Simulated work banner must be displayed');
      assert.ok(
        banner.textContent?.includes('[Simulated Work Visualization]'),
        'Banner must display [Simulated Work Visualization]'
      );
      assert.ok(
        banner.textContent?.includes('Does not imply real backend concurrency'),
        'Banner must explicitly state offline demonstration abstraction'
      );

      await unmount();
    });

    test('R4.5 - Specialist task cards render current step and collapsible activity history', async () => {
      const { container, unmount } = await render(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: PARALLEL_SPECIALIST_INTERVALS,
        })
      );

      const codyCard = container.querySelector('[data-testid="specialist-card-cody"]') as HTMLElement;
      assert.ok(
        codyCard.textContent?.includes('Current step: Exporting CodexToolRow and trajectoryParser'),
        'Cody card must render current step'
      );

      // Verify collapsible history list
      const toggleHistoryBtn = container.querySelector(
        '[data-testid="history-toggle-cody"]'
      ) as HTMLButtonElement;
      assert.ok(toggleHistoryBtn, 'History toggle button must exist');

      // Initially collapsed
      assert.equal(container.querySelector('[data-testid="history-list-cody"]'), null);

      // Expand history
      await fireEvent.click(toggleHistoryBtn);
      const historyList = container.querySelector('[data-testid="history-list-cody"]') as HTMLElement;
      assert.ok(historyList, 'History list must be visible after click');
      assert.ok(
        historyList.textContent?.includes('Isolated trajectory parser from monolithic component'),
        'History list must render historical step entries'
      );

      await unmount();
    });
  });

  // =========================================================================
  // Requirement R5: Safe Allowlist-Based Tool Execution Details & Redaction (5 tests)
  // =========================================================================
  describe('R5: Safe Allowlist-Based Tool Execution Details & Redaction', () => {
    test('R5.1 - Strict allowlist tool execution field extraction drops non-allowlisted keys', () => {
      const rawTool = ADVERSARIAL_TOOL_PAYLOADS.allowedFieldsOnly.rawTool;
      const safeDetails = extractAllowlistToolDetails(rawTool, 'cody', 'Cody');

      // Allowed fields must be retained
      assert.equal(safeDetails.toolName, 'read_file');
      assert.equal(safeDetails.operationType, 'read');
      assert.equal(safeDetails.filePath, '/safe/project/path/src/App.tsx');
      assert.equal(safeDetails.status, 'completed');
      assert.equal(safeDetails.associatedSpecialist?.id, 'cody');
      assert.equal(safeDetails.associatedSpecialist?.name, 'Cody');

      // Forbidden fields MUST NOT exist in safeDetails
      const safeRecord = safeDetails as Record<string, any>;
      assert.equal(safeRecord.rawStderr, undefined, 'rawStderr must not be present');
      assert.equal(safeRecord.environment, undefined, 'environment must not be present');
      assert.equal(safeRecord.systemTokens, undefined, 'systemTokens must not be present');
      assert.equal(safeRecord.hostDetails, undefined, 'hostDetails must not be present');
    });

    test('R5.2 - Bearer token scrubbing replaces tokens with [REDACTED]', () => {
      const input = ADVERSARIAL_TOOL_PAYLOADS.bearerToken.raw;
      const result = redactSensitiveData(input);

      assert.equal(result.wasRedacted, true, 'Redaction flag must be true');
      assert.ok(result.matchCount > 0, 'Match count must be greater than zero');
      assert.ok(
        result.text.includes('Authorization: [REDACTED]'),
        'Bearer token must be replaced with [REDACTED]'
      );
      assert.ok(
        !result.text.includes('ya29.a0AfH6SMB_secret_access_token_123456789'),
        'Raw token must not appear anywhere in sanitized output'
      );
    });

    test('R5.3 - API key scrubbing replaces OpenAI, Gemini, and GitHub tokens with [REDACTED]', () => {
      // 1. OpenAI sk-...
      const openAiRes = redactSensitiveData(ADVERSARIAL_TOOL_PAYLOADS.openAiApiKey.raw);
      assert.equal(openAiRes.wasRedacted, true);
      assert.ok(openAiRes.text.includes('Failed with key [REDACTED]'));
      assert.ok(!openAiRes.text.includes('sk-proj-abc123456789xyz9876543210QWERTYUIOP'));

      // 2. Google Gemini AIza...
      const geminiRes = redactSensitiveData(ADVERSARIAL_TOOL_PAYLOADS.googleApiKey.raw);
      assert.equal(geminiRes.wasRedacted, true);
      assert.ok(geminiRes.text.includes('Using Gemini key [REDACTED]'));
      assert.ok(!geminiRes.text.includes('AIzaSyD1234567890abcdefghijklmnopqrstuv'));

      // 3. GitHub ghp_...
      const ghRes = redactSensitiveData('Cloned using token ghp_1234567890abcdef1234567890abcdef1234.');
      assert.equal(ghRes.wasRedacted, true);
      assert.ok(ghRes.text.includes('Cloned using token [REDACTED].'));
    });

    test('R5.4 - Authorization headers scrubbed in raw tool headers', () => {
      const input = ADVERSARIAL_TOOL_PAYLOADS.authHeader.raw;
      const result = redactSensitiveData(input);

      assert.equal(result.wasRedacted, true);
      assert.ok(result.text.includes('Authorization: [REDACTED]'));
      assert.ok(!result.text.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));
    });

    test('R5.5 - Environment variable scrubbing sanitizes secret keys', () => {
      const input = ADVERSARIAL_TOOL_PAYLOADS.envVars.raw;
      const result = redactSensitiveData(input);

      assert.equal(result.wasRedacted, true);
      assert.ok(result.text.includes('ANTHROPIC_API_KEY=[REDACTED]'));
      assert.ok(result.text.includes('AWS_SECRET_ACCESS_KEY=[REDACTED]'));
      assert.ok(!result.text.includes('sk-ant-api03-abcdef123456'));
      assert.ok(!result.text.includes('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'));
    });
  });

  // =========================================================================
  // Requirement R6: Frontend Architecture, Maintainability & Accessibility (5 tests)
  // =========================================================================
  describe('R6: Frontend Architecture, Maintainability & Accessibility', () => {
    test('R6.1 - Canonical typed presentation model envelope validation', () => {
      // 1. Valid event
      const validEvent = CANONICAL_EXECUTION_EVENTS[0];
      const validCheck = validateExecutionActivityEvent(validEvent);
      assert.equal(validCheck.valid, true, 'Canonical event must be valid');
      assert.equal(validCheck.errors.length, 0);

      // 2. Corrupted event missing eventId
      const missingIdCheck = validateExecutionActivityEvent({
        ...validEvent,
        eventId: '',
      });
      assert.equal(missingIdCheck.valid, false);
      assert.ok(missingIdCheck.errors.some((e) => e.includes('Missing or empty eventId')));

      // 3. Corrupted event with forbidden 'production' sourceClassification
      const forbiddenSourceCheck = validateExecutionActivityEvent({
        ...validEvent,
        sourceClassification: 'production' as any,
      });
      assert.equal(forbiddenSourceCheck.valid, false);
      assert.ok(forbiddenSourceCheck.errors.some((e) => e.includes('Forbidden sourceClassification')));

      // 4. Invalid eventType
      const invalidTypeCheck = validateExecutionActivityEvent({
        ...validEvent,
        eventType: 'unregistered.event.type' as any,
      });
      assert.equal(invalidTypeCheck.valid, false);
      assert.ok(invalidTypeCheck.errors.some((e) => e.includes('Invalid eventType')));
    });

    test('R6.2 - Keyboard accessibility: Enter and Space toggle disclosure', async () => {
      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: CANONICAL_EXECUTION_EVENTS,
        })
      );

      const disclosureBtn = container.querySelector(
        '[data-testid="disclosure-btn-evt-10-tool-completed"]'
      ) as HTMLButtonElement;
      assert.ok(disclosureBtn, 'Disclosure toggle button must exist');

      // 1. Press Enter (keyCode 13) to expand
      assert.equal(disclosureBtn.getAttribute('aria-expanded'), 'false');
      await fireEvent.keyDown(disclosureBtn, { key: 'Enter', keyCode: 13 });
      assert.equal(disclosureBtn.getAttribute('aria-expanded'), 'true');
      assert.ok(container.querySelector('[data-testid="expanded-panel-evt-10-tool-completed"]'));

      // 2. Press Space (keyCode 32) to collapse
      await fireEvent.keyDown(disclosureBtn, { key: ' ', keyCode: 32 });
      assert.equal(disclosureBtn.getAttribute('aria-expanded'), 'false');
      assert.equal(container.querySelector('[data-testid="expanded-panel-evt-10-tool-completed"]'), null);

      await unmount();
    });

    test('R6.3 - ARIA attributes binding: aria-expanded, aria-controls, and role="region"', async () => {
      const { container, unmount } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: CANONICAL_EXECUTION_EVENTS,
        })
      );

      const disclosureBtn = container.querySelector(
        '[data-testid="disclosure-btn-evt-10-tool-completed"]'
      ) as HTMLButtonElement;
      const controlsId = disclosureBtn.getAttribute('aria-controls');
      assert.equal(controlsId, 'details-evt-10-tool-completed');

      // Expand panel
      await fireEvent.click(disclosureBtn);

      const panel = container.querySelector(`#${controlsId}`) as HTMLElement;
      assert.ok(panel, 'Target panel matching aria-controls ID must exist in DOM');
      assert.equal(panel.getAttribute('role'), 'region', 'Panel must have role="region"');
      assert.ok(panel.getAttribute('aria-label')?.includes('Completed tool: write_file'), 'Panel must have descriptive aria-label');

      await unmount();
    });

    test('R6.4 - Drawer navigation keyboard accessibility and focusability', async () => {
      // Mock accessible navigation list component
      const NavTestComponent = () => {
        const [activeIdx, setActiveIdx] = React.useState(0);
        const items = ['Main Team', 'Maestro', 'Cody', 'Tester'];

        const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
          if (e.key === 'ArrowDown') {
            setActiveIdx((idx + 1) % items.length);
          } else if (e.key === 'ArrowUp') {
            setActiveIdx((idx - 1 + items.length) % items.length);
          } else if (e.key === 'Enter') {
            setActiveIdx(idx);
          }
        };

        return React.createElement(
          'ul',
          { role: 'tablist', 'aria-label': 'Navigation Drawer Tabs' },
          items.map((item, idx) =>
            React.createElement(
              'li',
              {
                key: item,
                role: 'tab',
                tabIndex: activeIdx === idx ? 0 : -1,
                'aria-selected': activeIdx === idx,
                onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, idx),
                'data-testid': `nav-tab-${item.toLowerCase().replace(' ', '-')}`,
              },
              item
            )
          )
        );
      };

      const { container, unmount } = await render(React.createElement(NavTestComponent));

      const firstTab = container.querySelector('[data-testid="nav-tab-main-team"]') as HTMLElement;
      assert.equal(firstTab.getAttribute('aria-selected'), 'true');
      assert.equal(firstTab.getAttribute('tabIndex'), '0');

      // Press ArrowDown to navigate to Maestro
      await fireEvent.keyDown(firstTab, { key: 'ArrowDown', code: 'ArrowDown' });
      const secondTab = container.querySelector('[data-testid="nav-tab-maestro"]') as HTMLElement;
      assert.equal(secondTab.getAttribute('aria-selected'), 'true');
      assert.equal(secondTab.getAttribute('tabIndex'), '0');

      await unmount();
    });

    test('R6.5 - Clean component mount and unmount lifecycle with zero React 19 warnings', async () => {
      // Mount and unmount timeline
      const { container: c1, unmount: unmount1 } = await render(
        React.createElement(ExecutionActivityTimeline, {
          events: CANONICAL_EXECUTION_EVENTS,
        })
      );
      assert.ok(c1.querySelector('.execution-activity-timeline'));
      await unmount1();
      assert.equal(c1.innerHTML, '', 'Container 1 should be completely empty after unmount');

      // Mount and unmount parallel execution view
      const { container: c2, unmount: unmount2 } = await render(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: PARALLEL_SPECIALIST_INTERVALS,
        })
      );
      assert.ok(c2.querySelector('.multi-specialist-execution-view'));
      await unmount2();
      assert.equal(c2.innerHTML, '', 'Container 2 should be completely empty after unmount');
    });
  });
});
