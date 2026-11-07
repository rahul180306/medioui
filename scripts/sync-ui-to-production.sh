#!/usr/bin/env bash
set -euo pipefail

# Non-destructive Sync: medioui (Design Repo) -> mediobot-v2 (Production App)
# Reviews changes with git diff, avoids overwriting backend adapters, and verifies builds.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_ROOT="${REPO_ROOT}/../mediobot-v2/apps/command-center"

if [ ! -d "${TARGET_ROOT}" ]; then
  echo "❌ Error: Target mediobot-v2 command-center not found at ${TARGET_ROOT}"
  exit 1
fi

MODE="${1:-review}"

echo "================================================================="
echo "  Mediobot UI Sync: Design Repo (medioui) -> Production App"
echo "  Mode: ${MODE}"
echo "================================================================="

# List of pure visual components safe to port from Google AI Studio / medioui
SAFE_COMPONENTS=(
  "src/index.css"
  "src/components/icons/CodexGlyph.tsx"
  "src/components/ThoughtLine.tsx"
  "src/components/ThoughtLine.css"
)

if [ "${MODE}" = "review" ]; then
  echo "🔍 [Review Mode] Inspecting diffs without modifying production files:"
  for file in "${SAFE_COMPONENTS[@]}"; do
    SRC="${REPO_ROOT}/mediobot-ui-refinement/${file}"
    DEST="${TARGET_ROOT}/${file}"
    if [ -f "${SRC}" ] && [ -f "${DEST}" ]; then
      if cmp -s "${SRC}" "${DEST}"; then
        echo "  - ${file}: in sync"
      else
        echo "  - ${file}: DIFF DETECTED (run with 'apply' to stage changes)"
        diff -u "${DEST}" "${SRC}" || true
      fi
    fi
  done
  echo ""
  echo "To apply approved changes non-destructively, run:"
  echo "  ./scripts/sync-ui-to-production.sh apply"
  exit 0
fi

if [ "${MODE}" = "apply" ]; then
  echo "🚀 [Apply Mode] Staging design changes into target repository..."
  for file in "${SAFE_COMPONENTS[@]}"; do
    SRC="${REPO_ROOT}/mediobot-ui-refinement/${file}"
    DEST="${TARGET_ROOT}/${file}"
    if [ -f "${SRC}" ]; then
      mkdir -p "$(dirname "${DEST}")"
      cp "${SRC}" "${DEST}"
      echo "  ✔ Synced: ${file}"
    fi
  done

  if [ -d "${REPO_ROOT}/public/assets/aistudio" ]; then
    echo "  ✔ Syncing Google AI Studio asset bundle..."
    mkdir -p "${TARGET_ROOT}/public/assets/aistudio"
    cp -r "${REPO_ROOT}/public/assets/aistudio/"* "${TARGET_ROOT}/public/assets/aistudio/"
  fi

  echo ""
  echo "Verifying production build after sync..."
  cd "${TARGET_ROOT}"
  pnpm --filter @mediobot-v2/command-center run typecheck
  echo "✔ Production typecheck passed after sync."
  echo "Review git diff in ${TARGET_ROOT} before committing."
fi
