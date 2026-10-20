import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import InviteGate from './InviteGate';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  // undefined = not checked yet, null = check failed (show a retry screen —
  // never fail open), boolean = the real answer.
  const [activated, setActivated] = useState<boolean | null | undefined>(undefined);
  // Bumped by the Retry button to re-run the status check.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    apiClient.get('/api/invite/status')
      .then((res) => { if (active) setActivated((res as { activated: boolean }).activated); })
      .catch(() => { if (active) setActivated(null); });
    return () => { active = false; };
  }, [user, attempt]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (activated === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (activated === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-primary" style={{ gap: 12 }}>
        <p className="text-text-secondary">Couldn't verify your access.</p>
        <button
          type="button"
          onClick={() => { setActivated(undefined); setAttempt((n) => n + 1); }}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid currentColor', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (activated === false) {
    return <InviteGate onActivated={() => setActivated(true)} />;
  }

  return <>{children}</>;
}
