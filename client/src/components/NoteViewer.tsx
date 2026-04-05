import type { Note } from './NoteList';

interface NoteViewerProps {
  note: Note | null;
  onEdit: () => void;
  onClose: () => void;
}

export default function NoteViewer({ note, onEdit, onClose }: NoteViewerProps) {
  if (!note) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border text-center">
        <p className="text-text-secondary text-sm">Note not found.</p>
        <button onClick={onClose} className="text-accent-info text-sm mt-2 hover:opacity-80">
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-semibold text-lg">{note.title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="text-accent-info text-sm hover:opacity-80"
            aria-label="Edit note"
          >
            ✏️ Edit
          </button>
          <button
            onClick={onClose}
            className="text-text-secondary text-sm hover:text-text-primary"
            aria-label="Close viewer"
          >
            ✕
          </button>
        </div>
      </div>
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <span key={tag} className="bg-secondary text-accent-info text-xs px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="bg-secondary rounded p-4 border border-border">
        <pre className="text-text-primary text-sm whitespace-pre-wrap font-sans">
          {note.content || 'No content.'}
        </pre>
      </div>
      <p className="text-text-secondary text-xs">
        Last updated: {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  );
}
