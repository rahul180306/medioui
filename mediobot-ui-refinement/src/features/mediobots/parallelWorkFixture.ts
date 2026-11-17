/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Parallel Work Fixtures for Multi-Specialist Execution Visualization (R4)
 * Provides structured offline demonstration intervals demonstrating overlapping
 * concurrency windows across canonical projects without real backend concurrency.
 */

export interface SpecialistExecutionInterval {
  readonly intervalId: string;
  readonly specialistId: string;
  readonly specialistName: string;
  readonly specialistRole: string;
  readonly taskTitle: string;
  readonly startRelativeSec: number;
  readonly endRelativeSec: number;
  readonly status: 'working' | 'completed' | 'failed' | 'waiting';
  readonly currentStep: string;
  readonly history: ReadonlyArray<string>;
}

/**
 * Canonical Project 1: Calculator (`team-calculator`)
 * Overlapping concurrency:
 * - Cody: 0s - 22s (Arithmetic engine)
 * - Tester: 12s - 35s (Precision & edge-case test suite)
 * - Doc: 18s - 38s (API & README documentation)
 * - Vision: 20s - 36s (Keypad touch targets & mobile audit)
 * Concurrency window: 18s - 22s (4 specialists simultaneously active)
 */
export const CALCULATOR_PARALLEL_FIXTURE: ReadonlyArray<SpecialistExecutionInterval> = [
  {
    intervalId: 'int-calc-cody',
    specialistId: 'cody',
    specialistName: 'Cody',
    specialistRole: 'Software engineering',
    taskTitle: 'Implement arithmetic core & division-by-zero guards',
    startRelativeSec: 0,
    endRelativeSec: 22,
    status: 'completed',
    currentStep: 'Exporting arithmetic evaluator and operator precedence tree',
    history: [
      'Created token scanner for arithmetic expressions',
      'Implemented shunting-yard precedence climber',
      'Added division-by-zero guards and NaN guards',
      'Exposed binary operator evaluators with full precision',
    ],
  },
  {
    intervalId: 'int-calc-tester',
    specialistId: 'tester',
    specialistName: 'Tester',
    specialistRole: 'Independent verification',
    taskTitle: 'Author test suite & assert arithmetic edge cases',
    startRelativeSec: 12,
    endRelativeSec: 35,
    status: 'completed',
    currentStep: 'Executing automated edge-case test matrix',
    history: [
      'Drafted arithmetic property-based test cases',
      'Validated IEEE-754 float precision boundaries',
      'Asserted negative number and unary minus handling',
      'Verified zero-division runtime error interception',
    ],
  },
  {
    intervalId: 'int-calc-doc',
    specialistId: 'doc',
    specialistName: 'Doc',
    specialistRole: 'Documentation intelligence',
    taskTitle: 'Generate API documentation & usage examples in README',
    startRelativeSec: 18,
    endRelativeSec: 38,
    status: 'completed',
    currentStep: 'Published calculator API reference and quickstart guide',
    history: [
      'Documented exported function signatures and parameter types',
      'Authored edge-case error recovery guidance',
      'Added interactive code snippets for REPL usage',
    ],
  },
  {
    intervalId: 'int-calc-vision',
    specialistId: 'vision',
    specialistName: 'Vision',
    specialistRole: 'UI inspection & visual review',
    taskTitle: 'Audit keypad tap targets and layout spacing',
    startRelativeSec: 20,
    endRelativeSec: 36,
    status: 'working',
    currentStep: 'Measuring 44px min tap targets on mobile viewport',
    history: [
      'Rendered 375px mobile viewport keypad grid',
      'Inspected numeric keypad row and column gaps',
      'Verified display readout text contrast ratios',
    ],
  },
];

/**
 * Canonical Project 2: Research (`team-research`)
 * Overlapping concurrency:
 * - Research: 0s - 42s (Multi-agent framework evaluation)
 * - Scraapy: 8s - 50s (Documentation & benchmark extraction)
 * - Doc: 25s - 58s (ADR-004 drafting & executive brief)
 * - Cody: 35s - 60s (Framework adapter prototype)
 * Concurrency window: 25s - 42s (3 specialists simultaneously active)
 */
export const RESEARCH_PARALLEL_FIXTURE: ReadonlyArray<SpecialistExecutionInterval> = [
  {
    intervalId: 'int-res-research',
    specialistId: 'research',
    specialistName: 'Research',
    specialistRole: 'Deep research & Web intelligence',
    taskTitle: 'Evaluate multi-agent coordination frameworks and latency tradeoffs',
    startRelativeSec: 0,
    endRelativeSec: 42,
    status: 'completed',
    currentStep: 'Synthesizing cross-framework benchmark matrix',
    history: [
      'Queried academic literature on multi-agent consensus protocols',
      'Benchmarked latency of streaming turn coordination',
      'Documented in-memory state serialization overhead',
      'Compiled latency distribution tables (p50, p95, p99)',
    ],
  },
  {
    intervalId: 'int-res-scraapy',
    specialistId: 'scraapy',
    specialistName: 'Scraapy',
    specialistRole: 'Web scraping & Extraction pipeline',
    taskTitle: 'Extract documentation tables and release notes for target frameworks',
    startRelativeSec: 8,
    endRelativeSec: 50,
    status: 'completed',
    currentStep: 'Sanitized extracted benchmark schema for downstream consumers',
    history: [
      'Extracted table structures from offline documentation mirrors',
      'Normalized benchmark markdown tables into typed JSON',
      'Validated schema conformance against internal specifications',
    ],
  },
  {
    intervalId: 'int-res-doc',
    specialistId: 'doc',
    specialistName: 'Doc',
    specialistRole: 'Documentation & Architecture synthesis',
    taskTitle: 'Draft Architectural Decision Record (ADR-004) and executive brief',
    startRelativeSec: 25,
    endRelativeSec: 58,
    status: 'working',
    currentStep: 'Authoring architectural trade-offs section in ADR-004',
    history: [
      'Structured decision drivers and functional constraints',
      'Constructed alternative comparison scorecard',
      'Drafted executive summary bullet points for leadership review',
    ],
  },
  {
    intervalId: 'int-res-cody',
    specialistId: 'cody',
    specialistName: 'Cody',
    specialistRole: 'Software architecture & Implementation',
    taskTitle: 'Prototype adapter interface for selected framework',
    startRelativeSec: 35,
    endRelativeSec: 60,
    status: 'waiting',
    currentStep: 'Awaiting ADR-004 architectural sign-off before implementation',
    history: [
      'Reviewed interface compatibility requirements',
      'Prepared draft TypeScript adapter declarations',
    ],
  },
];

/**
 * Canonical Project 3: Dashboard (`team-dashboard`)
 * Overlapping concurrency:
 * - Research: 0s - 28s (Canvas vs SVG rendering benchmark)
 * - Cody: 10s - 55s (Grid layout, Canvas charts, metric cards)
 * - Doc: 18s - 40s (OpenAPI 3.1 schema specification)
 * - Vision: 30s - 58s (Viewport responsive review & dark mode check)
 * - Tester: 38s - 65s (Integration tests for auth and charts)
 * Concurrency window: 30s - 40s (4 specialists simultaneously active)
 */
export const DASHBOARD_PARALLEL_FIXTURE: ReadonlyArray<SpecialistExecutionInterval> = [
  {
    intervalId: 'int-dash-research',
    specialistId: 'research',
    specialistName: 'Research',
    specialistRole: 'Deep research & Web intelligence',
    taskTitle: 'Benchmark Canvas vs SVG rendering performance',
    startRelativeSec: 0,
    endRelativeSec: 28,
    status: 'completed',
    currentStep: 'Confirmed sub-16ms 60fps rendering threshold for 5,000 data points',
    history: [
      'Created 1,000-node SVG test harness',
      'Created 5,000-point Canvas chart test harness',
      'Profiled JavaScript execution time and heap allocation',
      'Recommended Canvas-backed chart layer for time-series metrics',
    ],
  },
  {
    intervalId: 'int-dash-cody',
    specialistId: 'cody',
    specialistName: 'Cody',
    specialistRole: 'Software engineering',
    taskTitle: 'Implement responsive dashboard grid, Canvas chart, auth',
    startRelativeSec: 10,
    endRelativeSec: 55,
    status: 'working',
    currentStep: 'Optimizing Canvas resize observer and debounced re-renders',
    history: [
      'Implemented CSS grid container with dynamic break-points',
      'Added high-performance Canvas rendering layer',
      'Integrated metric summary cards and real-time sparklines',
      'Hooked up resize debounce handler',
    ],
  },
  {
    intervalId: 'int-dash-doc',
    specialistId: 'doc',
    specialistName: 'Doc',
    specialistRole: 'Documentation intelligence',
    taskTitle: 'Draft OpenAPI 3.1 specification for analytics metrics',
    startRelativeSec: 18,
    endRelativeSec: 40,
    status: 'completed',
    currentStep: 'Published analytics schema v1 to docs repository',
    history: [
      'Mapped metric endpoint parameters and query filters',
      'Authored schema response definitions in OpenAPI 3.1 YAML',
      'Verified schema validity with internal linter',
    ],
  },
  {
    intervalId: 'int-dash-vision',
    specialistId: 'vision',
    specialistName: 'Vision',
    specialistRole: 'Visual UX inspection & Browser workflows',
    taskTitle: 'Conduct visual review on rendered mobile and desktop viewports',
    startRelativeSec: 30,
    endRelativeSec: 58,
    status: 'working',
    currentStep: 'Auditing dark mode contrast ratios across metric cards',
    history: [
      'Inspected light theme palette contrast against WCAG AA standards',
      'Verified layout responsiveness at 375px and 768px viewports',
      'Confirmed axis label legibility on high-DPI displays',
    ],
  },
  {
    intervalId: 'int-dash-tester',
    specialistId: 'tester',
    specialistName: 'Tester',
    specialistRole: 'Independent verification',
    taskTitle: 'Author Playwright integration tests for dashboard auth, charts',
    startRelativeSec: 38,
    endRelativeSec: 65,
    status: 'waiting',
    currentStep: 'Waiting for canvas resize stabilization before running assertions',
    history: [
      'Authored authentication and session gate tests',
      'Prepared snapshot baseline tests for metric cards',
    ],
  },
];

/**
 * Canonical Project 4: Refactoring / Refinement (`team-refactor` / `team-refinement`)
 * Matches canonical E2E test fixture in `medioui/tests/e2e/tier1-feature-coverage.test.ts`.
 * Overlapping concurrency:
 * - Cody: 0s - 14s (Decompose CodexExecutionView subcomponents)
 * - Tester: 4s - 18s (Author 4-Tier E2E test suite)
 * - Vision: 8s - 22s (Audit component layout density and spacing)
 * - Doc: 12s - 24s (Maintain interface contracts in PROJECT.md)
 * - Deployer: 20s - 32s (Verify production bundle size and tree-shaking metrics)
 * Concurrency window: 8s - 14s (4 specialists simultaneously active)
 */
export const REFACTORING_PARALLEL_FIXTURE: ReadonlyArray<SpecialistExecutionInterval> = [
  {
    intervalId: 'int-cody-1',
    specialistId: 'cody',
    specialistName: 'Cody',
    specialistRole: 'Software engineering',
    taskTitle: 'Decompose CodexExecutionView subcomponents',
    startRelativeSec: 0,
    endRelativeSec: 14,
    status: 'working',
    currentStep: 'Exporting CodexToolRow and trajectoryParser',
    history: [
      'Isolated trajectory parser from monolithic component',
      'Created useToolTimer hook with zero drift',
      'Extracted ModelAttributionBadge',
    ],
  },
  {
    intervalId: 'int-tester-1',
    specialistId: 'tester',
    specialistName: 'Tester',
    specialistRole: 'Independent verification',
    taskTitle: 'Author 4-Tier E2E test suite',
    startRelativeSec: 4,
    endRelativeSec: 18,
    status: 'working',
    currentStep: 'Verifying chronological sorting of 17 event types',
    history: [
      'Configured JSDOM React 19 test harness',
      'Formulated canonical test fixtures',
      'Implemented R1 through R6 assertion suites',
    ],
  },
  {
    intervalId: 'int-vision-1',
    specialistId: 'vision',
    specialistName: 'Vision',
    specialistRole: 'UI inspection & visual review',
    taskTitle: 'Audit component layout density and spacing',
    startRelativeSec: 8,
    endRelativeSec: 22,
    status: 'working',
    currentStep: 'Inspecting disclosure toggle hit targets and ARIA states',
    history: [
      'Checked compact row height (28px target)',
      'Verified theme border contrast',
      'Validated focus ring visibility',
    ],
  },
  {
    intervalId: 'int-doc-1',
    specialistId: 'doc',
    specialistName: 'Doc',
    specialistRole: 'Documentation intelligence',
    taskTitle: 'Maintain interface contracts in PROJECT.md',
    startRelativeSec: 12,
    endRelativeSec: 24,
    status: 'completed',
    currentStep: 'Synchronized event schemas and redaction contracts',
    history: [
      'Updated typed event schemas',
      'Documented allowlist redaction invariants',
      'Published M3 interface contracts',
    ],
  },
  {
    intervalId: 'int-deployer-1',
    specialistId: 'deployer',
    specialistName: 'Deployer',
    specialistRole: 'Deployment',
    taskTitle: 'Verify production bundle size and tree-shaking metrics',
    startRelativeSec: 20,
    endRelativeSec: 32,
    status: 'waiting',
    currentStep: 'Waiting for upstream test verification to complete',
    history: [
      'Profiled initial bundle chunk map',
      'Identified dynamic import targets',
    ],
  },
];

/**
 * Standard alias for the Refactoring fixture to match E2E tests expectations
 */
export const PARALLEL_SPECIALIST_INTERVALS = REFACTORING_PARALLEL_FIXTURE;

/**
 * Canonical default intervals alias
 */
export const CANONICAL_PARALLEL_INTERVALS = CALCULATOR_PARALLEL_FIXTURE;

/**
 * Map of canonical fixtures keyed by team ID
 */
export const PARALLEL_WORK_FIXTURES: Readonly<Record<string, ReadonlyArray<SpecialistExecutionInterval>>> = {
  'team-calculator': CALCULATOR_PARALLEL_FIXTURE,
  'team-research': RESEARCH_PARALLEL_FIXTURE,
  'team-dashboard': DASHBOARD_PARALLEL_FIXTURE,
  'team-refactor': REFACTORING_PARALLEL_FIXTURE,
  'team-refinement': REFACTORING_PARALLEL_FIXTURE,
};

/**
 * Resolves parallel work intervals for a given team ID with robust alias handling
 * and safe fallback to the canonical calculator fixture.
 */
export function getParallelWorkIntervalsForTeam(
  teamId?: string
): ReadonlyArray<SpecialistExecutionInterval> {
  if (!teamId) return CALCULATOR_PARALLEL_FIXTURE;

  const normalized = teamId.toLowerCase().trim();

  if (normalized.includes('calc')) {
    return CALCULATOR_PARALLEL_FIXTURE;
  }
  if (normalized.includes('research')) {
    return RESEARCH_PARALLEL_FIXTURE;
  }
  if (normalized.includes('dash')) {
    return DASHBOARD_PARALLEL_FIXTURE;
  }
  if (normalized.includes('refactor') || normalized.includes('refine')) {
    return REFACTORING_PARALLEL_FIXTURE;
  }

  // Check direct map lookup
  if (PARALLEL_WORK_FIXTURES[normalized]) {
    return PARALLEL_WORK_FIXTURES[normalized];
  }

  // Safe fallback to calculator project
  return CALCULATOR_PARALLEL_FIXTURE;
}

export interface SpecialistProfile {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly avatar: string;
  readonly textTheme: string;
  readonly borderTheme: string;
  readonly badgeTheme: string;
  readonly currentTask?: string;
}

/**
 * 7 Canonical Specialist Profiles (+ Coordinator)
 */
export const SPECIALIST_PROFILES: Readonly<Record<string, SpecialistProfile>> = {
  maestro: {
    id: 'maestro',
    name: 'Maestro',
    role: 'Team orchestration',
    avatar: 'bg-[#f4f4f5]',
    textTheme: 'text-[#f4f4f5]',
    borderTheme: 'border-white/20',
    badgeTheme: 'bg-white/10 text-neutral-200',
    currentTask: 'Delegating architecture milestones',
  },
  cody: {
    id: 'cody',
    name: 'Cody',
    role: 'Software engineering',
    avatar: 'bg-[#fef08a]',
    textTheme: 'text-[#fde047]',
    borderTheme: 'border-[#fef08a]/30',
    badgeTheme: 'bg-[#fef08a]/10 text-[#fef08a]',
    currentTask: 'Implementing timeline subcomponents',
  },
  vision: {
    id: 'vision',
    name: 'Vision',
    role: 'UI inspection & visual review',
    avatar: 'bg-[#bae6fd]',
    textTheme: 'text-[#38bdf8]',
    borderTheme: 'border-[#bae6fd]/30',
    badgeTheme: 'bg-[#bae6fd]/10 text-[#bae6fd]',
    currentTask: 'Auditing layout density and spacing',
  },
  doc: {
    id: 'doc',
    name: 'Doc',
    role: 'Documentation intelligence',
    avatar: 'bg-[#4b4a56]',
    textTheme: 'text-[#cbd5e1]',
    borderTheme: 'border-[#52525b]/40',
    badgeTheme: 'bg-[#52525b]/20 text-[#d4d4d8]',
    currentTask: 'Updating interface contracts in PROJECT.md',
  },
  research: {
    id: 'research',
    name: 'Research',
    role: 'Web research',
    avatar: 'bg-[#fed7aa]',
    textTheme: 'text-[#fb923c]',
    borderTheme: 'border-[#fed7aa]/30',
    badgeTheme: 'bg-[#fed7aa]/10 text-[#fed7aa]',
    currentTask: 'Analyzing Codex vs Antigravity timeline patterns',
  },
  tester: {
    id: 'tester',
    name: 'Tester',
    role: 'Independent verification',
    avatar: 'bg-[#ddd6fe]',
    textTheme: 'text-[#c084fc]',
    borderTheme: 'border-[#ddd6fe]/30',
    badgeTheme: 'bg-[#ddd6fe]/10 text-[#ddd6fe]',
    currentTask: 'Authoring Tier 1 feature coverage tests',
  },
  deployer: {
    id: 'deployer',
    name: 'Deployer',
    role: 'Deployment',
    avatar: 'bg-[#a7f3d0]',
    textTheme: 'text-[#34d399]',
    borderTheme: 'border-[#a7f3d0]/30',
    badgeTheme: 'bg-[#a7f3d0]/10 text-[#a7f3d0]',
    currentTask: 'Staging static asset server on port 0',
  },
  scraapy: {
    id: 'scraapy',
    name: 'Scraapy',
    role: 'Web scraping & extraction',
    avatar: 'bg-[#99f6e4]',
    textTheme: 'text-[#2dd4bf]',
    borderTheme: 'border-[#99f6e4]/30',
    badgeTheme: 'bg-[#99f6e4]/10 text-[#2dd4bf]',
    currentTask: 'Extracting offline UI component fixtures',
  },
};

