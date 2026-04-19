import { useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient';

interface GamificationStatus {
  level: number;
  totalXP: number;
  progress: { current: number; required: number; percentage: number };
}

export default function LevelDisplay() {
  const [status, setStatus] = useState<GamificationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/api/gamification/status')
      .then((data) => setStatus(data as GamificationStatus))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div className="text-accent-warning text-sm">{error}</div>;
  }

  if (!status) {
    return <div className="text-text-secondary text-sm">Loading...</div>;
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-accent-secondary font-bold text-lg">
          Level {status.level}
        </span>
        <span className="text-text-secondary text-sm">
          {status.totalXP} XP total
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
        <div
          className="bg-accent-primary h-3 rounded-full transition-all duration-300"
          style={{ width: `${status.progress.percentage}%` }}
          role="progressbar"
          aria-valuenow={status.progress.current}
          aria-valuemin={0}
          aria-valuemax={status.progress.required}
          aria-label={`XP progress: ${status.progress.current} of ${status.progress.required}`}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-text-secondary text-xs">
          {status.progress.current} / {status.progress.required} XP
        </span>
        <span className="text-text-secondary text-xs">
          {Math.floor(status.progress.percentage)}%
        </span>
      </div>
    </div>
  );
}
