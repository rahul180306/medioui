/**
 * Browser-safe dynamic specialist recruitment.
 *
 * Evaluates the user's objective to determine which specialists should be
 * dynamically recruited onto Maestro's team for this goal.
 * Pure TypeScript with ZERO Node.js runtime dependencies (no crypto, fs, sqlite).
 */

export interface CandidateSpecialist {
  readonly id: string;
  readonly name: string;
  readonly role?: string;
  readonly capabilities?: ReadonlyArray<string>;
}

export function recruitSpecialistsForObjective(
  objective: string,
  candidates: ReadonlyArray<CandidateSpecialist>
): string[] {
  const trimmed = objective.trim().toLowerCase();
  if (!trimmed) return [];

  // 1. Pure greetings and conversational identity questions need NO specialists
  const isGreeting = /^(?:hi|hey|hello|yo|greetings|good\s+(?:morning|afternoon|evening|day)|howdy|sup)(?:[!?.]|\s|$)/i.test(trimmed);
  const isIdentity = /^(?:who are you|what are you|what can you do|help me|status|what is your status)(?:[!?.]|\s|$)/i.test(trimmed);
  if (isGreeting || isIdentity) {
    return [];
  }

  // 2. Pure informational questions answered directly by Maestro from context
  const isDirectInfo =
    /\b(how many|what (?:are the )?total|count|list|show|what files|what are the files|project structure|overview of(?: the)? project)\b/i.test(trimmed) &&
    !/\b(implement|code|write|edit|refactor|test|run|build|create|fix|debug|benchmark|delete|remove)\b/i.test(trimmed);
  if (isDirectInfo) {
    return [];
  }

  const recruited = new Set<string>();

  const findId = (roleOrName: string) => {
    const match = candidates.find(
      (c) =>
        c.id.toLowerCase() === roleOrName.toLowerCase() ||
        c.name.toLowerCase() === roleOrName.toLowerCase() ||
        (c.role && c.role.toLowerCase().includes(roleOrName.toLowerCase()))
    );
    return match ? match.id : null;
  };

  // Documentation inquiries -> Doc specialist
  if (/\b(doc|docs|documentation|api reference|api signature|official guide|spec|specification|version matrix|breaking change)\b/i.test(trimmed)) {
    const docId = findId('doc');
    if (docId) recruited.add(docId);
  }

  // Research, tradeoffs, architectural exploration -> Research specialist
  if (/\b(research|investigate|compare|tradeoff|trade-offs|alternatives|feasibility|best practices?|benchmark)\b/i.test(trimmed)) {
    const resId = findId('research');
    if (resId) recruited.add(resId);
  }

  // UI, scraping, design extraction -> Scraapy specialist
  if (/\b(scrape|crawler?|extract ui|component extraction|animation reference|design reference|figma|scraapy)\b/i.test(trimmed)) {
    const scrId = findId('scraapy');
    if (scrId) recruited.add(scrId);
  }

  // Coding, implementation, bug fixes, refactoring -> Cody
  if (/\b(implement|code|write|edit|refactor|fix|bug|patch|modify|build|create file|function|class|endpoint|api)\b/i.test(trimmed)) {
    const codyId = findId('cody');
    if (codyId) recruited.add(codyId);
  }

  // Verification, testing, asserting invariants -> Tester
  if (/\b(test|tests|testing|verify|verification|assert|invariant|unit test|e2e|coverage|regression)\b/i.test(trimmed)) {
    const testerId = findId('tester');
    if (testerId) recruited.add(testerId);
  }

  // Fallback: If intent mentions coding/workspace work but didn't match specific words, recruit Cody
  if (recruited.size === 0 && /\b(file|script|app|module|component|schema|table)\b/i.test(trimmed)) {
    const codyId = findId('cody');
    if (codyId) recruited.add(codyId);
  }

  return Array.from(recruited);
}

