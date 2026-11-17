/**
 * CodexExecutionView Facade Module
 *
 * Decomposed into modular single-responsibility subcomponents under src/features/activity/subcomponents/:
 * - modelAttribution.tsx
 * - useToolTimer.ts
 * - trajectoryParser.tsx
 * - CodexToolRow.tsx
 * - CodexToolCluster.tsx
 *
 * 100% backward compatibility maintained for all 21 exported symbols.
 */

// 1. Model Attribution
export {
  MODEL_DISPLAY_NAMES,
  resolveModelDisplay,
  getModelBadgeColors,
  ModelAttributionBadge,
  type ModelExecutionTelemetry,
  type ModelBadgeProps,
} from './subcomponents/modelAttribution';

// 2. Tool Timer & Duration
export {
  formatDurationMs,
  useToolDuration,
} from './subcomponents/useToolTimer';

// 3. Trajectory Parser & View
export {
  parseCanonicalTrajectory,
  CanonicalTrajectoryView,
  type TrajectoryBlock,
} from './subcomponents/trajectoryParser';

// 4. Tool Row & Action Parsing
export {
  CodexToolRow,
  parseToolAction,
  type CodexToolRowProps,
  type ParsedToolAction,
} from './subcomponents/CodexToolRow';

// 5. Tool Cluster & Activity Accordion
export {
  CodexToolCluster,
  ActivityAccordion,
  computeGroupHeader,
  deduplicateTools,
  type CodexToolClusterProps,
  type ActivityAccordionProps,
} from './subcomponents/CodexToolCluster';

// Default export alias to CodexToolCluster for backward compatibility
export { CodexToolCluster as default } from './subcomponents/CodexToolCluster';
