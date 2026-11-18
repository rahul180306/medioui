import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverSourcePath = path.join(repoRoot, 'server.ts');
const packagePath = path.join(repoRoot, 'package.json');
const serverEntry = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
let child: ChildProcess | undefined;
let baseUrl: string;
let serverOutput = '';

function stopChild(): Promise<void> {
  if (!child || child.exitCode !== null) return Promise.resolve();
  const current = child;
  return new Promise((resolve) => {
    current.once('exit', () => resolve());
    current.kill('SIGTERM');
    const timeout = setTimeout(() => {
      if (current.exitCode === null) current.kill('SIGKILL');
    }, 1500);
    timeout.unref();
  });
}

before(async () => {
  child = spawn(process.execPath, [serverEntry, serverSourcePath], {
    cwd: repoRoot,
    // Do not inherit API keys or provider configuration into the test process.
    env: { PATH: process.env.PATH ?? '', NODE_ENV: 'production', PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk: Buffer) => { serverOutput += chunk.toString(); });
  child.stderr?.on('data', (chunk: Buffer) => { serverOutput += chunk.toString(); });

  const started = Date.now();
  while (!baseUrl && Date.now() - started < 10_000) {
    const match = serverOutput.match(/http:\/\/(?:0\.0\.0\.0|127\.0\.0\.1):(\d+)/);
    if (match) {
      baseUrl = `http://127.0.0.1:${match[1]}`;
      break;
    }
    if (child.exitCode !== null) throw new Error(`Offline demo server exited before startup: ${serverOutput}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (!baseUrl) throw new Error(`Offline demo server did not start: ${serverOutput}`);
});

after(async () => { await stopChild(); });

test('offline demo API fails closed without execution, provider, credential, or fake telemetry routes', async () => {
  const serverSource = await readFile(serverSourcePath, 'utf8');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as { scripts: Record<string, string> };

  assert.doesNotMatch(serverSource, /node:child_process|\bexec\s*\(|\bspawn\s*\(/,
    'standalone UI server must not contain a host command execution path');
  assert.doesNotMatch(serverSource, /GoogleGenAI|new OpenAI|generateContent|chat\.completions\.create/,
    'standalone UI server must not construct provider clients or make model requests');
  assert.doesNotMatch(serverSource, /GEMINI_API_KEY|EXPLABS_API_KEY|customApiKey|customExplabsApiKey/,
    'standalone UI server must not read, save, or expose provider credentials');
  assert.match(serverSource, /app\.listen\(port,\s*'0\.0\.0\.0'/,
    'application server must bind to 0.0.0.0 for Cloud Run health checks');
  assert.doesNotMatch(serverSource, /process\.env\.HOST/,
    'server must not accept or use an external bind override');
  assert.ok(serverSource.indexOf("app.use('/api'") < serverSource.indexOf('app.use(vite.middlewares)'),
    'API deny-by-default middleware must run before Vite SPA fallback');
  assert.match(packageJson.scripts.preview ?? '', /--host\s+0\.0\.0\.0/,
    'Vite preview command must bind to 0.0.0.0');

  const secretMarker = 'offline-test-secret-must-not-be-accepted';
  const disabledCalls: Array<{ method: string; route: string; body?: unknown }> = [
    { method: 'POST', route: '/api/terminal/execute', body: { command: 'DO_NOT_RUN', cwd: '/tmp' } },
    { method: 'POST', route: '/api/gemini/execute', body: { prompt: 'DO_NOT_SEND', apiKey: secretMarker } },
    { method: 'POST', route: '/api/gemini/validate-key', body: { apiKey: secretMarker, save: true } },
    { method: 'POST', route: '/api/experiential/save-key', body: { apiKey: secretMarker } },
    { method: 'POST', route: '/api/experiential/test-call', body: { apiKey: secretMarker } },
    { method: 'POST', route: '/api/gemini/clear-key' },
    { method: 'GET', route: '/api/gemini/key-status' },
    { method: 'GET', route: '/api/gemini/health' },
    { method: 'GET', route: '/api/gemini/models' },
    { method: 'GET', route: '/api/gemini/status' },
    { method: 'GET', route: '/api/experiential/key-status' },
    { method: 'GET', route: '/api/system/resources' },
    { method: 'GET', route: '/api/dummy-project/files' },
    { method: 'POST', route: '/api/turns', body: { prompt: 'must not execute' } },
  ];

  for (const call of disabledCalls) {
    const response = await fetch(`${baseUrl}${call.route}`, {
      method: call.method,
      ...(call.body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(call.body) } : {}),
    });
    assert.equal(response.status, 503, `${call.method} ${call.route} must be explicitly disabled`);
    const text = await response.text();
    assert.match(text, /OFFLINE_API_DISABLED/);
    assert.doesNotMatch(text, new RegExp(secretMarker));
    assert.doesNotMatch(text, /exitCode|stdout|stderr|verified|completed successfully/i,
      'disabled execution endpoints must not fabricate tool/test outcomes');
  }

  const unknown = await fetch(`${baseUrl}/api/not-a-route`);
  assert.equal(unknown.status, 404, 'unknown API routes must fail closed');
  assert.deepEqual(await unknown.json(), { code: 'API_NOT_FOUND', error: 'API route not found.' });
});

test('selected runtime remains the offline fixture and can load its seeded conversations', async () => {
  const [{ OfflineFixtureRuntime }, client] = await Promise.all([
    import('../mediobot-ui-refinement/src/runtime/offlineFixture.js'),
    import('../mediobot-ui-refinement/src/runtime/client.js'),
  ]);
  assert.equal(client.USE_OFFLINE_FIXTURE, true);
  assert.ok(client.runtimeInstance instanceof OfflineFixtureRuntime);
  const threads = await client.runtimeInstance.loadThreads();
  assert.ok(threads.length > 0);
  assert.ok(threads.every((thread) => thread.turns.every((turn) => turn.status !== 'running')),
    'fixture seed loads as stored data without starting simulated or real work');
});
