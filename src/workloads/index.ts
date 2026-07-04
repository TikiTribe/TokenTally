// Public workload API: the four forecasts + framework presets + the shared contract types.
// Owner: TokenTally engine. Version: Phase 1.
//
// FIRST-PAINT CONTRACT (P1-A25): this module transitively pulls in the engine + registry-query graph.
// A Phase-2 UI MUST reach it only via a dynamic `import('@/workloads')` (code-split per mode), never a
// top-level import in a first-paint component, or the size-limit gate on the entry chunk will break.
export { chatbotForecast } from '@/workloads/chatbot';
export { promptForecast } from '@/workloads/prompt';
export { agentForecast, MAX_PLOTTED_STEPS } from '@/workloads/agent';
export { crewForecast, MAX_CREW_MEMBERS } from '@/workloads/crew';
export { AGENT_PRESETS, CUSTOM_PRESET, applyPreset } from '@/workloads/presets';
export type { PresetName, AgentPreset } from '@/workloads/presets';
export type {
  WorkloadForecast, StepProfile, WorkloadKind, TokenizerBand,
  ChatbotConfig, PromptConfig, AgentConfig, CrewConfig,
} from '@/types/workload';
export { WORKLOAD_KINDS } from '@/types/workload';
