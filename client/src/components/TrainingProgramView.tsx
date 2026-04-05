import { useState } from 'react';

export interface ProgramExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  targetWeight: number;
  sortOrder: number;
}

export interface ProgramDay {
  id: string;
  dayOfWeek: string;
  exercises: ProgramExercise[];
}

export interface TrainingProgram {
  id: string;
  name: string;
  active: boolean;
  days: ProgramDay[];
}

interface TrainingProgramViewProps {
  programs: TrainingProgram[];
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function TrainingProgramView({ programs, onActivate, onDelete }: TrainingProgramViewProps) {
  const activeProgram = programs.find((p) => p.active);
  const otherPrograms = programs.filter((p) => !p.active);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (programs.length === 0) {
    return (
      <p className="text-text-secondary text-sm">
        No training programs yet. Create one to get started.
      </p>
    );
  }

  const sortedDays = activeProgram
    ? [...activeProgram.days].sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek))
    : [];

  const activeDayKey = selectedDay ?? (sortedDays.length > 0 ? sortedDays[0].dayOfWeek : null);
  const activeDay = sortedDays.find((d) => d.dayOfWeek === activeDayKey);

  return (
    <div className="space-y-4">
      {activeProgram && (
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-text-primary font-semibold">{activeProgram.name}</span>
              <span className="text-xs bg-accent-primary text-primary px-2 py-0.5 rounded font-semibold">
                Active
              </span>
            </div>
          </div>

          {/* Day tabs */}
          {sortedDays.length > 0 && (
            <div className="flex gap-1 mb-3 flex-wrap" role="tablist" aria-label="Training days">
              {sortedDays.map((day) => (
                <button
                  key={day.id}
                  role="tab"
                  aria-selected={day.dayOfWeek === activeDayKey}
                  onClick={() => setSelectedDay(day.dayOfWeek)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    day.dayOfWeek === activeDayKey
                      ? 'bg-accent-primary text-primary'
                      : 'bg-secondary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {DAY_LABELS[day.dayOfWeek] || day.dayOfWeek}
                </button>
              ))}
            </div>
          )}

          {/* Exercises for selected day */}
          {activeDay && activeDay.exercises.length > 0 ? (
            <div className="space-y-1" role="list" aria-label={`${DAY_LABELS[activeDay.dayOfWeek] || activeDay.dayOfWeek} exercises`}>
              {activeDay.exercises.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between text-sm" role="listitem">
                  <span className="text-text-primary">{ex.name}</span>
                  <span className="text-text-secondary">
                    {ex.sets}×{ex.reps}{ex.targetWeight > 0 ? ` @ ${ex.targetWeight}kg` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : activeDay ? (
            <p className="text-text-secondary text-sm">No exercises for this day.</p>
          ) : null}
        </div>
      )}

      {/* Other programs */}
      {otherPrograms.length > 0 && (
        <div className="space-y-2">
          {otherPrograms.map((program) => (
            <div key={program.id} className="bg-card rounded-lg p-3 border border-border flex items-center justify-between">
              <div>
                <span className="text-text-primary text-sm font-medium">{program.name}</span>
                <span className="text-text-secondary text-xs ml-2">
                  {program.days.length} day{program.days.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onActivate(program.id)}
                  className="text-accent-info text-xs hover:opacity-80"
                  aria-label={`Activate ${program.name}`}
                >
                  Activate
                </button>
                <button
                  onClick={() => onDelete(program.id)}
                  className="text-accent-warning text-xs hover:opacity-80"
                  aria-label={`Delete ${program.name}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
