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
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NoteList({ notes = [], onSelect, onDelete, searchTerm, onSearchChange }: NoteListProps) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search notes..."
        className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
        aria-label="Search notes"
      />
      {notes.length === 0 ? (
        <p className="text-text-secondary text-sm">
          {searchTerm ? 'No notes match your search.' : 'No notes yet. Create one to get started.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-card rounded-lg p-3 border border-border hover:border-accent-primary transition-colors cursor-pointer"
              onClick={() => onSelect(note.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(note.id); }}
              aria-label={`View note: ${note.title}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-text-primary font-semibold text-sm truncate">{note.title}</h4>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                  className="text-accent-warning text-xs hover:opacity-80 shrink-0"
                  aria-label={`Delete note: ${note.title}`}
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {note.tags.map((tag) => (
                  <span key={tag} className="bg-secondary text-accent-info text-xs px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
                <span className="text-text-secondary text-xs ml-auto">{formatDate(note.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
