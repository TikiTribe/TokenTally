// Phase 2A placeholder for the results area. NEVER a $0 — the real cost display (headline + waterfall +
// confidence + badge) lands in Phase 2C. Owner: TokenTally UI. Version: Phase 2A.
export function ResultsPending(): JSX.Element {
  return (
    <div className="card" style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
      <strong style={{ color: 'var(--text)' }}>Cost forecast</strong>
      <p style={{ margin: '0.5rem 0 0' }}>
        Enter your workload above. Real-time forecasts (headline cost, waterfall, confidence range, accuracy
        badge) arrive in the next build stage.
      </p>
    </div>
  );
}
