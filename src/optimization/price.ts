// Shared workload pricing for the optimizer + tornado. Exhaustive over the supported workload kinds
// (P1-A22: crew optimization is deferred to Phase 2). Pure. Owner: engine. Version: Phase 1.
import { chatbotForecast, promptForecast, agentForecast } from '@/workloads';
import type { OptWorkloadKind, WorkloadConfig } from '@/optimization/candidates';
import type { WorkloadForecast, ChatbotConfig, PromptConfig, AgentConfig } from '@/types/workload';

export function priceWorkload(kind: OptWorkloadKind, config: WorkloadConfig): WorkloadForecast {
  switch (kind) {
    case 'chatbot':
      return chatbotForecast(config as ChatbotConfig);
    case 'prompt':
      return promptForecast(config as PromptConfig);
    case 'agent':
      return agentForecast(config as AgentConfig);
    default: {
      const _never: never = kind;
      throw new Error(`unsupported workload kind: ${String(_never)}`);
    }
  }
}
