# Mediobot UI Integration Guide
**Design & Prototyping Workspace Contract for Google AI Studio and Production Mediobot**

---

## 1. Overview & Architectural Roles

Mediobot employs a decoupled two-repository architecture to enable rapid, creative UI design exploration in **Google AI Studio** while maintaining strict production reliability, persistent SQLite data, and deterministic agent orchestration in **mediobot-v2**:

| Repository | Primary Role | Runtime Execution | Backend / Data Source |
|---|---|---|---|
| **`medioui`** (`github.com/rahul180306/medioui`) | Complete UI design & prototyping workspace | Standalone Express + Vite (Node / Bun / WebContainer) | Centralized Mock Adapter with 15 typed prototype scenarios |
| **`mediobot-v2`** (`github.com/rahul180306/MedioBot`) | Autonomous AI Organization core product | Electron desktop & local-first Node daemon | SQLite database, LangGraph, WorkerRuntime, real filesystem |

---

## 2. Adapter-Based Architecture

To ensure components can be ported between `medioui` and `mediobot-v2` without modifying component logic, the system uses an adapter pattern:

```
                  ┌──────────────────────────────────────────────┐
                  │                UI Components                 │
                  │ (ThreadView, NavRail, ThreadsDrawer, Mind)   │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │             Typed UI Contracts               │
                  │  (Thread, Turn, ThreadItem, MedioBotAgent)   │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │           IMediobotRuntime Adapter           │
                  │   (startTurn, saveThread, listFiles, etc.)   │
                  └──────────────┬───────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
  ┌───────────────────────────────┐ ┌───────────────────────────────┐
  │      MockMediobotRuntime      │ │     MediobotRuntimeClient     │
  │     (medioui / AI Studio)     │ │     (mediobot-v2 desktop)     │
  │                               │ │                               │
  │ • In-memory mock threads      │ │ • Live HTTP SSE stream        │
  │ • 15 Prototype Scenarios      │ │ • SQLite persistence (v21)   │
  │ • Simulated tool executions   │ │ • Real filesystem TOCTOU lock │
  │ • Zero billable API spend     │ │ • WorkerRuntime orchestration │
  └───────────────────────────────┘ └───────────────────────────────┘
```

### Component Rules
1. **Zero Monorepo Dependencies in UI Components:** UI components must never import `@mediobot-v2/runtime`, `@mediobot-v2/domain`, `@mediobot-v2/tools`, or SQLite modules directly.
2. **Context-Driven State:** Components interact exclusively through `useApp()` (`AppContext.tsx`) and the `IMediobotRuntime` interface.
3. **Mock Data Separation:** Mock fixtures are encapsulated under `src/mock/` and `src/runtime/mockData.ts`. Never hardcode dummy fixtures into presentation components.

---

## 3. Five-Level Conversation Architecture

The user interface represents five distinct context levels:

```
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: ORGANIZATION                                                  │
│ Persistent Mediobot organization, permanent agent identities           │
│ (Maestro, Cody, Tester, Doc, Research, Scraapy, Vision),               │
│ capabilities, model routing preferences, and project catalogs.         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 2: TEAM WORKSPACE                                                │
│ Team-specific conversation environment (`teamId`).                      │
│ Created by the top-level "New chat" button in the History drawer.      │
│ Owns fresh Main Team conversations and isolated specialist chats.      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 3: MAIN TEAM CONVERSATIONS                                       │
│ Multiple parallel Main Team conversations inside the same team.        │
│ Created by the "+" icon beside the "Main Team" header in History.      │
│ Switches Main Team without resetting specialist side chats.            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 4: SPECIALIST CONVERSATIONS                                      │
│ Independent 1-on-1 specialist sessions tied to the active team.        │
│ Clicking Cody or Tester in Team A opens their side-chat in Team A;     │
│ messages never bleed into Team B's Cody session.                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 5: EXECUTION AND COLLABORATION                                   │
│ Task assignments, tool invocations, peer messages (`request`,          │
│ `response`, `finding`), model attribution badges, progress/blockers,   │
│ thinking traces, and independent verification badges.                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Ownership & Synchronization Map

| Component / Layer | Primary Owner | Sync Direction | Notes |
|---|---|---|---|
| Visual Design Tokens (`index.css`, Tailwind) | `medioui` | `medioui` → `mediobot-v2` | Color palettes, borders, animations |
| `CodexGlyph.tsx`, Custom Icons | `medioui` | `medioui` → `mediobot-v2` | Brand identity, AI Studio assets |
| `EmptyState.tsx`, Standby Views | `medioui` | `medioui` → `mediobot-v2` | Minimalist layout, zero clutter |
| `NavRail.tsx`, `ThreadsDrawer.tsx` | Shared | Bidirectional | Preserves `createNewTeam` / `createNewMainTeamChat` |
| `Mind` (World Space Execution View) | `mediobot-v2` | `mediobot-v2` → `medioui` | Monospace reasoning, terminal buffers |
| `MockMediobotRuntime`, `mockScenarios.ts` | `medioui` | `medioui` ONLY | Never copy mock data into `mediobot-v2` |
| `server.ts`, SQLite, LangGraph | `mediobot-v2` | `mediobot-v2` ONLY | Never copy production backend into `medioui` |

---

## 5. Development & Running the Workspace

```bash
# Clone the design repository
git clone https://github.com/rahul180306/medioui.git
cd medioui

# Install dependencies (Node or Bun)
bun install # or npm install

# Run the local development server (port 3000)
bun run dev # or npm run dev

# Run TypeScript typecheck
bun run typecheck

# Build the standalone production distribution
bun run build
```

Once running, navigate to `http://localhost:3000` to interact with the full prototype, test all 15 scenarios via the floating Prototype Selector, and explore responsive design layouts.

