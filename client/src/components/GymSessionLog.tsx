export interface GymSession {
  id: string;
  date: string;
  notes: string | null;
  exercises: {
    id: string;
    name: string;
    sets: number;
    reps: number;
    weight: number;
    muscleGroups: { muscleGroup: string }[];
  }[];
}

interface GymSessionLogProps {
  sessions: GymSession[];
  onDelete?: (sessionId: string) => void;
}

export default function GymSessionLog({ sessions, onDelete }: GymSessionLogProps) {
  if (sessions.length === 0) {
    return (
      <p className="text-text-secondary text-sm">
        No gym sessions yet. Import your first session from Hevy to start tracking.
      </p>
    );
  }

  return (
    <div className="space-y-3" role="list" aria-label="Gym sessions">
      {sessions.map((session) => (
        <div key={session.id} className="bg-card rounded-lg p-4 border border-border" role="listitem">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-primary font-semibold">
              {new Date(session.date).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-text-secondary text-xs">
                {session.exercises.length} exercise{session.exercises.length !== 1 ? 's' : ''}
              </span>
              {onDelete && (
                <button
                  onClick={() => onDelete(session.id)}
                  className="text-accent-warning text-xs hover:opacity-80"
                  aria-label={`Delete session from ${session.date}`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          {session.notes && (
            <p className="text-text-secondary text-sm mb-2">{session.notes}</p>
          )}
          <div className="space-y-1">
            {session.exercises.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{ex.name}</span>
                <span className="text-text-secondary">
                  {ex.sets}×{ex.reps}{ex.weight > 0 ? ` @ ${ex.weight}kg` : ' (BW)'}
                </span>
              </div>
            ))}
          </div>
          {session.exercises.some((ex) => ex.muscleGroups.length > 0) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {[...new Set(session.exercises.flatMap((ex) => ex.muscleGroups.map((mg) => mg.muscleGroup)))].map((mg) => (
                <span key={mg} className="text-xs bg-secondary text-text-secondary px-2 py-0.5 rounded">{mg}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
