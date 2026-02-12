// Gate types
export type {
  GateVerdict,
  GateResult,
  CapacityGateContext,
  SuppressionState,
  SuppressionContext,
  SubHubFreshness,
  FreshnessGateContext,
} from './types';

// Gate functions
export { checkCapacity } from './capacity-gate';
export { checkSuppression } from './suppression-engine';
export { checkFreshness } from './freshness-gate';
