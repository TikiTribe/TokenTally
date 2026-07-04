// Phase 2A Prompt/Batch input panel (lazy). help-1: per-field tooltips + explainer.
import { useAppStore } from '@/store/useAppStore';
import { NumberField } from '@/ui/NumberField';
import { ModelSelector } from '@/ui/ModelSelector';
import { TokenizedTextArea } from '@/ui/TokenizedTextArea';
import { ModeExplainer } from '@/ui/ModeExplainer';
import { FIELD_HELP, MODEL_HELP } from '@/config/helpContent';

export default function PromptPanel(): JSX.Element {
  const i = useAppStore((s) => s.inputs.prompt);
  const modelId = useAppStore((s) => s.selection.prompt.canonicalId);
  const patch = useAppStore((s) => s.patchInputs);
  return (
    <div className="card">
      <ModeExplainer mode="prompt" />
      <ModelSelector mode="prompt" help={MODEL_HELP} />
      <TokenizedTextArea label="Prompt" fieldId="prompt.promptText" modelId={modelId} value={i.promptText} onChange={(v) => patch('prompt', { promptText: v })} hint="Tokenized live off the main thread" help={FIELD_HELP['prompt.promptText']} />
      <NumberField label="Shared system prompt (tokens, cacheable prefix)" value={i.sharedSystemPromptTokens} onChange={(v) => patch('prompt', { sharedSystemPromptTokens: v })} hint="0 = none" help={FIELD_HELP['prompt.sharedSystemPromptTokens']} />
      <NumberField label="Response (tokens)" value={i.responseTokens} onChange={(v) => patch('prompt', { responseTokens: v })} help={FIELD_HELP['prompt.responseTokens']} />
      <NumberField label="Calls per month" value={i.callsPerMonth} onChange={(v) => patch('prompt', { callsPerMonth: v })} help={FIELD_HELP['prompt.callsPerMonth']} />
      <NumberField label="Turns per call" value={i.turnsPerCall} min={1} onChange={(v) => patch('prompt', { turnsPerCall: v })} help={FIELD_HELP['prompt.turnsPerCall']} />
    </div>
  );
}
