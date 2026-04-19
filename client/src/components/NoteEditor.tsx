import { useState, useEffect } from 'react';
import type { Note } from './NoteList';

interface NoteEditorProps {
  note: Note | null;
  onSave: (body: { title: string; content: string; tags: string[] }) => void;
  onClose: () => void;
}

export default function NoteEditor({ note, onSave, onClose }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content ?? '');
      setTagsInput(note.tags.join(', '));
    } else {
      setTitle('');
      setContent('');
      setTagsInput('');
    }
  }, [note]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave({ title: title.trim(), content, tags });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-semibold">{note ? 'Edit Note' : 'New Note'}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-accent-info text-sm hover:opacity-80"
          aria-label="Close editor"
        >
          ✕
        </button>
      </div>
      <div>
        <label htmlFor="note-title" className="text-text-secondary text-xs block mb-1">Title</label>
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
          required
        />
      </div>
      <div>
        <label htmlFor="note-content" className="text-text-secondary text-xs block mb-1">Content (markdown)</label>
        <textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary min-h-[160px] resize-y font-mono focus:outline-none focus:border-accent-primary"
        />
      </div>
      <div>
        <label htmlFor="note-tags" className="text-text-secondary text-xs block mb-1">Tags (comma-separated)</label>
        <input
          id="note-tags"
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="react, hooks, patterns"
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-accent-primary text-primary px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
        >
          {note ? 'Save Changes' : 'Create Note'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="bg-secondary text-text-secondary px-4 py-2 rounded text-sm hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
