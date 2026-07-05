// P1-A23: lock the Phase-2 import contract - every intended public symbol must be reachable from the barrel
// (tsc catches a misnamed re-export but NOT an omitted one).
import { describe, it, expect } from 'vitest';
import * as workloads from '@/workloads';

describe('workloads barrel', () => {
  it('exports every public forecast, preset, and constant', () => {
    for (const name of [
      'chatbotForecast', 'promptForecast', 'agentForecast', 'crewForecast', 'applyPreset',
    ] as const) {
      expect(typeof workloads[name]).toBe('function');
    }
    expect(Array.isArray(workloads.AGENT_PRESETS)).toBe(true);
    expect(workloads.CUSTOM_PRESET.name).toBe('custom');
    expect(workloads.MAX_PLOTTED_STEPS).toBeGreaterThan(0);
    expect(workloads.MAX_CREW_MEMBERS).toBeGreaterThan(0);
    expect(workloads.WORKLOAD_KINDS).toContain('chatbot');
  });
});
