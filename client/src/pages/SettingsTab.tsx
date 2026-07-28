import { useAuth } from '../contexts/AuthContext';
import DataExport from '../components/DataExport';

export default function SettingsTab() {
  const { logout } = useAuth();

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)', maxWidth: 560 }}>
      <DataExport />

      <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
        <h3 style={{ fontSize: 17, marginBottom: 16 }}>Account</h3>
        <div style={{ display: 'grid', gap: 10 }}>
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
