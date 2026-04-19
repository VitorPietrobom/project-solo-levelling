export interface Lesson {
  id: string;
  content: string;
  tags: string[];
  linkedSkillId: string | null;
  date: string;
}

interface LessonsListProps {
  lessons: Lesson[];
  onDelete: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LessonsList({ lessons = [], onDelete, searchTerm, onSearchChange }: LessonsListProps) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search lessons..."
        className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
        aria-label="Search lessons"
      />
      {lessons.length === 0 ? (
        <p className="text-text-secondary text-sm">No lessons found.</p>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-card rounded-lg p-3 border border-border">
              <div className="flex items-start justify-between gap-2">
                <p className="text-text-primary text-sm">{lesson.content}</p>
                <button
                  onClick={() => onDelete(lesson.id)}
                  className="text-accent-warning text-xs hover:opacity-80 shrink-0"
                  aria-label={`Delete lesson`}
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {lesson.tags.map((tag) => (
                  <span key={tag} className="bg-secondary text-accent-info text-xs px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
                {lesson.linkedSkillId && (
                  <span className="text-accent-secondary text-xs">🔗 Linked skill</span>
                )}
                <span className="text-text-secondary text-xs ml-auto">{formatDate(lesson.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
