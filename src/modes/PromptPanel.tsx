// Phase 2A Prompt/Batch input panel (lazy).
import { useAppStore } from '@/store/useAppStore';
import { NumberField } from '@/ui/NumberField';
import { ModelSelector } from '@/ui/ModelSelector';
import { ResultsPending } from '@/ui/ResultsPending';

export default function PromptPanel(): JSX.Element {
  const i = useAppStore((s) => s.inputs.prompt);
  const patch = useAppStore((s) => s.patchInputs);
  return (
    <div className="card">
      <ModelSelector mode="prompt" />
      <NumberField label="Prompt (tokens, live count in the next stage)" value={i.sharedSystemPromptTokens} onChange={(v) => patch('prompt', { sharedSystemPromptTokens: v })} hint="Shared cacheable prefix (0 = none)" />
      <NumberField label="Response (tokens)" value={i.responseTokens} onChange={(v) => patch('prompt', { responseTokens: v })} />
      <NumberField label="Calls per month" value={i.callsPerMonth} onChange={(v) => patch('prompt', { callsPerMonth: v })} />
      <NumberField label="Turns per call" value={i.turnsPerCall} min={1} onChange={(v) => patch('prompt', { turnsPerCall: v })} />
      <ResultsPending />
    </div>
  );
}
