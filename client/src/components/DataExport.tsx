import { useState } from 'react';
import { Download } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

interface DailyRow {
  date: string;
  intakeCalories: number; protein: number; carbs: number; fat: number; meals: number;
  burnedCalories: number | null; strain: number | null;
  weightKg: number | null; net: number | null;
}
interface ExportPayload {
  generatedAt: string;
  daily: DailyRow[];
  [k: string]: unknown;
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows: DailyRow[]): string {
  const cols: (keyof DailyRow)[] = ['date', 'intakeCalories', 'protein', 'carbs', 'fat', 'meals', 'burnedCalories', 'strain', 'weightKg', 'net'];
  const header = cols.join(',');
  const lines = rows.map((r) => cols.map((c) => (r[c] == null ? '' : r[c])).join(','));
  return [header, ...lines].join('\n');
}

export default function DataExport() {
  const [busy, setBusy] = useState<null | 'json' | 'csv'>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchData(): Promise<ExportPayload> {
    return (await apiClient.get('/api/export')) as ExportPayload;
  }

  async function exportJson() {
    setBusy('json'); setError(null);
    try {
      const data = await fetchData();
      const stamp = data.generatedAt.slice(0, 10);
      triggerDownload(`arise-export-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json');
    } catch { setError('Export failed. Try again.'); } finally { setBusy(null); }
  }

  async function exportCsv() {
    setBusy('csv'); setError(null);
    try {
      const data = await fetchData();
      const stamp = data.generatedAt.slice(0, 10);
      triggerDownload(`arise-daily-${stamp}.csv`, toCsv(data.daily || []), 'text/csv');
    } catch { setError('Export failed. Try again.'); } finally { setBusy(null); }
  }

  return (
    <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
      <h3 style={{ fontSize: 17, marginBottom: 4 }}>Export My Data</h3>
      <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 16 }}>
        Download your full history — daily calories in, calories burned (WHOOP), macros, and weight — to analyze anywhere.
      </p>
      {error && <p style={{ color: 'var(--warn)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={exportCsv} disabled={busy !== null}>
          <Download size={15} />{busy === 'csv' ? 'Preparing…' : 'Daily CSV'}
        </button>
        <button className="btn" onClick={exportJson} disabled={busy !== null}>
          <Download size={15} />{busy === 'json' ? 'Preparing…' : 'Full JSON'}
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 12 }}>
        CSV = one row per day (great for spreadsheets). JSON = everything, including each individual food entry and measurement.
      </p>
    </section>
  );
}
