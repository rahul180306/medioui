#!/usr/bin/env bash
set -euo pipefail

# Non-destructive Sync: mediobot-v2 (Production App) -> medioui (Design Repo)
# Imports approved component improvements and contracts from production into Google AI Studio design workspace.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROD_ROOT="${REPO_ROOT}/../mediobot-v2/apps/command-center"

if [ ! -d "${PROD_ROOT}" ]; then
  echo "❌ Error: Source production command-center not found at ${PROD_ROOT}"
  exit 1
fi

MODE="${1:-review}"

echo "================================================================="
echo "  Mediobot UI Sync: Production App -> Design Repo (medioui)"
echo "  Mode: ${MODE}"
echo "================================================================="

SAFE_COMPONENTS=(
  "src/components/ThoughtLine.tsx"
  "src/components/ThoughtLine.css"
  "src/features/mind/SpecialistMindSpace.tsx"
  "src/features/mind/MindSpaceView.tsx"
  "src/features/mind/AgentMindTimeline.tsx"
  "src/features/mind/SpecialistActivityView.tsx"
  "src/features/threads/CollaborationStream.tsx"
  "src/features/threads/CollapsibleThinkingTrace.tsx"
  "src/features/threads/ParallelModelGuidanceStrip.tsx"
  "src/features/threads/PeerMessageView.tsx"
  "src/features/threads/PromotionModal.tsx"
)

if [ "${MODE}" = "review" ]; then
  echo "🔍 [Review Mode] Inspecting diffs without modifying design files:"
  for file in "${SAFE_COMPONENTS[@]}"; do
    SRC="${PROD_ROOT}/${file}"
    DEST="${REPO_ROOT}/mediobot-ui-refinement/${file}"
    if [ -f "${SRC}" ] && [ -f "${DEST}" ]; then
      if cmp -s "${SRC}" "${DEST}"; then
        echo "  - ${file}: in sync"
      else
        echo "  - ${file}: DIFF DETECTED (run with 'apply' to import)"
        diff -u "${DEST}" "${SRC}" || true
      fi
    elif [ -f "${SRC}" ] && [ ! -f "${DEST}" ]; then
      echo "  - ${file}: NEW FILE in production (run with 'apply' to import)"
    fi
  done
  echo ""
  echo "To import approved changes non-destructively, run:"
  echo "  ./scripts/sync-ui-from-production.sh apply"
  exit 0
fi

if [ "${MODE}" = "apply" ]; then
  echo "🚀 [Apply Mode] Importing production updates into design repo..."
  for file in "${SAFE_COMPONENTS[@]}"; do
    SRC="${PROD_ROOT}/${file}"
    DEST="${REPO_ROOT}/mediobot-ui-refinement/${file}"
    if [ -f "${SRC}" ]; then
      mkdir -p "$(dirname "${DEST}")"
      cp "${SRC}" "${DEST}"
      echo "  ✔ Imported: ${file}"
    fi
  done

  echo ""
  echo "Verifying design repo typecheck and build..."
  cd "${REPO_ROOT}"
  bun run typecheck
  bun run build
  echo "✔ medioui typecheck and build passed after import."
fi
