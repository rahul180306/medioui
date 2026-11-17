import type { ToolExecutionData } from '../../types';
import type {
  SafeToolExecutionDetails,
  ExecutionStepStatus,
  ToolOperationType,
} from '../../types/executionActivity';
import { getMediobotPresentation } from '../mediobots/presentation';

/**
 * Result of a sensitive data redaction pass.
 */
export interface RedactionResult {
  readonly text: string;
  readonly wasRedacted: boolean;
  readonly matchCount: number;
}

interface PatternRule {
  readonly name: string;
  readonly regex: RegExp;
  readonly replace: string | ((substring: string, ...args: any[]) => string);
}

/**
 * ReDoS-safe regex patterns ordered by precedence to redact credentials, tokens,
 * keys, and sensitive environment variables without false positives or catastrophic backtracking.
 */
const SENSITIVE_PATTERNS: ReadonlyArray<PatternRule> = [
  // 1. Private Key Blocks (PEM & PGP) - case-insensitive
  {
    name: 'privateKeyBlock',
    regex: /(?:-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9_-]+ )?PRIVATE KEY-----|-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]*?-----END PGP PRIVATE KEY BLOCK-----)/gi,
    replace: '[REDACTED]',
  },

  // 2. Authorization & Proxy-Authorization Headers (Bearer, Basic, Token, ApiKey)
  {
    name: 'authHeader',
    regex: /(?:authorization|proxy-authorization)\s*:\s*(?:Bearer|Basic|Token|ApiKey)\s+[^\s,;]+/gi,
    replace: (m: string) =>
      /^proxy-authorization/i.test(m)
        ? 'Proxy-Authorization: [REDACTED]'
        : 'Authorization: [REDACTED]',
  },

  // 3. API Key & Auth Token Headers
  {
    name: 'apiKeyHeader',
    regex: /(?:x-api-key|x-auth-token|api-key)\s*[:=]\s*(['"]?)(?!\[REDACTED\])[^\s"';&]+(\1)/gi,
    replace: 'x-api-key: [REDACTED]',
  },

  // 4. Cookie & Set-Cookie Headers
  {
    name: 'cookieHeader',
    regex: /(?:cookie|set-cookie)\s*:\s*(?!\[REDACTED\])[^\r\n"']+/gi,
    replace: 'Cookie: [REDACTED]',
  },

  // 5. Embedded URL Credentials across general protocols & connection strings (empty username supported)
  {
    name: 'urlCredentials',
    regex: /\b([a-zA-Z][a-zA-Z0-9+.-]*:\/\/(?:[^\s:@/]*:)?)(?!\[REDACTED\])[^@\s/]+(@[^\s/]+)/gi,
    replace: '$1[REDACTED]$2',
  },

  // 6. Sensitive CLI Flags (handling quoted values with whitespace/delimiters)
  {
    name: 'cliFlags',
    regex: /(?<=\s|^)(--(?:password|passwd|pwd|secret|token|api-key|apiKey|access-token|client-secret|private-key)[=\s]+)(?:(["'])(?!\[REDACTED\])[\s\S]*?\2|(?!\[REDACTED\])[^\s"']+)/gi,
    replace: '$1[REDACTED]',
  },
  {
    name: 'shortPasswordFlag',
    regex: /(?<=\s|^)(-p\s+)(?:(["'])(?!\[REDACTED\])[\s\S]*?\2|(?!\[REDACTED\])[^\s"']+)/g,
    replace: '$1[REDACTED]',
  },
  {
    name: 'shortUserPasswordFlag',
    regex: /(?<=\s|^)(-u\s+[a-zA-Z0-9_.-]+:)(?:(["'])(?!\[REDACTED\])[\s\S]*?\2|(?!\[REDACTED\])[^\s"']+)/gi,
    replace: '$1[REDACTED]',
  },

  // 7. Sensitive Environment Variables (e.g. OPENAI_API_KEY=..., DATABASE_URL=...)
  {
    name: 'sensitiveEnvVars',
    regex: /\b([A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|AUTH|CREDENTIAL|DATABASE_URL|REDIS_URL|CONNECTION_STRING)[A-Z0-9_]*\s*=\s*)(['"]?)(?!\[REDACTED\])[^\s"'\r\n]+\2/g,
    replace: '$1$2[REDACTED]$2',
  },

  // 8. Key-Value & JSON Property Assignments (supporting quoted values with spaces and delimiters)
  {
    name: 'sensitiveAssignments',
    regex: /((?:["']\b)?(?:password|passwd|pwd|secret|token|api_?key|apiKey|access_?token|auth_?token|client_?secret|private_?key)\b(?:["'])?\s*[:=]\s*)(?:(["'])(?!\[REDACTED\])[\s\S]*?\2|(?!\[REDACTED\])[^\s"'&,;}{]+)/gi,
    replace: (_match: string, prefix: string, quote?: string) =>
      quote ? `${prefix}${quote}[REDACTED]${quote}` : `${prefix}[REDACTED]`,
  },

  // 9. Provider API Keys (matching tokens preceded by underscores, boundaries, or non-alphanumeric chars)
  // OpenAI: sk-...
  {
    name: 'openAiKey',
    regex: /(?<![a-zA-Z0-9])sk-(?:proj-|admin-)?[a-zA-Z0-9_-]{20,}\b/g,
    replace: '[REDACTED]',
  },
  // Anthropic: sk-ant-...
  {
    name: 'anthropicKey',
    regex: /(?<![a-zA-Z0-9])sk-ant-(?:api\d\d-)?[a-zA-Z0-9_-]{20,}\b/g,
    replace: '[REDACTED]',
  },
  // Google / Gemini: AIza...
  {
    name: 'googleKey',
    regex: /(?<![a-zA-Z0-9])AIza[0-9A-Za-z_-]{35}\b/g,
    replace: '[REDACTED]',
  },
  // GitHub: ghp_..., gho_..., github_pat_...
  {
    name: 'githubKey',
    regex: /(?<![a-zA-Z0-9])(?:(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9_]{50,})\b/g,
    replace: '[REDACTED]',
  },
  // AWS Access Key ID: AKIA..., ASIA...
  {
    name: 'awsKey',
    regex: /(?<![a-zA-Z0-9])(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
    replace: '[REDACTED]',
  },
  // Slack: xoxb-..., xoxp-...
  {
    name: 'slackKey',
    regex: /(?<![a-zA-Z0-9])xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,32}\b/g,
    replace: '[REDACTED]',
  },

  // 10. Standalone Bearer & Basic Tokens (supporting padding `={0,2}` without leaving dangling equals)
  {
    name: 'bearerToken',
    regex: /\bBearer\s+(?!\[REDACTED\])[a-zA-Z0-9_\-\.=:+\/]{14,}={0,2}(?![a-zA-Z0-9_\-\.=:+\/])/gi,
    replace: 'Bearer [REDACTED]',
  },
  {
    name: 'basicAuthToken',
    regex: /\bBasic\s+(?!\[REDACTED\])[a-zA-Z0-9+/=]{10,}={0,2}(?![a-zA-Z0-9+/=])/gi,
    replace: 'Basic [REDACTED]',
  },
];

/**
 * Scans input text and redacts sensitive patterns, returning the sanitized string
 * along with match count and whether any redactions occurred.
 */
export function redactSensitiveData(input: string): RedactionResult {
  if (!input || typeof input !== 'string') {
    return {
      text: typeof input === 'string' ? input : '',
      wasRedacted: false,
      matchCount: 0,
    };
  }

  let text = input;
  let matchCount = 0;

  for (const pattern of SENSITIVE_PATTERNS) {
    const matches = text.match(pattern.regex);
    if (matches && matches.length > 0) {
      matchCount += matches.length;
      text = text.replace(pattern.regex, pattern.replace as any);
    }
  }

  return {
    text,
    wasRedacted: matchCount > 0,
    matchCount,
  };
}

/**
 * Sanitizes command string for safe presentation:
 * - Strips runner wrapper prefixes (`terminal.execute`, `terminal.run`)
 * - Extracts inner command from serialized JSON payloads
 * - Omits dangerous inline scripts (`python -c`, `bash -c`, `node -e`), correctly handling escaped quotes
 * - Redacts sensitive CLI flags and headers
 * - Bounds long command lines to 300 characters
 */
export function sanitizeCommandDescription(rawCommand: string): string {
  if (!rawCommand || typeof rawCommand !== 'string') return '';
  let cmd = rawCommand.trim();

  // Strip terminal execution prefix
  cmd = cmd.replace(/^terminal\.(?:execute|run)\s+/i, '');

  // If serialized JSON object, parse command property
  if (cmd.startsWith('{') && cmd.endsWith('}')) {
    try {
      const parsed = JSON.parse(cmd);
      if (typeof parsed.command === 'string') {
        cmd = parsed.command;
      } else if (typeof parsed.cmd === 'string') {
        cmd = parsed.cmd;
      }
    } catch {
      // Keep plain text if not valid JSON
    }
  }

  // Strip inline scripts (python -c "...", bash -c "...", node -e "...")
  // Robustly handle escaped quotes inside quoted script arguments without ReDoS backtracking
  cmd = cmd.replace(
    /\b(python3?|node|bash|sh|zsh)\s+(-c|-e)\s+(?:(['"])((?:\\.|(?!\3)[^\\])*?)\3|[^\s]+)/gi,
    (_match, runner, flag) => `${runner} ${flag} [inline script omitted]`
  );

  // Redact header flags (-H, --header) preserving Proxy-Authorization
  cmd = cmd.replace(
    /(?:-(?:H|-header)\s+['"])(?:Authorization|Proxy-Authorization):\s*[^'"]+['"]/gi,
    (match) =>
      /proxy-authorization/i.test(match)
        ? '-H "Proxy-Authorization: [REDACTED]"'
        : '-H "Authorization: [REDACTED]"'
  );

  // Redact sensitive CLI flags (handling quotes with spaces cleanly)
  cmd = cmd.replace(
    /(?<=\s|^)(--(?:password|passwd|pwd|secret|token|api-key|apiKey|access-token|client-secret|private-key)[=\s]+)(?:(["'])(?!\[REDACTED\])[\s\S]*?\2|(?!\[REDACTED\])[^\s"']+)/gi,
    '$1[REDACTED]'
  );
  cmd = cmd.replace(
    /(?<=\s|^)(-p\s+)(?:(["'])(?!\[REDACTED\])[\s\S]*?\2|(?!\[REDACTED\])[^\s"']+)/g,
    '$1[REDACTED]'
  );
  cmd = cmd.replace(
    /(?<=\s|^)(-u\s+[a-zA-Z0-9_.-]+:)(?:(["'])(?!\[REDACTED\])[\s\S]*?\2|(?!\[REDACTED\])[^\s"']+)/gi,
    '$1[REDACTED]'
  );

  // Run general redaction engine
  cmd = redactSensitiveData(cmd).text;

  // Bound command length to 300 characters
  if (cmd.length > 300) {
    cmd = cmd.slice(0, 300) + '... [arguments truncated]';
  }

  return cmd;
}

/**
 * Extracts and strictly allowlists safe tool execution details from raw ToolExecutionData.
 * Arbitrary raw parameters, credentials, environment variables, and unconstrained outputs
 * are omitted or sanitized.
 *
 * Fully defensive against null, undefined, non-object, and schema-deviant inputs.
 */
type ToolExecutionPresentationInput = Omit<Partial<ToolExecutionData>, 'status'> & {
  // Timeline stores can include lifecycle states that predate the narrower
  // tool-result contract; keep them renderable without widening that contract.
  status?: ToolExecutionData['status'] | 'queued' | 'blocked';
};

export function extractAllowlistToolDetails(
  tool?: ToolExecutionPresentationInput | null,
  specialistId?: string,
  specialistName?: string
): SafeToolExecutionDetails {
  const safeTool =
    tool && typeof tool === 'object' ? tool : ({} as Partial<ToolExecutionData>);
  const toolName =
    typeof safeTool.toolName === 'string' && safeTool.toolName.trim()
      ? safeTool.toolName.trim()
      : 'tool';
  const lowerName = toolName.toLowerCase();
  const rawCommand =
    typeof safeTool.command === 'string' ? safeTool.command.trim() : '';
  const lowerCommand = rawCommand.toLowerCase();

  // 1. Map operationType to one of the 8 allowed literals
  let operationType: ToolOperationType = 'generic';
  if (
    lowerName.includes('read') ||
    lowerCommand.startsWith('filesystem.read') ||
    lowerName === 'cat'
  ) {
    operationType = 'read';
  } else if (
    lowerName.includes('write') ||
    lowerName.includes('edit') ||
    lowerName.includes('patch') ||
    lowerCommand.startsWith('filesystem.write') ||
    lowerCommand.startsWith('filesystem.edit')
  ) {
    operationType = 'write';
  } else if (
    lowerName.includes('list') ||
    lowerName.includes('dir') ||
    lowerName === 'ls' ||
    lowerCommand.startsWith('filesystem.list')
  ) {
    operationType = 'list';
  } else if (
    lowerName.includes('search') ||
    lowerName.includes('grep') ||
    lowerName.includes('find') ||
    lowerCommand.startsWith('filesystem.search') ||
    lowerCommand.startsWith('project.search')
  ) {
    operationType = 'search';
  } else if (
    lowerName.includes('terminal') ||
    lowerName.includes('execute') ||
    lowerName.includes('run') ||
    lowerName === 'bash' ||
    lowerName === 'sh' ||
    lowerCommand.startsWith('terminal.')
  ) {
    operationType = 'execute';
  } else if (
    lowerName.includes('browser') ||
    lowerName.includes('web') ||
    lowerName.includes('scraapy') ||
    lowerName.includes('crawl') ||
    lowerName.includes('fetch')
  ) {
    operationType = 'browser';
  } else if (
    lowerName.includes('inspect') ||
    lowerName.includes('audit') ||
    lowerName.includes('perception')
  ) {
    operationType = 'inspect';
  }

  // 2. Safe filePath extraction
  let filePath: string | undefined;
  if (safeTool.inputArgs) {
    if (typeof safeTool.inputArgs === 'object' && safeTool.inputArgs !== null) {
      const args = safeTool.inputArgs as Record<string, unknown>;
      const candidate =
        args.path ??
        args.filePath ??
        args.file ??
        args.Path ??
        args.directory ??
        args.dir ??
        args.Directory ??
        args.target;
      if (typeof candidate === 'string') filePath = candidate.trim();
    } else if (typeof safeTool.inputArgs === 'string') {
      try {
        const parsed = JSON.parse(safeTool.inputArgs);
        if (typeof parsed === 'object' && parsed !== null) {
          const candidate =
            parsed.path ??
            parsed.filePath ??
            parsed.file ??
            parsed.Path ??
            parsed.directory ??
            parsed.dir ??
            parsed.target;
          if (typeof candidate === 'string') filePath = candidate.trim();
        }
      } catch {
        // Not a JSON object
      }
    }
  }

  if (!filePath && rawCommand) {
    if (/^filesystem\.(?:read|write|edit|list)\s+/i.test(rawCommand)) {
      const arg = rawCommand.replace(/^filesystem\.(?:read|write|edit|list)\s+/i, '').trim();
      let candidate: unknown = arg.replace(/^["']|["']$/g, '');
      if (typeof candidate === 'string' && candidate.startsWith('{')) {
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && typeof parsed === 'object') {
            const p = parsed.path ?? parsed.directory ?? parsed.filePath;
            if (typeof p === 'string') {
              candidate = p;
            } else {
              candidate = undefined;
            }
          }
        } catch {
          // Keep raw candidate string
        }
      }
      if (typeof candidate === 'string' && candidate.trim()) {
        filePath = candidate.trim();
      }
    }
  }

  if (typeof filePath === 'string') {
    filePath = redactSensitiveData(filePath.replace(/^["']|["']$/g, '')).text.trim();
    if (!filePath) filePath = undefined;
  } else {
    filePath = undefined;
  }

  // 3. Command description extraction
  let commandDescription: string | undefined;
  if (rawCommand) {
    const sanitized = sanitizeCommandDescription(rawCommand);
    if (sanitized && (operationType === 'execute' || sanitized !== filePath)) {
      commandDescription = sanitized;
    }
  } else if (typeof safeTool.inputArgs === 'object' && safeTool.inputArgs !== null) {
    const cmdCandidate =
      (safeTool.inputArgs as Record<string, unknown>).command ??
      (safeTool.inputArgs as Record<string, unknown>).cmd;
    if (typeof cmdCandidate === 'string') {
      commandDescription = sanitizeCommandDescription(cmdCandidate);
    }
  }

  // 4. Timestamps & duration
  const startTimestamp =
    typeof safeTool.startedAt === 'number' &&
    Number.isFinite(safeTool.startedAt) &&
    safeTool.startedAt > 0
      ? safeTool.startedAt
      : Date.now();
  const durationMs =
    typeof safeTool.durationMs === 'number' &&
    Number.isFinite(safeTool.durationMs) &&
    safeTool.durationMs >= 0
      ? safeTool.durationMs
      : undefined;

  // 5. Status mapping (preserving queued and blocked explicitly)
  let status: ExecutionStepStatus = 'completed';
  const rawStatus = typeof safeTool.status === 'string' ? (safeTool.status as string) : '';
  if (rawStatus === 'running') status = 'running';
  else if (rawStatus === 'failed') status = 'failed';
  else if (rawStatus === 'cancelled') status = 'cancelled';
  else if (rawStatus === 'queued') status = 'queued';
  else if (rawStatus === 'blocked') status = 'blocked';
  else status = 'completed';

  const completionTimestamp =
    status !== 'running' && status !== 'queued' && status !== 'blocked' && durationMs !== undefined
      ? startTimestamp + durationMs
      : undefined;

  // 6. Error info
  let errorInfo: string | undefined;
  let rawError: string | undefined;
  if (typeof safeTool.error === 'string') {
    rawError = safeTool.error;
  } else if (
    safeTool.error &&
    typeof safeTool.error === 'object' &&
    'message' in safeTool.error &&
    typeof (safeTool.error as any).message === 'string'
  ) {
    rawError = (safeTool.error as any).message;
  }

  if (rawError) {
    errorInfo = redactSensitiveData(rawError).text;
  } else if (status === 'failed') {
    if (typeof safeTool.exitCode === 'number' && safeTool.exitCode !== 0) {
      errorInfo = `Process exited with code ${safeTool.exitCode}`;
    } else if (safeTool.terminationSignal) {
      errorInfo = `Process terminated with signal ${safeTool.terminationSignal}`;
    } else if (safeTool.failureCategory) {
      errorInfo = safeTool.failureCategory;
    } else if (safeTool.errorCode) {
      errorInfo = safeTool.errorCode;
    } else if (safeTool.recoveryReason) {
      errorInfo = safeTool.recoveryReason;
    }
  }

  // 7. Associated specialist attribution
  let associatedSpecialist: SafeToolExecutionDetails['associatedSpecialist'] | undefined;
  if (specialistId || specialistName) {
    const pres = getMediobotPresentation(specialistId, specialistName);
    associatedSpecialist = {
      id: specialistId || pres.id,
      name: specialistName || pres.displayName,
      ...(pres.specialization ? { role: pres.specialization } : {}),
    };
  }

  // 8. Sanitized output preview
  let sanitizedOutputPreview: string | undefined;
  const rawOutput =
    safeTool.outputLog ?? safeTool.output ?? (status === 'failed' ? rawError : undefined);

  if (rawOutput && typeof rawOutput === 'string') {
    // Strip ANSI escape sequences
    let cleaned = rawOutput.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
    cleaned = redactSensitiveData(cleaned).text;
    const lines = cleaned.split('\n');
    if (lines.length > 25 || cleaned.length > 1000) {
      cleaned = lines.slice(0, 25).join('\n').slice(0, 1000) + '\n... [output truncated]';
    }
    sanitizedOutputPreview = cleaned;
  } else if (status === 'running') {
    sanitizedOutputPreview = 'Executing process...';
  }

  // Strict allowlisting: only safe properties returned
  const safeDetails: SafeToolExecutionDetails = {
    toolName,
    operationType,
    startTimestamp,
    status,
    ...(filePath !== undefined ? { filePath } : {}),
    ...(commandDescription !== undefined ? { commandDescription } : {}),
    ...(completionTimestamp !== undefined ? { completionTimestamp } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(errorInfo !== undefined ? { errorInfo } : {}),
    ...(associatedSpecialist !== undefined ? { associatedSpecialist } : {}),
    ...(sanitizedOutputPreview !== undefined ? { sanitizedOutputPreview } : {}),
  };

  return safeDetails;
}
