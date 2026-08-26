import { useState } from 'react';
import { apiClient, errorMessage } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface InviteGateProps {
  onActivated: () => void;
}

export default function InviteGate({ onActivated }: InviteGateProps) {
  const { logout } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError('Enter your invite code');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/api/invite/redeem', { body: { code: code.trim() } });
      onActivated();
    } catch (err) {
      setError(errorMessage(err, 'Failed to redeem invite code'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-primary">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-8 rounded-lg bg-card border border-border"
      >
        <h1 className="text-2xl font-bold text-text-primary mb-2 text-center">
          Project Arise
        </h1>
        <p className="text-text-secondary text-sm mb-6 text-center">
          Currently in a closed alpha. Enter your invite code to get in.
        </p>

        {error && (
          <p className="text-accent-warning text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        <label className="block mb-6">
          <span className="text-text-secondary text-sm">Invite code</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            className="mt-1 block w-full px-3 py-2 rounded bg-secondary text-text-primary border border-border focus:outline-none focus:border-accent-primary"
            aria-label="Invite code"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? 'Checking…' : 'Enter'}
        </button>

        <button
          type="button"
          onClick={logout}
          className="mt-4 w-full text-text-secondary text-sm hover:opacity-80"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
