# Mediobot UI — Frontend Architecture & Refinement Guide

This archive contains the complete, dedicated **Mediobot UI & Command Center** frontend codebase. Use this duplicate to explore, customize, and refine the interface.

---

## 📁 Key File Map for UI Refinement

### 1. Codex-Style Execution & Tool Clusters
- **`src/features/activity/CodexExecutionView.tsx`**:
  - `parseToolAction`: Normalizes tool payloads into clean action rows (e.g. `Read file`, `Listed files in...`, `Ran command`).
  - `CodexToolCluster`: Renders the single-line collapsible cluster headers (`📁 Read files ⌄`, `>_ Ran command`) with progress spinners and checkmark badges.
  - `CodexToolRow`: Individual interactive item rows. Clicking open dynamically streams/loads file contents or directory structures inline without card borders.
- **`src/features/activity/ActivityItem.tsx`**:
  - Controls presentation of tool turns and suppresses internal thinking/inspecting blocks in Main Chat while preserving them in specialist workspaces.
- **`src/features/activity/DiffViewer.tsx`**:
  - Unified and split diff presentation for file edits.

### 2. Main Chat & Specialist Workspaces
- **`src/features/threads/ThreadView.tsx`**:
  - Detects `isSpecificMediobotChat` vs. Main Chat.
  - Applies signature font color styling to each Mediobot in Main Chat alone.
  - Renders user prompts, `CodexToolCluster`, assistant markdown prose, copy triggers, and image attachments.
- **`src/features/threads/TimelineNavigator.tsx`**:
  - Right-aligned compact anchor timeline with checkpoint navigation.
- **`src/features/threads/MarkdownContent.tsx`**:
  - Markdown renderer with syntax-highlighted code blocks, tables, and latex support.

### 3. Mediobot Personalities & Signature Colors
- **`src/features/mediobots/presentation.ts`**:
  - Theme colors, accent borders, light/dark text contrast tokens, and badges for each of the 7 Mediobots:
    - **Maestro**: Orchestrator (Violet / Iris)
    - **Cody**: Precision Code Editor (Emerald / Mint)
    - **Doc**: Documentation Specialist (Sky Blue)
    - **Scraapy**: Web Extraction & Crawling (Cyan / Teal)
    - **Tester**: Verification & Security Evaluator (Amber / Orange)
    - **Vision**: Visual Perception & Inspection (Rose / Fuchsia)
    - **Research**: Deep Intelligence (Purple)

### 4. Composer & Input Surface
- **`src/features/composer/Composer.tsx`**:
  - Multiline prompt box, model selector dropdown, attachment handler (drag & drop, paste images/PDFs), and stop/send buttons.
- **`src/features/composer/PromptBar.tsx`** & **`PromptBar.css`**:
  - Visual styling of the floating prompt bar and action triggers.

### 5. Navigation & Layout
- **`src/features/navigation/NavRail.tsx`**: Leftmost narrow rail for switching between Main Chat, Mediobot Workspaces, and Library.
- **`src/features/navigation/TopChrome.tsx`**: Top header with project picker, breadcrumbs, and settings trigger.
- **`src/features/navigation/ThreadsDrawer.tsx`**: Collapsible conversation history drawer.
- **`src/features/editor/CodeEditorView.tsx`**: CodeMirror split-view code editor when inspecting workspace files.

### 6. Styles & Themes
- **`src/index.css`**: Tailwind v4 configuration, font styling, animations, and dark/light color scheme definitions.
- **`src/styles.css`**: Custom scrollbars, glassmorphic utility classes, and custom UI variables.

---

## 🚀 Running the UI

### Standalone Vite Dev Server
From within the `mediobot-v2` workspace:
```bash
# Start the full command center (backend + frontend)
pnpm dev

# Or build the client production bundle directly
pnpm exec vite build
```

The production bundle builds to `dist/` in under 1 second.
