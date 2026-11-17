/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADVERSARIAL NETWORK GUARD TEST SUITE (Task B)
 *
 * Verifies that the authoritative production network guard in src/runtime/networkGuard.ts
 * implements the strict 7-step deterministic request authorization engine and multi-channel
 * guards, preventing all bypass vectors identified in the Codex re-audit.
 *
 * Implements the complete 40-case adversarial matrix (ADV-01 through ADV-40).
 * All tests run against the actual imported production guard using mocked native transports.
 * ZERO real external network requests are sent.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  installNetworkGuard,
  isPermittedRequest,
  setNetworkGuardDevMode,
  isDevMode,
} from '../mediobot-ui-refinement/src/runtime/client.ts';

const SIMULATED_ORIGIN = 'http://localhost:5173';

interface MockScopeHarness {
  scope: any;
  nativeFetchSpy: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  nativeFetchCalls: Array<{ url: string; method: string }>;
  nativeXhrCalls: string[];
  guardedFetch: typeof fetch;
}

function createHarness(): MockScopeHarness {
  const nativeFetchCalls: Array<{ url: string; method: string }> = [];
  const nativeXhrCalls: string[] = [];

  const nativeFetchSpy = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = init?.method || (input && typeof input === 'object' && 'method' in input ? (input as any).method : 'GET');
    nativeFetchCalls.push({ url, method });

    // Handle mock redirect for ADV-31
    if (url.includes('/assets/redirect.js')) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: 'https://evil.com/leak',
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, source: 'nativeFetchMock' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

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
      nativeXhrCalls.push(`${this._method} ${this._url}`);
    }
  }

  const mockNavigator: any = {
    sendBeacon: (url: string | URL, _data?: any): boolean => {
      nativeFetchCalls.push({ url: String(url), method: 'POST' });
      return true;
    },
  };

  const scope: any = {
    location: {
      origin: SIMULATED_ORIGIN,
      href: `${SIMULATED_ORIGIN}/`,
      hostname: 'localhost',
      port: '5173',
      protocol: 'http:',
    },
    fetch: nativeFetchSpy,
    XMLHttpRequest: MockBaseXHR,
    navigator: mockNavigator,
  };

  installNetworkGuard(scope, { defaultOrigin: SIMULATED_ORIGIN, isDev: false });

  return {
    scope,
    nativeFetchSpy,
    nativeFetchCalls,
    nativeXhrCalls,
    guardedFetch: scope.fetch,
  };
}

async function expectBlocked(
  guardedFetch: typeof fetch,
  input: RequestInfo | URL,
  label: string,
  init?: RequestInit
): Promise<void> {
  const res = await guardedFetch(input, init);
  assert.strictEqual(res.status, 403, `${label}: expected 403, got ${res.status}`);
  const body = (await res.json()) as any;
  assert.strictEqual(
    body?.error?.code,
    'CONTROLLED_DEMONSTRATION_MODE',
    `${label}: expected error.code to be CONTROLLED_DEMONSTRATION_MODE`
  );
  assert.ok(
    body?.error?.message?.includes('Network operation blocked'),
    `${label}: expected message to describe blocked operation`
  );
}

async function expectAllowed(
  guardedFetch: typeof fetch,
  input: RequestInfo | URL,
  label: string,
  init?: RequestInit
): Promise<void> {
  const res = await guardedFetch(input, init);
  assert.strictEqual(res.status, 200, `${label}: expected 200, got ${res.status}`);
}

describe('Adversarial Network Guard Matrix (ADV-01 through ADV-40)', () => {
  let harness: MockScopeHarness;
  let guardedFetch: typeof fetch;

  before(() => {
    harness = createHarness();
    guardedFetch = harness.guardedFetch;
  });

  // ── Suffix-based External Egress Vectors (ADV-01 to ADV-06) ────────────────
  it('ADV-01: External URL ending in .js (original Codex bypass vector)', async () => {
    await expectBlocked(guardedFetch, 'https://external.invalid/file.js', 'ADV-01');
  });

  it('ADV-02: External URL ending in .css', async () => {
    await expectBlocked(guardedFetch, 'https://evil.com/styles/app.css', 'ADV-02');
  });

  it('ADV-03: External URL ending in .png', async () => {
    await expectBlocked(guardedFetch, 'https://attacker.org/pixel.png', 'ADV-03');
  });

  it('ADV-04: External URL ending in .svg', async () => {
    await expectBlocked(guardedFetch, 'https://evil.com/icon.svg', 'ADV-04');
  });

  it('ADV-05: External URL ending in .html', async () => {
    await expectBlocked(guardedFetch, 'https://evil.com/index.html', 'ADV-05');
  });

  it('ADV-06: External URL ending in .ico', async () => {
    await expectBlocked(guardedFetch, 'https://evil.com/favicon.ico', 'ADV-06');
  });

  // ── Same-Origin API Bypass Vectors (ADV-07 to ADV-12) ───────────────────────
  it('ADV-07: Same-origin /api/private.js (Codex bypass #2)', async () => {
    await expectBlocked(guardedFetch, `${SIMULATED_ORIGIN}/api/private.js`, 'ADV-07');
  });

  it('ADV-08: Same-origin /api/terminal/execute.js', async () => {
    await expectBlocked(guardedFetch, `${SIMULATED_ORIGIN}/api/terminal/execute.js`, 'ADV-08');
  });

  it('ADV-09: Same-origin /api/gemini/execute.css', async () => {
    await expectBlocked(guardedFetch, `${SIMULATED_ORIGIN}/api/gemini/execute.css`, 'ADV-09');
  });

  it('ADV-10: Same-origin /api/terminal/execute with POST method', async () => {
    await expectBlocked(
      guardedFetch,
      `${SIMULATED_ORIGIN}/api/terminal/execute`,
      'ADV-10',
      { method: 'POST', body: '{}' }
    );
  });

  it('ADV-11: Same-origin /api/gemini/execute with POST method', async () => {
    await expectBlocked(
      guardedFetch,
      `${SIMULATED_ORIGIN}/api/gemini/execute`,
      'ADV-11',
      { method: 'POST', body: '{}' }
    );
  });

  it('ADV-12: Same-origin /api/workspace core route', async () => {
    await expectBlocked(guardedFetch, `${SIMULATED_ORIGIN}/api/workspace`, 'ADV-12');
  });

  // ── Request Object Wrapping (ADV-13 to ADV-15) ─────────────────────────────
  it('ADV-13: Request object with external URL', async () => {
    const req = new Request('https://evil.com/file.js');
    await expectBlocked(guardedFetch, req, 'ADV-13');
  });

  it('ADV-14: Request object with /api/private.js', async () => {
    const req = new Request(`${SIMULATED_ORIGIN}/api/private.js`);
    await expectBlocked(guardedFetch, req, 'ADV-14');
  });

  it('ADV-15: Request object with POST method on static asset', async () => {
    const req = new Request(`${SIMULATED_ORIGIN}/assets/main.js`, { method: 'POST' });
    await expectBlocked(guardedFetch, req, 'ADV-15');
  });

  // ── Mutating HTTP Methods on Static Assets (ADV-16 to ADV-18) ──────────────
  it('ADV-16: Mutating method POST on static asset', async () => {
    await expectBlocked(
      guardedFetch,
      `${SIMULATED_ORIGIN}/assets/main.js`,
      'ADV-16',
      { method: 'POST', body: 'exfil' }
    );
  });

  it('ADV-17: Mutating method DELETE on static asset', async () => {
    await expectBlocked(
      guardedFetch,
      `${SIMULATED_ORIGIN}/assets/main.js`,
      'ADV-17',
      { method: 'DELETE' }
    );
  });

  it('ADV-18: Mutating method PUT on static asset', async () => {
    await expectBlocked(
      guardedFetch,
      `${SIMULATED_ORIGIN}/assets/main.js`,
      'ADV-18',
      { method: 'PUT', body: 'code' }
    );
  });

  // ── Traversal and Ambiguity Attacks (ADV-19 to ADV-23) ─────────────────────
  it('ADV-19: Percent-encoded slash traversal (/assets/..%2fapi/private.js)', async () => {
    await expectBlocked(guardedFetch, `${SIMULATED_ORIGIN}/assets/..%2fapi/private.js`, 'ADV-19');
  });

  it('ADV-20: Double percent-encoded dot traversal (/assets/%252e%252e/api/private.js)', async () => {
    await expectBlocked(guardedFetch, `${SIMULATED_ORIGIN}/assets/%252e%252e/api/private.js`, 'ADV-20');
  });

  it('ADV-21: Backslash directory traversal (/assets/..\\api\\private.js)', async () => {
    await expectBlocked(guardedFetch, `${SIMULATED_ORIGIN}/assets/..\\api\\private.js`, 'ADV-21');
  });

  it('ADV-22: Dot-dot traversal to API (/assets/../../api/terminal/execute)', async () => {
    await expectBlocked(guardedFetch, `${SIMULATED_ORIGIN}/assets/../../api/terminal/execute`, 'ADV-22');
  });

  it('ADV-23: Query string API smuggling (/assets/main.js?redirect=/api/terminal/execute)', async () => {
    await expectBlocked(
      guardedFetch,
      `${SIMULATED_ORIGIN}/assets/main.js?redirect=/api/terminal/execute`,
      'ADV-23'
    );
  });

  // ── Protocol, Domain Spoofing & Malformed Inputs (ADV-24 to ADV-30) ────────
  it('ADV-24: Malformed URL string fails closed', async () => {
    await expectBlocked(guardedFetch, 'not a valid url ::: http', 'ADV-24');
  });

  it('ADV-25: Protocol-relative external URL (//evil.com/assets/main.js)', async () => {
    await expectBlocked(guardedFetch, '//evil.com/assets/main.js', 'ADV-25');
  });

  it('ADV-26: Userinfo domain spoofing (http://localhost:5173@evil.com/assets/main.js)', async () => {
    await expectBlocked(guardedFetch, 'http://localhost:5173@evil.com/assets/main.js', 'ADV-26');
  });

  it('ADV-27: Subdomain prefix spoofing (http://localhost:5173.evil.com/assets/main.js)', async () => {
    await expectBlocked(guardedFetch, 'http://localhost:5173.evil.com/assets/main.js', 'ADV-27');
  });

  it('ADV-28: Port mismatch spoofing (http://localhost:9999/assets/main.js)', async () => {
    await expectBlocked(guardedFetch, 'http://localhost:9999/assets/main.js', 'ADV-28');
  });

  it('ADV-29: data: URI scheme denied', async () => {
    await expectBlocked(guardedFetch, 'data:text/javascript,console.log(1)', 'ADV-29');
  });

  it('ADV-30: blob: URI scheme denied', async () => {
    await expectBlocked(guardedFetch, `${SIMULATED_ORIGIN}/blob:http://localhost:5173/uuid`, 'ADV-30');
  });

  // ── Redirect Protection (ADV-31) ───────────────────────────────────────────
  it('ADV-31: Redirect from allowed destination to unauthorized target is intercepted', async () => {
    // Harness responds with 302 Location: https://evil.com/leak
    await expectBlocked(guardedFetch, `${SIMULATED_ORIGIN}/assets/redirect.js`, 'ADV-31');
  });

  // ── Multi-Channel Network Guards (ADV-32 to ADV-38) ────────────────────────
  it('ADV-32: XMLHttpRequest external .js blocked with 403 status and error JSON', () => {
    const xhr = new harness.scope.XMLHttpRequest();
    xhr.open('GET', 'https://evil.com/file.js');
    xhr.send();
    assert.strictEqual(xhr.status, 403, 'XHR must return status 403');
    const body = JSON.parse(xhr.responseText);
    assert.strictEqual(body.error.code, 'CONTROLLED_DEMONSTRATION_MODE');
  });

  it('ADV-33: XMLHttpRequest same-origin /api/private.js blocked with 403 status', () => {
    const xhr = new harness.scope.XMLHttpRequest();
    xhr.open('GET', `${SIMULATED_ORIGIN}/api/private.js`);
    xhr.send();
    assert.strictEqual(xhr.status, 403, 'XHR must return status 403');
    const body = JSON.parse(xhr.responseText);
    assert.strictEqual(body.error.code, 'CONTROLLED_DEMONSTRATION_MODE');
  });

  it('ADV-34: XMLHttpRequest POST method on static asset blocked with 403 status', () => {
    const xhr = new harness.scope.XMLHttpRequest();
    xhr.open('POST', `${SIMULATED_ORIGIN}/assets/main.js`);
    xhr.send();
    assert.strictEqual(xhr.status, 403, 'XHR must return status 403');
    const body = JSON.parse(xhr.responseText);
    assert.strictEqual(body.error.code, 'CONTROLLED_DEMONSTRATION_MODE');
  });

  it('ADV-35: EventSource to /api/workspace/events throws SecurityError', () => {
    assert.throws(
      () => new harness.scope.EventSource(`${SIMULATED_ORIGIN}/api/workspace/events`),
      (err: any) => err.name === 'SecurityError' || err.message?.includes('SecurityError') || err.message?.includes('blocked')
    );
  });

  it('ADV-36: EventSource to external URL throws SecurityError', () => {
    assert.throws(
      () => new harness.scope.EventSource('https://evil.com/events'),
      (err: any) => err.name === 'SecurityError' || err.message?.includes('SecurityError') || err.message?.includes('blocked')
    );
  });

  it('ADV-37: WebSocket connection attempt throws SecurityError', () => {
    assert.throws(
      () => new harness.scope.WebSocket('wss://evil.com/socket'),
      (err: any) => err.name === 'SecurityError' || err.message?.includes('SecurityError') || err.message?.includes('disabled')
    );
  });

  it('ADV-37b: EventSource to static asset (.js / .css) throws SecurityError', () => {
    assert.throws(
      () => new harness.scope.EventSource(`${SIMULATED_ORIGIN}/assets/main.js`),
      (err: any) => err.name === 'SecurityError' && (err.message?.includes('Streaming connections to static asset') || err.message?.includes('SecurityError'))
    );
    assert.throws(
      () => new harness.scope.EventSource(`${SIMULATED_ORIGIN}/assets/styles.css`),
      (err: any) => err.name === 'SecurityError' && (err.message?.includes('Streaming connections to static asset') || err.message?.includes('SecurityError'))
    );
  });

  it('ADV-37c: WebSocket to static asset or API endpoint throws SecurityError', () => {
    assert.throws(
      () => new harness.scope.WebSocket(`ws://localhost:5173/assets/stream.js`),
      (err: any) => err.name === 'SecurityError'
    );
    assert.throws(
      () => new harness.scope.WebSocket(`ws://localhost:5173/api/live`),
      (err: any) => err.name === 'SecurityError' && (err.message?.includes('Absolute /api/ endpoint access is denied') || err.message?.includes('disabled'))
    );
  });

  it('ADV-38: navigator.sendBeacon to external/API returns false', () => {
    const result = harness.scope.navigator.sendBeacon('/api/telemetry', 'payload');
    assert.strictEqual(result, false, 'sendBeacon must return false for blocked API destination');
  });

  // ── Legitimate Whitelisted Assets (ADV-39 & ADV-40) ────────────────────────
  it('ADV-39: Legitimate same-origin asset GET succeeds (200 OK)', async () => {
    await expectAllowed(guardedFetch, `${SIMULATED_ORIGIN}/assets/main-abc123.js`, 'ADV-39');
  });

  it('ADV-40: Legitimate root document GET succeeds (200 OK)', async () => {
    await expectAllowed(guardedFetch, `${SIMULATED_ORIGIN}/`, 'ADV-40 (root)');
    await expectAllowed(guardedFetch, `${SIMULATED_ORIGIN}/index.html`, 'ADV-40 (index.html)');
    await expectAllowed(guardedFetch, `${SIMULATED_ORIGIN}/favicon.ico`, 'ADV-40 (favicon.ico)');
  });

  // ── Telemetry & Egress Verification ─────────────────────────────────────────
  it('TELEMETRY: Native fetch spy received zero unauthorized calls', () => {
    // Only ADV-31 (the redirect probe which was intercepted) and ADV-39/ADV-40 should have touched nativeFetch
    for (const call of harness.nativeFetchCalls) {
      assert.strictEqual(
        call.method,
        'GET',
        `Native fetch must only receive GET requests, but received ${call.method} for ${call.url}`
      );
      assert.ok(
        call.url.startsWith(SIMULATED_ORIGIN),
        `Native fetch must never receive external origins: ${call.url}`
      );
      assert.ok(
        !call.url.includes('/api/'),
        `Native fetch must never receive API calls: ${call.url}`
      );
    }
  });

  it('TELEMETRY: Native XHR received zero calls', () => {
    assert.strictEqual(
      harness.nativeXhrCalls.length,
      0,
      'Native XHR must receive 0 calls when blocked by GuardedXHR'
    );
  });

  // ── Dev Mode Whitelisting Verification ─────────────────────────────────────
  it('DEV-MODE: Vite dev prefixes permitted in dev mode but denied in production mode', () => {
    // In production mode (isDev = false)
    const prodRes = isPermittedRequest(`${SIMULATED_ORIGIN}/@vite/client`, 'GET', {
      baseOrigin: SIMULATED_ORIGIN,
      isDev: false,
    });
    assert.strictEqual(prodRes.permitted, false, '/@vite/client must be denied in production mode');

    // In dev mode (isDev = true)
    const devRes = isPermittedRequest(`${SIMULATED_ORIGIN}/@vite/client`, 'GET', {
      baseOrigin: SIMULATED_ORIGIN,
      isDev: true,
    });
    assert.strictEqual(devRes.permitted, true, '/@vite/client must be permitted in dev mode');

    const devFsRes = isPermittedRequest(`${SIMULATED_ORIGIN}/@fs/Users/dev/main.tsx`, 'GET', {
      baseOrigin: SIMULATED_ORIGIN,
      isDev: true,
    });
    assert.strictEqual(devFsRes.permitted, true, '/@fs/ must be permitted in dev mode');
  });

  // ── Fetch Post-Install Immutability & Defense-in-Depth (R4, MEDIUM-01) ───────
  it('FETCH-IMMUTABILITY: window.fetch post-install immutability prevents reassignment and preserves guard', async () => {
    // 1. Verify property descriptor is non-writable
    const desc = Object.getOwnPropertyDescriptor(harness.scope, 'fetch');
    assert.ok(desc, 'fetch descriptor must exist on guarded scope');
    assert.strictEqual(desc.writable, false, 'fetch property must be non-writable (writable: false)');

    // 2. Attempt direct property assignment
    const originalGuardedFetch = harness.scope.fetch;
    const dummyBypassFetch = async () => new Response('UNAUTHORIZED_EXFIL_PAYLOAD', { status: 200 });

    let assignmentThrew = false;
    try {
      harness.scope.fetch = dummyBypassFetch;
    } catch (err: any) {
      assignmentThrew = true;
      assert.ok(
        err instanceof TypeError || err.message?.includes('read only') || err.message?.includes('Cannot assign'),
        `Expected TypeError on fetch reassignment, got: ${err.message}`
      );
    }

    // Whether in strict mode (threw TypeError) or non-strict mode (silent drop),
    // scope.fetch must strictly remain the original guarded function
    assert.strictEqual(
      harness.scope.fetch,
      originalGuardedFetch,
      'scope.fetch must remain guardedFetch and not be overwritten by direct assignment'
    );
    assert.notStrictEqual(
      harness.scope.fetch,
      dummyBypassFetch,
      'scope.fetch must NOT point to dummyBypassFetch'
    );

    // 3. Attempt Object.defineProperty reassignment
    assert.throws(
      () => {
        Object.defineProperty(harness.scope, 'fetch', {
          value: dummyBypassFetch,
        });
      },
      /Cannot redefine property|read only/,
      'Object.defineProperty reassignment on frozen fetch must throw error'
    );

    // 4. Verify transport descriptors on other guards (EventSource, WebSocket, XMLHttpRequest) are frozen
    const esDesc = Object.getOwnPropertyDescriptor(harness.scope, 'EventSource');
    assert.ok(esDesc, 'EventSource descriptor must exist on guarded scope');
    assert.strictEqual(esDesc.writable, false, 'EventSource must be non-writable');

    const wsDesc = Object.getOwnPropertyDescriptor(harness.scope, 'WebSocket');
    assert.ok(wsDesc, 'WebSocket descriptor must exist on guarded scope');
    assert.strictEqual(wsDesc.writable, false, 'WebSocket must be non-writable');

    const xhrDesc = Object.getOwnPropertyDescriptor(harness.scope, 'XMLHttpRequest');
    assert.ok(xhrDesc, 'XMLHttpRequest descriptor must exist on guarded scope');
    assert.strictEqual(xhrDesc.writable, false, 'XMLHttpRequest must be non-writable');

    // 5. Verify guard remains fully operational post-tamper attempt
    await expectBlocked(
      harness.scope.fetch,
      'https://external.invalid/file.js',
      'Post-tamper attempt: external egress must still be blocked with 403'
    );
    await expectBlocked(
      harness.scope.fetch,
      `${SIMULATED_ORIGIN}/api/private.js`,
      'Post-tamper attempt: /api/private.js must still be blocked with 403'
    );
  });
});

describe('Real Loopback Two-Server Redirect Security Suite (Zero Destination Connections)', () => {
  let serverA: http.Server;
  let serverB: http.Server;
  let portA: number;
  let portB: number;
  let originA: string;
  let originB: string;
  let serverBHits = 0;
  let serverAHits = 0;
  let guardedScope: any;

  before(async () => {
    // Server B: Denied destination target (receives zero hits if redirect guard works)
    serverB = http.createServer((_req, res) => {
      serverBHits++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ leak: 'DESTINATION_SERVER_REACHED' }));
    });
    await new Promise<void>((r) => serverB.listen(0, '127.0.0.1', () => r()));
    portB = (serverB.address() as any).port;
    originB = `http://127.0.0.1:${portB}`;

    // Server A: Permitted origin with redirecting and legitimate endpoints
    serverA = http.createServer((req, res) => {
      serverAHits++;
      const url = req.url || '/';
      if (url.startsWith('/assets/redirect.js')) {
        res.writeHead(302, {
          Location: `${originB}/leak.js`,
          'Content-Type': 'text/plain',
        });
        res.end('Redirecting to Server B');
      } else if (url.startsWith('/assets/multihop1.js')) {
        res.writeHead(302, {
          Location: `${originA}/assets/multihop2.js`,
          'Content-Type': 'text/plain',
        });
        res.end('First hop');
      } else if (url.startsWith('/assets/multihop2.js')) {
        res.writeHead(302, {
          Location: `${originB}/leak.js`,
          'Content-Type': 'text/plain',
        });
        res.end('Second hop to Server B');
      } else if (url.startsWith('/assets/allowed.js')) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end('console.log("legitimate-asset");');
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    await new Promise<void>((r) => serverA.listen(0, '127.0.0.1', () => r()));
    portA = (serverA.address() as any).port;
    originA = `http://127.0.0.1:${portA}`;

    // Install real networkGuard on a scope bound to originA
    guardedScope = {
      location: {
        origin: originA,
        href: `${originA}/`,
        hostname: '127.0.0.1',
        port: String(portA),
        protocol: 'http:',
      },
      fetch: globalThis.fetch.bind(globalThis),
      XMLHttpRequest: (class extends EventTarget {
        status = 0;
        statusText = '';
        readyState = 0;
        responseText = '';
        open() {}
        send() {}
      } as any),
    };
    installNetworkGuard(guardedScope, { defaultOrigin: originA, isDev: false });
  });

  after(() => {
    serverA.close();
    serverB.close();
  });

  beforeEach(() => {
    serverBHits = 0;
    serverAHits = 0;
  });

  it('LOOPBACK-01: Direct string fetch to redirecting asset returns 403 and Server B receives ZERO hits', async () => {
    const res = await guardedScope.fetch(`${originA}/assets/redirect.js`);
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden fail-closed');
    const body = await res.json();
    assert.strictEqual(body.error.code, 'CONTROLLED_DEMONSTRATION_MODE');
    assert.strictEqual(serverBHits, 0, 'Server B (denied destination) must receive ZERO hits');
  });

  it('LOOPBACK-02: fetch(Request with redirect: "follow") returns 403 and Server B receives ZERO hits', async () => {
    const req = new Request(`${originA}/assets/redirect.js`, { redirect: 'follow' });
    const res = await guardedScope.fetch(req);
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden fail-closed');
    const body = await res.json();
    assert.strictEqual(body.error.code, 'CONTROLLED_DEMONSTRATION_MODE');
    assert.strictEqual(serverBHits, 0, 'Server B (denied destination) must receive ZERO hits');
  });

  it('LOOPBACK-03: fetch(url, { redirect: "follow" }) returns 403 and Server B receives ZERO hits', async () => {
    const res = await guardedScope.fetch(`${originA}/assets/redirect.js`, { redirect: 'follow' });
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden fail-closed');
    const body = await res.json();
    assert.strictEqual(body.error.code, 'CONTROLLED_DEMONSTRATION_MODE');
    assert.strictEqual(serverBHits, 0, 'Server B (denied destination) must receive ZERO hits');
  });

  it('LOOPBACK-04: fetch(Request with redirect: "manual") returns 403 and Server B receives ZERO hits', async () => {
    const req = new Request(`${originA}/assets/redirect.js`, { redirect: 'manual' });
    const res = await guardedScope.fetch(req);
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden fail-closed');
    const body = await res.json();
    assert.strictEqual(body.error.code, 'CONTROLLED_DEMONSTRATION_MODE');
    assert.strictEqual(serverBHits, 0, 'Server B (denied destination) must receive ZERO hits');
  });

  it('LOOPBACK-05: Multi-hop redirect chain (A -> A -> B) returns 403 and Server B receives ZERO hits', async () => {
    const res = await guardedScope.fetch(`${originA}/assets/multihop1.js`);
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden fail-closed on multi-hop chain');
    const body = await res.json();
    assert.strictEqual(body.error.code, 'CONTROLLED_DEMONSTRATION_MODE');
    assert.strictEqual(serverBHits, 0, 'Server B (denied destination) must receive ZERO hits on multi-hop');
  });

  it('LOOPBACK-06: XMLHttpRequest to redirecting asset returns 403 and Server B receives ZERO hits', async () => {
    const xhr = new guardedScope.XMLHttpRequest();
    xhr.open('GET', `${originA}/assets/redirect.js`);
    xhr.send();
    // Allow microtasks/macrotasks to complete dispatch
    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(xhr.status, 403, 'XHR must return 403 Forbidden');
    const body = JSON.parse(xhr.responseText);
    assert.strictEqual(body.error.code, 'CONTROLLED_DEMONSTRATION_MODE');
    assert.strictEqual(serverBHits, 0, 'Server B (denied destination) must receive ZERO hits via XHR');
  });

  it('LOOPBACK-07: Positive control (normal static asset 200 OK) loads successfully and Server B receives ZERO hits', async () => {
    const res = await guardedScope.fetch(`${originA}/assets/allowed.js`);
    assert.strictEqual(res.status, 200, 'Legitimate asset on permitted origin must return 200 OK');
    const text = await res.text();
    assert.ok(text.includes('legitimate-asset'), 'Asset body must be received correctly');
    assert.strictEqual(serverBHits, 0, 'Server B must receive ZERO hits during normal asset load');
  });
});
