// Pure normalization layer: raw TokenCost entry -> typed ModelRecord.
// No network, no Date.now(), no side effects. Every function is unit-tested test-first.
// This file grows across Phase 0A Tasks 4-9; each section is appended, never rewritten.
// Owner: TokenTally engine. Version: Phase 0A.

import type { BillingUnit } from '@/types/registry';

export type RawEntry = Record<string, unknown>;

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const PER_MILLION = 1_000_000;

// A4 supply-chain guard: reject negative and ~1000x data-poisoning/typo rates on per raw
// token/char values. 1e-2 raw sits just above the highest real rate in the pinned snapshot
// (azure_ai/jais-30b-chat output at 9.71e-3 raw = $9,710/M), so no real model is dropped.
const MAX_RAW_RATE = 1e-2;

function sanePrice(v: number | null, unit: BillingUnit): boolean {
  if (v === null) return true; // absence is handled by the caller, not treated as insane
  if (v < 0) return false;
  if (unit === 'per_token' || unit === 'per_character') return v <= MAX_RAW_RATE;
  return Number.isFinite(v); // per_second / dbu: raw rates vary widely, only require finiteness
}

export function detectBillingUnit(e: RawEntry): BillingUnit {
  // A5: per_character wins when present (Vertex's real billing unit; gemini-1.5-pro and
  // medlm carry both a per-character and a per-token rate — the per-character rate is billed).
  if (num(e.input_cost_per_character) !== null) return 'per_character';
  if (num(e.input_cost_per_second) !== null && num(e.input_cost_per_token) === null) return 'per_second';
  if (num(e.input_dbu_cost_per_token) !== null && num(e.input_cost_per_token) === null) return 'dbu';
  return 'per_token';
}

// Token and character prices scale to per-million; per_second and dbu are stored raw.
// A present-but-insane raw value returns null, which drops the row in normalizeEntry.
export function normalizeInputPrice(e: RawEntry, unit: BillingUnit): number | null {
  switch (unit) {
    case 'per_token': {
      const v = num(e.input_cost_per_token);
      return v !== null && sanePrice(v, unit) ? v * PER_MILLION : null;
    }
    case 'per_character': {
      const v = num(e.input_cost_per_character);
      return v !== null && sanePrice(v, unit) ? v * PER_MILLION : null;
    }
    case 'per_second': {
      const v = num(e.input_cost_per_second);
      return v !== null && sanePrice(v, unit) ? v : null;
    }
    case 'dbu': {
      const v = num(e.input_dbu_cost_per_token);
      return v !== null && sanePrice(v, unit) ? v : null;
    }
  }
}

// A5: output pricing mirrors the input unit switch. An insane output rate omits the field
// (returns null) rather than dropping the whole row.
export function normalizeOutputPrice(e: RawEntry, unit: BillingUnit): number | null {
  switch (unit) {
    case 'per_token': {
      const v = num(e.output_cost_per_token);
      return v !== null && sanePrice(v, unit) ? v * PER_MILLION : null;
    }
    case 'per_character': {
      const v = num(e.output_cost_per_character);
      return v !== null && sanePrice(v, unit) ? v * PER_MILLION : null;
    }
    case 'per_second': {
      const v = num(e.output_cost_per_second);
      return v !== null && sanePrice(v, unit) ? v : null;
    }
    case 'dbu': {
      const v = num(e.output_dbu_cost_per_token);
      return v !== null && sanePrice(v, unit) ? v : null;
    }
  }
}
