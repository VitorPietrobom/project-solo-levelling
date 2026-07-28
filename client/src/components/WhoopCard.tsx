import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Heart, Moon, Zap } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

interface WhoopLatest {
  recovery: { score: number | null; restingHeartRate: number | null; hrv: number | null } | null;
  sleep: { performance: number | null; efficiency: number | null; consistency: number | null } | null;
  strain: { day: number | null; avgHeartRate: number | null } | null;
  workouts: { id: string; sport: string; start: string | null; strain: number | null; avgHeartRate: number | null }[];
  profile: { firstName: string | null; lastName: string | null } | null;
}

interface WhoopStatus {
  connected: boolean;
  syncedAt?: string | null;
  latest?: WhoopLatest | null;
}

function recoveryColor(score: number | null): string {
  if (score == null) return 'var(--text-faint)';
  if (score >= 67) return 'var(--good)';
  if (score >= 34) return 'var(--warn)';
  return 'var(--bad)';
}

function Metric({ icon: Icon, label, value, unit, color }: {
  icon: React.ElementType; label: string; value: string | number; unit?: string; color: string;
}) {
  return (
    <div style={{ background: 'var(--surface-inset)', borderRadius: 'var(--r-sm)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, color: 'var(--text-3)' }}>
        <Icon size={14} />
        <span className="eyebrow" style={{ fontSize: 10 }}>{label}</span>
      </div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 3 }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function WhoopCard({ onSynced }: { onSynced?: () => void } = {}) {
  const [status, setStatus] = useState<WhoopStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try { setStatus((await apiClient.get('/api/whoop/status')) as WhoopStatus); }
    catch { setStatus({ connected: false }); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Auto-sync once right after returning from the Whoop OAuth redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('whoop') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname);
      handleSync();
    } else if (params.get('whoop') === 'error' || params.get('whoop') === 'denied') {
      setError('Whoop connection was not completed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect() {
    setError(null);
    try {
      const { url } = (await apiClient.get('/api/whoop/authorize')) as { url: string };
      window.location.href = url;
    } catch {
      setError('Whoop is not configured yet. Add your Whoop API keys in Vercel.');
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const data = (await apiClient.post('/api/whoop/sync')) as WhoopStatus & { weightLogged?: boolean };
      setStatus(data);
      if (data.weightLogged) onSynced?.(); // WHOOP added today's bodyweight — refresh the chart
    } catch {
      setError('Could not sync Whoop data. Try reconnecting.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    try { await apiClient.delete('/api/whoop'); } catch { /* ignore */ }
    setStatus({ connected: false });
  }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={17} />
        </div>
        <h3 style={{ fontSize: 17 }}>Whoop</h3>
      </div>
      {status?.connected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={14} className={syncing ? 'spin' : ''} />{syncing ? 'Syncing…' : 'Sync'}
          </button>
          <button className="btn btn-ghost" style={{ color: 'var(--bad)' }} onClick={handleDisconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );

  if (!status) {
    return <section className="card arise-in" style={{ padding: 'var(--pad)' }}>{header}<p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Loading…</p></section>;
  }

  if (!status.connected) {
    return (
      <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
        {header}
        <p style={{ color: 'var(--text-3)', fontSize: 13.5, marginBottom: 16, maxWidth: 460 }}>
          Connect your Whoop to pull in daily <strong>recovery</strong>, <strong>sleep</strong>, <strong>strain</strong>, and recent workouts.
        </p>
        {error && <p style={{ color: 'var(--warn)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button className="btn btn-primary" onClick={handleConnect}>
          <Activity size={15} strokeWidth={2.4} />Connect Whoop
        </button>
      </section>
    );
  }

  const l = status.latest;
  return (
    <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
      {header}
      {error && <p style={{ color: 'var(--warn)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {!l || (!l.recovery && !l.sleep && !l.strain) ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>
          {status.syncedAt ? 'No Whoop data available yet — check back after your next recovery is scored.' : 'Tap Sync to pull your latest Whoop data.'}
        </p>
      ) : (
        <>
          <div className="grid-3-col" style={{ marginBottom: l.workouts.length ? 18 : 0 }}>
            <Metric icon={Heart} label="Recovery" value={l.recovery?.score ?? '—'} unit={l.recovery?.score != null ? '%' : ''} color={recoveryColor(l.recovery?.score ?? null)} />
            <Metric icon={Moon} label="Sleep" value={l.sleep?.performance ?? '—'} unit={l.sleep?.performance != null ? '%' : ''} color="var(--accent-2)" />
            <Metric icon={Zap} label="Day Strain" value={l.strain?.day ?? '—'} color="var(--accent)" />
          </div>

          {(l.recovery?.restingHeartRate != null || l.recovery?.hrv != null) && (
            <div style={{ display: 'flex', gap: 18, marginTop: 12, fontSize: 12.5, color: 'var(--text-3)' }}>
              {l.recovery?.restingHeartRate != null && <span className="mono">RHR {l.recovery.restingHeartRate} bpm</span>}
              {l.recovery?.hrv != null && <span className="mono">HRV {l.recovery.hrv} ms</span>}
            </div>
          )}

          {l.workouts.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Recent Whoop workouts</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {l.workouts.map((w) => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-inset)', borderRadius: 'var(--r-sm)' }}>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{w.sport}</span>
                    {w.strain != null && <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>strain {w.strain}</span>}
                    {w.avgHeartRate != null && <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>{w.avgHeartRate} bpm</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {status.syncedAt && (
        <div style={{ marginTop: 16, fontSize: 11.5, color: 'var(--text-faint)' }}>
          Last synced {new Date(status.syncedAt).toLocaleString()}
        </div>
      )}
    </section>
  );
}
