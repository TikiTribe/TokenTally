// Public optimization API. Owner: TokenTally engine. Version: Phase 1.
//
// FIRST-PAINT CONTRACT (P1-A25): reach this module only via a dynamic import() in Phase 2 (it pulls in the
// workloads + engine + registry-query graph). SECURITY (P1-A29): the label/rationale/note/control strings
// are display-as-text-only (DOM text nodes, never innerHTML).
export { optimize, solveBudget } from '@/optimization/optimize';
export type { Recommendation } from '@/optimization/optimize';
export { tornado } from '@/optimization/tornado';
export type { TornadoBar } from '@/optimization/tornado';
export { denialOfWallet, DOW_DISCLAIMER, DOW_VDP_URL } from '@/optimization/denialOfWallet';
export type { DenialOfWalletConfig, DenialOfWalletResult, Mitigation } from '@/optimization/denialOfWallet';
export { candidates, numField, isAllowedNumericField, NUMERIC_FIELDS } from '@/optimization/candidates';
export type { OptimizationBase, Candidate, OptKind, OptWorkloadKind, WorkloadConfig } from '@/optimization/candidates';
export { priceWorkload } from '@/optimization/price';
