export function PageState({ title, message, tone = 'neutral', busy = false }) {
  return (
    <main className={`page-state page-state--${tone}`} aria-live="polite" aria-busy={busy}>
      {busy && <span className="spinner" aria-hidden="true" />}
      <h1>{title}</h1>
      {message && <p>{message}</p>}
    </main>
  );
}
