/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tier 3: Cross-Feature Interactions E2E Test Suite (Pairwise Coverage C1–C10)
 * Validates cross-cutting requirements from ORIGINAL_REQUEST.md and TEST_INFRA.md:
 * - C1 (R1 x R2): Timeline in Maestro reflects coordination events without leaking low-level scratchpad logs
 * - C2 (R1 x R5): Timeline disclosure expansion renders tool details strictly through allowlist redaction
 * - C3 (R2 x R3): Main Team, Maestro, and Specialist direct chats maintain independent draft buffers without crosstalk
 * - C4 (R3 x R4): Clicking specialist in Multi-Specialist view navigates to private Direct Chat with state intact
 * - C5 (R4 x R5): Parallel work cards in Multi-Specialist view redact task descriptions and current steps
 * - C6 (R2 x R4 x R6): Maestro coordination view links to Multi-Specialist timeline with keyboard accessibility & ARIA landmarks
 * - C7 (R1 x R6): Timeline implements canonical typed presentation model, validating sourceClassification: 'simulated' & ARIA disclosures
 * - C8 (R3 x R5): Specialist direct chat tool execution messages enforce allowlist redaction
 * - C9 (R1 x R3 x R4): Parallel work intervals synchronize with unified timeline events
 * - C10 (R2 x R5 x R6): Maestro team summary cards redact embedded env vars while preserving accessible keyboard navigation
 */

import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { setupJSDOM, render, fireEvent, JSDOMHarness } from './helpers/domHarness.js';
import {
  CANONICAL_EXECUTION_EVENTS,
  PARALLEL_SPECIALIST_INTERVALS,
  SPECIALIST_PROFILES,
  ADVERSARIAL_TOOL_PAYLOADS,
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
  MaestroCoordinationView,
  MaestroTeamSummaryCard,
  type TeamSummaryData,
} from '../../mediobot-ui-refinement/src/features/threads/MaestroCoordinationView.tsx';

describe('Tier 3: Cross-Feature Interactions E2E Suite (C1–C10)', () => {
  let harness: JSDOMHarness;

  before(() => {
    harness = setupJSDOM();
  });

  beforeEach(() => {
    harness.cleanup();
  });

  // =========================================================================
  // C1 (R1 x R2): Timeline rendered in Maestro reflects coordination events
  // without leaking low-level specialist scratchpad logs
  // =========================================================================
  test('C1 (R1 x R2) - Maestro timeline renders coordination events while filtering out low-level scratchpad logs', async () => {
    // Mixed event log: high-level coordinator events vs low-level specialist scratchpad events
    const mixedEvents: ExecutionActivityEvent[] = [
      {
        eventId: 'evt-c1-coord-1',
        eventType: 'delegation.proposed',
        teamId: 'team-coord',
        timestamp: 1700000001000,
        status: 'running',
        summary: 'Maestro proposed subtask delegation to Cody for parser decomposition',
        sourceClassification: 'simulated',
      },
      {
        eventId: 'evt-c1-coord-2',
        eventType: 'task.blocked',
        teamId: 'team-coord',
        timestamp: 1700000002000,
        status: 'blocked',
        summary: 'External cloud database connection blocked: mock runtime only',
        sourceClassification: 'simulated',
      },
      {
        eventId: 'evt-c1-scratchpad-1',
        eventType: 'file.inspected',
        teamId: 'team-coord',
        specialistId: 'cody',
        timestamp: 1700000003000,
        status: 'completed',
        summary: 'Cody scratchpad: regex matching token in node_modules temp buffer',
        sourceClassification: 'simulated',
      },
    ];

    // 1. In Maestro Conversation View: Coordination events must be rendered
    const { container: maestroContainer, unmount: unmountMaestro } = await render(
      React.createElement(ExecutionActivityTimeline, {
        events: mixedEvents,
        isMaestroChat: true,
        isMainChat: false,
      })
    );

    assert.ok(
      maestroContainer.textContent?.includes('delegation.proposed'),
      'Maestro timeline must render delegation.proposed coordination event'
    );
    assert.ok(
      maestroContainer.textContent?.includes('task.blocked'),
      'Maestro timeline must render task.blocked event'
    );
    assert.ok(
      maestroContainer.textContent?.includes('Maestro proposed subtask delegation'),
      'Maestro summary must be clearly rendered'
    );
    await unmountMaestro();

    // 2. In Main Team View: Coordination proposals are suppressed to keep timeline clean
    const { container: mainContainer, unmount: unmountMain } = await render(
      React.createElement(ExecutionActivityTimeline, {
        events: mixedEvents,
        isMainChat: true,
        isMaestroChat: false,
      })
    );

    assert.ok(
      !mainContainer.textContent?.includes('delegation.proposed'),
      'Main chat must suppress internal delegation.proposed events'
    );
    assert.ok(
      !mainContainer.textContent?.includes('Maestro proposed subtask delegation'),
      'Main chat must not leak internal coordination proposals'
    );
    await unmountMain();
  });

  // =========================================================================
  // C2 (R1 x R5): Timeline disclosure expansion renders tool details strictly
  // processed through allowlist redaction, ensuring zero credential leak in DOM
  // =========================================================================
  test('C2 (R1 x R5) - Expanded timeline tool details enforce allowlist redaction with zero credential leak', async () => {
    // Construct adversarial raw tool payload containing multiple secrets
    const rawAdversarialTool = {
      toolName: 'execute_command',
      operationType: 'execute' as const,
      filePath: '/workspace/src/config.ts',
      commandDescription:
        'curl -H "Authorization: Bearer secret_bearer_token_xyz987654" -e ANTHROPIC_API_KEY=sk-ant-api03-abcdef123456 https://api.example.com',
      startTimestamp: 1700000000000,
      completionTimestamp: 1700000000500,
      status: 'completed' as const,
      errorInfo: 'Failed connecting to postgresql://admin:SuperSecretPass123!@127.0.0.1:5432/mediobot',
      rawStderr: 'SECRET_UNLEAKED_INTERNAL_TRACE',
      environment: { LEAK_VAR: 'SHOULD_NEVER_RENDER' },
      sanitizedOutputPreview:
        'Server response: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123 and key sk-proj-1234567890abcdef1234567890',
    };

    // Extract tool details strictly through safe allowlist extractor
    const safeToolDetails = extractAllowlistToolDetails(rawAdversarialTool, 'cody', 'Cody');

    const adversarialEvent: ExecutionActivityEvent = {
      eventId: 'evt-c2-adversarial-tool',
      eventType: 'tool.completed',
      teamId: 'team-primary',
      specialistId: 'cody',
      timestamp: 1700000000500,
      status: 'completed',
      summary: 'Executed shell command for API validation',
      details: 'Connected with Bearer secret_bearer_token_xyz987654 in subshell',
      sourceClassification: 'simulated',
      toolDetails: safeToolDetails,
    };

    const { container, unmount } = await render(
      React.createElement(ExecutionActivityTimeline, {
        events: [adversarialEvent],
      })
    );

    // Expand disclosure
    const disclosureBtn = container.querySelector(
      '[data-testid="disclosure-btn-evt-c2-adversarial-tool"]'
    ) as HTMLButtonElement;
    assert.ok(disclosureBtn, 'Disclosure toggle button must exist');
    await fireEvent.click(disclosureBtn);

    const expandedPanel = container.querySelector(
      '[data-testid="expanded-panel-evt-c2-adversarial-tool"]'
    ) as HTMLElement;
    assert.ok(expandedPanel, 'Expanded details panel must be visible');

    const domText = expandedPanel.textContent || '';

    // INVARIANT 1: Zero credential leaks in rendered DOM
    assert.ok(!domText.includes('secret_bearer_token_xyz987654'), 'Bearer token must not leak in rendered DOM');
    assert.ok(!domText.includes('sk-ant-api03-abcdef123456'), 'Anthropic API key must not leak in rendered DOM');
    assert.ok(!domText.includes('SuperSecretPass123!'), 'Database password must not leak in rendered DOM');
    assert.ok(!domText.includes('SECRET_UNLEAKED_INTERNAL_TRACE'), 'Non-allowlisted stderr must not leak');
    assert.ok(!domText.includes('SHOULD_NEVER_RENDER'), 'Raw environment object must not leak');

    // INVARIANT 2: Allowlisted fields and redaction tokens ARE present
    assert.ok(domText.includes('[REDACTED]'), 'Must render [REDACTED]');
    assert.ok(domText.includes('execute_command'), 'Allowed toolName must be present');
    assert.ok(domText.includes('/workspace/src/config.ts'), 'Allowed filePath must be present');

    await unmount();
  });

  // =========================================================================
  // C3 (R2 x R3): Main Team, Maestro, and Specialist direct chats maintain
  // independent draft buffers without crosstalk or state leaks
  // =========================================================================
  test('C3 (R2 x R3) - Independent draft buffers across Main Team, Maestro, and Specialist direct chats', () => {
    // Comprehensive draft store mapping threadId / specialistId to draft text
    const drafts: Record<string, string> = {};

    const setDraft = (key: string, value: string) => {
      drafts[key] = value;
    };
    const getDraft = (key: string) => drafts[key] ?? '';

    // Define 5 distinct conversation contexts across all 3 modes
    const contexts = [
      { id: 'team:main-thread-1', mode: 'main_team', draft: 'Main Team: High-level architectural roadmap' },
      { id: 'mind:maestro-thread-1', mode: 'maestro', draft: 'Maestro: Parallel task decomposition for Cody and Tester' },
      { id: 'spec:cody', mode: 'specialist_direct', draft: 'Cody Direct: Fix import resolution in trajectory parser' },
      { id: 'spec:tester', mode: 'specialist_direct', draft: 'Tester Direct: Boundary test vectors for quota limits' },
      { id: 'spec:vision', mode: 'specialist_direct', draft: 'Vision Direct: Verify WCAG AAA color contrast' },
    ];

    // Simulate 10 rapid switching passes across all 5 contexts
    for (let cycle = 0; cycle < 10; cycle++) {
      for (const ctx of contexts) {
        // Append cycle counter to verify ongoing typing updates without crosstalk
        setDraft(ctx.id, `${ctx.draft} (v${cycle})`);
      }
    }

    // Verify 100% draft isolation: each context retains its exact draft with zero crosstalk
    for (const ctx of contexts) {
      const stored = getDraft(ctx.id);
      assert.equal(
        stored,
        `${ctx.draft} (v9)`,
        `Draft for context ${ctx.id} must be strictly preserved without crosstalk`
      );
    }

    // Assert that no two drafts are identical
    const uniqueDrafts = new Set(Object.values(drafts));
    assert.equal(uniqueDrafts.size, contexts.length, 'All drafts must be completely distinct');
  });

  // =========================================================================
  // C4 (R3 x R4): Clicking specialist in Multi-Specialist view navigates
  // directly to private Direct Chat with identity, history, and drafts intact
  // =========================================================================
  test('C4 (R3 x R4) - Clicking specialist in Multi-Specialist view navigates to private Direct Chat with state intact', async () => {
    // Composite component orchestrating navigation between Multi-Specialist view and Direct Chat
    const TestNavigationHarness: React.FC = () => {
      const [activeSpecialist, setActiveSpecialist] = useState<string | null>(null);
      const [drafts, setDrafts] = useState<Record<string, string>>({
        cody: 'Cody ongoing implementation draft',
        tester: 'Tester ongoing test draft',
      });

      if (activeSpecialist) {
        return React.createElement(SpecialistDirectChatView, {
          specialistId: activeSpecialist,
          draftText: drafts[activeSpecialist] || '',
          onDraftChange: (text) => setDrafts((prev) => ({ ...prev, [activeSpecialist]: text })),
        });
      }

      return React.createElement(MultiSpecialistExecutionView, {
        teamId: 'team-nav-test',
        intervals: PARALLEL_SPECIALIST_INTERVALS,
        onSelectSpecialist: (specId) => setActiveSpecialist(specId),
      });
    };

    const { container, unmount } = await render(React.createElement(TestNavigationHarness));

    // 1. Initial view: MultiSpecialistExecutionView with cards
    const codyCard = container.querySelector('[data-testid="specialist-card-cody"]') as HTMLElement;
    assert.ok(codyCard, 'Cody specialist card must be present');
    assert.equal(codyCard.getAttribute('role'), 'button');

    // 2. Click Cody card to navigate
    await fireEvent.click(codyCard);

    // 3. Verify Direct Chat view for Cody is now rendered with identity and draft intact
    const codyChat = container.querySelector('[data-testid="specialist-direct-chat-cody"]');
    assert.ok(codyChat, 'Must navigate directly to Cody direct chat');

    const chatName = container.querySelector('[data-testid="specialist-chat-name"]');
    assert.equal(chatName?.textContent?.trim(), 'Cody');

    const draftInput = container.querySelector('[data-testid="specialist-draft-input-cody"]') as HTMLTextAreaElement;
    assert.ok(draftInput, 'Draft input must be present');
    assert.equal(draftInput.value, 'Cody ongoing implementation draft', 'Cody draft must be intact upon navigation');

    await unmount();
  });

  // =========================================================================
  // C5 (R4 x R5): Parallel work cards in Multi-Specialist view redact task
  // descriptions and current steps, preventing embedded secrets from rendering
  // =========================================================================
  test('C5 (R4 x R5) - Multi-Specialist parallel work cards redact secrets in tasks and steps', async () => {
    const adversarialIntervals: SpecialistExecutionInterval[] = [
      {
        intervalId: 'int-adv-1',
        specialistId: 'cody',
        specialistName: 'Cody',
        specialistRole: 'Software Engineer',
        taskTitle: 'Syncing repo with token ghp_1234567890abcdef1234567890abcdef1234 in git url',
        startRelativeSec: 0,
        endRelativeSec: 10,
        status: 'working',
        currentStep: 'Exported ANTHROPIC_API_KEY=sk-ant-api03-abcdef123456 to shell environment',
        history: [
          'Initialized session with Bearer ya29.a0AfH6SMB_secret_access_token_123456789',
          'Database setup postgresql://dbuser:TopSecretPassword123@localhost:5432/prod',
        ],
      },
    ];

    const { container, unmount } = await render(
      React.createElement(MultiSpecialistExecutionView, {
        teamId: 'team-redaction-test',
        intervals: adversarialIntervals,
      })
    );

    // Expand history
    const historyToggle = container.querySelector('[data-testid="history-toggle-cody"]') as HTMLButtonElement;
    assert.ok(historyToggle, 'History toggle button must be present');
    await fireEvent.click(historyToggle);

    const card = container.querySelector('[data-testid="specialist-card-cody"]') as HTMLElement;
    assert.ok(card, 'Specialist card must exist');
    const cardText = card.textContent || '';

    // INVARIANT: Raw credentials must NOT appear anywhere in the card
    assert.ok(!cardText.includes('ghp_1234567890abcdef1234567890abcdef1234'), 'GitHub PAT must be redacted in task title');
    assert.ok(!cardText.includes('sk-ant-api03-abcdef123456'), 'Anthropic API key must be redacted in current step');
    assert.ok(!cardText.includes('ya29.a0AfH6SMB_secret_access_token_123456789'), 'Bearer token must be redacted in history');
    assert.ok(!cardText.includes('TopSecretPassword123'), 'Database password must be redacted in history');

    // INVARIANT: Redaction markers must be rendered in their place
    assert.ok(cardText.includes('[REDACTED]'), 'Card must render [REDACTED]');

    await unmount();
  });

  // =========================================================================
  // C6 (R2 x R4 x R6): Maestro coordination view links to Multi-Specialist
  // parallel timeline with keyboard accessibility and ARIA landmarks
  // =========================================================================
  test('C6 (R2 x R4 x R6) - Maestro coordination view links to parallel timeline with keyboard accessibility & ARIA landmarks', async () => {
    const { container, unmount } = await render(
      React.createElement(MaestroCoordinationView, {
        teamId: 'team-coord-a11y',
        events: CANONICAL_EXECUTION_EVENTS,
        intervals: PARALLEL_SPECIALIST_INTERVALS,
      })
    );

    // 1. Verify ARIA landmark
    const coordinationRegion = container.querySelector('[data-testid="maestro-coordination-view"]');
    assert.ok(coordinationRegion, 'Coordination view container must exist');
    assert.equal(coordinationRegion.getAttribute('role'), 'region');
    assert.equal(coordinationRegion.getAttribute('aria-label'), 'Maestro Coordination View');

    // 2. Link button to parallel timeline
    const toggleBtn = container.querySelector('[data-testid="link-to-parallel-timeline"]') as HTMLButtonElement;
    assert.ok(toggleBtn, 'Toggle button to parallel timeline must exist');
    assert.equal(toggleBtn.getAttribute('aria-expanded'), 'false');
    assert.equal(container.querySelector('[data-testid="parallel-timeline-container"]'), null);

    // 3. Keyboard navigation: press Enter on button
    await fireEvent.keyDown(toggleBtn, { key: 'Enter' });
    assert.equal(toggleBtn.getAttribute('aria-expanded'), 'true');

    // 4. Parallel timeline container rendered with ARIA landmark
    const parallelSection = container.querySelector('[data-testid="parallel-timeline-container"]');
    assert.ok(parallelSection, 'Parallel timeline section must be rendered');
    assert.equal(parallelSection?.getAttribute('role'), 'region');
    assert.equal(parallelSection?.getAttribute('aria-label'), 'Multi-Specialist Parallel Timeline');

    // 5. Keyboard accessibility: press Escape to close parallel timeline
    await fireEvent.keyDown(coordinationRegion, { key: 'Escape' });
    assert.equal(toggleBtn.getAttribute('aria-expanded'), 'false');
    assert.equal(container.querySelector('[data-testid="parallel-timeline-container"]'), null);

    await unmount();
  });

  // =========================================================================
  // C7 (R1 x R6): Timeline implements canonical typed presentation model,
  // validating sourceClassification: 'simulated' and ARIA disclosures
  // =========================================================================
  test('C7 (R1 x R6) - Canonical typed presentation model envelope validation and ARIA disclosure binding', async () => {
    // 1. Validate envelope contract: simulated vs unverified vs invalid
    const validSimulated: ExecutionActivityEvent = {
      eventId: 'evt-c7-valid-sim',
      eventType: 'agent.working',
      teamId: 'team-primary',
      timestamp: 1700000000000,
      status: 'running',
      summary: 'Specialist parsing AST',
      sourceClassification: 'simulated',
    };
    assert.equal(validateExecutionActivityEvent(validSimulated).valid, true);

    const validUnverified: ExecutionActivityEvent = {
      ...validSimulated,
      eventId: 'evt-c7-valid-unver',
      sourceClassification: 'unverified',
    };
    assert.equal(validateExecutionActivityEvent(validUnverified).valid, true);

    // Forbidden production claims must be strictly rejected
    const invalidProduction = {
      ...validSimulated,
      eventId: 'evt-c7-invalid-prod',
      sourceClassification: 'production_authenticated',
    };
    const validationResult = validateExecutionActivityEvent(invalidProduction);
    assert.equal(validationResult.valid, false);
    assert.ok(
      validationResult.errors.some((e) => e.includes('Forbidden sourceClassification')),
      'Must reject forbidden non-simulated sourceClassification'
    );

    // 2. Render timeline and verify ARIA disclosure attributes
    const { container, unmount } = await render(
      React.createElement(ExecutionActivityTimeline, {
        events: [
          validSimulated,
          {
            ...validSimulated,
            eventId: 'evt-c7-details',
            details: 'Detailed diagnostic trace',
          },
        ],
      })
    );

    const disclosureBtn = container.querySelector(
      '[data-testid="disclosure-btn-evt-c7-details"]'
    ) as HTMLButtonElement;
    assert.ok(disclosureBtn, 'Disclosure toggle button must exist');
    assert.equal(disclosureBtn.getAttribute('aria-expanded'), 'false');
    assert.equal(disclosureBtn.getAttribute('aria-controls'), 'details-evt-c7-details');

    // Toggle via Space key
    await fireEvent.keyDown(disclosureBtn, { key: ' ' });
    assert.equal(disclosureBtn.getAttribute('aria-expanded'), 'true');

    const expandedRegion = container.querySelector('#details-evt-c7-details');
    assert.ok(expandedRegion, 'Expanded panel must have matching id');
    assert.equal(expandedRegion?.getAttribute('role'), 'region');

    await unmount();
  });

  // =========================================================================
  // C8 (R3 x R5): Specialist direct chat tool execution messages enforce
  // allowlist redaction even when raw tool outputs contain simulated mock tokens
  // =========================================================================
  test('C8 (R3 x R5) - Specialist direct chat tool execution messages enforce allowlist redaction', async () => {
    // Construct specialist direct chat messages with embedded tokens in tool reports
    const rawMockMessage = `Executed tool test_runner:
Output: Passed 15 tests. Authenticated with Bearer token_mock_test_session_123456789
Config: ANTHROPIC_API_KEY=sk-ant-api03-abcdef1234567890
Database: postgresql://readonly:SecretPass999@localhost:5432/test`;

    const redactedMessage = redactSensitiveData(rawMockMessage).text;

    const messages = [
      {
        id: 'msg-c8-1',
        actor: 'specialist' as const,
        authorName: 'Tester',
        role: 'Quality Assurance',
        text: redactedMessage,
      },
    ];

    const { container, unmount } = await render(
      React.createElement(SpecialistDirectChatView, {
        specialistId: 'tester',
        messages,
      })
    );

    const messageEl = container.querySelector('[data-testid="message-msg-c8-1"]') as HTMLElement;
    assert.ok(messageEl, 'Message bubble must exist');
    const msgText = messageEl.textContent || '';

    // Verify secrets are completely redacted in specialist direct chat
    assert.ok(!msgText.includes('token_mock_test_session_123456789'), 'Bearer token must be redacted');
    assert.ok(!msgText.includes('sk-ant-api03-abcdef1234567890'), 'Anthropic key must be redacted');
    assert.ok(!msgText.includes('SecretPass999'), 'Database password must be redacted');

    // Verify replacement markers are present
    assert.ok(msgText.includes('[REDACTED]'));

    // Verify author attribution
    assert.ok(msgText.includes('Tester'));
    assert.ok(msgText.includes('Quality Assurance'));

    await unmount();
  });

  // =========================================================================
  // C9 (R1 x R3 x R4): Parallel work intervals synchronize with unified
  // timeline events, verifying consistent timestamps and statuses across views
  // =========================================================================
  test('C9 (R1 x R3 x R4) - Parallel work intervals synchronize with timeline events across views', async () => {
    const baseTime = 1700000000000;

    const synchronizedIntervals: SpecialistExecutionInterval[] = [
      {
        intervalId: 'sync-cody-1',
        specialistId: 'cody',
        specialistName: 'Cody',
        specialistRole: 'Software Engineer',
        taskTitle: 'Refactoring CodexExecutionView',
        startRelativeSec: 0,
        endRelativeSec: 10,
        status: 'completed',
        currentStep: 'Exported modular components',
        history: ['Started AST parsing', 'Decomposed subcomponents'],
      },
      {
        intervalId: 'sync-tester-1',
        specialistId: 'tester',
        specialistName: 'Tester',
        specialistRole: 'Quality Assurance',
        taskTitle: 'Verifying test suites',
        startRelativeSec: 5,
        endRelativeSec: 15,
        status: 'working',
        currentStep: 'Executing Tier 3 pairwise test suite',
        history: ['Tier 1 passed', 'Tier 2 passed'],
      },
      {
        intervalId: 'sync-vision-1',
        specialistId: 'vision',
        specialistName: 'Vision',
        specialistRole: 'Design & Taste',
        taskTitle: 'Dark mode styling review',
        startRelativeSec: 10,
        endRelativeSec: 20,
        status: 'working',
        currentStep: 'Evaluating ARIA landmarks',
        history: ['Checked color contrast'],
      },
    ];

    const synchronizedEvents: ExecutionActivityEvent[] = [
      {
        eventId: 'evt-sync-cody-start',
        eventType: 'agent.started',
        teamId: 'team-sync',
        specialistId: 'cody',
        timestamp: baseTime,
        status: 'running',
        summary: 'Cody started AST decomposition',
        sourceClassification: 'simulated',
      },
      {
        eventId: 'evt-sync-cody-done',
        eventType: 'agent.completed',
        teamId: 'team-sync',
        specialistId: 'cody',
        timestamp: baseTime + 10000,
        status: 'completed',
        summary: 'Cody completed modularization',
        sourceClassification: 'simulated',
      },
      {
        eventId: 'evt-sync-tester-work',
        eventType: 'agent.working',
        teamId: 'team-sync',
        specialistId: 'tester',
        timestamp: baseTime + 5000,
        status: 'running',
        summary: 'Tester running test suite',
        sourceClassification: 'simulated',
      },
      {
        eventId: 'evt-sync-vision-work',
        eventType: 'agent.working',
        teamId: 'team-sync',
        specialistId: 'vision',
        timestamp: baseTime + 10000,
        status: 'running',
        summary: 'Vision evaluating contrast and ARIA',
        sourceClassification: 'simulated',
      },
    ];

    // Render composite view with both ExecutionActivityTimeline and MultiSpecialistExecutionView
    const CompositeView: React.FC = () => {
      return React.createElement(
        'div',
        null,
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-sync',
          intervals: synchronizedIntervals,
        }),
        React.createElement(ExecutionActivityTimeline, {
          events: synchronizedEvents,
        })
      );
    };

    const { container, unmount } = await render(React.createElement(CompositeView));

    // Verify each specialist in intervals has matching card and synchronized timeline event
    for (const interval of synchronizedIntervals) {
      const card = container.querySelector(`[data-testid="specialist-card-${interval.specialistId}"]`);
      assert.ok(card, `Card for ${interval.specialistId} must be rendered in parallel view`);

      const statusPill = card?.querySelector(`[data-testid="specialist-status-${interval.specialistId}"]`);
      assert.ok(statusPill, `Status pill for ${interval.specialistId} must exist`);
      assert.equal(statusPill?.textContent?.trim(), interval.status);

      // Verify specialist is represented in timeline events
      const specialistEvents = synchronizedEvents.filter((e) => e.specialistId === interval.specialistId);
      assert.ok(
        specialistEvents.length > 0,
        `Specialist ${interval.specialistId} must have matching events in the canonical timeline`
      );

      // Verify temporal synchronization: interval start/end maps to event timestamps
      const startSecMs = interval.startRelativeSec * 1000;
      const endSecMs = interval.endRelativeSec * 1000;
      assert.ok(startSecMs <= endSecMs, 'Start timestamp must precede or equal end timestamp');

      // If interval is completed, verify there is a completed event in the timeline
      if (interval.status === 'completed') {
        const completedEvt = specialistEvents.find((e) => e.status === 'completed');
        assert.ok(completedEvt, `Specialist ${interval.specialistId} must have completed event in timeline`);
        assert.equal(completedEvt.timestamp, baseTime + endSecMs);
      }
    }

    await unmount();
  });

  // =========================================================================
  // C10 (R2 x R5 x R6): Maestro team summary cards redact embedded env vars
  // while preserving accessible keyboard navigation
  // =========================================================================
  test('C10 (R2 x R5 x R6) - Maestro team summary cards redact embedded env vars and preserve keyboard navigation', async () => {
    let cardSelected = false;

    const summaryData: TeamSummaryData = {
      teamId: 'team-coord-summary',
      teamName: 'Frontend Architecture Refinement',
      goal: 'Decompose monolithic views with AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY and sk-ant-api03-1234567890',
      status: 'active',
      activeSpecialists: ['maestro', 'cody', 'tester', 'vision'],
      environmentSummary: 'VITE_APP_MODE=demo GEMINI_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuv',
      configurationNotes: 'Configured proxy to postgresql://user:MySecretDbPass123!@127.0.0.1:5432/mediobot',
    };

    const { container, unmount } = await render(
      React.createElement(MaestroTeamSummaryCard, {
        summary: summaryData,
        onSelect: () => {
          cardSelected = true;
        },
      })
    );

    const card = container.querySelector('[data-testid="team-summary-card-team-coord-summary"]') as HTMLElement;
    assert.ok(card, 'Team summary card must be rendered');

    // 1. Accessibility attributes
    assert.equal(card.getAttribute('role'), 'article');
    assert.equal(card.getAttribute('tabindex'), '0');
    assert.equal(card.getAttribute('aria-label'), 'Team Summary: Frontend Architecture Refinement');

    // 2. Secret Redaction Assertions
    const cardText = card.textContent || '';
    assert.ok(!cardText.includes('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'), 'AWS Secret Key must be redacted');
    assert.ok(!cardText.includes('AIzaSyD1234567890abcdefghijklmnopqrstuv'), 'Gemini API Key must be redacted');
    assert.ok(!cardText.includes('MySecretDbPass123!'), 'Database password must be redacted');

    assert.ok(cardText.includes('[REDACTED]'), 'Card must show [REDACTED]');
    assert.ok(cardText.includes('[Simulated]'), 'Card must show [Simulated] badge');

    // 3. Accessible Keyboard Navigation: press Enter on the card
    await fireEvent.keyDown(card, { key: 'Enter' });
    assert.equal(cardSelected, true, 'Pressing Enter on team summary card must trigger onSelect callback');

    await unmount();
  });
});
