import { Search, X, Link2 } from 'lucide-react';

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
  hideSearch?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default function LessonsList({ lessons = [], onDelete, searchTerm, onSearchChange, hideSearch }: LessonsListProps) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {!hideSearch && (
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            type="text" value={searchTerm} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search lessons…" aria-label="Search lessons"
            style={{ width: '100%', background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '9px 12px 9px 34px', fontSize: 13.5, outline: 'none' }}
          />
        </div>
      )}

      {lessons.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
          {searchTerm ? 'No lessons match.' : 'No lessons yet. Capture what you learned.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {lessons.map((lesson) => (
            <div key={lesson.id} style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '12px 14px', borderLeft: '3px solid var(--accent-2)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{lesson.content}</p>
                <button
                  onClick={() => onDelete(lesson.id)} aria-label="Delete lesson"
                  style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', flexShrink: 0, display: 'flex', lineHeight: 1 }}
                ><X size={14} /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {lesson.tags.map((tag) => (
                  <span key={tag} className="chip" style={{ fontSize: 10.5, padding: '3px 8px', color: 'var(--accent-2)' }}>{tag}</span>
                ))}
                {lesson.linkedSkillId && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)' }}><Link2 size={11} /> skill</span>
                )}
                <span style={{ color: 'var(--text-faint)', fontSize: 11, marginLeft: 'auto' }}>{formatDate(lesson.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
