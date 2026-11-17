/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mediobot Controlled Demonstration Network Guard
 *
 * Authoritative deterministic 7-step request authorization engine and multi-channel
 * browser network guard for offline demonstration mode.
 *
 * This client-side guard prevents accidental network egress and API calls during
 * offline evaluation. It does NOT claim OS-level containment.
 */

export interface AuthorizationResult {
  permitted: boolean;
  reason?: string;
  normalizedUrl?: string;
}

export interface AuthorizationContext {
  scope?: any;
  baseOrigin?: string;
  baseHref?: string;
  isDev?: boolean;
}

export interface NetworkGuardOptions {
  isDev?: boolean;
  defaultOrigin?: string;
}

const ALLOWED_STATIC_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.css',
  '.png',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.json',
  '.map',
]);

const EXACT_PERMITTED_PATHS = new Set([
  '/',
  '/index.html',
  '/favicon.ico',
]);

const DEV_PREFIXES = [
  '/@vite/',
  '/@fs/',
  '/node_modules/',
  '/@id/',
  '/src/',
];

let globalDevOverride: boolean | null = null;

export function setNetworkGuardDevMode(enabled: boolean | null): void {
  globalDevOverride = enabled;
}

export function isDevMode(): boolean {
  if (globalDevOverride !== null) return globalDevOverride;
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && typeof (import.meta as any).env.DEV === 'boolean') {
    return (import.meta as any).env.DEV;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV !== 'production';
  }
  return false;
}

export function createSecurityError(message: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, 'SecurityError');
  }
  const err = new Error(message);
  err.name = 'SecurityError';
  return err;
}

export function defineFrozenProperty(target: any, prop: string, value: any): void {
  if (!target) return;
  try {
    Object.defineProperty(target, prop, {
      value,
      writable: false,
      configurable: false,
      enumerable: true,
    });
  } catch {
    try {
      Object.defineProperty(target, prop, {
        value,
        writable: false,
        configurable: true,
        enumerable: true,
      });
    } catch {
      try {
        target[prop] = value;
      } catch {
        // Retain existing immutable property if redefining is completely rejected
      }
    }
  }
}

const STATIC_EXTENSIONS_PATTERN = /\.(js|mjs|cjs|ts|tsx|jsx|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|otf|json|map|html|htm|txt|wasm)$/i;

export function validateStreamingDestination(
  urlStr: string,
  transportName: 'EventSource' | 'WebSocket',
  context?: AuthorizationContext
): never {
  const activeContext = getActiveContext(context);
  let parsed: URL;
  try {
    parsed = new URL(urlStr, activeContext.baseHref);
  } catch {
    throw createSecurityError(`${transportName} blocked: Malformed destination "${urlStr}".`);
  }

  const scope = activeContext.scope || (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {}));
  let expectedOrigin = activeContext.baseOrigin || scope?.location?.origin;
  if (!expectedOrigin && activeContext.baseHref) {
    try {
      expectedOrigin = new URL(activeContext.baseHref).origin;
    } catch {}
  }
  if (!expectedOrigin) {
    expectedOrigin = 'http://localhost:5173';
  }

  let expectedHost = 'localhost:5173';
  try {
    expectedHost = new URL(expectedOrigin).host;
  } catch {}

  if (transportName === 'EventSource') {
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw createSecurityError(
        `${transportName} blocked: Protocol "${parsed.protocol}" is unauthorized. Only http: and https: protocols are permitted.`
      );
    }
  }

  const isExternal = transportName === 'WebSocket'
    ? (parsed.host !== expectedHost && parsed.origin !== expectedOrigin)
    : (parsed.origin !== expectedOrigin || parsed.host !== expectedHost);

  if (isExternal) {
    throw createSecurityError(
      `${transportName} blocked: External destination or unauthorized origin "${parsed.origin || parsed.host}" is prohibited in controlled demonstration mode. Expected "${expectedOrigin}".`
    );
  }

  if (parsed.username || parsed.password) {
    throw createSecurityError(`${transportName} blocked: Credentials in URL are strictly prohibited.`);
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    throw createSecurityError(`${transportName} blocked: URI decoding failed for pathname.`);
  }

  const decodedLower = decodedPath.toLowerCase();
  const rawLower = parsed.pathname.toLowerCase();
  const segments = decodedPath.split('/').map((s) => s.toLowerCase());

  if (
    decodedLower === '/api' ||
    decodedLower.startsWith('/api/') ||
    rawLower === '/api' ||
    rawLower.startsWith('/api/') ||
    decodedLower.includes('/api/') ||
    rawLower.includes('/api/') ||
    decodedLower.endsWith('/api') ||
    rawLower.endsWith('/api') ||
    segments.some((s) => s === 'api')
  ) {
    throw createSecurityError(
      `${transportName} blocked: Absolute /api/ endpoint access is denied in controlled demonstration mode.`
    );
  }

  const lastDot = decodedPath.lastIndexOf('.');
  const lastSlash = decodedPath.lastIndexOf('/');
  if (lastDot > lastSlash) {
    const ext = decodedPath.slice(lastDot).toLowerCase();
    if (ALLOWED_STATIC_EXTENSIONS.has(ext) || STATIC_EXTENSIONS_PATTERN.test(decodedPath)) {
      throw createSecurityError(
        `${transportName} blocked: Streaming connections to static asset extensions ("${ext}") are prohibited in controlled demonstration mode.`
      );
    }
  }

  throw createSecurityError(
    `${transportName} is disabled in controlled demonstration mode: "${urlStr}". External network transports and streaming are disabled.`
  );
}

export function getActiveContext(explicitContext?: AuthorizationContext): AuthorizationContext {
  if (explicitContext) return explicitContext;
  const scope: any = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  const baseOrigin = scope?.location?.origin || 'http://localhost:5173';
  const baseHref = scope?.location?.href || `${baseOrigin}/`;
  return {
    scope,
    baseOrigin,
    baseHref,
    isDev: isDevMode(),
  };
}

export class GuardedEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;

  constructor(url: string | URL, _eventSourceInitDict?: EventSourceInit) {
    const urlStr = typeof url === 'string' ? url : url.toString();
    validateStreamingDestination(urlStr, 'EventSource');
  }
}

export class GuardedWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  constructor(url: string | URL, _protocols?: string | string[]) {
    const urlStr = typeof url === 'string' ? url : url.toString();
    validateStreamingDestination(urlStr, 'WebSocket');
  }
}

/**
 * Extracts raw URL string from RequestInfo | URL | string.
 */
export function extractUrlString(input: RequestInfo | URL | unknown): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  if (input && typeof input === 'object' && 'url' in input && typeof (input as any).url === 'string') {
    return (input as any).url;
  }
  return String(input);
}

/**
 * Extracts HTTP method from RequestInfo | URL | RequestInit | string.
 */
export function extractMethod(
  input: RequestInfo | URL | unknown,
  initOrMethod?: RequestInit | string
): string {
  if (typeof initOrMethod === 'string') {
    return initOrMethod;
  }
  if (initOrMethod && typeof initOrMethod === 'object' && 'method' in initOrMethod && typeof initOrMethod.method === 'string') {
    return initOrMethod.method;
  }
  if (input && typeof input === 'object' && 'method' in input && typeof (input as any).method === 'string') {
    return (input as any).method;
  }
  return 'GET';
}

/**
 * Extracts RequestRedirect ('follow' | 'error' | 'manual') from RequestInfo | URL | RequestInit.
 * Respects Fetch standard precedence where init.redirect overrides Request.redirect.
 */
export function extractRedirectMode(
  input: RequestInfo | URL | unknown,
  init?: RequestInit
): RequestRedirect {
  if (init && typeof init === 'object' && 'redirect' in init && init.redirect) {
    return init.redirect;
  }
  if (input && typeof input === 'object' && 'redirect' in input && (input as any).redirect) {
    return (input as any).redirect;
  }
  return 'follow';
}

/**
 * Creates standard 403 Response object for blocked requests.
 */
export function createBlockedResponse(url: string, reason?: string): Response {
  const detail = reason ? ` ${reason}` : ' Only same-origin static asset paths with GET/HEAD methods are permitted.';
  const body = {
    error: {
      code: 'CONTROLLED_DEMONSTRATION_MODE',
      message: `Network operation blocked: "${url}" is unauthorized in controlled demonstration mode.${detail}`,
    },
  };

  return new Response(JSON.stringify(body), {
    status: 403,
    statusText: 'Forbidden',
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Step-by-step deterministic 7-step request authorization engine.
 */
export function isPermittedRequest(
  input: RequestInfo | URL | unknown,
  initOrMethod?: RequestInit | string,
  context?: AuthorizationContext
): AuthorizationResult {
  // ── Step 1: Extract URL and Method ─────────────────────────────────────────
  const rawUrl = extractUrlString(input);
  const rawMethod = extractMethod(input, initOrMethod);
  const method = rawMethod.trim().toUpperCase();

  // ── Step 2: Restrict HTTP Method ───────────────────────────────────────────
  if (method !== 'GET' && method !== 'HEAD') {
    return {
      permitted: false,
      reason: `Method "${method}" is prohibited in controlled demonstration mode. Only GET and HEAD methods are permitted.`,
    };
  }

  // ── Step 3: Parse and Validate Origin & Protocol ───────────────────────────
  const scope = context?.scope || (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {}));
  const baseHref = context?.baseHref || scope?.location?.href || (context?.baseOrigin ? `${context.baseOrigin}/` : 'http://localhost:5173/');

  let parsed: URL;
  try {
    parsed = new URL(rawUrl, baseHref);
  } catch {
    return {
      permitted: false,
      reason: `Malformed or unparseable destination: "${rawUrl}".`,
    };
  }

  // Protocol must strictly be http: or https:
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      permitted: false,
      reason: `Protocol "${parsed.protocol}" is unauthorized. Only http: and https: protocols are permitted.`,
    };
  }

  // Determine expected origin
  let expectedOrigin = context?.baseOrigin || scope?.location?.origin;
  if (!expectedOrigin && baseHref) {
    try {
      expectedOrigin = new URL(baseHref).origin;
    } catch {
      // fallback
    }
  }
  if (!expectedOrigin) {
    expectedOrigin = 'http://localhost:5173';
  }

  // Origin check
  if (parsed.origin !== expectedOrigin) {
    return {
      permitted: false,
      reason: `External origin "${parsed.origin}" is unauthorized in controlled demonstration mode. Expected "${expectedOrigin}".`,
    };
  }

  // Username and password check (prevent userinfo domain spoofing e.g. http://localhost:5173@evil.com)
  if (parsed.username || parsed.password) {
    return {
      permitted: false,
      reason: 'Credentials in URL are strictly prohibited.',
    };
  }

  // Host and port verification
  try {
    const baseParsed = new URL(baseHref);
    if (parsed.hostname !== baseParsed.hostname || parsed.port !== baseParsed.port) {
      return {
        permitted: false,
        reason: `Host or port mismatch ("${parsed.host}" vs "${baseParsed.host}").`,
      };
    }
  } catch {
    // ignore parse error on baseHref
  }

  // ── Step 4: Path Normalization & Ambiguity Check ───────────────────────────
  // Reject raw backslashes before decoding
  if (rawUrl.includes('\\') || parsed.pathname.includes('\\')) {
    return {
      permitted: false,
      reason: 'Backslash path separators are strictly prohibited.',
    };
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    return {
      permitted: false,
      reason: 'URI decoding failed for pathname.',
    };
  }

  // Null bytes
  if (decodedPath.includes('\0')) {
    return {
      permitted: false,
      reason: 'Null byte detected in path.',
    };
  }

  // Backslashes in decoded path
  if (decodedPath.includes('\\')) {
    return {
      permitted: false,
      reason: 'Backslash detected in decoded path.',
    };
  }

  // Double or nested percent-encoding check
  if (decodedPath.includes('%')) {
    return {
      permitted: false,
      reason: 'Ambiguous or nested percent-encoding detected in path.',
    };
  }

  // Control characters
  if (/[\x00-\x1f\x7f]/.test(decodedPath)) {
    return {
      permitted: false,
      reason: 'Control character detected in path.',
    };
  }

  // Directory traversal checks on decoded segments
  const segments = decodedPath.split('/');
  if (segments.some((seg) => seg === '..' || seg === '.')) {
    return {
      permitted: false,
      reason: 'Directory traversal (.. or .) detected in path segments.',
    };
  }

  // Directory traversal checks on raw segments
  const rawSegments = parsed.pathname.split('/');
  if (rawSegments.some((seg) => seg === '..' || seg === '.' || seg.includes('..'))) {
    return {
      permitted: false,
      reason: 'Directory traversal detected in raw path.',
    };
  }

  // ── Step 5: Absolute API Endpoint Denial ───────────────────────────────────
  const decodedLower = decodedPath.toLowerCase();
  const rawLower = parsed.pathname.toLowerCase();

  // Root or prefix match
  if (
    decodedLower === '/api' ||
    decodedLower.startsWith('/api/') ||
    rawLower === '/api' ||
    rawLower.startsWith('/api/')
  ) {
    return {
      permitted: false,
      reason: 'Absolute /api/ endpoint access is denied in controlled demonstration mode.',
    };
  }

  // /api/ anywhere in path segments or substring
  if (
    decodedLower.includes('/api/') ||
    rawLower.includes('/api/') ||
    decodedLower.endsWith('/api') ||
    rawLower.endsWith('/api') ||
    segments.some((s) => s.toLowerCase() === 'api')
  ) {
    return {
      permitted: false,
      reason: 'API endpoint access is denied in controlled demonstration mode regardless of location or extension.',
    };
  }

  // ── Step 6: Permitted Static Resource Path Whitelist ──────────────────────
  let matchedStatic = false;

  if (EXACT_PERMITTED_PATHS.has(decodedPath)) {
    matchedStatic = true;
  } else if (decodedPath.startsWith('/assets/')) {
    const lastDot = decodedPath.lastIndexOf('.');
    const lastSlash = decodedPath.lastIndexOf('/');
    if (lastDot <= lastSlash) {
      return {
        permitted: false,
        reason: 'Asset path missing approved static file extension.',
      };
    }
    const ext = decodedPath.slice(lastDot).toLowerCase();
    if (!ALLOWED_STATIC_EXTENSIONS.has(ext)) {
      return {
        permitted: false,
        reason: `Static extension "${ext}" is unauthorized.`,
      };
    }
    matchedStatic = true;
  } else {
    // Check dev-mode prefixes
    const dev = context?.isDev !== undefined ? context.isDev : isDevMode();
    if (dev) {
      if (DEV_PREFIXES.some((prefix) => decodedPath.startsWith(prefix))) {
        matchedStatic = true;
      }
    }
  }

  if (!matchedStatic) {
    return {
      permitted: false,
      reason: `Path "${decodedPath}" does not match permitted static whitelist.`,
    };
  }

  // ── Step 7: Query String Sanity Check ──────────────────────────────────────
  if (parsed.search && parsed.search.length > 1) {
    const queryStr = parsed.search.slice(1);
    let decodedQuery = '';
    try {
      decodedQuery = decodeURIComponent(queryStr);
    } catch {
      return {
        permitted: false,
        reason: 'Malformed query string.',
      };
    }

    const queryLower = (queryStr + ' ' + decodedQuery).toLowerCase();
    if (
      queryLower.includes('/api/') ||
      queryLower.includes('/api') ||
      queryLower.includes('..') ||
      queryLower.includes('\\') ||
      queryLower.includes('\0') ||
      queryLower.includes('<script')
    ) {
      return {
        permitted: false,
        reason: 'Prohibited query parameters detected (traversal, API smuggling, or script injection).',
      };
    }
  }

  return {
    permitted: true,
    normalizedUrl: parsed.href,
  };
}

/**
 * Installs multi-channel network guards on the specified scope.
 */
export function installNetworkGuard(targetScope?: any, options?: NetworkGuardOptions): void {
  const scope = targetScope || (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {}));
  if (!scope || (scope as any).__mediobotNetworkGuardInstalled) {
    return;
  }
  (scope as any).__mediobotNetworkGuardInstalled = true;

  if (options?.isDev !== undefined) {
    setNetworkGuardDevMode(options.isDev);
  }

  const baseOrigin = options?.defaultOrigin || scope.location?.origin || 'http://localhost:5173';
  const baseHref = scope.location?.href || `${baseOrigin}/`;
  const context: AuthorizationContext = {
    scope,
    baseOrigin,
    baseHref,
    isDev: options?.isDev !== undefined ? options.isDev : isDevMode(),
  };

  // ── 1. Guard window.fetch ──────────────────────────────────────────────────
  const nativeFetch = scope.fetch?.bind(scope) || (typeof globalThis !== 'undefined' && globalThis.fetch ? globalThis.fetch.bind(globalThis) : null);
  let guardedFetch: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | null = null;

  if (nativeFetch) {
    guardedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      try {
        (scope as any).__mediobotFetchCallCount = ((scope as any).__mediobotFetchCallCount || 0) + 1;
      } catch {}
      const auth = isPermittedRequest(input, init, context);
      if (!auth.permitted) {
        const rawUrl = extractUrlString(input);
        return createBlockedResponse(rawUrl, auth.reason);
      }

      const rawUrl = extractUrlString(input);
      const requestedRedirect = extractRedirectMode(input, init);
      // In controlled demonstration mode, enforce fail-closed redirect handling:
      // 'error' throws immediately on redirect; 'manual' prevents automatic following and returns opaqueredirect or 3xx.
      const enforcedRedirect: RequestRedirect = requestedRedirect === 'error' ? 'error' : 'manual';
      const enforcedInit: RequestInit = { ...(init || {}), redirect: enforcedRedirect };

      let response: Response;
      try {
        response = await nativeFetch(input, enforcedInit);
      } catch (fetchErr: any) {
        // If nativeFetch threw a redirect error (e.g. redirect: 'error') or network failure on redirect
        return createBlockedResponse(
          rawUrl,
          `Network request blocked or redirect rejected: ${fetchErr?.message || 'Redirect rejected in controlled demonstration mode.'}`
        );
      }

      // Check for redirect responses:
      // 1. Browser opaque redirect: response.type === 'opaqueredirect'
      // 2. HTTP 3xx status: response.status >= 300 && response.status < 400
      // 3. Followed redirect detection (defense-in-depth): response.redirected === true
      const isRedirect =
        response.type === 'opaqueredirect' ||
        (response.status >= 300 && response.status < 400) ||
        Boolean(response.redirected);

      if (isRedirect) {
        let location = '';
        try {
          if (response.headers && typeof response.headers.get === 'function') {
            location = response.headers.get('location') || '';
          }
        } catch {}

        return createBlockedResponse(
          location || rawUrl,
          `Redirect blocked in controlled demonstration mode: destination "${location || 'unknown'}" will not be contacted.`
        );
      }

      return response;
    };

    defineFrozenProperty(scope, 'fetch', guardedFetch);
  }

  // ── 2. Guard window.XMLHttpRequest ─────────────────────────────────────────
  if (scope.XMLHttpRequest) {
    const OrigXHR = scope.XMLHttpRequest;
    class GuardedXHR extends OrigXHR {
      private __mediobotBlocked = false;
      private __mediobotBlockedUrl = '';
      private __mediobotBlockedReason = '';
      private __mediobotMethod = 'GET';
      private __mediobotHeaders: Record<string, string> = {};

      open(method: string, url: string | URL, ...rest: any[]): void {
        const urlStr = typeof url === 'string' ? url : url.toString();
        this.__mediobotMethod = method;
        this.__mediobotBlockedUrl = urlStr;
        this.__mediobotHeaders = {};

        const auth = isPermittedRequest(urlStr, method, context);
        if (!auth.permitted) {
          this.__mediobotBlocked = true;
          this.__mediobotBlockedReason = auth.reason || 'Unauthorized request';
          // Fail-closed: do NOT invoke super.open() to prevent any native socket initialization
          return;
        }

        this.__mediobotBlocked = false;
        try {
          return super.open(method, url as string, ...(rest as [boolean?, string?, string?]));
        } catch {
          // If super.open throws on synthetic URLs in test harnesses, ignore
        }
      }

      setRequestHeader(name: string, value: string): void {
        this.__mediobotHeaders[name] = value;
        if (!this.__mediobotBlocked) {
          try {
            super.setRequestHeader(name, value);
          } catch {}
        }
      }

      send(body?: Document | XMLHttpRequestBodyInit | null): void {
        if (this.__mediobotBlocked) {
          const urlStr = this.__mediobotBlockedUrl;
          const errJson = JSON.stringify({
            error: {
              code: 'CONTROLLED_DEMONSTRATION_MODE',
              message: `XHR blocked: "${urlStr}" is unauthorized in controlled demonstration mode. ${this.__mediobotBlockedReason}`,
            },
          });

          Object.defineProperty(this, 'status', { get: () => 403, configurable: true });
          Object.defineProperty(this, 'statusText', { get: () => 'Forbidden', configurable: true });
          Object.defineProperty(this, 'readyState', { get: () => 4, configurable: true });
          Object.defineProperty(this, 'responseText', { get: () => errJson, configurable: true });
          Object.defineProperty(this, 'response', {
            get: () => {
              if ((this as any).responseType === 'json') {
                try {
                  return JSON.parse(errJson);
                } catch {
                  return errJson;
                }
              }
              return errJson;
            },
            configurable: true,
          });

          setTimeout(() => {
            try {
              this.dispatchEvent(new Event('readystatechange'));
              const loadEvent = typeof ProgressEvent !== 'undefined' ? new ProgressEvent('load') : new Event('load');
              this.dispatchEvent(loadEvent);
              const loadEndEvent = typeof ProgressEvent !== 'undefined' ? new ProgressEvent('loadend') : new Event('loadend');
              this.dispatchEvent(loadEndEvent);
            } catch {
              // Ignore event dispatch errors in synthetic harnesses
            }
          }, 0);
          return;
        }

        // Permitted XHR request: dispatch via guardedFetch with redirect: 'manual'
        // to ensure any HTTP 3xx redirect fails closed and the destination server receives ZERO requests.
        if (guardedFetch) {
          guardedFetch(this.__mediobotBlockedUrl, {
            method: this.__mediobotMethod,
            body: body as any,
            redirect: 'manual',
            headers: this.__mediobotHeaders,
          })
            .then(async (res) => {
              const text = await res.text();
              Object.defineProperty(this, 'status', { get: () => res.status, configurable: true });
              Object.defineProperty(this, 'statusText', {
                get: () => res.statusText || (res.status === 200 ? 'OK' : 'Forbidden'),
                configurable: true,
              });
              Object.defineProperty(this, 'readyState', { get: () => 4, configurable: true });
              Object.defineProperty(this, 'responseText', { get: () => text, configurable: true });
              Object.defineProperty(this, 'response', {
                get: () => {
                  if ((this as any).responseType === 'json') {
                    try {
                      return JSON.parse(text);
                    } catch {
                      return text;
                    }
                  }
                  return text;
                },
                configurable: true,
              });

              try {
                this.dispatchEvent(new Event('readystatechange'));
                const eventName = res.ok ? 'load' : 'error';
                const evt = typeof ProgressEvent !== 'undefined' ? new ProgressEvent(eventName) : new Event(eventName);
                this.dispatchEvent(evt);
                const loadEndEvt = typeof ProgressEvent !== 'undefined' ? new ProgressEvent('loadend') : new Event('loadend');
                this.dispatchEvent(loadEndEvt);
              } catch {}
            })
            .catch((err) => {
              Object.defineProperty(this, 'status', { get: () => 403, configurable: true });
              Object.defineProperty(this, 'statusText', { get: () => 'Forbidden', configurable: true });
              Object.defineProperty(this, 'readyState', { get: () => 4, configurable: true });
              try {
                this.dispatchEvent(new Event('readystatechange'));
                this.dispatchEvent(typeof ProgressEvent !== 'undefined' ? new ProgressEvent('error') : new Event('error'));
                this.dispatchEvent(typeof ProgressEvent !== 'undefined' ? new ProgressEvent('loadend') : new Event('loadend'));
              } catch {}
            });
          return;
        }

        return super.send(body);
      }
    }

    defineFrozenProperty(scope, 'XMLHttpRequest', GuardedXHR);
  }

  // ── 3. Guard window.EventSource ────────────────────────────────────────────
  class GuardedEventSourceScoped {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;

    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;

    constructor(url: string | URL, _eventSourceInitDict?: EventSourceInit) {
      const urlStr = typeof url === 'string' ? url : url.toString();
      validateStreamingDestination(urlStr, 'EventSource', context);
    }
  }
  defineFrozenProperty(scope, 'EventSource', GuardedEventSourceScoped);

  // ── 4. Guard window.WebSocket ──────────────────────────────────────────────
  class GuardedWebSocketScoped {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;

    constructor(url: string | URL, _protocols?: string | string[]) {
      const urlStr = typeof url === 'string' ? url : url.toString();
      validateStreamingDestination(urlStr, 'WebSocket', context);
    }
  }
  defineFrozenProperty(scope, 'WebSocket', GuardedWebSocketScoped);

  // ── 5. Guard navigator.sendBeacon ──────────────────────────────────────────
  const nav = scope.navigator || (typeof navigator !== 'undefined' ? navigator : null);
  if (nav) {
    const origSendBeacon = nav.sendBeacon?.bind(nav);
    const guardedSendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      const auth = isPermittedRequest(urlStr, 'POST', context);
      if (!auth.permitted) {
        return false;
      }
      if (origSendBeacon) {
        return origSendBeacon(url, data);
      }
      return false;
    };
    defineFrozenProperty(nav, 'sendBeacon', guardedSendBeacon);
  }

  // ── 6. Guard Worker and SharedWorker ───────────────────────────────────────
  if (scope.Worker) {
    const OrigWorker = scope.Worker;
    class GuardedWorker extends OrigWorker {
      constructor(scriptURL: string | URL, options?: WorkerOptions) {
        const urlStr = typeof scriptURL === 'string' ? scriptURL : scriptURL.toString();
        const auth = isPermittedRequest(urlStr, 'GET', context);
        if (!auth.permitted) {
          throw createSecurityError(`Worker blocked: "${urlStr}" is unauthorized in controlled demonstration mode.`);
        }
        super(scriptURL, options);
      }
    }
    defineFrozenProperty(scope, 'Worker', GuardedWorker);
  }

  if (scope.SharedWorker) {
    const OrigSharedWorker = scope.SharedWorker;
    class GuardedSharedWorker extends OrigSharedWorker {
      constructor(scriptURL: string | URL, options?: string | WorkerOptions) {
        const urlStr = typeof scriptURL === 'string' ? scriptURL : scriptURL.toString();
        const auth = isPermittedRequest(urlStr, 'GET', context);
        if (!auth.permitted) {
          throw createSecurityError(`SharedWorker blocked: "${urlStr}" is unauthorized in controlled demonstration mode.`);
        }
        super(scriptURL, options);
      }
    }
    defineFrozenProperty(scope, 'SharedWorker', GuardedSharedWorker);
  }
}
