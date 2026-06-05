import WeeklySummary from '../components/WeeklySummary';

export default function SummaryTab() {
  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
        <h3 style={{ fontSize: 17, marginBottom: 16 }}>Weekly Summary</h3>
        <WeeklySummary />
      </section>
    </div>
  );
}
