import { Search, X } from 'lucide-react';

export interface Note {
  id: string;
  title: string;
  tags: string[];
  updatedAt: string;
  content?: string;
}

interface NoteListProps {
  notes: Note[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  hideSearch?: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function preview(content?: string): string {
  if (!content) return '';
  return content.replace(/[#>*`_[\]()-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);
}

export default function NoteList({ notes = [], onSelect, onDelete, searchTerm, onSearchChange, hideSearch }: NoteListProps) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {!hideSearch && (
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            type="text" value={searchTerm} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes…" aria-label="Search notes"
            style={{ width: '100%', background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '9px 12px 9px 34px', fontSize: 13.5, outline: 'none' }}
          />
        </div>
      )}

      {notes.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
          {searchTerm ? 'No notes match your search.' : 'No notes yet. Create one to get started.'}
        </p>
      ) : (
        <div className="grid-2-col">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelect(note.id)}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(note.id); }}
              aria-label={`View note: ${note.title}`}
              style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 14, cursor: 'pointer', transition: 'border-color .15s, transform .15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-soft)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <h4 style={{ fontSize: 14.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</h4>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                  aria-label={`Delete note: ${note.title}`}
                  style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', flexShrink: 0, lineHeight: 1, display: 'flex' }}
                ><X size={14} /></button>
              </div>
              {preview(note.content) && (
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '6px 0 0', lineHeight: 1.45 }}>{preview(note.content)}…</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {note.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="chip" style={{ fontSize: 10.5, padding: '3px 8px', color: 'var(--accent-2)' }}>{tag}</span>
                ))}
                <span style={{ color: 'var(--text-faint)', fontSize: 11, marginLeft: 'auto' }}>{formatDate(note.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
