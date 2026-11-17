import assert from 'node:assert/strict';
import test from 'node:test';
import { MockMediobotRuntime } from '../../src/runtime/mockClient.ts';
import { MockMediobotRuntime as LegacyRuntimeEntry } from '../../src/runtime/mockRuntime.ts';
import { OfflineFixtureRuntime } from '../../src/runtime/offlineFixture.ts';
import { runtimeInstance, USE_OFFLINE_FIXTURE } from '../../src/runtime/client.ts';
import { getOutcomeBadge } from '../../src/features/activity/toolExecutionPresentation.ts';
import { MOCK_PROVIDERS } from '../../src/runtime/mockData.ts';

test('legacy mock entry point resolves only to the isolated offline fixture', () => {
  assert.equal(MockMediobotRuntime, OfflineFixtureRuntime);
  assert.equal(LegacyRuntimeEntry, OfflineFixtureRuntime);
  assert.equal(new MockMediobotRuntime().runtimeKind, 'offline-fixture',
    'legacy imports must not expose the retired mock as a connected runtime');
  assert.equal(USE_OFFLINE_FIXTURE, true);
  assert.equal(runtimeInstance.runtimeKind, 'offline-fixture');
});

test('offline fixture never reports a connected provider or enabled live model', async () => {
  const runtime = new MockMediobotRuntime();
  assert.ok(MOCK_PROVIDERS.every((provider) => !provider.connected && !provider.enabled
    && provider.models.every((model) => !model.enabled)), 'legacy catalog entries must not claim configured connectivity');
  assert.deepEqual(await runtime.getConnectedProviders(), []);
  assert.deepEqual(await runtime.getEnabledModels(), []);
  assert.equal((await runtime.connectProvider({ id: 'test' })).success, false);
  assert.equal(await runtime.toggleProvider('test', true), false);

  for (const thread of runtime.getInitialThreads()) {
    for (const turn of thread.turns) {
      for (const item of turn.items) {
        if (item.type !== 'tool_execution' || item.tool.status !== 'success') continue;
        assert.ok(
          item.tool.toolName.includes('(simulated)')
            || item.tool.outcomeBadge?.includes('Controlled demonstration')
            || item.tool.outcomeBadge?.includes('Simulated')
            || item.tool.outputLog?.includes('[Controlled demonstration]'),
          `successful fixture tool result must be explicitly labeled: ${item.tool.toolName}`,
        );
      }
    }
  }
});

test('simulated verification is never presented as a real successful command', () => {
  const runtime = new OfflineFixtureRuntime();
  const items = runtime.getInitialThreads().flatMap((thread) => thread.turns).flatMap((turn) => turn.items);
  const testerTool = items.find((item) => item.type === 'tool_execution' && item.tool.toolName.includes('terminal.execute'));
  const summary = items.find((item) => item.type === 'agent_message' && item.actor.type === 'mediobot' && item.actor.mediobotId === 'cody');

  assert.ok(testerTool && testerTool.type === 'tool_execution');
  assert.ok(summary && summary.type === 'agent_message');
  assert.match(summary.text, /^Controlled demonstration/);
  assert.match(summary.text, /No host files were changed/);
  assert.doesNotMatch(summary.text, /I have added|implemented the change/i);
  assert.equal(testerTool.tool.verificationStatus, 'unverified');
  assert.deepEqual(getOutcomeBadge(testerTool.tool), {
    label: 'Controlled demonstration · Simulated',
    className: 'text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/50 px-1.5 py-0.5 rounded font-mono',
  });
  assert.doesNotMatch(getOutcomeBadge(testerTool.tool)?.label ?? '', /exited 0|verified/i);
});

test('unverified command results without a fixture badge are not presented as successful checks', () => {
  const badge = getOutcomeBadge({
    toolName: 'terminal.execute',
    status: 'success',
    isVerification: true,
    verificationStatus: 'unverified',
  });

  assert.equal(badge?.label, 'not verified');
});

test('deterministic activity is labeled as a demonstration and makes no provider request', async () => {
  // Exercise the retired public entry point directly so older imports cannot
  // accidentally regain the former provider-backed mock implementation.
  const runtime = new MockMediobotRuntime();
  const priorFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls++;
    throw new Error('Unexpected network request from offline fixture');
  }) as typeof fetch;

  try {
    const events: Array<{ type: string; payload: any }> = [];
    runtime.onEvent((event) => events.push(event));
    const turnId = await runtime.startTurn('thread-alpha-main-01', 'Offline fixture truthfulness check', { model: 'Display-only model' });

    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('Fixture turn did not settle')), 1_000);
      const unsubscribe = runtime.onEvent((event) => {
        if (event.turnId === turnId && event.type === 'turn.completed') {
          clearTimeout(deadline);
          unsubscribe();
          resolve();
        }
      });
    });

    const turnEvents = events.filter((event) => event.payload?.item?.turnId === turnId);
    const toolEvents = turnEvents.filter((event) => event.payload.item.type === 'tool_execution');
    const diffEvents = turnEvents.filter((event) => event.payload.item.type === 'diff');
    const finalTurn = events.find((event) => event.turnId === turnId && event.type === 'turn.completed')?.payload?.turn;
    const summary = finalTurn?.items?.find((item: any) => item.type === 'agent_message' && item.actor.type === 'mediobot');
    assert.ok(toolEvents.length > 0);
    assert.ok(toolEvents.every((event) => event.payload.item.tool.outcomeBadge === 'Controlled demonstration'
      && event.payload.item.tool.outputLog.startsWith('[Controlled demonstration]')));
    assert.ok(diffEvents.length > 0);
    assert.ok(diffEvents.every((event) => event.payload.item.diff.isControlledDemonstration === true
      && event.payload.item.diff.verificationEvidence.startsWith('Controlled demonstration')));
    assert.ok(summary, 'the fixture emits a final specialist summary');
    assert.match(summary.text, /^Controlled demonstration only/);
    assert.match(summary.text, /No project files were changed; no provider request or verification command ran\./);
    assert.doesNotMatch(summary.text, /implemented|verified|tests passed|command succeeded/i);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = priorFetch;
  }
});

test('cancelling a deterministic fixture turn prevents later simulated success events', async () => {
  const runtime = new OfflineFixtureRuntime();
  const events: Array<{ type: string; turnId?: string }> = [];
  runtime.onEvent((event) => events.push({ type: event.type, turnId: event.turnId }));

  const threadId = 'thread-fixture-cancel-test';
  const turnId = await runtime.startTurn(threadId, 'Cancel this demonstration', { model: 'Display-only model' }, 'turn-fixture-cancel-test');
  await runtime.cancelTurn(threadId, turnId);
  await new Promise((resolve) => setTimeout(resolve, 340));

  const turn = (await runtime.loadThread(threadId)).turns.find((candidate) => candidate.id === turnId);
  assert.equal(turn?.status, 'cancelled');
  assert.deepEqual(events.filter((event) => event.turnId === turnId).map((event) => event.type), [
    'turn.snapshot',
    'turn.cancelled',
  ]);
  assert.equal((runtime as any).pendingTurnTimers.size, 0);
});
