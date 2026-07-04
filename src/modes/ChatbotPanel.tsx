// Phase 2A Chatbot input panel (lazy). Inputs bind to the store; the forecast lands in 2C.
import { useAppStore } from '@/store/useAppStore';
import { NumberField } from '@/ui/NumberField';
import { ModelSelector } from '@/ui/ModelSelector';
import { ResultsPending } from '@/ui/ResultsPending';
import type { ContextStrategy } from '@/store/types';

export default function ChatbotPanel(): JSX.Element {
  const i = useAppStore((s) => s.inputs.chatbot);
  const patch = useAppStore((s) => s.patchInputs);
  return (
    <div className="card">
      <ModelSelector mode="chatbot" />
      <NumberField label="System prompt (tokens, live count in the next stage)" value={i.avgUserMessageTokens} onChange={(v) => patch('chatbot', { avgUserMessageTokens: v })} hint="Cached prefix — the caching value lever" />
      <NumberField label="Avg response (tokens)" value={i.avgResponseTokens} onChange={(v) => patch('chatbot', { avgResponseTokens: v })} />
      <NumberField label="Turns per conversation" value={i.turnsPerConversation} onChange={(v) => patch('chatbot', { turnsPerConversation: v })} />
      <NumberField label="Conversations per month" value={i.conversationsPerMonth} onChange={(v) => patch('chatbot', { conversationsPerMonth: v })} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
        <label htmlFor="chatbot-ctx" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Context strategy</label>
        <select id="chatbot-ctx" className="input-field" value={i.contextStrategy}
          onChange={(e) => patch('chatbot', { contextStrategy: e.target.value as ContextStrategy })}>
          <option value="minimal">Minimal (50 tok/turn)</option>
          <option value="moderate">Moderate (150 tok/turn)</option>
          <option value="full">Full (300 tok/turn)</option>
        </select>
      </div>
      <ResultsPending />
    </div>
  );
}
