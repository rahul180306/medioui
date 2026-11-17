# Mediobot UI Refinement · Autonomous Multi-Agent Collaborative Interface

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646cff.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-182%20Passing-success.svg)](https://nodejs.org/api/test.html)

**Mediobot UI** is the official standalone web interface for Mediobot—an autonomous multi-specialist AI organization. It models coordinated agent workflows, minimal Codex-style execution activity timelines, multi-specialist parallel work schedules, unified side-by-side code diffs, terminal execution streams, human-in-the-loop approvals, and context compaction.

The entire showcase operates **100% offline** using an in-memory deterministic fixture engine. No API keys, cloud credentials, or running backend daemons are required ($0.00 operational spend).

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v20.0.0` or higher (compatible with Node 20, 22, 24)
- **Package Manager**: `npm` or `pnpm`

### Installation & Development Server
```bash
# Clone the repository
git clone https://github.com/rahul180306/medioui.git
cd medioui

# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Verification Commands
```bash
# Run complete test suite (182 passing tests)
npm test

# Run TypeScript typecheck
npm run typecheck

# Build optimized production bundle
npm run build
```

---

## 🎬 10 Interactive Demonstration Chats

The application comes pre-loaded with **10 deterministic demonstration conversations**, easily accessible from the **History** drawer under **"10 Demonstration Chats"**:

| # | Demonstration Chat | Primary Specialists | Key UI Components Demonstrated |
|---|--------------------|---------------------|--------------------------------|
| **1** | **Build a Website** | Maestro, Cody, Tester | User request intake, Maestro architectural plan, subagent delegation, live execution timeline, unified code diffs (`src/calculator.ts`), test verification. |
| **2** | **Debug an Application** | Maestro, Cody, Tester | Error diagnostic stream, file inspection (`authService.ts`), single-token diff patch, test execution, regression verification. |
| **3** | **Parallel Specialist Collaboration** | Maestro, Cody, Research, Doc | Multi-specialist parallel work Gantt chart, task dependency tracking, concurrent execution across 4 specialists, synchronized handoffs. |
| **4** | **Code Review & Security Audit** | Maestro, Cody, Scraapy | Automated static analysis, vulnerability detection (SQL injection alert), side-by-side code review diffs, human-in-the-loop approval gate. |
| **5** | **Research Task & Intelligence** | Maestro, Research, Scraapy | Web search telemetry, documentation scraping, source citations, synthesis report, context caching and token telemetry. |
| **6** | **Testing & Quality Assurance** | Maestro, Tester, Cody | Test suite failure reporting, stack trace isolation, Cody self-healing bugfix, automated re-run and green verification. |
| **7** | **Terminal Command Execution** | Maestro, Cody | Terminal command stream, ANSI log viewer, exit code badges, sensitive token/credential redaction in real time. |
| **8** | **Specialist Direct Chat (Cody)** | Cody (1-on-1) | Private 1-on-1 specialist direct conversation, bypass of team orchestration, rapid algorithmic code review and implementation. |
| **9** | **Long-Running Task & Recovery** | Maestro, Cody, Tester | Long-running task progress tracking, crash/disconnect simulation, durable state resumption from SQLite checkpoint, graceful recovery. |
| **10** | **Complete Mediobot Project Showcase** | All 7 Specialists | Grand end-to-end multi-turn project: planning, research, coding, multi-file diffs, testing, review approvals, context compaction, and final signoff. |

---

## 🧩 UI Execution Components Matrix

All 16 execution components are implemented, accessible, and covered by automated tests:

1. **Minimal Execution Timeline (`ExecutionActivityTimeline.tsx`)**
   - Chronological step-by-step audit trail modeled after Codex and Antigravity.
   - Granular semantic rows: agent started, working, completed, failed, cancelled, task queued, task blocked, tool started/completed/failed, file inspected, search performed, command executed, verification completed, context compaction, delegation proposed, specialist requested.
2. **Expandable Tool Execution Details (`CodexToolRow.tsx`)**
   - Click-to-expand details showing tool name, operation type, sanitized command, start time, duration, exit code, and formatted output logs.
3. **Allowlist-Based Sensitive Data Redaction (`allowlistRedaction.ts`)**
   - Automatic masking of Authorization bearer tokens, API keys (`AIza...`, `sk-...`, `ghp-...`), passwords, database connection strings, and private environment variables before DOM rendering.
4. **Unified & Split Code Diff Viewer (`DiffViewer.tsx`)**
   - High-contrast syntax-highlighted diffs displaying line additions (+), deletions (-), and context hunks with review badges.
5. **Multi-Specialist Parallel Work Visualization (`MultiSpecialistExecutionView.tsx`)**
   - Interactive SVG/HTML Gantt chart visualizing concurrent specialist workloads, task durations, active time windows, and dependencies.
6. **Maestro Coordination View (`MaestroCoordinationView.tsx`)**
   - Orchestration panel displaying system architecture, delegation proposals, task queues, and team-wide milestone tracking.
7. **Specialist Direct Conversations (`SpecialistDirectChatView.tsx`)**
   - 1-on-1 isolated conversational workspaces for each specialist bot (`Cody`, `Tester`, `Research`, `Doc`, `Scraapy`, `Vision`).
8. **Shared Main Team Conversations (`ThreadConversationView.tsx`)**
   - Multi-agent collaboration channel where Maestro delegates tasks and specialists deliver synthesized updates.
9. **Interactive Terminal Workspace (`TerminalWorkspaceView.tsx`)**
   - PTY/terminal-style log viewer with ANSI color parsing, scrollback buffer, command replay, and execution status indicators.
10. **Code & File Editor View (`CodeEditorView.tsx`)**
    - Multi-file tabbed editor with gutter line numbers, read-only inspection states, and active file synchronizations.
11. **Human-in-the-Loop Approval Modal (`PromotionModal.tsx`)**
    - Mandatory gatekeeper modal for high-impact file changes and production promotions requiring explicit user approval.
12. **Context Compaction Indicator (`StatusChangeLiveRegion.tsx`)**
    - Visual indicator reflecting automated context compaction events and context budget reductions.
13. **Participating Team Roster (`ThreadsDrawer.tsx`)**
    - Dynamic sidebar roster reflecting active specialists, orchestrators, status badges, and model assignments.
14. **Resource Status Indicator (`ResourceStatusIndicator.tsx`)**
    - Memory pressure state (`nominal`, `moderate`, `critical`), concurrency limits, and queued task monitors.
15. **Truthful Simulated Execution Badges**
    - Unambiguous visual indicators (`[Controlled demonstration]`, `[Simulated]`) guaranteeing truthfulness in offline mode.
16. **Responsive Navigation & Rubber Segment Controls (`NavRail.tsx`, `RubberSegment.tsx`)**
    - Fluid spring physics navigation rail and segment toggles for switching between Home, History, and Team views.

---

## 🔒 Truthfulness & Security Guarantees

- **No Remote Network Requests**: The offline mock engine (`OfflineFixtureRuntime`) intercepts all client calls locally. No socket or HTTP requests leave the browser.
- **Explicit Simulation Disclaimers**: Every synthetic tool output and verification step is explicitly marked with `[Controlled demonstration] · Simulated` or `unverified`.
- **Zero Real Credential Leakage**: Hardened allowlist redaction strips any accidental credentials before rendering into the DOM.
- **Pure Frontend Scope**: Contains zero backend daemons, native C++ bindings, or external dependencies outside the UI bundle.

---

## 📄 License

MIT © [Rahul](https://github.com/rahul180306)
