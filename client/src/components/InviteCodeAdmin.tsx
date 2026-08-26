import { useState, useEffect, useCallback } from 'react';
import { Plus, Copy, Check } from 'lucide-react';
import { apiClient, errorMessage, ApiError } from '../lib/apiClient';
import { useToast } from '../contexts/ToastContext';

interface InviteCode {
  id: string;
  code: string;
  createdAt: string;
  redeemedAt: string | null;
  redeemedBy: { email: string } | null;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function CodeRow({ invite }: { invite: InviteCode }) {
  const [copied, setCopied] = useState(false);
  const used = !!invite.redeemedAt;

  function copy() {
    navigator.clipboard.writeText(invite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 11px', background: 'var(--surface-inset)', borderRadius: 'var(--r-sm)' }}>
      <span className="mono" style={{ fontSize: 13.5, letterSpacing: 1, color: used ? 'var(--text-faint)' : 'var(--text)', textDecoration: used ? 'line-through' : 'none' }}>
        {invite.code}
      </span>
      {used ? (
        <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
          used by {invite.redeemedBy?.email ?? 'someone'} · {shortDate(invite.redeemedAt!)}
        </span>
      ) : (
        <button
          onClick={copy}
          className="btn btn-ghost"
          style={{ padding: '4px 8px', fontSize: 11.5, flexShrink: 0 }}
          aria-label={`Copy invite code ${invite.code}`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </div>
  );
}

// Only renders anything for the account matching the server's ADMIN_EMAIL —
// everyone else's GET /api/invite/codes 403s and this quietly disappears.
export default function InviteCodeAdmin() {
  const { showToast } = useToast();
  const [codes, setCodes] = useState<InviteCode[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchCodes = useCallback(async () => {
    try {
      setCodes((await apiClient.get('/api/invite/codes')) as InviteCode[]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setIsAdmin(false);
    }
  }, []);
  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const created = (await apiClient.post('/api/invite/codes')) as InviteCode;
      setCodes((prev) => [created, ...(prev ?? [])]);
    } catch (err) {
      showToast(errorMessage(err, 'Failed to generate invite code'));
    } finally {
      setGenerating(false);
    }
  }

  if (!isAdmin || codes === null) return null;

  return (
    <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 17 }}>Alpha Invites</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 2 }}>Each code works once, for one person.</p>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn btn-ghost">
          <Plus size={15} strokeWidth={2.4} />{generating ? 'Generating…' : 'New Code'}
        </button>
      </div>
      {codes.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0' }}>
          No codes yet — click "New Code" to generate one.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {codes.map((c) => <CodeRow key={c.id} invite={c} />)}
        </div>
      )}
    </section>
  );
}
