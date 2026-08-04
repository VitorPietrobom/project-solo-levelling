import { useState } from 'react';
import { Pencil, X, Layers, HelpCircle, Check } from 'lucide-react';
import type { Note } from './NoteList';
import Markdown from './ui/Markdown';

interface NoteViewerProps {
  note: Note | null;
  onEdit: () => void;
  onClose: () => void;
}

function flashcardsPrompt(note: Note): string {
  return `Turn the note below into spaced-repetition flashcards. Output a numbered list of Q&A pairs — each a single, specific question and a concise answer. Cover every key fact, definition, and concept. Keep questions atomic (one idea each).\n\nNOTE: ${note.title}\n\n${note.content || ''}`;
}
function quizPrompt(note: Note): string {
  return `Quiz me on the note below to test my recall. Ask me 8 questions ONE AT A TIME (mix of recall, "why", and application). Wait for my answer before revealing the correct one, then grade it briefly and move on. At the end give me a score and the 2 weakest spots to review.\n\nNOTE: ${note.title}\n\n${note.content || ''}`;
}

export default function NoteViewer({ note, onEdit, onClose }: NoteViewerProps) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyPrompt(kind: 'flashcards' | 'quiz') {
    if (!note) return;
    const text = kind === 'flashcards' ? flashcardsPrompt(note) : quizPrompt(note);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* clipboard blocked */ }
  }

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

      {/* Study with AI (bring-your-own-AI: copies a prompt) */}
      {note.content && note.content.trim().length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <span className="eyebrow" style={{ fontSize: 9.5 }}>Study with AI</span>
          <button className="btn btn-ghost" onClick={() => copyPrompt('flashcards')}>
            {copied === 'flashcards' ? <><Check size={14} /> Copied</> : <><Layers size={14} /> Flashcards</>}
          </button>
          <button className="btn btn-ghost" onClick={() => copyPrompt('quiz')}>
            {copied === 'quiz' ? <><Check size={14} /> Copied</> : <><HelpCircle size={14} /> Quiz me</>}
          </button>
        </div>
      )}

      <p style={{ color: 'var(--text-faint)', fontSize: 11.5, marginTop: 16 }}>
        Last updated {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  );
}
