import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import InviteGate from './InviteGate';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  // undefined = not checked yet, null = check failed open (don't block on a
  // transient error), boolean = the real answer.
  const [activated, setActivated] = useState<boolean | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    let active = true;
    apiClient.get('/api/invite/status')
      .then((res) => { if (active) setActivated((res as { activated: boolean }).activated); })
      .catch(() => { if (active) setActivated(null); });
    return () => { active = false; };
  }, [user]);

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

  if (activated === false) {
    return <InviteGate onActivated={() => setActivated(true)} />;
  }

  return <>{children}</>;
}
