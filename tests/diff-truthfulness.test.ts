/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Diff Review Truthfulness Test Suite (Task C)
 * Verifies simulated labeling in fixture mode, lack of fake tester attribution,
 * and strict durable receipt validation in connected mode.
 */

import { register } from 'node:module';
register(new URL('./css-loader.mjs', import.meta.url));

import { test, describe, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import type { FileDiff, DurableDiffReceipt } from '../mediobot-ui-refinement/src/types/index.js';

let DiffViewer: any;
let AppProvider: any;

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
  globalThis.localStorage = dom.window.localStorage;
  globalThis.sessionStorage = dom.window.sessionStorage;
  globalThis.MouseEvent = dom.window.MouseEvent;

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

  return dom;
}

describe('Diff Review Truthfulness & Receipt Validation (Task C)', () => {
  let dom: JSDOM;
  let container: HTMLElement;
  let root: Root;

  before(async () => {
    dom = setupJSDOM();
    container = dom.window.document.getElementById('root')!;

    const diffModule = await import('../mediobot-ui-refinement/src/features/activity/DiffViewer.js');
    DiffViewer = diffModule.DiffViewer;

    const appStateModule = await import('../mediobot-ui-refinement/src/state/AppContext.js');
    AppProvider = appStateModule.AppProvider;
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
  // 1. Fixture Mode: Truthful Simulated Action Buttons, Labels & Badges
  // --------------------------------------------------------------------------
  test('1. Fixture mode: Action buttons explicitly labeled (Simulated) and state transitions stay simulated', async () => {
    const fixtureDiff: FileDiff = {
      filePath: 'src/demo-calculator.ts',
      language: 'typescript',
      additions: 3,
      deletions: 1,
      state: 'proposed',
      isControlledDemonstration: true,
      verificationEvidence: 'Controlled demonstration · Simulated in-memory test suite',
      hunks: [
        {
          header: '@@ -1,4 +1,6 @@',
          oldStart: 1,
          oldLines: 4,
          newStart: 1,
          newLines: 6,
          lines: [
            { type: 'context', content: 'export function add(a: number, b: number): number {', oldLineNo: 1, newLineNo: 1 },
            { type: 'remove', content: '  return 0;', oldLineNo: 2 },
            { type: 'add', content: '  return a + b;', newLineNo: 2 },
            { type: 'context', content: '}', oldLineNo: 3, newLineNo: 3 },
          ],
        },
      ],
    };

    let latestState = 'proposed';
    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(DiffViewer, {
            diff: fixtureDiff,
            onStateChange: (s: any) => { latestState = s; },
          })
        )
      );
    });

    // Verify simulation disclosure is visibly displayed in DOM
    const disclosureEl = container.querySelector('[data-testid="diff-simulation-disclosure"]');
    assert.ok(disclosureEl, 'Simulation disclosure banner must exist in fixture mode');
    assert.match(
      disclosureEl.textContent || '',
      /Simulated demonstration change\. Does not modify host filesystem\./,
      'Must disclose simulated demonstration change and zero host filesystem writes'
    );

    // Verify initial proposed state badge
    const proposedBadge = container.querySelector('[data-testid="diff-state-proposed"]');
    assert.ok(proposedBadge, 'Proposed state badge must exist');
    assert.equal(proposedBadge.textContent?.trim(), 'Proposed (Unverified)');

    // Verify all 3 interactive action buttons are explicitly labeled (Simulated)
    const buttons = Array.from(container.querySelectorAll('button'));
    const verifyBtn = buttons.find((b) => b.textContent?.includes('Verify (Simulated)'));
    const applyBtn = buttons.find((b) => b.textContent?.includes('Apply (Simulated)'));
    const rejectBtn = buttons.find((b) => b.textContent?.includes('Reject (Simulated)'));

    assert.ok(verifyBtn, 'Verify button must be explicitly labeled "Verify (Simulated)"');
    assert.ok(applyBtn, 'Apply button must be explicitly labeled "Apply (Simulated)"');
    assert.ok(rejectBtn, 'Reject button must be explicitly labeled "Reject (Simulated)"');

    // Click "Verify (Simulated)" and verify simulated badge
    await act(async () => {
      verifyBtn!.click();
    });
    assert.equal(latestState, 'verified');
    const verifiedBadge = container.querySelector('[data-testid="diff-state-verified"]');
    assert.ok(verifiedBadge, 'Verified badge must appear');
    assert.equal(verifiedBadge.textContent?.trim(), 'Verified (Simulated)', 'Badge must say Verified (Simulated), never bare Verified');
    assert.doesNotMatch(verifiedBadge.textContent || '', /Tester/, 'Must not invent fake independent Tester');

    // Click "Apply (Simulated)" and verify simulated badge
    const currentApplyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Apply (Simulated)')
    );
    assert.ok(currentApplyBtn, 'Apply (Simulated) button should be available');
    await act(async () => {
      currentApplyBtn!.click();
    });
    assert.equal(latestState, 'applied');
    const appliedBadge = container.querySelector('[data-testid="diff-state-applied"]');
    assert.ok(appliedBadge, 'Applied badge must appear');
    assert.equal(appliedBadge.textContent?.trim(), 'Applied (Simulated)');

    // Click "Reject (Simulated)" and verify simulated badge
    const currentRejectBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reject (Simulated)')
    );
    assert.ok(currentRejectBtn, 'Reject (Simulated) button should be available');
    await act(async () => {
      currentRejectBtn!.click();
    });
    assert.equal(latestState, 'rejected');
    const rejectedBadge = container.querySelector('[data-testid="diff-state-rejected"]');
    assert.ok(rejectedBadge, 'Rejected badge must appear');
    assert.equal(rejectedBadge.textContent?.trim(), 'Rejected (Simulated)');
  });

  // --------------------------------------------------------------------------
  // 2. Fixture Mode: Removal of Fake Independent Tester Attribution
  // --------------------------------------------------------------------------
  test('2. Fixture mode: Does NOT display "Verified by Tester" even if diff fixture claims verifiedBy: Tester', async () => {
    const diffWithTester: FileDiff = {
      filePath: 'src/demo-change.ts',
      language: 'typescript',
      additions: 5,
      deletions: 1,
      state: 'verified',
      verificationEvidence: 'Controlled demonstration · Verified by deterministic assertion',
      verifiedBy: 'Tester', // Legacy fixture data
      isControlledDemonstration: true,
      hunks: [],
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(DiffViewer, {
            diff: diffWithTester,
          })
        )
      );
    });

    const verifiedBadge = container.querySelector('[data-testid="diff-state-verified"]');
    assert.ok(verifiedBadge, 'Verified badge must exist');
    assert.equal(verifiedBadge.textContent?.trim(), 'Verified (Simulated)');
    assert.doesNotMatch(
      container.textContent || '',
      /Verified by Tester/,
      'Must NEVER render fake "Verified by Tester" independent attribution in fixture mode'
    );
  });

  // --------------------------------------------------------------------------
  // 3. Connected Mode: Rejection of Missing, Invalid, or Mismatched Receipts
  // --------------------------------------------------------------------------
  test('3. Connected mode: Claims of applied or verified without valid durable receipts are downgraded to Proposed with visible mismatch errors', async () => {
    // Subcase 3a: Claimed state 'applied' with NO receipt
    const appliedNoReceipt: FileDiff = {
      filePath: 'src/real-module.ts',
      additions: 10,
      deletions: 2,
      state: 'applied',
      isControlledDemonstration: false,
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(DiffViewer, { key: 'subcase-3a', diff: appliedNoReceipt })
        )
      );
    });

    const proposedBadge3a = container.querySelector('[data-testid="diff-state-proposed"]');
    assert.ok(proposedBadge3a, 'Applied state without receipt must fall back to Proposed (Unverified)');
    const errorBanner3a = container.querySelector('[data-testid="diff-receipt-error"]');
    assert.ok(errorBanner3a, 'Must display visible receipt validation error banner');
    assert.match(errorBanner3a.textContent || '', /Missing durable receipt for applied state/);

    // Subcase 3b: Claimed state 'verified' with NO receipt
    const verifiedNoReceipt: FileDiff = {
      filePath: 'src/real-module.ts',
      additions: 10,
      deletions: 2,
      state: 'verified',
      isControlledDemonstration: false,
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(DiffViewer, { key: 'subcase-3b', diff: verifiedNoReceipt })
        )
      );
    });

    const proposedBadge3b = container.querySelector('[data-testid="diff-state-proposed"]');
    assert.ok(proposedBadge3b, 'Verified state without receipt must fall back to Proposed (Unverified)');
    const errorBanner3b = container.querySelector('[data-testid="diff-receipt-error"]');
    assert.ok(errorBanner3b, 'Must display visible receipt validation error banner');
    assert.match(errorBanner3b.textContent || '', /Missing durable receipt for verified state/);

    // Subcase 3c: File path mismatch between diff and receipt
    const pathMismatchDiff: FileDiff = {
      filePath: 'src/real-module.ts',
      additions: 4,
      deletions: 1,
      state: 'applied',
      isControlledDemonstration: false,
      receipt: {
        receiptId: 'rcpt-mismatch-1',
        status: 'applied',
        filePath: 'src/different-module.ts', // Mismatched path!
        effectEvidence: 'commit-sha-abc',
        authorizedBy: 'admin',
        timestamp: '2026-11-09T09:00:00Z',
      },
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(DiffViewer, { key: 'subcase-3c', diff: pathMismatchDiff })
        )
      );
    });

    const proposedBadge3c = container.querySelector('[data-testid="diff-state-proposed"]');
    assert.ok(proposedBadge3c, 'Path mismatch must downgrade to Proposed (Unverified)');
    const errorBanner3c = container.querySelector('[data-testid="diff-receipt-error"]');
    assert.ok(errorBanner3c, 'Must display path mismatch error');
    assert.match(errorBanner3c.textContent || '', /does not match diff file path/);

    // Subcase 3d: Missing effectEvidence for applied state
    const missingEffectDiff: FileDiff = {
      filePath: 'src/real-module.ts',
      additions: 4,
      deletions: 1,
      state: 'applied',
      isControlledDemonstration: false,
      receipt: {
        receiptId: 'rcpt-no-effect',
        status: 'applied',
        filePath: 'src/real-module.ts',
        effectEvidence: '', // Empty effect evidence!
        authorizedBy: 'admin',
        timestamp: '2026-11-09T09:00:00Z',
      },
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(DiffViewer, { key: 'subcase-3d', diff: missingEffectDiff })
        )
      );
    });

    const proposedBadge3d = container.querySelector('[data-testid="diff-state-proposed"]');
    assert.ok(proposedBadge3d, 'Missing effect evidence must downgrade to Proposed (Unverified)');
    const errorBanner3d = container.querySelector('[data-testid="diff-receipt-error"]');
    assert.ok(errorBanner3d, 'Must display missing effectEvidence error');
    assert.match(errorBanner3d.textContent || '', /Missing required effectEvidence for applied state/);

    // Subcase 3e: Missing verificationEvidence for verified state
    const missingVerificationDiff: FileDiff = {
      filePath: 'src/real-module.ts',
      additions: 4,
      deletions: 1,
      state: 'verified',
      isControlledDemonstration: false,
      receipt: {
        receiptId: 'rcpt-no-verify',
        status: 'verified',
        filePath: 'src/real-module.ts',
        verificationEvidence: '', // Empty verification evidence!
        verifier: 'Tester',
        authorizedBy: 'admin',
        timestamp: '2026-11-09T09:00:00Z',
      },
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(DiffViewer, { key: 'subcase-3e', diff: missingVerificationDiff })
        )
      );
    });

    const proposedBadge3e = container.querySelector('[data-testid="diff-state-proposed"]');
    assert.ok(proposedBadge3e, 'Missing verification evidence must downgrade to Proposed (Unverified)');
    const errorBanner3e = container.querySelector('[data-testid="diff-receipt-error"]');
    assert.ok(errorBanner3e, 'Must display missing verificationEvidence error');
    assert.match(errorBanner3e.textContent || '', /Missing required verificationEvidence for verified state/);
  });

  // --------------------------------------------------------------------------
  // 4. Connected Mode: Valid Receipts Render Authentic States & Evidence
  // --------------------------------------------------------------------------
  test('4. Connected mode: Authentic durable receipts correctly render Applied and Verified states with evidence', async () => {
    // 4a: Authentic Applied state backed by receipt
    const validAppliedReceipt: DurableDiffReceipt = {
      receiptId: 'rcpt-applied-pass-1',
      status: 'applied',
      filePath: 'src/service.ts',
      effectEvidence: 'git-commit-hash-789abc',
      authorizedBy: 'release-manager',
      timestamp: '2026-11-09T09:30:00Z',
    };
    const validAppliedDiff: FileDiff = {
      filePath: 'src/service.ts',
      additions: 8,
      deletions: 0,
      state: 'applied',
      isControlledDemonstration: false,
      receipt: validAppliedReceipt,
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(DiffViewer, { key: 'subcase-4a', diff: validAppliedDiff })
        )
      );
    });

    const appliedBadge = container.querySelector('[data-testid="diff-state-applied"]');
    assert.ok(appliedBadge, 'Applied badge must be rendered');
    assert.equal(appliedBadge.textContent?.trim(), 'Applied');
    const receiptError = container.querySelector('[data-testid="diff-receipt-error"]');
    assert.equal(receiptError, null, 'Must NOT render any receipt error for valid receipt');
    const evidenceBar = container.querySelector('[data-testid="diff-verification-evidence"]');
    assert.ok(evidenceBar, 'Evidence bar must exist');
    assert.match(evidenceBar.textContent || '', /Effect: git-commit-hash-789abc/);
    assert.match(evidenceBar.textContent || '', /Authorized by release-manager/);

    // 4b: Authentic Verified state backed by receipt
    const validVerifiedReceipt: DurableDiffReceipt = {
      receiptId: 'rcpt-verified-pass-2',
      status: 'verified',
      filePath: 'src/service.ts',
      verificationEvidence: 'Automated Playwright e2e matrix passed (12/12)',
      verifier: 'Independent-Forensic-Auditor',
      authorizedBy: 'lead-architect',
      timestamp: '2026-11-09T09:35:00Z',
    };
    const validVerifiedDiff: FileDiff = {
      filePath: 'src/service.ts',
      additions: 8,
      deletions: 0,
      state: 'verified',
      isControlledDemonstration: false,
      receipt: validVerifiedReceipt,
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(DiffViewer, { key: 'subcase-4b', diff: validVerifiedDiff })
        )
      );
    });

    const verifiedBadge = container.querySelector('[data-testid="diff-state-verified"]');
    assert.ok(verifiedBadge, 'Verified badge must be rendered');
    assert.equal(verifiedBadge.textContent?.trim(), 'Verified by Independent-Forensic-Auditor');
    const verifiedEvidenceBar = container.querySelector('[data-testid="diff-verification-evidence"]');
    assert.ok(verifiedEvidenceBar, 'Verification evidence bar must exist');
    assert.match(verifiedEvidenceBar.textContent || '', /Evidence: Automated Playwright e2e matrix passed \(12\/12\)/);
    assert.match(verifiedEvidenceBar.textContent || '', /Authorized by lead-architect/);
  });

  // --------------------------------------------------------------------------
  // 5. Connected Mode: Local State Transition Buttons are Strictly Disabled
  // --------------------------------------------------------------------------
  test('5. Connected mode: Local state transition buttons are disabled and do not alter state', async () => {
    const proposedConnectedDiff: FileDiff = {
      filePath: 'src/connected-change.ts',
      additions: 2,
      deletions: 2,
      state: 'proposed',
      isControlledDemonstration: false,
      hunks: [],
    };

    let stateMutationAttempted = false;
    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(DiffViewer, {
            diff: proposedConnectedDiff,
            onStateChange: () => { stateMutationAttempted = true; },
          })
        )
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const verifyBtn = buttons.find((b) => b.textContent?.trim() === 'Verify');
    const applyBtn = buttons.find((b) => b.textContent?.trim() === 'Apply');
    const rejectBtn = buttons.find((b) => b.textContent?.trim() === 'Reject');

    assert.ok(verifyBtn, 'Verify button should exist');
    assert.ok(applyBtn, 'Apply button should exist');
    assert.ok(rejectBtn, 'Reject button should exist');

    assert.equal(verifyBtn?.disabled, true, 'Verify button MUST be disabled in connected mode');
    assert.equal(applyBtn?.disabled, true, 'Apply button MUST be disabled in connected mode');
    assert.equal(rejectBtn?.disabled, true, 'Reject button MUST be disabled in connected mode');

    assert.match(
      verifyBtn?.title || '',
      /Connected-mode operations require authorized backend execution/,
      'Must explain connected-mode operations require authorized backend execution'
    );

    // Attempt clicks on disabled controls
    await act(async () => {
      verifyBtn?.click();
      applyBtn?.click();
      rejectBtn?.click();
    });

    assert.equal(stateMutationAttempted, false, 'Clicks on disabled connected buttons must NOT trigger onStateChange');
    const proposedBadge = container.querySelector('[data-testid="diff-state-proposed"]');
    assert.ok(proposedBadge, 'State must remain Proposed (Unverified)');
  });
});
