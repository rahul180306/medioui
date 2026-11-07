export const COMMON_CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'md', 'yaml', 'yml',
  'sh', 'bash', 'sql', 'rs', 'go', 'c', 'cpp', 'h', 'hpp', 'toml', 'svg',
  'png', 'jpg', 'jpeg', 'gif', 'ico', 'env', 'txt', 'log', 'lock', 'vue', 'svelte'
]);

export function isPathReference(raw: string): boolean {
  const trimmed = raw.trim().replace(/^[`'"]+|[`'"]+$/g, '');
  if (!trimmed || trimmed.includes(' ') || trimmed.length > 180) return false;
  if (trimmed.includes('://')) return false;
  if (/^\d+(?:\/\d+)+$/.test(trimmed)) return false;

  // Dotfiles or dotfolders: e.g. .mediobot, .gitignore, .env, .eslintrc, .agents
  if (/^\.[a-zA-Z0-9_-][a-zA-Z0-9_.-]*(?:\/[a-zA-Z0-9_.-]+)*\/?$/.test(trimmed)) {
    return true;
  }

  // Directory paths ending with slash: e.g. src/, packages/, apps/command-center/, ./src/
  if (/^(?:\.{1,2}\/|[a-zA-Z0-9_-]+\/)[a-zA-Z0-9_\-./\\]*\/$/.test(trimmed) || /^[a-zA-Z0-9_-]+\/$/.test(trimmed)) {
    return true;
  }

  // Code files with recognized extension: calculator.js, index.html, prime_check.py, App.tsx
  const extMatch = trimmed.match(/\.([a-zA-Z0-9]{1,10})(?::\d+(?::\d+)?)?$/);
  if (extMatch && COMMON_CODE_EXTENSIONS.has(extMatch[1].toLowerCase())) {
    return true;
  }

  // Relative/workspace paths with slashes: src/index.ts, tests/calculator.test.js
  if (trimmed.includes('/') && /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+(?::\d+)?$/.test(trimmed)) {
    return true;
  }

  return false;
}

export function sanitizeExecutiveNarrative(text: string): string {
  if (!text) return '';
  return text
    // Remove "Execution evidence reconciliation: ..." blocks and anything following it about bounded-execution-state
    .replace(/(?:^|\n\n?)Execution evidence reconciliation:[\s\S]*?(?=\n\n|$)/gi, '')
    // Remove standalone "Per bounded-execution-state..." sentences or paragraphs
    .replace(/(?:^|\n\n?)Per bounded-execution-state[\s\S]*?(?=\n\n|$)/gi, '')
    // Remove "Executive conclusion: " prefix so answers start naturally
    .replace(/^Executive conclusion:\s*/gi, '')
    .replace(/\nExecutive conclusion:\s*/gi, '\n')
    // Remove robotic evidence parentheticals e.g. (evidence: filesystem.list succeeded; entries=4)
    .replace(/\s*\((?:evidence|audit|telemetry):\s*[^)]+\)/gi, '')
    // Remove robotic specialist references e.g. "and Cody's specialist result."
    .replace(/\s*(?:and|,)?\s*(?:this is confirmed by|as confirmed by|according to)?\s*Cody(?:'s)? specialist result\.?/gi, '')
    // Remove robotic audit markers
    .replace(/\bworker completed\b/gi, '')
    .replace(/\b\d+\s+evidence records?\b/gi, '')
    .replace(/[^\S\r\n]{2,}/g, ' ')
    .replace(/[^\S\r\n]+\./g, '.')
    .replace(/\.\s*\./g, '.')
    .trim();
}
