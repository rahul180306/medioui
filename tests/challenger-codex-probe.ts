/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER PROBE
 * Milestone 4 (Task F) - Independent Codex Re-Audit Reproduction & Stress Test
 *
 * Objectives:
 * 1. Independent before/after reproduction of exact Codex bypass probes:
 *    - Probe 1: window.fetch('https://external.invalid/file.js')
 *    - Probe 2: window.fetch('/api/private.js')
 *    Assert both return HTTP 403 CONTROLLED_DEMONSTRATION_MODE and native fetch spy is invoked ZERO times.
 * 2. Probe additional adversarial vectors:
 *    - External .css, .png, .svg
 *    - Mutating methods POST, PUT, DELETE on static assets
 *    - Directory traversal (/assets/..%2fapi/private.js, double-encoded, backslashes)
 *    - Alternate transports (XMLHttpRequest, EventSource, WebSocket, sendBeacon)
 */

import assert from 'node:assert/strict';
import {
  installNetworkGuard,
  isPermittedRequest,
} from '../mediobot-ui-refinement/src/runtime/networkGuard.ts';
import {
  USE_OFFLINE_FIXTURE,
  runtimeInstance,
} from '../mediobot-ui-refinement/src/runtime/client.ts';

const SIMULATED_ORIGIN = 'http://localhost:5173';

interface ProbeReport {
  name: string;
  category: string;
  expectedStatus: number | string;
  actualStatus: number | string;
  nativeSpyInvocations: number;
  passed: boolean;
  detail: string;
}

const probeResults: ProbeReport[] = [];

console.log('='.repeat(80));
console.log('CHALLENGER 1: EMPIRICAL CODEX RE-AUDIT PROBE HARNESS');
console.log('Target: medioui/mediobot-ui-refinement/src/runtime/networkGuard.ts');
console.log('='.repeat(80));

// ─────────────────────────────────────────────────────────────────────────────
// PART 0: EMPIRICAL "BEFORE" DEMONSTRATION (Previous Vulnerable Logic)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- PART 0: Before Remediation (Demonstrating Original Codex Flaw) ---');

function legacyVulnerableGuard(url: string): boolean {
  // Exact regex/condition identified in Codex Re-Audit Report (Finding 1):
  // "allows any URL ending .js, .css, .html, .png, .svg, .ico, or containing /@vite/, /@fs/, node_modules, before checking origin."
  const isAsset =
    /\.(js|css|html|png|svg|ico)$/i.test(url) ||
    url.includes('/@vite/') ||
    url.includes('/@fs/') ||
    url.includes('node_modules');
  return isAsset; // if true, previously forwarded directly to native fetch!
}

const legacyProbe1Bypassed = legacyVulnerableGuard('https://external.invalid/file.js');
const legacyProbe2Bypassed = legacyVulnerableGuard('/api/private.js');
const legacyCssBypassed = legacyVulnerableGuard('https://evil.com/style.css');

console.log(`[BEFORE] 'https://external.invalid/file.js' matched asset regex: ${legacyProbe1Bypassed} (VULNERABLE BYPASS)`);
console.log(`[BEFORE] '/api/private.js' matched asset regex: ${legacyProbe2Bypassed} (VULNERABLE BYPASS)`);
console.log(`[BEFORE] 'https://evil.com/style.css' matched asset regex: ${legacyCssBypassed} (VULNERABLE BYPASS)`);

assert.equal(legacyProbe1Bypassed, true, 'Original flawed logic should have permitted external .js');
assert.equal(legacyProbe2Bypassed, true, 'Original flawed logic should have permitted /api/private.js');
console.log('[BEFORE] Original vulnerability successfully reproduced and confirmed.');

// ─────────────────────────────────────────────────────────────────────────────
// PART 1: AFTER REMEDIATION (Corrected Production networkGuard.ts)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- PART 1: After Remediation (Production networkGuard.ts Verification) ---');

// Set up spy telemetry
let nativeFetchCallCount = 0;
const nativeFetchCalls: Array<{ url: string; method: string }> = [];

const nativeFetchSpy = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  nativeFetchCallCount++;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const method = init?.method || (input && typeof input === 'object' && 'method' in input ? (input as any).method : 'GET');
  nativeFetchCalls.push({ url, method });

  return new Response(JSON.stringify({ ok: true, source: 'nativeFetchMock' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Set up XHR spy telemetry
let nativeXhrCallCount = 0;
const nativeXhrCalls: string[] = [];

class MockBaseXHR extends EventTarget {
  status = 0;
  statusText = '';
  readyState = 0;
  responseText = '';
  response: any = null;
  private _url = '';
  private _method = 'GET';

  open(method: string, url: string | URL): void {
    this._method = method;
    this._url = typeof url === 'string' ? url : url.toString();
    this.readyState = 1;
  }

  send(_body?: any): void {
    nativeXhrCallCount++;
    nativeXhrCalls.push(`${this._method} ${this._url}`);
  }
}

// Set up Beacon spy telemetry
let nativeBeaconCallCount = 0;
const mockNavigator: any = {
  sendBeacon: (url: string | URL, _data?: any): boolean => {
    nativeBeaconCallCount++;
    return true;
  },
};

// Set up EventSource spy telemetry
let nativeEventSourceCallCount = 0;
class MockBaseEventSource {
  constructor(_url: string | URL) {
    nativeEventSourceCallCount++;
  }
}

// Set up WebSocket spy telemetry
let nativeWebSocketCallCount = 0;
class MockBaseWebSocket {
  constructor(_url: string | URL) {
    nativeWebSocketCallCount++;
  }
}

// Build isolated mock window scope
const mockWindow: any = {
  location: {
    origin: SIMULATED_ORIGIN,
    href: `${SIMULATED_ORIGIN}/`,
    hostname: 'localhost',
    port: '5173',
    protocol: 'http:',
  },
  fetch: nativeFetchSpy,
  XMLHttpRequest: MockBaseXHR,
  EventSource: MockBaseEventSource,
  WebSocket: MockBaseWebSocket,
  navigator: mockNavigator,
};

// Install the production guard
installNetworkGuard(mockWindow, { defaultOrigin: SIMULATED_ORIGIN, isDev: false });

async function runFetchProbe(
  name: string,
  category: string,
  url: string,
  init?: RequestInit,
  expectedStatus: number = 403,
  expectBlockedCode: boolean = true
): Promise<void> {
  const startSpyCalls = nativeFetchCallCount;
  const res = await mockWindow.fetch(url, init);
  const spyDelta = nativeFetchCallCount - startSpyCalls;
  let codeMatch = true;
  let bodyJson: any = null;

  try {
    bodyJson = await res.json();
    if (expectBlockedCode) {
      codeMatch = bodyJson?.error?.code === 'CONTROLLED_DEMONSTRATION_MODE';
    }
  } catch {
    if (expectBlockedCode) codeMatch = false;
  }

  const passed =
    res.status === expectedStatus &&
    (expectedStatus === 403 ? spyDelta === 0 : spyDelta === 1) &&
    codeMatch;

  probeResults.push({
    name,
    category,
    expectedStatus,
    actualStatus: res.status,
    nativeSpyInvocations: spyDelta,
    passed,
    detail: bodyJson?.error?.code || (res.status === 200 ? '200_OK_FORWARDED' : 'UNEXPECTED'),
  });

  console.log(
    `[${passed ? 'PASS' : 'FAIL'}] ${name}: status=${res.status} (expected ${expectedStatus}), nativeFetchCalls=${spyDelta}, code=${bodyJson?.error?.code || 'N/A'}`
  );

  assert.equal(res.status, expectedStatus, `${name}: status must be ${expectedStatus}`);
  if (expectedStatus === 403) {
    assert.equal(spyDelta, 0, `${name}: native fetch spy must NOT be called on blocked request`);
    if (expectBlockedCode) {
      assert.equal(
        bodyJson?.error?.code,
        'CONTROLLED_DEMONSTRATION_MODE',
        `${name}: error code must be CONTROLLED_DEMONSTRATION_MODE`
      );
    }
  } else {
    assert.equal(spyDelta, 1, `${name}: native fetch spy MUST be called on authorized request`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBE SUITE EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n--- Objective 1: Exact Original Codex Re-Audit Probes ---');
  // Probe 1: window.fetch('https://external.invalid/file.js')
  await runFetchProbe(
    'Codex Probe 1: External .js URL',
    'Original Codex Probes',
    'https://external.invalid/file.js',
    undefined,
    403,
    true
  );

  // Probe 2: window.fetch('/api/private.js')
  await runFetchProbe(
    'Codex Probe 2: Same-Origin /api/private.js',
    'Original Codex Probes',
    '/api/private.js',
    undefined,
    403,
    true
  );

  console.log('\n--- Objective 2A: Additional Adversarial External Asset Extensions ---');
  await runFetchProbe(
    'Probe 2A.1: External .css',
    'External Assets',
    'https://external.invalid/styles/theme.css',
    undefined,
    403,
    true
  );
  await runFetchProbe(
    'Probe 2A.2: External .png',
    'External Assets',
    'https://attacker.com/telemetry.png',
    undefined,
    403,
    true
  );
  await runFetchProbe(
    'Probe 2A.3: External .svg',
    'External Assets',
    'https://attacker.com/vector.svg',
    undefined,
    403,
    true
  );
  await runFetchProbe(
    'Probe 2A.4: External .ico',
    'External Assets',
    'https://external.invalid/favicon.ico',
    undefined,
    403,
    true
  );
  await runFetchProbe(
    'Probe 2A.5: External .mjs',
    'External Assets',
    'https://cdn.jsdelivr.net/npm/malicious@1.0.0/index.mjs',
    undefined,
    403,
    true
  );

  console.log('\n--- Objective 2B: Mutating Methods on Static Asset Paths ---');
  await runFetchProbe(
    'Probe 2B.1: POST to /assets/main.js',
    'Mutating Methods',
    '/assets/main.js',
    { method: 'POST', body: JSON.stringify({ exfil: 'secret' }) },
    403,
    true
  );
  await runFetchProbe(
    'Probe 2B.2: PUT to /assets/main.css',
    'Mutating Methods',
    '/assets/main.css',
    { method: 'PUT', body: 'body { color: red; }' },
    403,
    true
  );
  await runFetchProbe(
    'Probe 2B.3: DELETE to /assets/main.js',
    'Mutating Methods',
    '/assets/main.js',
    { method: 'DELETE' },
    403,
    true
  );
  await runFetchProbe(
    'Probe 2B.4: PATCH to /index.html',
    'Mutating Methods',
    '/index.html',
    { method: 'PATCH', body: '...' },
    403,
    true
  );

  console.log('\n--- Objective 2C: Directory Traversal and Encoding Vectors ---');
  await runFetchProbe(
    'Probe 2C.1: Percent-encoded /assets/..%2fapi/private.js',
    'Directory Traversal',
    '/assets/..%2fapi/private.js',
    undefined,
    403,
    true
  );
  await runFetchProbe(
    'Probe 2C.2: Double-percent-encoded /assets/%252e%252e/api/private.js',
    'Directory Traversal',
    '/assets/%252e%252e/api/private.js',
    undefined,
    403,
    true
  );
  await runFetchProbe(
    'Probe 2C.3: Backslash traversal /assets/..\\api\\private.js',
    'Directory Traversal',
    '/assets/..\\api\\private.js',
    undefined,
    403,
    true
  );
  await runFetchProbe(
    'Probe 2C.4: Dot-dot path /assets/../../api/terminal/execute',
    'Directory Traversal',
    '/assets/../../api/terminal/execute',
    undefined,
    403,
    true
  );
  await runFetchProbe(
    'Probe 2C.5: Null-byte traversal /assets/main.js%00/api/private.js',
    'Directory Traversal',
    '/assets/main.js%00/api/private.js',
    undefined,
    403,
    true
  );
  await runFetchProbe(
    'Probe 2C.6: Query string API smuggling /assets/main.js?next=/api/execute',
    'Directory Traversal',
    '/assets/main.js?next=/api/execute',
    undefined,
    403,
    true
  );

  console.log('\n--- Objective 2D: Alternate Transports (XHR, EventSource, WebSocket, Beacon) ---');
  // 1. XMLHttpRequest
  const startXhrCalls = nativeXhrCallCount;
  const xhr1 = new mockWindow.XMLHttpRequest();
  xhr1.open('GET', 'https://external.invalid/file.js');
  xhr1.send();
  assert.equal(xhr1.status, 403, 'XHR to external .js must return 403');
  assert.equal(nativeXhrCallCount, startXhrCalls, 'Native XHR must NOT be called for external .js');

  const xhr2 = new mockWindow.XMLHttpRequest();
  xhr2.open('GET', '/api/private.js');
  xhr2.send();
  assert.equal(xhr2.status, 403, 'XHR to /api/private.js must return 403');
  assert.equal(nativeXhrCallCount, startXhrCalls, 'Native XHR must NOT be called for /api/private.js');

  const xhr3 = new mockWindow.XMLHttpRequest();
  xhr3.open('POST', '/assets/main.js');
  xhr3.send('payload');
  assert.equal(xhr3.status, 403, 'XHR POST to static asset must return 403');
  assert.equal(nativeXhrCallCount, startXhrCalls, 'Native XHR must NOT be called for POST');
  console.log('[PASS] XMLHttpRequest: All 3 adversarial vectors blocked with status 403 and 0 native calls');

  // 2. EventSource
  const startEventSourceCalls = nativeEventSourceCallCount;
  let es1Blocked = false;
  try {
    new mockWindow.EventSource('/api/events.js');
  } catch (err: any) {
    es1Blocked = err.name === 'SecurityError';
  }
  assert.equal(es1Blocked, true, 'EventSource to /api/ must throw SecurityError');

  let es2Blocked = false;
  try {
    new mockWindow.EventSource('https://external.invalid/stream');
  } catch (err: any) {
    es2Blocked = err.name === 'SecurityError';
  }
  assert.equal(es2Blocked, true, 'EventSource to external URL must throw SecurityError');
  assert.equal(nativeEventSourceCallCount, startEventSourceCalls, 'Native EventSource must NOT be called');
  console.log('[PASS] EventSource: Both /api/ and external streams throw SecurityError with 0 native calls');

  // 3. WebSocket
  const startWsCalls = nativeWebSocketCallCount;
  let ws1Blocked = false;
  try {
    new mockWindow.WebSocket('ws://localhost:5173/ws');
  } catch (err: any) {
    ws1Blocked = err.name === 'SecurityError';
  }
  assert.equal(ws1Blocked, true, 'WebSocket must throw SecurityError in controlled demonstration mode');

  let ws2Blocked = false;
  try {
    new mockWindow.WebSocket('wss://external.com/socket');
  } catch (err: any) {
    ws2Blocked = err.name === 'SecurityError';
  }
  assert.equal(ws2Blocked, true, 'External WebSocket must throw SecurityError');
  assert.equal(nativeWebSocketCallCount, startWsCalls, 'Native WebSocket must NOT be called');
  console.log('[PASS] WebSocket: External and local WebSockets throw SecurityError with 0 native calls');

  // 4. sendBeacon
  const startBeaconCalls = nativeBeaconCallCount;
  const beacon1 = mockWindow.navigator.sendBeacon('/api/telemetry', 'data');
  assert.equal(beacon1, false, 'sendBeacon to /api/ must return false');

  const beacon2 = mockWindow.navigator.sendBeacon('https://analytics.com/collect', 'data');
  assert.equal(beacon2, false, 'sendBeacon to external URL must return false');
  assert.equal(nativeBeaconCallCount, startBeaconCalls, 'Native sendBeacon must NOT be called');
  console.log('[PASS] navigator.sendBeacon: Unauthorized beacons return false with 0 native calls');

  console.log('\n--- Objective 2E: Legitimate Baseline Static Asset Requests (Positive Controls) ---');
  await runFetchProbe(
    'Positive Control 1: GET /assets/index-Ch1sRHyb.js',
    'Legitimate Static Asset',
    '/assets/index-Ch1sRHyb.js',
    { method: 'GET' },
    200,
    false
  );
  await runFetchProbe(
    'Positive Control 2: GET /assets/index-CNHf2NYd.css',
    'Legitimate Static Asset',
    '/assets/index-CNHf2NYd.css',
    { method: 'GET' },
    200,
    false
  );
  await runFetchProbe(
    'Positive Control 3: GET /',
    'Legitimate Document Root',
    '/',
    { method: 'GET' },
    200,
    false
  );
  await runFetchProbe(
    'Positive Control 4: GET /index.html',
    'Legitimate Document Root',
    '/index.html',
    { method: 'GET' },
    200,
    false
  );

  console.log('\n--- Objective 2F: Client Runtime Integration Check ---');
  console.log(`USE_OFFLINE_FIXTURE flag: ${USE_OFFLINE_FIXTURE}`);
  assert.equal(USE_OFFLINE_FIXTURE, true, 'USE_OFFLINE_FIXTURE must be true in client.ts');
  assert.ok(runtimeInstance, 'runtimeInstance must be instantiated in client.ts');
  console.log('[PASS] client.ts verified: offline fixture enabled and runtime active');

  console.log('\n' + '='.repeat(80));
  console.log('CHALLENGER PROBE SUMMARY: ALL 23 ADVERSARIAL & POSITIVE PROBES PASSED!');
  console.log(`Total probes executed: ${probeResults.length}`);
  console.log(`Blocked probes returning 403: ${probeResults.filter((p) => p.expectedStatus === 403).length}`);
  console.log(`Zero native fetch calls on blocked probes: VERIFIED`);
  console.log(`Alternate transports (XHR, EventSource, WebSocket, sendBeacon): VERIFIED FAIL-CLOSED`);
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('\n[FATAL PROBE FAILURE]:', err);
  process.exit(1);
});
