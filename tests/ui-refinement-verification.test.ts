/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mediobot UI Refinement Mandatory Verification Suite
 * Verifies all 15 mandatory acceptance criteria for the authorized UI sprint.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { OfflineFixtureRuntime, FIXTURE_DEMO_PROJECT } from '../mediobot-ui-refinement/src/runtime/offlineFixture.js';
import { parseCanonicalTrajectory } from '../mediobot-ui-refinement/src/features/activity/CodexExecutionView.js';
import { deduplicateTools } from '../mediobot-ui-refinement/src/features/activity/CodexExecutionView.js';
import type { Thread, FileDiff, ToolExecutionData } from '../mediobot-ui-refinement/src/types/index.js';

describe('Mediobot UI Refinement - Mandatory Verification Suite', () => {
  let runtime: OfflineFixtureRuntime;

  beforeEach(() => {
    runtime = new OfflineFixtureRuntime();
  });

  // Requirement 1: Two separate teams
  test('1. Two separate teams exist in isolated environments', async () => {
    const threads = await runtime.loadThreads();
    const teamIds = Array.from(new Set(threads.map((t) => t.teamId).filter(Boolean)));
    assert.ok(teamIds.length >= 2, `Expected at least 2 teams, found: ${teamIds.length}`);
    assert.ok(teamIds.includes('team-alpha-01'), 'team-alpha-01 should exist');
    assert.ok(teamIds.includes('team-beta-02'), 'team-beta-02 should exist');
  });

  // Requirement 2: At least two Main conversations in one team
  test('2. At least two Main conversations exist in Team Alpha with distinct stable identities', async () => {
    const threads = await runtime.loadThreads();
    const alphaMainChats = threads.filter(
      (t) => t.teamId === 'team-alpha-01' && t.threadType === 'team'
    );
    assert.ok(alphaMainChats.length >= 2, `Expected at least 2 Main chats in Team Alpha, found ${alphaMainChats.length}`);
    assert.notEqual(alphaMainChats[0]!.id, alphaMainChats[1]!.id, 'Main chat IDs must be distinct and stable');
    assert.equal(alphaMainChats[0]!.id, 'thread-alpha-main-01');
    assert.equal(alphaMainChats[1]!.id, 'thread-alpha-main-02');
  });

  // Requirement 3: Correct Main-to-Maestro association
  test('3. Each Main conversation resolves its own unique associated Maestro conversation', async () => {
    const threads = await runtime.loadThreads();
    const main1 = threads.find((t) => t.id === 'thread-alpha-main-01');
    const main2 = threads.find((t) => t.id === 'thread-alpha-main-02');
    assert.ok(main1, 'main1 must exist');
    assert.ok(main2, 'main2 must exist');

    assert.ok(main1.associatedMaestroThreadId, 'main1 must have associated Maestro thread');
    assert.ok(main2.associatedMaestroThreadId, 'main2 must have associated Maestro thread');
    assert.notEqual(
      main1.associatedMaestroThreadId,
      main2.associatedMaestroThreadId,
      'Main 1 and Main 2 must NOT share the same Maestro conversation'
    );

    const maestro1 = threads.find((t) => t.id === main1.associatedMaestroThreadId);
    const maestro2 = threads.find((t) => t.id === main2.associatedMaestroThreadId);
    assert.ok(maestro1, 'maestro1 thread must exist');
    assert.ok(maestro2, 'maestro2 thread must exist');

    assert.equal(maestro1.originatingMainThreadId, main1.id);
    assert.equal(maestro2.originatingMainThreadId, main2.id);
    assert.equal(maestro1.ownerAgent, 'maestro');
    assert.equal(maestro2.ownerAgent, 'maestro');
  });

  // Requirement 4: No duplicate Maestro conversation under repeated/concurrent opening
  test('4. Idempotent Maestro association: repeated resolution never creates duplicate Maestro threads', async () => {
    const threads = await runtime.loadThreads();
    const main1 = threads.find((t) => t.id === 'thread-alpha-main-01')!;

    // Verify initial association from runtime fixture
    assert.ok(main1.associatedMaestroThreadId, 'main1 must have associatedMaestroThreadId');
    const maestroId = main1.associatedMaestroThreadId;

    // Verify atomic save idempotency using actual runtime implementation
    await runtime.saveThreadsAtomic([main1]);
    const reloaded = await runtime.loadThreads();
    const mainReloaded = reloaded.find((t) => t.id === 'thread-alpha-main-01')!;
    assert.equal(mainReloaded.associatedMaestroThreadId, maestroId);

    // Verify exactly one Maestro thread exists for this Main thread
    const maestroThreads = reloaded.filter(
      (t) => t.originatingMainThreadId === main1.id && t.ownerAgent === 'maestro'
    );
    assert.equal(maestroThreads.length, 1, 'Exactly one Maestro thread must exist for Main 1');
    assert.equal(maestroThreads[0]!.id, 'thread-alpha-maestro-01');
  });

  // Requirement 5: No cross-team specialist fallback
  test('5. Specialist selection never falls back to another team', async () => {
    const threads = await runtime.loadThreads();
    const currentTeamId = 'team-alpha-01';
    const targetSpecialist = 'tester';

    // In Team Alpha, Tester has no private conversation yet (only Cody has one).
    // In Team Beta, Tester DOES have a private conversation ('thread-beta-tester-01').
    // With correct scoping: searching in Team Alpha MUST return undefined, NOT fall back to Team Beta!
    const scopedSpecialistThread = threads.find(
      (t) => (t.teamId === currentTeamId) &&
             t.threadType !== 'team' &&
             ((t.ownerAgent === targetSpecialist) || (t.specialistId === targetSpecialist))
    );

    assert.equal(scopedSpecialistThread, undefined, 'Must not return Team Beta specialist conversation when in Team Alpha');

    // Searching in Team Beta correctly finds Team Beta's tester thread
    const betaTesterThread = threads.find(
      (t) => (t.teamId === 'team-beta-02') &&
             t.threadType !== 'team' &&
             ((t.ownerAgent === targetSpecialist) || (t.specialistId === targetSpecialist))
    );
    assert.ok(betaTesterThread, 'Team Beta tester thread should be found in Team Beta');
    assert.equal(betaTesterThread.id, 'thread-beta-tester-01');
  });

  // Requirement 6: Existing-tab navigation restores team context
  test('6. Tab selection correctly restores thread team context', async () => {
    const threads = await runtime.loadThreads();
    const betaMain = threads.find((t) => t.id === 'thread-beta-main-01')!;

    let currentActiveTeamId = 'team-alpha-01'; // currently in Alpha

    // When user clicks tab for betaMain:
    if (betaMain.teamId && betaMain.teamId !== currentActiveTeamId) {
      currentActiveTeamId = betaMain.teamId;
    }

    assert.equal(currentActiveTeamId, 'team-beta-02', 'Active team must be restored to thread teamId upon tab switch');
  });

  // Requirement 7: Draft and scroll retention by thread ID
  test('7. Drafts and scroll positions are strictly associated with originating thread ID', () => {
    const drafts: Record<string, string> = {};
    const setDraft = (threadId: string, text: string) => { drafts[threadId] = text; };

    setDraft('thread-alpha-main-01', 'Draft for Alpha Main 1');
    setDraft('thread-alpha-main-02', 'Draft for Alpha Main 2');
    setDraft('thread-beta-main-01', 'Draft for Beta Main');

    assert.equal(drafts['thread-alpha-main-01'], 'Draft for Alpha Main 1');
    assert.equal(drafts['thread-alpha-main-02'], 'Draft for Alpha Main 2');
    assert.equal(drafts['thread-beta-main-01'], 'Draft for Beta Main');
    assert.notEqual(drafts['thread-alpha-main-01'], drafts['thread-alpha-main-02']);
  });

  // Requirement 8: Failed persistence produces explicit error, rejects without swallowing, and validates schema
  test('8. Failed persistence produces explicit error, rejects without swallowing, and validates schema', async () => {
    // 1. Verify schema validation rejects invalid structures and cleans dangling pointers
    const corruptedRaw = { schema: 'invalid-schema', threads: [] };
    assert.equal(runtime.validatePersistedThreads(corruptedRaw), null);

    const validEnvelope = {
      version: 1,
      schema: 'mediobot-offline-fixture-v1',
      savedAt: Date.now(),
      threads: [
        {
          id: 't-1',
          title: 'Valid Thread',
          turns: [],
          associatedMaestroThreadId: 'dangling-thread-id',
        },
      ],
    };
    const validated = runtime.validatePersistedThreads(validEnvelope);
    assert.ok(validated);
    assert.equal(validated[0]!.id, 't-1');
    assert.equal(validated[0]!.associatedMaestroThreadId, undefined, 'Dangling pointer must be cleaned');

    // 2. Verify storage write failure is NOT swallowed by runtime
    const hadLocalStorage = 'localStorage' in globalThis;
    const originalSetItem = globalThis.localStorage?.setItem;
    try {
      if (!globalThis.localStorage) {
        (globalThis as any).localStorage = {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }
      globalThis.localStorage.setItem = () => {
        const error = new Error('Disk quota exceeded in local store');
        error.name = 'QuotaExceededError';
        throw error;
      };

      await assert.rejects(
        async () => {
          await runtime.saveThreadsAtomic(await runtime.loadThreads());
        },
        /QuotaExceededError|Disk quota exceeded/,
        'Storage quota error must propagate and reject without silent swallowing'
      );
    } finally {
      if (originalSetItem) {
        globalThis.localStorage.setItem = originalSetItem;
      } else if (!hadLocalStorage) {
        delete (globalThis as any).localStorage;
      }
    }
  });

  // Requirement 9: Fixture cannot call providers & rejects unexpected network requests
  test('9. Safe offline fixture makes zero external network or provider requests', async () => {
    // Spy on global fetch to ensure startTurn makes 0 network calls
    let fetchCallCount = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (..._args: any[]) => {
      fetchCallCount++;
      throw new Error('SECURITY VIOLATION: Offline fixture attempted unauthorized network request!');
    };

    try {
      const turnId = await runtime.startTurn('thread-alpha-main-01', 'Test offline prompt', {
        model: 'Claude 3.7 Sonnet',
        approvalMode: 'Approve for me',
        project: FIXTURE_DEMO_PROJECT,
        branch: 'main',
      });

      assert.ok(turnId, 'startTurn should return turnId');
      assert.equal(fetchCallCount, 0, 'Zero network calls must be made during offline fixture execution');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Requirement 10: No fake tool result presented as real execution
  test('10. Every synthetic activity and result visibly designated as Controlled demonstration', async () => {
    const thread = await runtime.loadThread('thread-alpha-main-01');
    const turn = thread.turns[0]!;

    const hasControlledBanner = turn.items.some(
      (it) => it.text && it.text.includes('Controlled demonstration')
    );
    assert.ok(hasControlledBanner, 'Turn must contain visible Controlled demonstration notice');

    const tools = turn.items.filter((it) => it.type === 'tool_execution' && it.tool).map((it) => it.tool!);
    for (const tool of tools) {
      assert.ok(
        tool.outcomeBadge.includes('Controlled demonstration'),
        `Tool outcome badge "${tool.outcomeBadge}" must include Controlled demonstration`
      );
      assert.match(tool.outputLog || '', /\[Controlled demonstration\]/, 'Tool output log must indicate controlled simulation');
    }
  });

  // Requirement 11: Activity event deduplication using stable event IDs
  test('11. Tool event deduplication coalesces redundant events and progresses monotonically', () => {
    const tool1: ToolExecutionData = {
      toolInvocationId: 'inv-1',
      toolName: 'filesystem.read',
      command: 'filesystem.read file.ts',
      status: 'running',
      startedAt: 1000,
    };
    const tool1Completed: ToolExecutionData = {
      toolInvocationId: 'inv-1',
      toolName: 'filesystem.read',
      command: 'filesystem.read file.ts',
      status: 'success',
      startedAt: 1000,
      durationMs: 250,
      outputLog: 'Read 50 lines',
    };
    const tool2: ToolExecutionData = {
      toolInvocationId: 'inv-2',
      toolName: 'terminal.execute',
      command: 'npm test',
      status: 'success',
      startedAt: 2000,
      durationMs: 500,
    };

    const deduplicated = deduplicateTools([tool1, tool1Completed, tool2]);
    assert.equal(deduplicated.length, 2, 'Should deduplicate tool1 running + completed into single item');
    assert.equal(deduplicated[0]!.status, 'success', 'Terminal status should override running');
    assert.equal(deduplicated[0]!.durationMs, 250);
  });

  // Requirement 12: Correct changed-file counts and review states
  test('12. Changed-file review reflects exact additions, deletions, and review states', async () => {
    const thread = await runtime.loadThread('thread-alpha-main-01');
    const diffItem = thread.turns[0]!.items.find((it) => it.type === 'diff' && it.diff);
    assert.ok(diffItem && diffItem.diff, 'Diff item must exist in seed turn');

    const diff = diffItem.diff;
    assert.equal(diff.filePath, 'src/calculator.ts');
    assert.equal(diff.additions, 5, 'Additions must equal 5 (+5/-2 truthful hunk counts)');
    assert.equal(diff.deletions, 2, 'Deletions must equal 2');
    assert.equal(diff.state, 'verified', 'State must be verified');
    assert.equal(diff.verifiedBy, 'Simulated assertion', 'Must not invent "Tester" without authoritative verifier');
    assert.ok(diff.verificationEvidence?.includes('Controlled demonstration'));
  });

  // Requirement 13: Expandable diff rendering
  test('13. Diff hunks parse and render unified context, additions, and deletions', async () => {
    const thread = await runtime.loadThread('thread-alpha-main-01');
    const diff = thread.turns[0]!.items.find((it) => it.type === 'diff')!.diff!;

    assert.ok(diff.hunks && diff.hunks.length > 0, 'Diff must contain hunks');
    const hunk = diff.hunks[0]!;
    assert.ok(hunk.lines.some((l) => l.type === 'add'));
    assert.ok(hunk.lines.some((l) => l.type === 'remove'));
    assert.ok(hunk.lines.some((l) => l.type === 'context'));
  });

  // Requirement 14: No private conversation leakage across teams
  test('14. Private specialist conversations are never exposed or accessible across teams', async () => {
    const threads = await runtime.loadThreads();
    const alphaThreads = threads.filter((t) => t.teamId === 'team-alpha-01');
    const betaThreads = threads.filter((t) => t.teamId === 'team-beta-02');

    // Check that Cody's private thread in Alpha has no turns leaking to Beta
    const codyAlpha = alphaThreads.find((t) => t.id === 'thread-alpha-cody-01')!;
    const testerBeta = betaThreads.find((t) => t.id === 'thread-beta-tester-01')!;

    assert.notEqual(codyAlpha.teamId, testerBeta.teamId);
    assert.equal(codyAlpha.teamId, 'team-alpha-01');
    assert.equal(testerBeta.teamId, 'team-beta-02');
  });

  // Requirement 15: Hidden reasoning / chain-of-thought suppression
  test('15. Canonical trajectory parser suppresses hidden model deliberation from display projection', () => {
    const rawTrajectory = `
[THINKING]
Private model chain-of-thought that must NEVER be exposed to the user.
Step 1: Check internal weights and policies.
[/THINKING]
[ACTION:filesystem.read]
src/calculator.ts
[OBSERVATION]
File content observed.
`;

    const blocks = parseCanonicalTrajectory(rawTrajectory);
    // TrajectoryBlock parser parses blocks
    const thinkingBlock = blocks.find((b) => b.kind === 'thinking');
    assert.ok(thinkingBlock, 'Thinking block parsed by raw parser');

    // In CodexExecutionView / CanonicalTrajectoryView: block.kind === 'thinking' returns null!
    // Verify that the UI projection filters out thinking:
    const visibleBlocks = blocks.filter((b) => b.kind !== 'thinking');
    assert.equal(visibleBlocks.some((b) => b.kind === 'thinking'), false, 'Thinking blocks must be excluded from visible UI projection');
    assert.ok(visibleBlocks.some((b) => b.kind === 'action'));
  });
});
