// Phase 2A Denial-of-Wallet input panel (lazy). Defensive, opt-in, dual-use. P2-A20: the disclaimer + VDP
// link render (as text nodes / a real link) DOM-BEFORE any figure, and no worst-case number appears until
// BOTH the kill switch and the authorized-use acknowledgement are on. The exposure figure + mitigations
// land in 2C, sourcing DOW_DISCLAIMER/DOW_VDP_URL from @/optimization; the copy here mirrors them.
import { useAppStore } from '@/store/useAppStore';
import { NumberField } from '@/ui/NumberField';
import { ModelSelector } from '@/ui/ModelSelector';

const DISCLAIMER =
  'Defensive planning only. This bounds your own worst-case spend so you can set budget, output, retry, ' +
  'and rate-limit controls. Do not use it to plan abuse of a third party; test only systems you are ' +
  'authorized to test.';
const VDP_URL = 'https://github.com/TikiTribe/TokenTally/security/advisories/new';

export default function DenialOfWalletPanel(): JSX.Element {
  const i = useAppStore((s) => s.inputs.denial_of_wallet);
  const patch = useAppStore((s) => s.patchInputs);
  const ready = i.enabled && i.acknowledgedAuthorizedUse;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Denial of Wallet (defensive)</h2>
      <p style={{ color: 'var(--text-muted)' }}>{DISCLAIMER}</p>
      <p>
        Report a vulnerability:{' '}
        <a href={VDP_URL} style={{ color: 'var(--primary)' }} rel="noreferrer">
          {VDP_URL}
        </a>
      </p>
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        <input type="checkbox" checked={i.enabled} onChange={(e) => patch('denial_of_wallet', { enabled: e.target.checked })} />{' '}
        Enable Denial-of-Wallet modeling (opt-in)
      </label>
      <label style={{ display: 'block', marginBottom: '0.75rem' }}>
        <input type="checkbox" checked={i.acknowledgedAuthorizedUse} onChange={(e) => patch('denial_of_wallet', { acknowledgedAuthorizedUse: e.target.checked })} />{' '}
        I am modeling a system I am authorized to test.
      </label>

      {ready ? (
        <>
          <ModelSelector mode="denial_of_wallet" />
          <NumberField label="Attacker requests per month" value={i.attackerRequestsPerMonth} onChange={(v) => patch('denial_of_wallet', { attackerRequestsPerMonth: v })} />
          <NumberField label="Retry ceiling (forced-retry multiplier)" value={i.retryCeiling} min={1} onChange={(v) => patch('denial_of_wallet', { retryCeiling: v })} />
          <NumberField label="Fallback input cap (tokens, if model exposes none)" value={i.fallbackInputTokens} onChange={(v) => patch('denial_of_wallet', { fallbackInputTokens: v })} />
          <NumberField label="Fallback output cap (tokens, if model exposes none)" value={i.fallbackOutputTokens} onChange={(v) => patch('denial_of_wallet', { fallbackOutputTokens: v })} />
          <div className="card" style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
            Bounded worst-case exposure + defensive mitigations arrive in the next build stage.
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>Enable both checkboxes above to model exposure.</p>
      )}
    </div>
  );
}
