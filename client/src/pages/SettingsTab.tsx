import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DataExport from '../components/DataExport';
import { apiClient } from '../lib/apiClient';

function HunterNameField() {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchName = useCallback(async () => {
    try {
      const status = (await apiClient.get('/api/gamification/status')) as { hunterName?: string };
      setName(status.hunterName ?? '');
      setSaved(status.hunterName ?? null);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { fetchName(); }, [fetchName]);

  async function save() {
    setSaving(true);
    try {
      const res = (await apiClient.put('/api/gamification/profile', { body: { hunterName: name } })) as { hunterName: string };
      setName(res.hunterName);
      setSaved(res.hunterName);
    } finally { setSaving(false); }
  }

  const dirty = name !== (saved ?? '');

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', background: 'var(--surface-inset)', borderRadius: 'var(--r-sm)', flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Hunter name</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Shown on your level card instead of the generic default</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && dirty) save(); }}
          placeholder="Hunter name" aria-label="Hunter name" maxLength={40}
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '7px 10px', fontSize: 13, width: 160 }}
        />
        <button className="btn btn-primary" onClick={save} disabled={!dirty || saving} style={{ padding: '7px 12px', fontSize: 12.5 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsTab() {
  const { logout } = useAuth();

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)', maxWidth: 560 }}>
      <DataExport />

      <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
        <h3 style={{ fontSize: 17, marginBottom: 16 }}>Account</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <HunterNameField />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface-inset)', borderRadius: 'var(--r-sm)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Sign out</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sign out of your account on this device</div>
            </div>
            <button
              onClick={logout}
              className="btn"
              style={{ color: 'var(--bad)', borderColor: 'var(--bad)', flexShrink: 0 }}
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
        <h3 style={{ fontSize: 17, marginBottom: 4 }}>About</h3>
        <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 16 }}>Project Arise — level up your life.</p>
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            ['Version', '1.0.0'],
            ['Stack', 'React · Express · Neon Postgres'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ color: 'var(--text-3)' }}>{label}</span>
              <span className="mono" style={{ color: 'var(--text-2)' }}>{value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
