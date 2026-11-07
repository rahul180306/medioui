# Mediobot UI Synchronization Workflow
**Safe, Bidirectional Git Synchronization between `medioui` and `mediobot-v2`**

---

## 1. Principles of Safe Synchronization

1. **Never Blindly Overwrite:** Never copy entire directories across repository boundaries. Sync only audited visual components, CSS styles, and design assets.
2. **Never Commit Secrets or Backend Leaks:** `medioui` must never contain `.env`, SQLite databases, LangGraph orchestration, or production credentials.
3. **Never Pollute Production with Mock Fixtures:** `mediobot-v2` must never import `mockData.ts` or `mockScenarios.ts`.
4. **Use Review Branches:** Always perform synchronizations on non-destructive git branches (e.g. `sync/aistudio-design-update` or `sync/production-ui-contracts`).

---

## 2. Direction A: Syncing Production UI → Design Repository

When `mediobot-v2` introduces new UI components, contract fields, or views (such as Mind Space execution or new specialist badges), port them into `medioui`:

### Step-by-Step Commands:

```bash
# 1. Ensure working directory in medioui is clean
cd /path/to/medioui
git status

# 2. Create a sync branch
git checkout -b sync/from-production-$(date +%Y%m%d)

# 3. Selectively copy updated UI components (e.g., Mind Space or Collaboration features)
cp -r /path/to/mediobot-v2/apps/command-center/src/features/mind \
      mediobot-ui-refinement/src/features/

cp /path/to/mediobot-v2/apps/command-center/src/features/threads/CollaborationStream.tsx \
   mediobot-ui-refinement/src/features/threads/

# 4. Verify TypeScript contracts
bun run typecheck

# 5. Review git diff
git diff

# 6. Commit the updated components
git add .
git commit -m "chore(sync): update UI components from production mediobot-v2"
```

---

## 3. Direction B: Syncing Design Repository → Production UI

When user or Google AI Studio refines visual styling, layouts, animations, or typography in `medioui`, integrate them into `mediobot-v2`:

### Step-by-Step Commands:

```bash
# 1. In mediobot-v2, create a design integration branch
cd /path/to/mediobot-v2
git checkout -b design/integrate-aistudio-$(date +%Y%m%d)

# 2. Inspect the exact changes made in medioui
cd /path/to/medioui
git log -n 5 --oneline
git diff HEAD~1 mediobot-ui-refinement/src/index.css

# 3. Selectively port approved visual assets and styles
cp medioui/mediobot-ui-refinement/src/index.css \
   /path/to/mediobot-v2/apps/command-center/src/index.css

cp medioui/mediobot-ui-refinement/src/components/icons/CodexGlyph.tsx \
   /path/to/mediobot-v2/apps/command-center/src/components/icons/CodexGlyph.tsx

cp -r medioui/public/assets/aistudio/* \
      /path/to/mediobot-v2/apps/command-center/public/assets/aistudio/

# 4. Run production typechecks and tests in mediobot-v2
cd /path/to/mediobot-v2
pnpm --filter @mediobot-v2/command-center run typecheck
node --experimental-strip-types apps/command-center/tests/ui/ui.test.ts

# 5. Commit design improvements with clear attribution
git add apps/command-center/src/index.css apps/command-center/src/components/icons/CodexGlyph.tsx
git commit -m "style(ui): integrate refined visual tokens and Codex glyph from Google AI Studio"
```

---

## 4. Conflict Resolution & Preservation Checklist

Before finalizing any sync commit, verify:
- [ ] No monorepo packages (`@mediobot-v2/*`) were imported into `medioui`.
- [ ] No `mockScenarios` or dummy turn arrays were copied into `mediobot-v2`.
- [ ] `createNewTeam` (top-level New Chat) and `createNewMainTeamChat` (Main Team header icon) remain wired to their respective state handlers.
- [ ] `bun run typecheck` passes in `medioui` (0 errors).
- [ ] `pnpm --filter @mediobot-v2/command-center run typecheck` passes in `mediobot-v2` (0 errors).

