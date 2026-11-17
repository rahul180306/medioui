import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  redactSensitiveData,
  sanitizeCommandDescription,
  extractAllowlistToolDetails,
} from '../../src/features/activity/allowlistRedaction';
import type { ToolExecutionData } from '../../src/types';
import type {
  ExecutionActivityEvent,
  ExecutionStepItemType,
  ExecutionSourceClassification,
  ExecutionStepStatus,
} from '../../src/types/executionActivity';

describe('Milestone 1: Allowlist Redaction Engine & Typed Event Model', () => {
  // =========================================================================
  // Suite 1: Header & Token Redaction
  // =========================================================================
  describe('Suite 1: Header & Token Redaction', () => {
    it('redacts Authorization Bearer header', () => {
      const input = 'Authorization: Bearer mySecretToken1234567890';
      const result = redactSensitiveData(input);
      assert.strictEqual(result.wasRedacted, true);
      assert.strictEqual(result.matchCount, 1);
      assert.strictEqual(result.text, 'Authorization: [REDACTED]');
    });

    it('redacts Proxy-Authorization Basic header', () => {
      const input = 'Proxy-Authorization: Basic dXNlcjpwYXNzd29yZDEyMw==';
      const result = redactSensitiveData(input);
      assert.strictEqual(result.wasRedacted, true);
      assert.strictEqual(result.matchCount, 1);
      assert.strictEqual(result.text, 'Proxy-Authorization: [REDACTED]');
    });

    it('redacts x-api-key and x-auth-token headers', () => {
      const input1 = 'x-api-key: super-secret-api-key-val';
      const result1 = redactSensitiveData(input1);
      assert.strictEqual(result1.wasRedacted, true);
      assert.strictEqual(result1.text, 'x-api-key: [REDACTED]');

      const input2 = 'x-auth-token: token-xyz-12345';
      const result2 = redactSensitiveData(input2);
      assert.strictEqual(result2.wasRedacted, true);
      assert.strictEqual(result2.text, 'x-api-key: [REDACTED]');
    });

    it('redacts Cookie and Set-Cookie headers', () => {
      const input = 'Cookie: session_id=abc1234; auth_token=secret987';
      const result = redactSensitiveData(input);
      assert.strictEqual(result.wasRedacted, true);
      assert.strictEqual(result.text, 'Cookie: [REDACTED]');
    });

    it('redacts standalone Bearer and Basic tokens', () => {
      const bearerInput = 'Access with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature';
      const bearerResult = redactSensitiveData(bearerInput);
      assert.strictEqual(bearerResult.wasRedacted, true);
      assert.ok(bearerResult.text.includes('Bearer [REDACTED]'));

      const basicInput = 'Using Basic YWRtaW46cGFzc3dvcmQxMjM= for login';
      const basicResult = redactSensitiveData(basicInput);
      assert.strictEqual(basicResult.wasRedacted, true);
      assert.ok(basicResult.text.includes('Basic [REDACTED]'));
    });
  });

  // =========================================================================
  // Suite 2: Provider API Key Redaction
  // =========================================================================
  describe('Suite 2: Provider API Key Redaction', () => {
    it('redacts OpenAI standard and project/admin keys (sk-...)', () => {
      const skKey = 'sk-abcdef1234567890abcdef123456';
      const result1 = redactSensitiveData(`OpenAI key is ${skKey}`);
      assert.strictEqual(result1.wasRedacted, true);
      assert.ok(!result1.text.includes(skKey));
      assert.ok(result1.text.includes('[REDACTED]'));

      const skProjKey = 'sk-proj-abc1234567890abcdef1234567890';
      const result2 = redactSensitiveData(`Project key: ${skProjKey}`);
      assert.strictEqual(result2.wasRedacted, true);
      assert.ok(!result2.text.includes(skProjKey));
    });

    it('redacts Anthropic keys (sk-ant-...)', () => {
      const antKey = 'sk-ant-api03-abcdef1234567890abcdef123456789012345';
      const result = redactSensitiveData(`Anthropic key: ${antKey}`);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes(antKey));
      assert.ok(result.text.includes('[REDACTED]'));
    });

    it('redacts Google / Gemini API keys (AIza...)', () => {
      const googleKey = 'AIzaSyA1234567890abcdefghijklmnopqrstuv';
      const result = redactSensitiveData(`Google API key: ${googleKey}`);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes(googleKey));
      assert.ok(result.text.includes('[REDACTED]'));
    });

    it('redacts GitHub personal access tokens (ghp_..., github_pat_...)', () => {
      const ghpKey = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      const result1 = redactSensitiveData(`GitHub token: ${ghpKey}`);
      assert.strictEqual(result1.wasRedacted, true);
      assert.ok(!result1.text.includes(ghpKey));

      const patKey = 'github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz01234567890123456789';
      const result2 = redactSensitiveData(`Fine-grained token: ${patKey}`);
      assert.strictEqual(result2.wasRedacted, true);
      assert.ok(!result2.text.includes(patKey));
    });

    it('redacts AWS Access Key IDs (AKIA..., ASIA...)', () => {
      const awsKey = 'AKIAIOSFODNN7EXAMPLE';
      const result = redactSensitiveData(`AWS key: ${awsKey}`);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes(awsKey));
      assert.ok(result.text.includes('[REDACTED]'));
    });

    it('redacts Slack tokens (xoxb-..., xoxp-...)', () => {
      const slackKey = ['xox', 'b-123456789012-1234567890123-abcdefghijklmnopqrstuvwx'].join('');
      const result = redactSensitiveData(`Slack bot token: ${slackKey}`);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes(slackKey));
      assert.ok(result.text.includes('[REDACTED]'));
    });
  });

  // =========================================================================
  // Suite 3: Key-Value & Flag Redaction
  // =========================================================================
  describe('Suite 3: Key-Value & Flag Redaction', () => {
    it('redacts CLI flags (--password, --secret, --token, --api-key)', () => {
      const cmd = 'curl --password mySecretPassword --token secretToken123 https://example.com';
      const result = redactSensitiveData(cmd);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes('mySecretPassword'));
      assert.ok(!result.text.includes('secretToken123'));
      assert.ok(result.text.includes('--password [REDACTED]'));
      assert.ok(result.text.includes('--token [REDACTED]'));
    });

    it('redacts short CLI flags (-p password, -u user:password)', () => {
      const cmd = 'mysql -u root -p supersecret123 database';
      const result = redactSensitiveData(cmd);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes('supersecret123'));
      assert.ok(result.text.includes('-p [REDACTED]'));
    });

    it('redacts JSON key-value assignments', () => {
      const jsonStr = '{"apiKey": "myApiKeyVal", "secret": "shhh", "status": "active"}';
      const result = redactSensitiveData(jsonStr);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes('myApiKeyVal'));
      assert.ok(!result.text.includes('shhh'));
      assert.ok(result.text.includes('"status": "active"'));
    });

    it('redacts key=value assignment formats', () => {
      const input = 'password=mySecretPass token=secretTokenVal';
      const result = redactSensitiveData(input);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes('mySecretPass'));
      assert.ok(!result.text.includes('secretTokenVal'));
      assert.ok(result.text.includes('password=[REDACTED]'));
      assert.ok(result.text.includes('token=[REDACTED]'));
    });
  });

  // =========================================================================
  // Suite 4: Sensitive Environment Variables & URLs
  // =========================================================================
  describe('Suite 4: Sensitive Environment Variables & URLs', () => {
    it('redacts sensitive environment variable declarations', () => {
      const input = 'DATABASE_URL="postgres://user:pass@host:5432/db" OPENAI_API_KEY=sk-test-key-12345';
      const result = redactSensitiveData(input);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes('pass@host'));
      assert.ok(!result.text.includes('sk-test-key-12345'));
    });

    it('redacts embedded credentials in HTTP/HTTPS URLs', () => {
      const input = 'git clone https://developer:ghp_1234567890abcdefghijklmnopqrstuvwxyz@github.com/org/repo.git';
      const result = redactSensitiveData(input);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes('ghp_'));
      assert.ok(result.text.includes('https://developer:[REDACTED]@github.com'));
    });

    it('redacts embedded credentials in database connection URLs', () => {
      const input = 'Connect to postgresql://postgres:superSecretDbPass@db.internal:5432/production';
      const result = redactSensitiveData(input);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes('superSecretDbPass'));
      assert.ok(result.text.includes('postgresql://postgres:[REDACTED]@db.internal:5432/production'));
    });
  });

  // =========================================================================
  // Suite 5: Private Key Blocks
  // =========================================================================
  describe('Suite 5: Private Key Blocks', () => {
    it('redacts RSA private key PEM block', () => {
      const pem = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y123456789abcdefghijklmnopqrstuvwxyz
-----END RSA PRIVATE KEY-----`;
      const result = redactSensitiveData(pem);
      assert.strictEqual(result.wasRedacted, true);
      assert.strictEqual(result.text, '[REDACTED]');
    });

    it('redacts generic PRIVATE KEY PEM block', () => {
      const pem = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...
-----END PRIVATE KEY-----`;
      const result = redactSensitiveData(pem);
      assert.strictEqual(result.wasRedacted, true);
      assert.strictEqual(result.text, '[REDACTED]');
    });

    it('redacts PGP PRIVATE KEY BLOCK', () => {
      const pgp = `-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: BCPG v1.58
lQO+BFxY...
-----END PGP PRIVATE KEY BLOCK-----`;
      const result = redactSensitiveData(pgp);
      assert.strictEqual(result.wasRedacted, true);
      assert.strictEqual(result.text, '[REDACTED]');
    });
  });

  // =========================================================================
  // Suite 6: Edge Cases & ReDoS Defense
  // =========================================================================
  describe('Suite 6: Edge Cases & ReDoS Defense', () => {
    it('handles empty strings and null/undefined gracefully', () => {
      const empty = redactSensitiveData('');
      assert.strictEqual(empty.text, '');
      assert.strictEqual(empty.wasRedacted, false);
      assert.strictEqual(empty.matchCount, 0);

      const nullResult = redactSensitiveData(null as unknown as string);
      assert.strictEqual(nullResult.text, '');
      assert.strictEqual(nullResult.wasRedacted, false);
      assert.strictEqual(nullResult.matchCount, 0);
    });

    it('does not produce false positives on innocent words (skateboarding, tokenized, cookie_jar)', () => {
      const text = 'The skater went skateboarding with a tokenized cookie_jar and password_manager';
      const result = redactSensitiveData(text);
      assert.strictEqual(result.wasRedacted, false);
      assert.strictEqual(result.matchCount, 0);
      assert.strictEqual(result.text, text);
    });

    it('is idempotent when redacting already-redacted text', () => {
      const input = 'Authorization: Bearer mySecretToken1234567890';
      const firstPass = redactSensitiveData(input);
      assert.strictEqual(firstPass.wasRedacted, true);

      const secondPass = redactSensitiveData(firstPass.text);
      assert.strictEqual(secondPass.wasRedacted, false);
      assert.strictEqual(secondPass.matchCount, 0);
      assert.strictEqual(secondPass.text, firstPass.text);
    });

    it('processes a 20,000-character payload in <50ms without catastrophic backtracking', () => {
      const longInnocentText = 'const x = "harmless string content";\n'.repeat(500);
      const start = performance.now();
      const result = redactSensitiveData(longInnocentText);
      const elapsed = performance.now() - start;

      assert.strictEqual(result.wasRedacted, false);
      assert.ok(elapsed < 50, `Execution took ${elapsed.toFixed(2)}ms, expected < 50ms`);
    });
  });

  // =========================================================================
  // Suite 7: sanitizeCommandDescription Behavior
  // =========================================================================
  describe('Suite 7: sanitizeCommandDescription Behavior', () => {
    it('strips terminal execution wrapper prefixes', () => {
      const cmd1 = sanitizeCommandDescription('terminal.execute npm test');
      assert.strictEqual(cmd1, 'npm test');

      const cmd2 = sanitizeCommandDescription('terminal.run git status');
      assert.strictEqual(cmd2, 'git status');
    });

    it('unwraps JSON serialized commands', () => {
      const cmd = sanitizeCommandDescription('{"command": "pytest -v tests/"}');
      assert.strictEqual(cmd, 'pytest -v tests/');
    });

    it('omits dangerous inline scripts from python, node, and bash', () => {
      const py = sanitizeCommandDescription('python3 -c "import os; print(os.environ)"');
      assert.strictEqual(py, 'python3 -c [inline script omitted]');

      const node = sanitizeCommandDescription('node -e "console.log(process.env)"');
      assert.strictEqual(node, 'node -e [inline script omitted]');

      const bash = sanitizeCommandDescription('bash -c "rm -rf /tmp/foo"');
      assert.strictEqual(bash, 'bash -c [inline script omitted]');
    });

    it('sanitizes header flags and CLI secrets', () => {
      const cmd = sanitizeCommandDescription('curl -H "Authorization: Bearer secret-12345" https://api.com');
      assert.strictEqual(cmd, 'curl -H "Authorization: [REDACTED]" https://api.com');
    });

    it('bounds excessively long commands to 300 characters', () => {
      const longCommand = 'echo ' + 'a'.repeat(400);
      const sanitized = sanitizeCommandDescription(longCommand);
      assert.ok(sanitized.length <= 330);
      assert.ok(sanitized.endsWith('... [arguments truncated]'));
    });
  });

  // =========================================================================
  // Suite 8: extractAllowlistToolDetails Strict Allowlist Invariants
  // =========================================================================
  describe('Suite 8: extractAllowlistToolDetails Strict Allowlist Invariants', () => {
    it('classifies all 8 operation types deterministically', () => {
      const testCases: Array<[string, string, string]> = [
        ['filesystem.read', 'read', 'cat file.txt'],
        ['filesystem.write', 'write', 'edit file.txt'],
        ['filesystem.list', 'list', 'ls -la'],
        ['filesystem.search', 'search', 'grep pattern'],
        ['terminal.execute', 'execute', 'npm run build'],
        ['scraapy.fetch', 'browser', 'fetch http://example.com'],
        ['perception.snapshot', 'inspect', 'snapshot screen'],
        ['unknown.tool', 'generic', 'do something'],
      ];

      for (const [toolName, expectedOp, cmd] of testCases) {
        const raw: ToolExecutionData = {
          toolName,
          command: cmd,
          status: 'success',
          startedAt: 1000,
        };
        const safe = extractAllowlistToolDetails(raw);
        assert.strictEqual(safe.operationType, expectedOp, `Expected ${expectedOp} for ${toolName}`);
      }
    });

    it('safely extracts filePath from inputArgs object, JSON string, and command', () => {
      // From object
      const safe1 = extractAllowlistToolDetails({
        toolName: 'filesystem.read',
        inputArgs: { path: 'src/App.tsx' },
        status: 'success',
      });
      assert.strictEqual(safe1.filePath, 'src/App.tsx');

      // From JSON string
      const safe2 = extractAllowlistToolDetails({
        toolName: 'filesystem.read',
        inputArgs: JSON.stringify({ filePath: 'src/index.ts' }),
        status: 'success',
      });
      assert.strictEqual(safe2.filePath, 'src/index.ts');

      // From command
      const safe3 = extractAllowlistToolDetails({
        toolName: 'filesystem.read',
        command: 'filesystem.read "src/main.tsx"',
        status: 'success',
      });
      assert.strictEqual(safe3.filePath, 'src/main.tsx');
    });

    it('redacts secrets found inside extracted filePath', () => {
      const safe = extractAllowlistToolDetails({
        toolName: 'filesystem.read',
        inputArgs: { path: '/home/user/token=mySecretToken123/config.json' },
        status: 'success',
      });
      assert.ok(!safe.filePath?.includes('mySecretToken123'));
      assert.ok(safe.filePath?.includes('[REDACTED]'));
    });

    it('maps status, timestamps, and duration correctly', () => {
      const safeRunning = extractAllowlistToolDetails({
        toolName: 'terminal.execute',
        status: 'running',
        startedAt: 10000,
      });
      assert.strictEqual(safeRunning.status, 'running');
      assert.strictEqual(safeRunning.startTimestamp, 10000);
      assert.strictEqual(safeRunning.completionTimestamp, undefined);

      const safeCompleted = extractAllowlistToolDetails({
        toolName: 'terminal.execute',
        status: 'success',
        startedAt: 10000,
        durationMs: 500,
      });
      assert.strictEqual(safeCompleted.status, 'completed');
      assert.strictEqual(safeCompleted.startTimestamp, 10000);
      assert.strictEqual(safeCompleted.durationMs, 500);
      assert.strictEqual(safeCompleted.completionTimestamp, 10500);
    });

    it('redacts error messages and sanitizes exit codes', () => {
      const safe = extractAllowlistToolDetails({
        toolName: 'terminal.execute',
        status: 'failed',
        error: 'Failed with key sk-abcdef1234567890abcdef123456',
        exitCode: 1,
      });
      assert.strictEqual(safe.status, 'failed');
      assert.ok(!safe.errorInfo?.includes('sk-abcdef'));
      assert.ok(safe.errorInfo?.includes('[REDACTED]'));
    });

    it('attaches associated specialist correctly', () => {
      const safe = extractAllowlistToolDetails(
        { toolName: 'terminal.execute', status: 'success' },
        'cody',
        'Cody'
      );
      assert.ok(safe.associatedSpecialist);
      assert.strictEqual(safe.associatedSpecialist.id, 'cody');
      assert.strictEqual(safe.associatedSpecialist.name, 'Cody');
      assert.strictEqual(safe.associatedSpecialist.role, 'Software engineering');
    });

    it('strips ANSI codes and redacts output preview with bounds', () => {
      const ansiOutput = '\u001b[31mError:\u001b[0m api_key=secretKeyVal123 failed';
      const safe = extractAllowlistToolDetails({
        toolName: 'terminal.execute',
        status: 'failed',
        outputLog: ansiOutput,
      });
      assert.ok(!safe.sanitizedOutputPreview?.includes('\u001b'));
      assert.ok(!safe.sanitizedOutputPreview?.includes('secretKeyVal123'));
      assert.ok(safe.sanitizedOutputPreview?.includes('[REDACTED]'));
    });

    it('strictly drops raw inputArgs, unredacted output, and internal flags', () => {
      const raw: ToolExecutionData = {
        toolName: 'terminal.execute',
        command: 'echo 123',
        inputArgs: { rawSecret: 'do-not-leak' },
        outputLog: 'raw output log',
        output: 'raw output',
        status: 'success',
        stdoutBytes: 1024,
        stderrBytes: 0,
        eventSequence: 42,
        lifecycleConflict: false,
        recoveredFromExecution: true,
      };

      const safe = extractAllowlistToolDetails(raw) as Record<string, unknown>;
      assert.strictEqual(safe.inputArgs, undefined);
      assert.strictEqual(safe.outputLog, undefined);
      assert.strictEqual(safe.output, undefined);
      assert.strictEqual(safe.stdoutBytes, undefined);
      assert.strictEqual(safe.stderrBytes, undefined);
      assert.strictEqual(safe.eventSequence, undefined);
      assert.strictEqual(safe.lifecycleConflict, undefined);
      assert.strictEqual(safe.recoveredFromExecution, undefined);
    });
  });

  // =========================================================================
  // Suite 9: ExecutionActivityEvent Type Invariants
  // =========================================================================
  describe('Suite 9: ExecutionActivityEvent Type Invariants', () => {
    it('supports all 17 canonical granular event types', () => {
      const eventTypes: ExecutionStepItemType[] = [
        'agent.started',
        'agent.working',
        'agent.completed',
        'agent.failed',
        'agent.cancelled',
        'task.queued',
        'task.blocked',
        'tool.started',
        'tool.completed',
        'tool.failed',
        'file.inspected',
        'search.performed',
        'command.executed',
        'verification.completed',
        'context.compacted',
        'delegation.proposed',
        'specialist.requested',
      ];

      assert.strictEqual(eventTypes.length, 17);

      for (const eventType of eventTypes) {
        const event: ExecutionActivityEvent = {
          eventId: `evt-${eventType}`,
          eventType,
          teamId: 'team-alpha',
          timestamp: Date.now(),
          status: 'completed',
          summary: `Executed step ${eventType}`,
          sourceClassification: 'simulated',
        };
        assert.strictEqual(event.eventType, eventType);
        assert.strictEqual(event.sourceClassification, 'simulated');
      }
    });

    it('enforces sourceClassification to simulated or unverified', () => {
      const classifications: ExecutionSourceClassification[] = ['simulated', 'unverified'];
      for (const classification of classifications) {
        const event: ExecutionActivityEvent = {
          eventId: 'evt-class',
          eventType: 'agent.working',
          teamId: 'team-alpha',
          timestamp: Date.now(),
          status: 'running',
          summary: 'Testing classification',
          sourceClassification: classification,
        };
        assert.ok(['simulated', 'unverified'].includes(event.sourceClassification));
      }
    });

    it('supports optional toolDetails on execution event', () => {
      const rawTool: ToolExecutionData = {
        toolName: 'filesystem.read',
        command: 'cat src/App.tsx',
        status: 'success',
        startedAt: 12345,
        durationMs: 30,
      };

      const safeDetails = extractAllowlistToolDetails(rawTool, 'cody', 'Cody');

      const event: ExecutionActivityEvent = {
        eventId: 'evt-tool-1',
        eventType: 'file.inspected',
        teamId: 'team-alpha',
        conversationId: 'conv-123',
        specialistId: 'cody',
        taskId: 'task-456',
        timestamp: 12345,
        status: 'completed',
        summary: 'Inspected src/App.tsx',
        sourceClassification: 'simulated',
        toolDetails: safeDetails,
      };

      assert.strictEqual(event.toolDetails?.toolName, 'filesystem.read');
      assert.strictEqual(event.toolDetails?.operationType, 'read');
      assert.strictEqual(event.toolDetails?.associatedSpecialist?.id, 'cody');
    });
  });

  // =========================================================================
  // Suite 10: Iteration 2 Defensive Input Handling Regression
  // =========================================================================
  describe('Suite 10: Iteration 2 Defensive Input Handling Regression', () => {
    it('handles null, undefined, and non-object tool inputs without throwing', () => {
      const fromNull = extractAllowlistToolDetails(null);
      assert.strictEqual(fromNull.toolName, 'tool');
      assert.strictEqual(fromNull.operationType, 'generic');
      assert.strictEqual(fromNull.status, 'completed');

      const fromUndefined = extractAllowlistToolDetails(undefined);
      assert.strictEqual(fromUndefined.toolName, 'tool');
      assert.strictEqual(fromUndefined.operationType, 'generic');
      assert.strictEqual(fromUndefined.status, 'completed');

      const fromNumber = extractAllowlistToolDetails(12345 as any);
      assert.strictEqual(fromNumber.toolName, 'tool');

      const fromString = extractAllowlistToolDetails('unexpected' as any);
      assert.strictEqual(fromString.toolName, 'tool');
    });

    it('safely handles non-string and whitespace toolName', () => {
      const fromNumName = extractAllowlistToolDetails({ toolName: 999 as any });
      assert.strictEqual(fromNumName.toolName, 'tool');

      const fromObjName = extractAllowlistToolDetails({ toolName: { invalid: true } as any });
      assert.strictEqual(fromObjName.toolName, 'tool');

      const fromWhitespace = extractAllowlistToolDetails({ toolName: '   ' });
      assert.strictEqual(fromWhitespace.toolName, 'tool');
    });

    it('handles command filePath JSON with non-string fields without throwing TypeError', () => {
      const safeNum = extractAllowlistToolDetails({
        toolName: 'filesystem.read',
        command: 'filesystem.read {"path": 123}',
        status: 'success',
      });
      assert.strictEqual(safeNum.filePath, undefined);
      assert.strictEqual(safeNum.operationType, 'read');

      const safeBool = extractAllowlistToolDetails({
        toolName: 'filesystem.read',
        command: 'filesystem.read {"path": true}',
        status: 'success',
      });
      assert.strictEqual(safeBool.filePath, undefined);

      const safeObj = extractAllowlistToolDetails({
        toolName: 'filesystem.read',
        command: 'filesystem.read {"path": {}}',
        status: 'success',
      });
      assert.strictEqual(safeObj.filePath, undefined);
    });

    it('validates timestamps against non-finite values (Infinity, NaN)', () => {
      const safeInf = extractAllowlistToolDetails({
        toolName: 'terminal.execute',
        startedAt: Infinity,
        durationMs: Infinity,
      });
      assert.ok(Number.isFinite(safeInf.startTimestamp));
      assert.strictEqual(safeInf.durationMs, undefined);
      assert.strictEqual(safeInf.completionTimestamp, undefined);

      const safeNaN = extractAllowlistToolDetails({
        toolName: 'terminal.execute',
        startedAt: NaN,
        durationMs: NaN,
      });
      assert.ok(Number.isFinite(safeNaN.startTimestamp));
      assert.strictEqual(safeNaN.durationMs, undefined);
      assert.strictEqual(safeNaN.completionTimestamp, undefined);
    });

    it('extracts errorInfo from Error instances and redacts sensitive content', () => {
      const safeErr = extractAllowlistToolDetails({
        toolName: 'terminal.execute',
        status: 'failed',
        error: new Error('Database failed with sk-proj-1234567890abcdef1234567890') as any,
      });
      assert.strictEqual(safeErr.status, 'failed');
      assert.ok(safeErr.errorInfo?.includes('Database failed with [REDACTED]'));
      assert.ok(!safeErr.errorInfo?.includes('sk-proj-'));
    });
  });

  // =========================================================================
  // Suite 11: Iteration 2 Quoted Secrets with Spaces & Delimiters
  // =========================================================================
  describe('Suite 11: Iteration 2 Quoted Secrets with Spaces & Delimiters', () => {
    it('redacts JSON key-value assignments containing spaces', () => {
      const input = '{"password": "my secret phrase with spaces"}';
      const result = redactSensitiveData(input);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes('my secret phrase with spaces'));
      assert.strictEqual(result.text, '{"password": "[REDACTED]"}');
    });

    it('redacts JSON secrets containing punctuation and delimiters (&, ;, ,)', () => {
      const input1 = '{"password": "p@ss&word;123"}';
      const result1 = redactSensitiveData(input1);
      assert.strictEqual(result1.wasRedacted, true);
      assert.strictEqual(result1.text, '{"password": "[REDACTED]"}');

      const input2 = '{"secret": "foo,bar;baz"}';
      const result2 = redactSensitiveData(input2);
      assert.strictEqual(result2.wasRedacted, true);
      assert.strictEqual(result2.text, '{"secret": "[REDACTED]"}');
    });

    it('redacts quoted CLI flags containing spaces without leaking trailing words', () => {
      const cmd1 = 'curl --password "my secret password" https://example.com';
      const result1 = sanitizeCommandDescription(cmd1);
      assert.ok(!result1.includes('my secret password'));
      assert.ok(!result1.includes('secret password"'));
      assert.strictEqual(result1, 'curl --password [REDACTED] https://example.com');

      const cmd2 = 'app --password="my secret pass" --verbose';
      const result2 = sanitizeCommandDescription(cmd2);
      assert.ok(!result2.includes('my secret pass'));
      assert.ok(result2.includes('--password=[REDACTED]'));

      const cmd3 = 'mysql -u root -p "my secret pass" -h localhost';
      const result3 = sanitizeCommandDescription(cmd3);
      assert.ok(!result3.includes('my secret pass'));
      assert.ok(result3.includes('-p [REDACTED]'));
    });
  });

  // =========================================================================
  // Suite 12: Iteration 2 Inline Script Sanitizer with Escaped Quotes
  // =========================================================================
  describe('Suite 12: Iteration 2 Inline Script Sanitizer with Escaped Quotes', () => {
    it('sanitizes bash -c with escaped quotes without leaking inner secrets or trailing commands', () => {
      const cmd = 'bash -c "echo \\"secret123\\"; rm -rf /"';
      const sanitized = sanitizeCommandDescription(cmd);
      assert.ok(!sanitized.includes('secret123'));
      assert.ok(!sanitized.includes('rm -rf /'));
      assert.strictEqual(sanitized, 'bash -c [inline script omitted]');
    });

    it('sanitizes chained inline commands containing escaped quotes', () => {
      const cmd = 'bash -c "echo \\"secret123\\"; rm -rf /" && echo done';
      const sanitized = sanitizeCommandDescription(cmd);
      assert.ok(!sanitized.includes('secret123'));
      assert.ok(!sanitized.includes('rm -rf /'));
      assert.strictEqual(sanitized, 'bash -c [inline script omitted] && echo done');
    });

    it('sanitizes python3 and node inline scripts with quotes', () => {
      const py = 'python3 -c "import os; print(\\"secret_env\\")"';
      const sanitizedPy = sanitizeCommandDescription(py);
      assert.ok(!sanitizedPy.includes('secret_env'));
      assert.strictEqual(sanitizedPy, 'python3 -c [inline script omitted]');

      const node = 'node -e "console.log(\\"hidden_token\\")"';
      const sanitizedNode = sanitizeCommandDescription(node);
      assert.ok(!sanitizedNode.includes('hidden_token'));
      assert.strictEqual(sanitizedNode, 'node -e [inline script omitted]');
    });
  });

  // =========================================================================
  // Suite 13: Iteration 2 Expanded URL Credential Protocols
  // =========================================================================
  describe('Suite 13: Iteration 2 Expanded URL Credential Protocols', () => {
    it('redacts mongodb+srv connection string credentials', () => {
      const url = 'mongodb+srv://admin:mySecretPass123@cluster0.abcde.mongodb.net/test?retryWrites=true';
      const result = redactSensitiveData(url);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes('mySecretPass123'));
      assert.strictEqual(result.text, 'mongodb+srv://admin:[REDACTED]@cluster0.abcde.mongodb.net/test?retryWrites=true');
    });

    it('redacts redis connection strings with empty username', () => {
      const url = 'redis://:my_master_password@10.0.0.1:6379/0';
      const result = redactSensitiveData(url);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes('my_master_password'));
      assert.strictEqual(result.text, 'redis://:[REDACTED]@10.0.0.1:6379/0');
    });

    it('redacts s3 and file URL credentials', () => {
      const s3Url = 's3://AKIAIOSFODNN7EXAMPLE:secret123@bucket/file';
      const s3Result = redactSensitiveData(s3Url);
      assert.strictEqual(s3Result.wasRedacted, true);
      assert.ok(!s3Result.text.includes('secret123'));
      assert.ok(!s3Result.text.includes('AKIAIOSFODNN7EXAMPLE'));
      assert.strictEqual(s3Result.text, 's3://[REDACTED]:[REDACTED]@bucket/file');

      const fileUrl = 'file://user:secretPass123@localhost/path';
      const fileResult = redactSensitiveData(fileUrl);
      assert.strictEqual(fileResult.wasRedacted, true);
      assert.ok(!fileResult.text.includes('secretPass123'));
      assert.strictEqual(fileResult.text, 'file://user:[REDACTED]@localhost/path');
    });

    it('redacts ftp, sftp, git, and ssh connection credentials', () => {
      const testUrls = [
        ['ftp://admin:ftpSecret@ftp.server.com/dir/file.txt', 'ftp://admin:[REDACTED]@ftp.server.com/dir/file.txt', 'ftpSecret'],
        ['sftp://deployer:sftpPass@sftp.server.com:22/upload', 'sftp://deployer:[REDACTED]@sftp.server.com:22/upload', 'sftpPass'],
        ['git://gituser:gitSecret@git.internal.net/repo.git', 'git://gituser:[REDACTED]@git.internal.net/repo.git', 'gitSecret'],
        ['ssh://sshuser:sshSecret@ssh.internal.net:2222/project.git', 'ssh://sshuser:[REDACTED]@ssh.internal.net:2222/project.git', 'sshSecret'],
        ['amqp://admin:rabbit_secret@broker.internal:5672/vhost', 'amqp://admin:[REDACTED]@broker.internal:5672/vhost', 'rabbit_secret'],
      ];

      for (const [input, expected, secret] of testUrls) {
        const result = redactSensitiveData(input);
        assert.strictEqual(result.wasRedacted, true);
        assert.ok(!result.text.includes(secret));
        assert.strictEqual(result.text, expected);
      }
    });
  });

  // =========================================================================
  // Suite 14: Iteration 2 Authorization Schemes & Private Key Matching
  // =========================================================================
  describe('Suite 14: Iteration 2 Authorization Schemes & Private Key Matching', () => {
    it('redacts Authorization: Token and Authorization: ApiKey headers', () => {
      const tokenHeader = 'Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b';
      const resToken = redactSensitiveData(tokenHeader);
      assert.strictEqual(resToken.wasRedacted, true);
      assert.ok(!resToken.text.includes('9944b091'));
      assert.strictEqual(resToken.text, 'Authorization: [REDACTED]');

      const apiKeyHeader = 'Authorization: ApiKey 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b';
      const resApiKey = redactSensitiveData(apiKeyHeader);
      assert.strictEqual(resApiKey.wasRedacted, true);
      assert.ok(!resApiKey.text.includes('9944b091'));
      assert.strictEqual(resApiKey.text, 'Authorization: [REDACTED]');
    });

    it('preserves Proxy-Authorization header prefix', () => {
      const proxyHeader = 'Proxy-Authorization: Basic dXNlcjpwYXNzd29yZDEyMw==';
      const res = redactSensitiveData(proxyHeader);
      assert.strictEqual(res.wasRedacted, true);
      assert.strictEqual(res.text, 'Proxy-Authorization: [REDACTED]');

      const proxyLower = 'proxy-authorization: Bearer myToken1234567890abcdef';
      const resLower = redactSensitiveData(proxyLower);
      assert.strictEqual(resLower.wasRedacted, true);
      assert.strictEqual(resLower.text, 'Proxy-Authorization: [REDACTED]');
    });

    it('redacts standalone Basic auth tokens from 12 characters', () => {
      const input = 'using credential Basic dXNlcjpwYXNz for request';
      const result = redactSensitiveData(input);
      assert.strictEqual(result.wasRedacted, true);
      assert.ok(!result.text.includes('dXNlcjpwYXNz'));
      assert.strictEqual(result.text, 'using credential Basic [REDACTED] for request');
    });

    it('redacts lowercase PEM private key blocks', () => {
      const pem = `-----begin private key-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
-----end private key-----`;
      const result = redactSensitiveData(pem);
      assert.strictEqual(result.wasRedacted, true);
      assert.strictEqual(result.text, '[REDACTED]');
    });
  });

  // =========================================================================
  // Suite 15: Iteration 2 ExecutionStepStatus Mapping
  // =========================================================================
  describe('Suite 15: Iteration 2 ExecutionStepStatus Mapping', () => {
    it('preserves queued status and does not set completionTimestamp', () => {
      const safe = extractAllowlistToolDetails({
        toolName: 'build.compile',
        status: 'queued',
        startedAt: 1000,
        durationMs: 50,
      });
      assert.strictEqual(safe.status, 'queued');
      assert.strictEqual(safe.startTimestamp, 1000);
      assert.strictEqual(safe.completionTimestamp, undefined);
    });

    it('preserves blocked status and does not set completionTimestamp', () => {
      const safe = extractAllowlistToolDetails({
        toolName: 'deploy.step',
        status: 'blocked',
        startedAt: 2000,
        durationMs: 100,
      });
      assert.strictEqual(safe.status, 'blocked');
      assert.strictEqual(safe.startTimestamp, 2000);
      assert.strictEqual(safe.completionTimestamp, undefined);
    });

    it('computes completionTimestamp for completed, failed, and cancelled when durationMs is provided', () => {
      const safeCompleted = extractAllowlistToolDetails({
        toolName: 'test.run',
        status: 'completed',
        startedAt: 1000,
        durationMs: 200,
      });
      assert.strictEqual(safeCompleted.status, 'completed');
      assert.strictEqual(safeCompleted.completionTimestamp, 1200);

      const safeFailed = extractAllowlistToolDetails({
        toolName: 'test.run',
        status: 'failed',
        startedAt: 1000,
        durationMs: 200,
      });
      assert.strictEqual(safeFailed.status, 'failed');
      assert.strictEqual(safeFailed.completionTimestamp, 1200);

      const safeCancelled = extractAllowlistToolDetails({
        toolName: 'test.run',
        status: 'cancelled',
        startedAt: 1000,
        durationMs: 200,
      });
      assert.strictEqual(safeCancelled.status, 'cancelled');
      assert.strictEqual(safeCancelled.completionTimestamp, 1200);
    });
  });

  // =========================================================================
  // Suite 16: Security Hardening - ReDoS Defense, Underscore API Key Scrubbing & Base64 Padding
  // =========================================================================
  describe('Suite 16: Security Hardening - ReDoS Defense, Underscore API Key Scrubbing & Base64 Padding', () => {
    it('withstands catastrophic backtracking with 10,000 backslashes after unclosed quote in <50ms', () => {
      const adversaryInput = 'python -c "' + '\\'.repeat(10000);
      const start = performance.now();
      const sanitized = sanitizeCommandDescription(adversaryInput);
      const duration = performance.now() - start;

      assert.ok(duration < 50, `Execution took ${duration.toFixed(2)}ms, expected <50ms`);
      assert.ok(typeof sanitized === 'string');
    });

    it('withstands catastrophic backtracking across varied backslash lengths without hanging', () => {
      for (const n of [10, 20, 25, 50, 100, 1000, 5000, 10000]) {
        const input = 'bash -c "' + '\\'.repeat(n);
        const t0 = performance.now();
        const res = sanitizeCommandDescription(input);
        const elapsed = performance.now() - t0;
        assert.ok(elapsed < 20, `N=${n} took ${elapsed.toFixed(2)}ms, expected <20ms`);
        assert.ok(typeof res === 'string');
      }
    });

    it('redacts API keys preceded by underscores (OpenAI, Anthropic, Google, GitHub, AWS, Slack)', () => {
      // 1. OpenAI key preceded by underscore in file path
      const openAiPath = '/path/to/openai_sk-proj-012345678901234567890123456789_keys.json';
      const openAiResult = redactSensitiveData(openAiPath);
      assert.strictEqual(openAiResult.wasRedacted, true);
      assert.ok(!openAiResult.text.includes('sk-proj-012345678901234567890123456789'));
      assert.strictEqual(openAiResult.text, '/path/to/openai_[REDACTED].json');

      // 2. Anthropic key preceded by underscore in export statement
      const anthropicInput = 'export MY_KEY_sk-ant-api03-abcdef1234567890abcdef123456789012345=val';
      const anthropicResult = redactSensitiveData(anthropicInput);
      assert.strictEqual(anthropicResult.wasRedacted, true);
      assert.ok(!anthropicResult.text.includes('sk-ant-api03-abcdef1234567890abcdef123456789012345'));
      assert.strictEqual(anthropicResult.text, 'export MY_KEY_[REDACTED]=val');

      // 3. Google API key preceded by underscore
      const googleInput = 'const google_AIzaSyA1234567890abcdefghijklmnopqrstuv = true;';
      const googleResult = redactSensitiveData(googleInput);
      assert.strictEqual(googleResult.wasRedacted, true);
      assert.ok(!googleResult.text.includes('AIzaSyA1234567890abcdefghijklmnopqrstuv'));
      assert.strictEqual(googleResult.text, 'const google_[REDACTED] = true;');

      // 4. GitHub personal access tokens preceded by underscore
      const ghpInput = 'var my_ghp_1234567890abcdefghijklmnopqrstuvwxyz = 1;';
      const ghpResult = redactSensitiveData(ghpInput);
      assert.strictEqual(ghpResult.wasRedacted, true);
      assert.ok(!ghpResult.text.includes('ghp_1234567890abcdefghijklmnopqrstuvwxyz'));
      assert.strictEqual(ghpResult.text, 'var my_[REDACTED] = 1;');

      const patInput = 'var repo_github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz01234567890123456789 = 2;';
      const patResult = redactSensitiveData(patInput);
      assert.strictEqual(patResult.wasRedacted, true);
      assert.ok(!patResult.text.includes('github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz01234567890123456789'));
      assert.strictEqual(patResult.text, 'var repo_[REDACTED] = 2;');

      // 5. AWS Access Key ID preceded by underscore
      const awsInput = 'export MY_AWS_AKIAIOSFODNN7EXAMPLE=prod';
      const awsResult = redactSensitiveData(awsInput);
      assert.strictEqual(awsResult.wasRedacted, true);
      assert.ok(!awsResult.text.includes('AKIAIOSFODNN7EXAMPLE'));
      assert.strictEqual(awsResult.text, 'export MY_AWS_[REDACTED]=prod');

      // 6. Slack token preceded by underscore
      const mockSlack = ['xox', 'b-123456789012-1234567890123-abcdefghijklmnopqrstuvwx'].join('');
      const slackInput = `const bot_${mockSlack} = true;`;
      const slackResult = redactSensitiveData(slackInput);
      assert.strictEqual(slackResult.wasRedacted, true);
      assert.ok(!slackResult.text.includes(mockSlack));
      assert.strictEqual(slackResult.text, 'const bot_[REDACTED] = true;');
    });

    it('redacts standalone Bearer and Basic tokens with trailing padding without leaving dangling ==', () => {
      // 1. Double padding (==)
      const bearerDouble = 'Using Bearer dXNlcjpwYXNzd29yZA== for authentication';
      const bearerDoubleRes = redactSensitiveData(bearerDouble);
      assert.strictEqual(bearerDoubleRes.wasRedacted, true);
      assert.strictEqual(bearerDoubleRes.text, 'Using Bearer [REDACTED] for authentication');

      const bearerStandalone = 'Bearer dXNlcjpwYXNzd29yZA==';
      const bearerStandaloneRes = redactSensitiveData(bearerStandalone);
      assert.strictEqual(bearerStandaloneRes.wasRedacted, true);
      assert.strictEqual(bearerStandaloneRes.text, 'Bearer [REDACTED]');

      const basicDouble = 'Credentials: Basic dXNlcjpwYXNzd29yZA==';
      const basicDoubleRes = redactSensitiveData(basicDouble);
      assert.strictEqual(basicDoubleRes.wasRedacted, true);
      assert.strictEqual(basicDoubleRes.text, 'Credentials: Basic [REDACTED]');

      const basicStandalone = 'Basic dXNlcjpwYXNzd29yZA==';
      const basicStandaloneRes = redactSensitiveData(basicStandalone);
      assert.strictEqual(basicStandaloneRes.wasRedacted, true);
      assert.strictEqual(basicStandaloneRes.text, 'Basic [REDACTED]');

      // 2. Single padding (=)
      const bearerSingle = 'Token is Bearer dXNlcjpwYXNzd29yZA=';
      const bearerSingleRes = redactSensitiveData(bearerSingle);
      assert.strictEqual(bearerSingleRes.wasRedacted, true);
      assert.strictEqual(bearerSingleRes.text, 'Token is Bearer [REDACTED]');

      const basicSingle = 'Token is Basic dXNlcjpwYXNzd29yZA=';
      const basicSingleRes = redactSensitiveData(basicSingle);
      assert.strictEqual(basicSingleRes.wasRedacted, true);
      assert.strictEqual(basicSingleRes.text, 'Token is Basic [REDACTED]');

      // 3. Quoted tokens in JSON payloads
      const jsonPayload = '{"auth": "Bearer dXNlcjpwYXNzd29yZA==", "basic": "Basic dXNlcjpwYXNzd29yZA=="}';
      const jsonRes = redactSensitiveData(jsonPayload);
      assert.strictEqual(jsonRes.wasRedacted, true);
      assert.strictEqual(jsonRes.text, '{"auth": "Bearer [REDACTED]", "basic": "Basic [REDACTED]"}');

      // 4. Tokens followed by punctuation
      const punctInput = 'Bearer dXNlcjpwYXNzd29yZA==, Basic dXNlcjpwYXNzd29yZA==; and more';
      const punctRes = redactSensitiveData(punctInput);
      assert.strictEqual(punctRes.wasRedacted, true);
      assert.strictEqual(punctRes.text, 'Bearer [REDACTED], Basic [REDACTED]; and more');
    });
  });
});
