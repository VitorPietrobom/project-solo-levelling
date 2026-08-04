import { Pencil, X } from 'lucide-react';
import type { Note } from './NoteList';
import Markdown from './ui/Markdown';

interface NoteViewerProps {
  note: Note | null;
  onEdit: () => void;
  onClose: () => void;
}

export default function NoteViewer({ note, onEdit, onClose }: NoteViewerProps) {
  if (!note) {
    return (
      <div style={{ background: 'var(--surface-inset)', borderRadius: 'var(--r)', padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Note not found.</p>
        <button onClick={onClose} className="btn btn-ghost" style={{ marginTop: 8 }}>Back to list</button>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h3 style={{ fontSize: 20 }}>{note.title}</h3>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onEdit} aria-label="Edit note"><Pencil size={14} />Edit</button>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close viewer" style={{ padding: '6px 8px' }}><X size={16} /></button>
        </div>
      </div>

      {note.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {note.tags.map((tag) => (
            <span key={tag} className="chip" style={{ fontSize: 11, color: 'var(--accent-2)', borderColor: 'var(--accent-2-soft)' }}>{tag}</span>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
        <Markdown text={note.content || ''} />
      </div>

      <p style={{ color: 'var(--text-faint)', fontSize: 11.5, marginTop: 16 }}>
        Last updated {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  );
}
