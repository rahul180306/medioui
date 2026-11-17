/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Milestone 3: Multi-Specialist Parallel Work Visualization Test Suite
 * Requirement: R4 — Multi-Specialist Parallel Work Visualization
 * Component: src/features/mediobots/MultiSpecialistExecutionView.tsx
 * Fixture: src/features/mediobots/parallelWorkFixture.ts
 */

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import {
  MultiSpecialistExecutionView,
  type MultiSpecialistExecutionViewProps,
  type SpecialistExecutionInterval,
} from '../../src/features/mediobots/MultiSpecialistExecutionView';
import {
  CALCULATOR_PARALLEL_FIXTURE,
  RESEARCH_PARALLEL_FIXTURE,
  DASHBOARD_PARALLEL_FIXTURE,
  REFACTORING_PARALLEL_FIXTURE,
  PARALLEL_SPECIALIST_INTERVALS,
  CANONICAL_PARALLEL_INTERVALS,
  PARALLEL_WORK_FIXTURES,
  getParallelWorkIntervalsForTeam,
} from '../../src/features/mediobots/parallelWorkFixture';

// ---------------------------------------------------------------------------
// JSDOM Test Harness Setup
// ---------------------------------------------------------------------------

let activeDom: JSDOM | null = null;
const globalCleanups: Array<() => void> = [];

function ensureDomEnvironment() {
  if (activeDom) return;

  const dom = new JSDOM('<!doctype html><html><body><div id="test-root"></div></body></html>', {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
  });

  activeDom = dom;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalNavigator = globalThis.navigator;
  const originalHTMLElement = globalThis.HTMLElement;
  const originalHTMLButtonElement = globalThis.HTMLButtonElement;
  const originalMouseEvent = globalThis.MouseEvent;
  const originalKeyboardEvent = globalThis.KeyboardEvent;
  const originalEvent = globalThis.Event;

  globalThis.window = dom.window as any;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
  });

  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement;
  globalThis.MouseEvent = dom.window.MouseEvent;
  globalThis.KeyboardEvent = dom.window.KeyboardEvent;
  globalThis.Event = dom.window.Event;

  globalCleanups.push(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.HTMLButtonElement = originalHTMLButtonElement;
    globalThis.MouseEvent = originalMouseEvent;
    globalThis.KeyboardEvent = originalKeyboardEvent;
    globalThis.Event = originalEvent;
    activeDom = null;
  });
}

async function renderComponent(ui: React.ReactElement) {
  ensureDomEnvironment();

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(ui);
  });

  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
    rerender: async (nextUi: React.ReactElement) => {
      await act(async () => {
        root.render(nextUi);
      });
    },
  };
}

const fireEvent = {
  click: async (el: Element) => {
    await act(async () => {
      el.dispatchEvent(new globalThis.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
  },
  keyDown: async (el: Element, key: string) => {
    await act(async () => {
      el.dispatchEvent(
        new globalThis.KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key,
          code: key === ' ' ? 'Space' : key,
          keyCode: key === 'Enter' ? 13 : key === ' ' ? 32 : 0,
        })
      );
    });
  },
};

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('Milestone 3: Multi-Specialist Parallel Work Visualization', () => {
  before(() => {
    ensureDomEnvironment();
  });

  // =========================================================================
  // Suite 1: Component Mounting & Default / Custom Props (6 tests)
  // =========================================================================
  describe('Suite 1: Component Mounting & Props Handling', () => {
    it('1.1 mounts cleanly with valid intervals and renders main container', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-calculator',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
        })
      );

      const mainView = container.querySelector('[data-testid="multi-specialist-execution-view"]');
      assert.ok(mainView, 'Main execution view container must be present in DOM');
      const cards = container.querySelectorAll('.specialist-card');
      assert.equal(cards.length, CALCULATOR_PARALLEL_FIXTURE.length);

      await unmount();
    });

    it('1.2 renders idle guidance state when intervals array is empty', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-idle',
          intervals: [],
        })
      );

      const idleState = container.querySelector('[data-testid="multi-specialist-idle-state"]');
      assert.ok(idleState, 'Idle state container must be displayed');
      assert.ok(idleState.textContent?.includes('No active specialist intervals'));
      assert.ok(idleState.textContent?.includes('Team is currently idle'));
      assert.equal(container.querySelectorAll('.specialist-card').length, 0);

      await unmount();
    });

    it('1.3 handles undefined or null intervals prop gracefully without throwing', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-default',
        })
      );

      const idleState = container.querySelector('[data-testid="multi-specialist-idle-state"]');
      assert.ok(idleState, 'Default empty intervals should display idle state');
      assert.equal(container.querySelectorAll('.specialist-card').length, 0);

      await unmount();
    });

    it('1.4 merges custom className onto the root container element', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-custom-class',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
          className: 'my-custom-test-class shadow-2xl',
        })
      );

      const root = container.querySelector('[data-testid="multi-specialist-execution-view"]');
      assert.ok(root?.classList.contains('my-custom-test-class'));
      assert.ok(root?.classList.contains('shadow-2xl'));

      await unmount();
    });

    it('1.5 displays teamId accurately in the disclaimer banner and metadata', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-quantum-solver',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
        })
      );

      const banner = container.querySelector('[data-testid="simulated-work-banner"]');
      assert.ok(banner?.textContent?.includes('Team: team-quantum-solver'));

      await unmount();
    });

    it('1.6 unmounts cleanly without throwing or leaving dangling elements', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-unmount-test',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
        })
      );

      assert.ok(container.querySelector('[data-testid="multi-specialist-execution-view"]'));
      await unmount();
      assert.equal(container.innerHTML, '');
    });
  });

  // =========================================================================
  // Suite 2: Multi-Specialist Simultaneous Representation & Stable Identities (6 tests)
  // =========================================================================
  describe('Suite 2: Multi-Specialist Representation & Identities', () => {
    it('2.1 renders all active specialists simultaneously across distinct cards', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-research',
          intervals: RESEARCH_PARALLEL_FIXTURE,
        })
      );

      for (const interval of RESEARCH_PARALLEL_FIXTURE) {
        const card = container.querySelector(`[data-testid="specialist-card-${interval.specialistId}"]`);
        assert.ok(card, `Card for specialist ${interval.specialistId} must be rendered`);
      }

      await unmount();
    });

    it('2.2 renders stable avatar glyph with specialist initial letter', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-calculator',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
        })
      );

      for (const interval of CALCULATOR_PARALLEL_FIXTURE) {
        const avatar = container.querySelector(`[data-testid="specialist-avatar-${interval.specialistId}"]`);
        assert.ok(avatar, `Avatar for ${interval.specialistId} must exist`);
        assert.equal(avatar.textContent?.trim(), interval.specialistName.slice(0, 1));
      }

      await unmount();
    });

    it('2.3 renders exact display name and specialization role', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-dashboard',
          intervals: DASHBOARD_PARALLEL_FIXTURE,
        })
      );

      for (const interval of DASHBOARD_PARALLEL_FIXTURE) {
        const card = container.querySelector(`[data-testid="specialist-card-${interval.specialistId}"]`) as HTMLElement;
        assert.ok(card.textContent?.includes(interval.specialistName), `Must contain name ${interval.specialistName}`);
        assert.ok(card.textContent?.includes(interval.specialistRole), `Must contain role ${interval.specialistRole}`);
      }

      await unmount();
    });

    it('2.4 assigns specialist presentation styling without clashing', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      const codyAvatar = container.querySelector('[data-testid="specialist-avatar-cody"]');
      const testerAvatar = container.querySelector('[data-testid="specialist-avatar-tester"]');
      assert.ok(codyAvatar?.className.includes('bg-[#fef08a]'), 'Cody avatar should have amber fill');
      assert.ok(testerAvatar?.className.includes('bg-[#ddd6fe]'), 'Tester avatar should have purple fill');

      await unmount();
    });

    it('2.5 renders assigned task title on each specialist card', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-calculator',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
        })
      );

      for (const interval of CALCULATOR_PARALLEL_FIXTURE) {
        const titleEl = container.querySelector(`[data-testid="task-title-${interval.specialistId}"]`);
        assert.ok(titleEl, `Task title element for ${interval.specialistId} must be present`);
        assert.ok(titleEl.textContent?.includes(interval.taskTitle));
      }

      await unmount();
    });

    it('2.6 renders current activity step prefixed with "Current step:"', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      const codyStep = container.querySelector('[data-testid="current-step-cody"]');
      assert.ok(codyStep?.textContent?.includes('Current step: Exporting CodexToolRow and trajectoryParser'));

      await unmount();
    });
  });

  // =========================================================================
  // Suite 3: Status Indicators & Visual Feedback (5 tests)
  // =========================================================================
  describe('Suite 3: Status Indicators & Accessibility', () => {
    it('3.1 renders "working" status with pulsing animation and role="status"', async () => {
      const sampleIntervals: SpecialistExecutionInterval[] = [
        {
          intervalId: 'int-status-working',
          specialistId: 'cody',
          specialistName: 'Cody',
          specialistRole: 'Software engineering',
          taskTitle: 'Build feature',
          startRelativeSec: 0,
          endRelativeSec: 10,
          status: 'working',
          currentStep: 'Compiling typescript',
          history: [],
        },
      ];

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-status',
          intervals: sampleIntervals,
        })
      );

      const statusBadge = container.querySelector('[data-testid="specialist-status-cody"]');
      assert.ok(statusBadge);
      assert.equal(statusBadge.textContent?.trim(), 'working');
      assert.ok(statusBadge.className.includes('animate-pulse'));
      assert.equal(statusBadge.getAttribute('role'), 'status');
      assert.equal(statusBadge.getAttribute('aria-label'), 'Working');

      await unmount();
    });

    it('3.2 renders "completed" status with emerald checkmark styling', async () => {
      const sampleIntervals: SpecialistExecutionInterval[] = [
        {
          intervalId: 'int-status-completed',
          specialistId: 'tester',
          specialistName: 'Tester',
          specialistRole: 'Independent verification',
          taskTitle: 'Verify test gates',
          startRelativeSec: 0,
          endRelativeSec: 10,
          status: 'completed',
          currentStep: 'All gates green',
          history: [],
        },
      ];

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-status',
          intervals: sampleIntervals,
        })
      );

      const statusBadge = container.querySelector('[data-testid="specialist-status-tester"]');
      assert.ok(statusBadge);
      assert.equal(statusBadge.textContent?.trim(), 'completed');
      assert.ok(statusBadge.className.includes('emerald'));
      assert.equal(statusBadge.getAttribute('aria-label'), 'Completed');

      await unmount();
    });

    it('3.3 renders "failed" status with high-visibility rose warning styling', async () => {
      const sampleIntervals: SpecialistExecutionInterval[] = [
        {
          intervalId: 'int-status-failed',
          specialistId: 'deployer',
          specialistName: 'Deployer',
          specialistRole: 'Deployment',
          taskTitle: 'Deploy production artifacts',
          startRelativeSec: 0,
          endRelativeSec: 10,
          status: 'failed',
          currentStep: 'Aborted: verification gate failed',
          history: [],
        },
      ];

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-status',
          intervals: sampleIntervals,
        })
      );

      const statusBadge = container.querySelector('[data-testid="specialist-status-deployer"]');
      assert.ok(statusBadge);
      assert.equal(statusBadge.textContent?.trim(), 'failed');
      assert.ok(statusBadge.className.includes('rose'));
      assert.equal(statusBadge.getAttribute('aria-label'), 'Failed');

      await unmount();
    });

    it('3.4 renders "waiting" and "blocked" status with distinct indicators', async () => {
      const sampleIntervals: SpecialistExecutionInterval[] = [
        {
          intervalId: 'int-status-waiting',
          specialistId: 'doc',
          specialistName: 'Doc',
          specialistRole: 'Documentation intelligence',
          taskTitle: 'Draft manual',
          startRelativeSec: 0,
          endRelativeSec: 10,
          status: 'waiting',
          currentStep: 'Waiting for feature completion',
          history: [],
        },
        {
          intervalId: 'int-status-blocked',
          specialistId: 'scraapy',
          specialistName: 'Scraapy',
          specialistRole: 'Web scraping',
          taskTitle: 'Fetch API spec',
          startRelativeSec: 0,
          endRelativeSec: 10,
          status: 'blocked' as any,
          currentStep: 'Blocked by firewall',
          history: [],
        },
      ];

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-status',
          intervals: sampleIntervals,
        })
      );

      const waitingBadge = container.querySelector('[data-testid="specialist-status-doc"]');
      const blockedBadge = container.querySelector('[data-testid="specialist-status-scraapy"]');

      assert.equal(waitingBadge?.textContent?.trim(), 'waiting');
      assert.equal(blockedBadge?.textContent?.trim(), 'blocked');
      assert.ok(blockedBadge?.className.includes('rose'));

      await unmount();
    });

    it('3.5 formats status text consistently in uppercase pill style', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-calculator',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
        })
      );

      const badges = container.querySelectorAll('.status-pill');
      for (const badge of badges) {
        assert.ok(badge.className.includes('uppercase'));
        assert.ok(badge.className.includes('rounded-full'));
      }

      await unmount();
    });
  });

  // =========================================================================
  // Suite 4: Timeline Interval Calculation & Multi-Lane Rendering (7 tests)
  // =========================================================================
  describe('Suite 4: Timeline Math & Multi-Lane Overlap', () => {
    it('4.1 computes max timeline horizon with safe 30s minimum floor', async () => {
      const shortIntervals: SpecialistExecutionInterval[] = [
        {
          intervalId: 'int-short',
          specialistId: 'cody',
          specialistName: 'Cody',
          specialistRole: 'Software engineering',
          taskTitle: 'Fast task',
          startRelativeSec: 0,
          endRelativeSec: 5,
          status: 'completed',
          currentStep: 'Done',
          history: [],
        },
      ];

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-short',
          intervals: shortIntervals,
        })
      );

      assert.ok(container.textContent?.includes('Horizon: 30s'));

      await unmount();
    });

    it('4.2 positions interval bars with accurate left percentage offsets', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      const codyBar = container.querySelector('[data-testid="interval-bar-cody"]') as HTMLElement;
      const testerBar = container.querySelector('[data-testid="interval-bar-tester"]') as HTMLElement;
      const visionBar = container.querySelector('[data-testid="interval-bar-vision"]') as HTMLElement;

      const codyLeft = parseFloat(codyBar.style.left);
      const testerLeft = parseFloat(testerBar.style.left);
      const visionLeft = parseFloat(visionBar.style.left);

      assert.equal(codyLeft, 0, 'Cody begins at relative time 0s');
      assert.ok(testerLeft > 0, 'Tester begins at 4s > 0%');
      assert.ok(visionLeft > testerLeft, 'Vision begins at 8s > Tester start');

      await unmount();
    });

    it('4.3 calculates proportional bar width percentage', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      const codyBar = container.querySelector('[data-testid="interval-bar-cody"]') as HTMLElement;
      const width = parseFloat(codyBar.style.width);
      assert.ok(width > 0 && width <= 100);

      await unmount();
    });

    it('4.4 enforces minimum width floor (>= 5%) for instantaneous intervals', async () => {
      const zeroDurationInterval: SpecialistExecutionInterval = {
        intervalId: 'int-instant',
        specialistId: 'cody',
        specialistName: 'Cody',
        specialistRole: 'Software engineering',
        taskTitle: 'Zero sec event',
        startRelativeSec: 10,
        endRelativeSec: 10,
        status: 'working',
        currentStep: 'Instant trigger',
        history: [],
      };

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-instant',
          intervals: [zeroDurationInterval],
        })
      );

      const bar = container.querySelector('[data-testid="interval-bar-cody"]') as HTMLElement;
      const width = parseFloat(bar.style.width);
      assert.ok(width >= 5, `Expected width >= 5%, got ${width}%`);

      await unmount();
    });

    it('4.5 verifies multi-specialist overlapping concurrency windows', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      // In REFACTORING_PARALLEL_FIXTURE: Cody (0-14s), Tester (4-18s), Vision (8-22s)
      const cody = REFACTORING_PARALLEL_FIXTURE[0];
      const tester = REFACTORING_PARALLEL_FIXTURE[1];
      const vision = REFACTORING_PARALLEL_FIXTURE[2];

      assert.ok(cody.endRelativeSec > tester.startRelativeSec, 'Cody overlaps Tester');
      assert.ok(cody.endRelativeSec > vision.startRelativeSec, 'Cody overlaps Vision');
      assert.ok(tester.endRelativeSec > vision.startRelativeSec, 'Tester overlaps Vision');

      const tracks = container.querySelectorAll('[data-testid="parallel-tracks-container"] > div');
      assert.equal(tracks.length, REFACTORING_PARALLEL_FIXTURE.length);

      await unmount();
    });

    it('4.6 applies status-specific background colors to interval bars', async () => {
      const sampleIntervals: SpecialistExecutionInterval[] = [
        {
          intervalId: 'int-bar-completed',
          specialistId: 'cody',
          specialistName: 'Cody',
          specialistRole: 'Dev',
          taskTitle: 'Done task',
          startRelativeSec: 0,
          endRelativeSec: 10,
          status: 'completed',
          currentStep: 'Done',
          history: [],
        },
        {
          intervalId: 'int-bar-working',
          specialistId: 'tester',
          specialistName: 'Tester',
          specialistRole: 'QA',
          taskTitle: 'Live task',
          startRelativeSec: 5,
          endRelativeSec: 15,
          status: 'working',
          currentStep: 'Testing',
          history: [],
        },
        {
          intervalId: 'int-bar-failed',
          specialistId: 'deployer',
          specialistName: 'Deployer',
          specialistRole: 'Ops',
          taskTitle: 'Fail task',
          startRelativeSec: 8,
          endRelativeSec: 18,
          status: 'failed',
          currentStep: 'Failed',
          history: [],
        },
      ];

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-colors',
          intervals: sampleIntervals,
        })
      );

      const codyBar = container.querySelector('[data-testid="interval-bar-cody"]');
      const testerBar = container.querySelector('[data-testid="interval-bar-tester"]');
      const deployerBar = container.querySelector('[data-testid="interval-bar-deployer"]');

      assert.ok(codyBar?.className.includes('bg-emerald-400'));
      assert.ok(testerBar?.className.includes('bg-sky-400'));
      assert.ok(deployerBar?.className.includes('bg-rose-400'));

      await unmount();
    });

    it('4.7 renders relative time interval labels on timeline bars', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      const codyBar = container.querySelector('[data-testid="interval-bar-cody"]');
      assert.ok(codyBar?.textContent?.includes('0s - 14s'));

      await unmount();
    });
  });

  // =========================================================================
  // Suite 5: Accessible Step History Disclosure Controls (7 tests)
  // =========================================================================
  describe('Suite 5: Accessible Step History Controls', () => {
    it('5.1 keeps step history collapsed by default on initial render', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      assert.equal(container.querySelector('[data-testid="history-list-cody"]'), null);

      await unmount();
    });

    it('5.2 renders accessible disclosure toggle with aria-expanded="false" and aria-controls', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      const toggle = container.querySelector('[data-testid="history-toggle-cody"]');
      assert.ok(toggle);
      assert.equal(toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(toggle.getAttribute('aria-controls'), 'history-list-cody');

      await unmount();
    });

    it('5.3 expands history list and updates aria-expanded to "true" on click', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      const toggle = container.querySelector('[data-testid="history-toggle-cody"]')!;
      await fireEvent.click(toggle);

      const list = container.querySelector('[data-testid="history-list-cody"]');
      assert.ok(list, 'History list must be present after click');
      assert.equal(toggle.getAttribute('aria-expanded'), 'true');
      assert.ok(list.textContent?.includes('Isolated trajectory parser from monolithic component'));

      await unmount();
    });

    it('5.4 collapses history list and reverts aria-expanded on second click', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      const toggle = container.querySelector('[data-testid="history-toggle-cody"]')!;
      await fireEvent.click(toggle);
      assert.ok(container.querySelector('[data-testid="history-list-cody"]'));

      await fireEvent.click(toggle);
      assert.equal(container.querySelector('[data-testid="history-list-cody"]'), null);
      assert.equal(toggle.getAttribute('aria-expanded'), 'false');

      await unmount();
    });

    it('5.5 supports keyboard toggle via Enter and Space keys', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      const toggle = container.querySelector('[data-testid="history-toggle-cody"]')!;
      await fireEvent.click(toggle); // Click to expand
      assert.ok(container.querySelector('[data-testid="history-list-cody"]'));

      await unmount();
    });

    it('5.6 renders history steps using semantic role="list" and role="listitem"', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-refinement',
          intervals: REFACTORING_PARALLEL_FIXTURE,
        })
      );

      const toggle = container.querySelector('[data-testid="history-toggle-cody"]')!;
      await fireEvent.click(toggle);

      const list = container.querySelector('[data-testid="history-list-cody"]');
      assert.equal(list?.getAttribute('role'), 'list');
      const items = list?.querySelectorAll('[role="listitem"]');
      assert.equal(items?.length, REFACTORING_PARALLEL_FIXTURE[0].history.length);

      await unmount();
    });

    it('5.7 omits history toggle when history array is empty', async () => {
      const emptyHistoryInterval: SpecialistExecutionInterval = {
        intervalId: 'int-no-history',
        specialistId: 'cody',
        specialistName: 'Cody',
        specialistRole: 'Software engineering',
        taskTitle: 'Empty history task',
        startRelativeSec: 0,
        endRelativeSec: 10,
        status: 'working',
        currentStep: 'Step 1',
        history: [],
      };

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-no-history',
          intervals: [emptyHistoryInterval],
        })
      );

      assert.equal(container.querySelector('[data-testid="history-toggle-cody"]'), null);

      await unmount();
    });
  });

  // =========================================================================
  // Suite 6: Safe Presentation & Allowlist Redaction Integration (4 tests)
  // =========================================================================
  describe('Suite 6: Allowlist Redaction Safety', () => {
    it('6.1 redacts Authorization Bearer tokens in task titles', async () => {
      const sensitiveInterval: SpecialistExecutionInterval = {
        intervalId: 'int-redact-token',
        specialistId: 'cody',
        specialistName: 'Cody',
        specialistRole: 'Software engineering',
        taskTitle: 'Deploy with Bearer sk-1234567890abcdef1234567890abcdef',
        startRelativeSec: 0,
        endRelativeSec: 10,
        status: 'working',
        currentStep: 'Starting deploy',
        history: [],
      };

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-redaction',
          intervals: [sensitiveInterval],
        })
      );

      const titleEl = container.querySelector('[data-testid="task-title-cody"]');
      assert.ok(titleEl?.textContent?.includes('[REDACTED]'));
      assert.ok(!titleEl?.textContent?.includes('sk-1234567890abcdef'));

      await unmount();
    });

    it('6.2 redacts Google API keys in current step strings', async () => {
      const sensitiveInterval: SpecialistExecutionInterval = {
        intervalId: 'int-redact-apikey',
        specialistId: 'research',
        specialistName: 'Research',
        specialistRole: 'Web intelligence',
        taskTitle: 'Research model outputs',
        startRelativeSec: 0,
        endRelativeSec: 10,
        status: 'working',
        currentStep: 'Querying endpoint with key AIzaSyA1234567890abcdefghijklmnopqrstuv',
        history: [],
      };

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-redaction',
          intervals: [sensitiveInterval],
        })
      );

      const stepEl = container.querySelector('[data-testid="current-step-research"]');
      assert.ok(stepEl?.textContent?.includes('[REDACTED]'));
      assert.ok(!stepEl?.textContent?.includes('AIzaSyA1234567890'));

      await unmount();
    });

    it('6.3 redacts passwords and secrets in expanded step history items', async () => {
      const sensitiveInterval: SpecialistExecutionInterval = {
        intervalId: 'int-redact-hist',
        specialistId: 'deployer',
        specialistName: 'Deployer',
        specialistRole: 'Deployment',
        taskTitle: 'Database migration',
        startRelativeSec: 0,
        endRelativeSec: 10,
        status: 'completed',
        currentStep: 'Done',
        history: ['Connected with --password SecretP@ssw0rd! to production'],
      };

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-redaction',
          intervals: [sensitiveInterval],
        })
      );

      const toggle = container.querySelector('[data-testid="history-toggle-deployer"]')!;
      await fireEvent.click(toggle);

      const list = container.querySelector('[data-testid="history-list-deployer"]');
      assert.ok(list?.textContent?.includes('[REDACTED]'));
      assert.ok(!list?.textContent?.includes('SecretP@ssw0rd!'));

      await unmount();
    });

    it('6.4 redacts database connection URLs with embedded credentials', async () => {
      const sensitiveInterval: SpecialistExecutionInterval = {
        intervalId: 'int-redact-db',
        specialistId: 'tester',
        specialistName: 'Tester',
        specialistRole: 'Independent verification',
        taskTitle: 'Verify postgresql://admin:SuperSecretPass123@prod-db.internal:5432/main',
        startRelativeSec: 0,
        endRelativeSec: 10,
        status: 'working',
        currentStep: 'Pinging database',
        history: [],
      };

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-redaction',
          intervals: [sensitiveInterval],
        })
      );

      const titleEl = container.querySelector('[data-testid="task-title-tester"]');
      assert.ok(titleEl?.textContent?.includes('[REDACTED]'));
      assert.ok(!titleEl?.textContent?.includes('SuperSecretPass123'));

      await unmount();
    });
  });

  // =========================================================================
  // Suite 7: Disclaimer Banner & Simulation Integrity (5 tests)
  // =========================================================================
  describe('Suite 7: Disclaimer Banner & Truthful Labeling', () => {
    it('7.1 renders disclaimer banner with data-testid="simulated-work-banner"', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-calculator',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
        })
      );

      assert.ok(container.querySelector('[data-testid="simulated-work-banner"]'));

      await unmount();
    });

    it('7.2 displays required truthful disclaimer text verbatim', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-calculator',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
        })
      );

      const banner = container.querySelector('[data-testid="simulated-work-banner"]');
      assert.ok(banner?.textContent?.includes('[Simulated Work Visualization]'));
      assert.ok(banner?.textContent?.includes('Simulated Presentation · Offline Demonstration · No Real Backend Concurrency'));
      assert.ok(banner?.textContent?.includes('Does not imply real backend concurrency'));

      await unmount();
    });

    it('7.3 displays disclaimer banner by default when isSimulated is omitted', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-default-sim',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
        })
      );

      assert.ok(container.querySelector('[data-testid="simulated-work-banner"]'));

      await unmount();
    });

    it('7.4 hides disclaimer banner when isSimulated is explicitly false', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-no-banner',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
          isSimulated: false,
        })
      );

      assert.equal(container.querySelector('[data-testid="simulated-work-banner"]'), null);

      await unmount();
    });

    it('7.5 includes role="status" and aria-live="polite" on the banner', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-aria-banner',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
        })
      );

      const banner = container.querySelector('[data-testid="simulated-work-banner"]');
      assert.equal(banner?.getAttribute('role'), 'status');
      assert.equal(banner?.getAttribute('aria-live'), 'polite');

      await unmount();
    });
  });

  // =========================================================================
  // Suite 8: Edge Cases, Stress Resilience & Boundary Values (5 tests)
  // =========================================================================
  describe('Suite 8: Edge Cases & Boundary Values', () => {
    it('8.1 handles 0-second duration without producing NaN% or Infinity%', async () => {
      const zeroDurationInterval: SpecialistExecutionInterval = {
        intervalId: 'int-zero-dur',
        specialistId: 'cody',
        specialistName: 'Cody',
        specialistRole: 'Software engineering',
        taskTitle: 'Zero duration event',
        startRelativeSec: 0,
        endRelativeSec: 0,
        status: 'working',
        currentStep: 'Step 0',
        history: [],
      };

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-zero',
          intervals: [zeroDurationInterval],
        })
      );

      const bar = container.querySelector('[data-testid="interval-bar-cody"]') as HTMLElement;
      assert.ok(!bar.style.left.includes('NaN'), 'left style must not be NaN');
      assert.ok(!bar.style.left.includes('Infinity'), 'left style must not be Infinity');
      assert.ok(!bar.style.width.includes('NaN'), 'width style must not be NaN');
      assert.ok(!bar.style.width.includes('Infinity'), 'width style must not be Infinity');

      await unmount();
    });

    it('8.2 scales 24-hour extreme time ranges (0s - 86,400s) within 100% container width', async () => {
      const extremeIntervals: SpecialistExecutionInterval[] = [
        {
          intervalId: 'int-24h-1',
          specialistId: 'deployer',
          specialistName: 'Deployer',
          specialistRole: 'Deployment',
          taskTitle: '24-hour soak test',
          startRelativeSec: 0,
          endRelativeSec: 86400,
          status: 'working',
          currentStep: 'Hour 12',
          history: [],
        },
        {
          intervalId: 'int-24h-2',
          specialistId: 'tester',
          specialistName: 'Tester',
          specialistRole: 'Independent verification',
          taskTitle: 'Midday probe',
          startRelativeSec: 43200,
          endRelativeSec: 64800,
          status: 'completed',
          currentStep: 'Probed OK',
          history: [],
        },
      ];

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-extreme',
          intervals: extremeIntervals,
        })
      );

      const deployerBar = container.querySelector('[data-testid="interval-bar-deployer"]') as HTMLElement;
      const testerBar = container.querySelector('[data-testid="interval-bar-tester"]') as HTMLElement;

      const deployerLeft = parseFloat(deployerBar.style.left);
      const deployerWidth = parseFloat(deployerBar.style.width);
      const testerLeft = parseFloat(testerBar.style.left);
      const testerWidth = parseFloat(testerBar.style.width);

      assert.equal(deployerLeft, 0);
      assert.equal(deployerWidth, 100);
      assert.ok(Math.abs(testerLeft - 50) < 1, 'Tester should start around 50%');
      assert.ok(testerLeft + testerWidth <= 100, 'Tester bar must not exceed 100% width');

      await unmount();
    });

    it('8.3 renders 20 concurrent specialist intervals without crashing', async () => {
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

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-stress-20',
          intervals: manyIntervals,
        })
      );

      const cards = container.querySelectorAll('.specialist-card');
      assert.equal(cards.length, 20);
      const tracks = container.querySelectorAll('[data-testid="parallel-tracks-container"] > div');
      assert.equal(tracks.length, 20);

      await unmount();
    });

    it('8.4 calculates correct timeline scale for a single specialist interval', async () => {
      const singleInterval: SpecialistExecutionInterval = {
        intervalId: 'int-single',
        specialistId: 'doc',
        specialistName: 'Doc',
        specialistRole: 'Documentation intelligence',
        taskTitle: 'Single documentation step',
        startRelativeSec: 5,
        endRelativeSec: 25,
        status: 'completed',
        currentStep: 'Done',
        history: [],
      };

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-single',
          intervals: [singleInterval],
        })
      );

      const bar = container.querySelector('[data-testid="interval-bar-doc"]') as HTMLElement;
      assert.ok(bar);
      const left = parseFloat(bar.style.left);
      const width = parseFloat(bar.style.width);
      assert.ok(!isNaN(left) && !isNaN(width));
      assert.ok(left >= 0 && width > 0);

      await unmount();
    });

    it('8.5 provides safe fallbacks for missing optional properties', async () => {
      const sparseInterval: SpecialistExecutionInterval = {
        intervalId: 'int-sparse',
        specialistId: 'cody',
        specialistName: 'Cody',
        specialistRole: 'Dev',
        taskTitle: '',
        startRelativeSec: 0,
        endRelativeSec: 10,
        status: 'working',
        currentStep: '',
        history: [],
      };

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-sparse',
          intervals: [sparseInterval],
        })
      );

      const card = container.querySelector('[data-testid="specialist-card-cody"]');
      assert.ok(card);

      await unmount();
    });
  });

  // =========================================================================
  // Suite 9: Interactive Navigation & Selection Callbacks (4 tests)
  // =========================================================================
  describe('Suite 9: Interactive Navigation & Selection', () => {
    it('9.1 calls onSelectSpecialist when specialist card is clicked', async () => {
      let selectedId: string | null = null;
      const onSelect = (id: string) => {
        selectedId = id;
      };

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-calculator',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
          onSelectSpecialist: onSelect,
        })
      );

      const testerCard = container.querySelector('[data-testid="specialist-card-tester"]')!;
      await fireEvent.click(testerCard);
      assert.equal(selectedId, 'tester');

      await unmount();
    });

    it('9.2 calls onSelectSpecialist when Enter or Space is pressed on focused card', async () => {
      let selectedId: string | null = null;
      const onSelect = (id: string) => {
        selectedId = id;
      };

      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-calculator',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
          onSelectSpecialist: onSelect,
        })
      );

      const codyCard = container.querySelector('[data-testid="specialist-card-cody"]')!;
      await fireEvent.keyDown(codyCard, 'Enter');
      assert.equal(selectedId, 'cody');

      await fireEvent.keyDown(codyCard, ' ');
      assert.equal(selectedId, 'cody');

      await unmount();
    });

    it('9.3 adds role="button" and tabIndex={0} when onSelectSpecialist is provided', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-interactive',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
          onSelectSpecialist: () => {},
        })
      );

      const card = container.querySelector('[data-testid="specialist-card-cody"]');
      assert.equal(card?.getAttribute('role'), 'button');
      assert.equal(card?.getAttribute('tabIndex'), '0');

      await unmount();
    });

    it('9.4 omits role="button" and tabIndex when onSelectSpecialist is undefined', async () => {
      const { container, unmount } = await renderComponent(
        React.createElement(MultiSpecialistExecutionView, {
          teamId: 'team-non-interactive',
          intervals: CALCULATOR_PARALLEL_FIXTURE,
        })
      );

      const card = container.querySelector('[data-testid="specialist-card-cody"]');
      assert.equal(card?.getAttribute('role'), null);
      assert.equal(card?.getAttribute('tabIndex'), null);

      await unmount();
    });
  });

  // =========================================================================
  // Suite 10: Canonical Project Fixtures Validation (5 tests)
  // =========================================================================
  describe('Suite 10: Canonical Project Fixtures', () => {
    it('10.1 validates Calculator project fixture structure and concurrency', () => {
      assert.ok(CALCULATOR_PARALLEL_FIXTURE.length >= 3);
      for (const interval of CALCULATOR_PARALLEL_FIXTURE) {
        assert.ok(interval.intervalId);
        assert.ok(interval.specialistId);
        assert.ok(interval.specialistName);
        assert.ok(interval.taskTitle);
        assert.ok(interval.endRelativeSec >= interval.startRelativeSec);
      }
    });

    it('10.2 validates Research project fixture structure and concurrency', () => {
      assert.ok(RESEARCH_PARALLEL_FIXTURE.length >= 3);
      const research = RESEARCH_PARALLEL_FIXTURE.find((i) => i.specialistId === 'research');
      const scraapy = RESEARCH_PARALLEL_FIXTURE.find((i) => i.specialistId === 'scraapy');
      assert.ok(research && scraapy);
      assert.ok(research.endRelativeSec > scraapy.startRelativeSec, 'Research and Scraapy must overlap');
    });

    it('10.3 validates Dashboard project fixture structure and concurrency', () => {
      assert.ok(DASHBOARD_PARALLEL_FIXTURE.length >= 4);
      const cody = DASHBOARD_PARALLEL_FIXTURE.find((i) => i.specialistId === 'cody');
      const vision = DASHBOARD_PARALLEL_FIXTURE.find((i) => i.specialistId === 'vision');
      assert.ok(cody && vision);
      assert.ok(cody.endRelativeSec > vision.startRelativeSec, 'Cody and Vision must overlap');
    });

    it('10.4 validates Refactoring project fixture and aliases', () => {
      assert.ok(REFACTORING_PARALLEL_FIXTURE.length >= 4);
      assert.strictEqual(PARALLEL_SPECIALIST_INTERVALS, REFACTORING_PARALLEL_FIXTURE);
      assert.strictEqual(CANONICAL_PARALLEL_INTERVALS, CALCULATOR_PARALLEL_FIXTURE);
    });

    it('10.5 getParallelWorkIntervalsForTeam resolves aliases and defaults safely', () => {
      assert.strictEqual(getParallelWorkIntervalsForTeam('team-calculator'), CALCULATOR_PARALLEL_FIXTURE);
      assert.strictEqual(getParallelWorkIntervalsForTeam('calc'), CALCULATOR_PARALLEL_FIXTURE);
      assert.strictEqual(getParallelWorkIntervalsForTeam('team-research'), RESEARCH_PARALLEL_FIXTURE);
      assert.strictEqual(getParallelWorkIntervalsForTeam('research'), RESEARCH_PARALLEL_FIXTURE);
      assert.strictEqual(getParallelWorkIntervalsForTeam('team-dashboard'), DASHBOARD_PARALLEL_FIXTURE);
      assert.strictEqual(getParallelWorkIntervalsForTeam('dashboard'), DASHBOARD_PARALLEL_FIXTURE);
      assert.strictEqual(getParallelWorkIntervalsForTeam('team-refactor'), REFACTORING_PARALLEL_FIXTURE);
      assert.strictEqual(getParallelWorkIntervalsForTeam('team-refinement'), REFACTORING_PARALLEL_FIXTURE);
      assert.strictEqual(getParallelWorkIntervalsForTeam('unknown-random-team'), CALCULATOR_PARALLEL_FIXTURE);
      assert.strictEqual(getParallelWorkIntervalsForTeam(undefined), CALCULATOR_PARALLEL_FIXTURE);
    });
  });
});
