// Phase 2A Chatbot input panel (lazy). Inputs bind to the store; forecast in ResultDisplay. help-1: per-field
// tooltips + a "how this works" explainer.
import { useAppStore } from '@/store/useAppStore';
import { NumberField } from '@/ui/NumberField';
import { ModelSelector } from '@/ui/ModelSelector';
import { TokenizedTextArea } from '@/ui/TokenizedTextArea';
import { ModeExplainer } from '@/ui/ModeExplainer';
import { HelpTip } from '@/ui/HelpTip';
import { FIELD_HELP, MODEL_HELP, fieldHelp } from '@/config/helpContent';
import type { ContextStrategy } from '@/store/types';

export default function ChatbotPanel(): JSX.Element {
  const i = useAppStore((s) => s.inputs.chatbot);
  const modelId = useAppStore((s) => s.selection.chatbot.canonicalId);
  const patch = useAppStore((s) => s.patchInputs);
  return (
    <div className="card">
      <ModeExplainer mode="chatbot" />
      <ModelSelector mode="chatbot" help={MODEL_HELP} />
      <TokenizedTextArea label="System prompt" fieldId="chatbot.systemPrompt" modelId={modelId} value={i.systemPromptText} onChange={(v) => patch('chatbot', { systemPromptText: v })} hint="Cached prefix (the caching value lever)" help={FIELD_HELP['chatbot.systemPrompt']} />
      <NumberField label="Avg user message (tokens)" value={i.avgUserMessageTokens} onChange={(v) => patch('chatbot', { avgUserMessageTokens: v })} help={FIELD_HELP['chatbot.avgUserMessageTokens']} />
      <NumberField label="Avg response (tokens)" value={i.avgResponseTokens} onChange={(v) => patch('chatbot', { avgResponseTokens: v })} help={FIELD_HELP['chatbot.avgResponseTokens']} />
      <NumberField label="Turns per conversation" value={i.turnsPerConversation} onChange={(v) => patch('chatbot', { turnsPerConversation: v })} help={FIELD_HELP['chatbot.turnsPerConversation']} />
      <NumberField label="Conversations per month" value={i.conversationsPerMonth} onChange={(v) => patch('chatbot', { conversationsPerMonth: v })} help={FIELD_HELP['chatbot.conversationsPerMonth']} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
        <span className="field-label-row">
          <label htmlFor="chatbot-ctx" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Context strategy</label>
          <HelpTip tipId="chatbot-ctx-tip" content={fieldHelp('chatbot.contextStrategy')} />
        </span>
        <select id="chatbot-ctx" className="input-field" value={i.contextStrategy} aria-describedby="chatbot-ctx-tip"
          onChange={(e) => patch('chatbot', { contextStrategy: e.target.value as ContextStrategy })}>
          <option value="minimal">Minimal (50 tok/turn)</option>
          <option value="moderate">Moderate (150 tok/turn)</option>
          <option value="full">Full (300 tok/turn)</option>
        </select>
      </div>
    </div>
  );
}
