import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('mounted Settings and credential panels report offline state without connection claims', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  const globals = ['window', 'document', 'navigator', 'localStorage', 'HTMLElement', 'Node', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame'] as const;
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const previousFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls++;
    throw new Error('Offline Settings must not probe provider status');
  }) as typeof fetch;
  for (const key of globals) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: key === 'window' ? dom.window : (dom.window as unknown as Record<string, unknown>)[key],
    });
  }
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true });

  try {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { AppProvider } = await import('../../src/state/AppContext.tsx');
    const { SettingsModal } = await import('../../src/features/settings/SettingsModal.tsx');
    const { GeminiApiKeyManager } = await import('../../src/features/settings/GeminiApiKeyManager.tsx');
    const { TerminalWorkspaceView } = await import('../../src/features/terminal/TerminalWorkspaceView.tsx');
    const { DiffViewer } = await import('../../src/features/activity/DiffViewer.tsx');
    const { OfflineFixtureRuntime } = await import('../../src/runtime/offlineFixture.ts');
    const seededDiff = new OfflineFixtureRuntime().getInitialThreads()
      .flatMap(thread => thread.turns)
      .flatMap(turn => turn.items)
      .find(item => item.type === 'diff');
    assert.ok(seededDiff && seededDiff.type === 'diff', 'fixture exposes a seeded demonstration diff');
    const root = createRoot(dom.window.document.getElementById('root')!);

    await React.act(async () => {
      root.render(React.createElement(AppProvider, null,
        React.createElement(React.Fragment, null,
          React.createElement(SettingsModal),
          React.createElement(DiffViewer, { diff: seededDiff.diff }),
        ),
      ));
    });

    const modelSettings = dom.window.document.body.textContent ?? '';
    assert.match(modelSettings, /Not connected · offline fixture/);
    assert.match(modelSettings, /Credentials are not read, stored, or tested by this runtime\./);
    assert.match(modelSettings, /Example model names/);
    assert.doesNotMatch(modelSettings, /GEMINI_API_KEY|Google Gemini Provider|Connected \(\d+ms\)|Official Gemini Models Ready/);
    const selectedModelCard = [...dom.window.document.querySelectorAll('div.cursor-pointer')]
      .find((card) => card.querySelector('svg'));
    assert.ok(selectedModelCard, 'a display-only model label remains selectable as a local preference');
    assert.doesNotMatch(selectedModelCard.querySelector('svg')?.getAttribute('class') ?? '', /emerald/,
      'selecting a display-only model label must not resemble verified provider readiness');

    const generalTab = [...dom.window.document.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('General & Approvals'));
    assert.ok(generalTab, 'general settings tab is mounted');
    await React.act(async () => generalTab.click());
    const generalSettings = dom.window.document.body.textContent ?? '';
    assert.match(generalSettings, /Default Agent Model Label/);
    assert.match(generalSettings, /Display preference only\. The offline fixture does not send requests to any model\./);
    assert.doesNotMatch(generalSettings, /connected model|model ready|active model/i);

    const runtimeTab = [...dom.window.document.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Mediobot Integration Layer'));
    assert.ok(runtimeTab, 'the runtime status tab is mounted');
    await React.act(async () => runtimeTab.click());
    const runtimeSettings = dom.window.document.body.textContent ?? '';
    assert.match(runtimeSettings, /Offline fixture · simulated only/);
    assert.match(runtimeSettings, /provider, host terminal, and computer-use execution are unavailable/);
    assert.equal(fetchCalls, 0, 'offline Settings must not issue provider or readiness requests');

    assert.equal(
      dom.window.document.querySelector('[data-testid="diff-state-verified"]')?.textContent?.trim(),
      'Verified (Simulated)',
      'a fixture diff must not look like a real verified file change',
    );
    assert.match(dom.window.document.body.textContent ?? '', /Controlled demonstration/);

    await React.act(async () => {
      root.render(React.createElement(AppProvider, null, React.createElement(GeminiApiKeyManager)));
    });
    let credentialSettings = dom.window.document.body.textContent ?? '';
    assert.match(credentialSettings, /Provider configuration and testing are disabled in the selected offline fixture\./);
    assert.match(credentialSettings, /Experiential Gateway unavailable in offline fixture/);
    assert.match(credentialSettings, /Provider credentials and readiness are not inspected in the offline fixture\./);
    assert.match(credentialSettings, /Experiential Gateway · Unavailable offline/);
    assert.match(credentialSettings, /Google Gemini · Unavailable offline/);
    assert.doesNotMatch(credentialSettings, /EXPLABS_API_KEY|GEMINI_API_KEY|Key Connected|Active key:/);
    for (const label of ['Save Key', 'Make Test Call (Verify Credits & Tokens)']) {
      const button = [...dom.window.document.querySelectorAll('button')]
        .find((candidate) => candidate.textContent?.includes(label));
      assert.ok(button, `credential action ${label} is rendered`);
      assert.equal((button as HTMLButtonElement).disabled, true, `${label} is unavailable offline`);
    }
    const geminiTab = [...dom.window.document.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Google Gemini'));
    assert.ok(geminiTab, 'Gemini credential section is available for inspection');
    await React.act(async () => geminiTab.click());
    credentialSettings = dom.window.document.body.textContent ?? '';
    assert.match(credentialSettings, /Google Gemini unavailable in offline fixture/);
    assert.match(credentialSettings, /Provider credentials and model readiness are not inspected in the offline fixture\./);
    assert.doesNotMatch(credentialSettings, /Active key:|Key Connected|credentials active|No API key detected/);
    assert.doesNotMatch(credentialSettings, /EXPLABS_API_KEY|GEMINI_API_KEY|Export to Environment|Copy Command/);
    for (const label of ['Validate & Save Key', 'Test Key (Ping)']) {
      const button = [...dom.window.document.querySelectorAll('button')]
        .find((candidate) => candidate.textContent?.includes(label));
      assert.ok(button, `credential action ${label} is rendered`);
      assert.equal((button as HTMLButtonElement).disabled, true, `${label} is unavailable offline`);
    }
    assert.equal(fetchCalls, 0, 'offline credential settings must not inspect or test provider credentials');

    // Configured credentials are not proof of provider reachability or model readiness.
    // Exercise this backend-status presentation with a local fetch stub only.
    const { runtimeInstance } = await import('../../src/runtime/client.ts');
    const runtimeKindDescriptor = Object.getOwnPropertyDescriptor(runtimeInstance, 'runtimeKind');
    const offlineFetch = globalThis.fetch;
    const statusRequests: string[] = [];
    Object.defineProperty(runtimeInstance, 'runtimeKind', { configurable: true, value: 'backend' });
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      statusRequests.push(url);
      const isGemini = url.includes('/api/gemini/key-status');
      return {
        ok: true,
        json: async () => isGemini
          ? { isConfigured: true, isCustomOverride: false, isEnvConfigured: true, maskedKey: '••••1234' }
          : { isConfigured: true, isCustomOverride: false, isEnvConfigured: true, maskedKey: '••••5678', baseUrl: 'https://example.invalid/v1', modelId: 'example-model' },
      } as Response;
    }) as typeof fetch;
    try {
      await React.act(async () => {
        root.render(React.createElement(AppProvider, null, React.createElement(SettingsModal)));
      });
      const backendSettingsText = dom.window.document.body.textContent ?? '';
      assert.match(backendSettingsText, /Connection status not verified/);
      assert.match(backendSettingsText, /provider availability, credentials, and model capabilities have not been checked/i);
      assert.doesNotMatch(backendSettingsText, /GEMINI_API_KEY|Connected \(\d+ms\)|Official Gemini Models Ready|Provider Connected|Models Ready/i);
      assert.equal(statusRequests.length, 0, 'Settings must not imply readiness by probing provider status');

      await React.act(async () => {
        root.render(React.createElement(AppProvider, null,
          React.createElement(GeminiApiKeyManager, { key: 'configured-backend-status' }),
        ));
      });
      let configuredCredentialText = dom.window.document.body.textContent ?? '';
      assert.match(configuredCredentialText, /Experiential credential configured/);
      assert.match(configuredCredentialText, /provider reachability and model availability have not been verified/i);
      assert.doesNotMatch(configuredCredentialText, /Gateway Connected|\bReady\b|model ready|Active key:/i);
      const experientialTab = [...dom.window.document.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Experiential Gateway'));
      assert.ok(experientialTab);
      assert.doesNotMatch((experientialTab.lastElementChild as HTMLElement).className, /emerald/, 'configured credentials must not use a connected indicator before provider verification');
      const configuredBadge = [...dom.window.document.querySelectorAll('span')]
        .find((span) => span.textContent?.trim() === 'Configured');
      assert.ok(configuredBadge);
      assert.doesNotMatch(configuredBadge.className, /emerald/, 'credential presence must not use success styling');
      const modelLabel = [...dom.window.document.querySelectorAll('div')]
        .find((div) => div.textContent?.trim() === 'Model ID');
      assert.ok(modelLabel?.nextElementSibling);
      assert.doesNotMatch((modelLabel.nextElementSibling as HTMLElement).className, /emerald/, 'an unverified model binding must not use success styling');
      const configuredGeminiTab = [...dom.window.document.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Google Gemini'));
      assert.ok(configuredGeminiTab, 'configured Gemini credential section is available');
      await React.act(async () => configuredGeminiTab.click());
      configuredCredentialText = dom.window.document.body.textContent ?? '';
      assert.match(configuredCredentialText, /Google Gemini credential configured/);
      assert.match(configuredCredentialText, /provider reachability and model availability have not been verified/i);
      assert.doesNotMatch(configuredCredentialText, /Key Connected|credentials active|\bReady\b|model ready|Active key:/i);
      const geminiTab = [...dom.window.document.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Google Gemini'));
      assert.ok(geminiTab);
      assert.doesNotMatch((geminiTab.lastElementChild as HTMLElement).className, /emerald/, 'configured Gemini credentials must not use a connected indicator before provider verification');
      assert.deepEqual(statusRequests.sort(), ['/api/experiential/key-status', '/api/gemini/key-status']);

      globalThis.fetch = (async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response) as typeof fetch;
      await React.act(async () => {
        root.render(React.createElement(AppProvider, null,
          React.createElement(GeminiApiKeyManager, { key: 'unavailable-backend-status' }),
        ));
      });
      let unavailableText = dom.window.document.body.textContent ?? '';
      assert.match(unavailableText, /Experiential credential status unavailable/);
      assert.match(unavailableText, /Credential configuration could not be determined/);
      assert.doesNotMatch(unavailableText, /EXPLABS_API_KEY Not Configured|Setup Required/);
      const unavailableGeminiTab = [...dom.window.document.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Google Gemini'));
      assert.ok(unavailableGeminiTab);
      await React.act(async () => unavailableGeminiTab.click());
      unavailableText = dom.window.document.body.textContent ?? '';
      assert.match(unavailableText, /Google Gemini credential status unavailable/);
      assert.doesNotMatch(unavailableText, /Gemini Key Not Configured|No API key detected/);
    } finally {
      globalThis.fetch = offlineFetch;
      if (runtimeKindDescriptor) Object.defineProperty(runtimeInstance, 'runtimeKind', runtimeKindDescriptor);
      else delete (runtimeInstance as { runtimeKind?: string }).runtimeKind;
    }

    await React.act(async () => {
      root.render(React.createElement(AppProvider, null,
        React.createElement(TerminalWorkspaceView, { onClose: () => {} }),
      ));
    });
    let terminalText = dom.window.document.body.textContent ?? '';
    assert.match(terminalText, /Terminal history and output are simulated examples; no host process ran and no workspace checks were performed\./);
    assert.doesNotMatch(terminalText, /PTY bridge ready|Test suite passed cleanly|No problems have been detected in the workspace/);
    const simulatedSuccessLine = [...dom.window.document.querySelectorAll('div')]
      .find((element) => element.textContent?.trim() === '[Controlled demonstration · simulated] found 0 vulnerabilities');
    assert.ok(simulatedSuccessLine, 'the offline terminal fixture retains its sample command output');
    assert.match(simulatedSuccessLine.textContent ?? '', /^\[Controlled demonstration · simulated\]/,
      'each synthetic terminal result must be labeled where it is displayed');
    assert.doesNotMatch(simulatedSuccessLine.className, /text-emerald/,
      'a synthetic success must not use the real-success color');

    const problemsTab = [...dom.window.document.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Problems'));
    assert.ok(problemsTab, 'terminal Problems tab is mounted');
    await React.act(async () => problemsTab.click());
    terminalText = dom.window.document.body.textContent ?? '';
    assert.match(terminalText, /No problems are recorded in this demonstration fixture/);
    assert.match(terminalText, /No workspace checks have been run/);

    const outputTab = [...dom.window.document.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Output'));
    assert.ok(outputTab, 'terminal Output tab is mounted');
    await React.act(async () => outputTab.click());
    terminalText = dom.window.document.body.textContent ?? '';
    assert.match(terminalText, /\[Controlled demonstration\] Example Vite output/);
    assert.match(terminalText, /\[Controlled demonstration\] Host PTY execution is unavailable/);
    assert.doesNotMatch(terminalText, /PTY bridge ready|sqlite.*synchronized|orchestrator initialized/);
    assert.equal(fetchCalls, 0, 'offline terminal view must not request backend or provider execution');

    await React.act(async () => root.unmount());
  } finally {
    globalThis.fetch = previousFetch;
    dom.window.close();
    for (const key of globals) {
      const descriptor = previous.get(key);
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as Record<string, unknown>)[key];
    }
    delete (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT;
  }

  const settingsSource = await readFile(path.join(appRoot, 'src/features/settings/SettingsModal.tsx'), 'utf8');
  assert.match(settingsSource, /runtimeInstance\.runtimeKind === 'offline-fixture'/);
});
