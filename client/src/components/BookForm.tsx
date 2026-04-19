import { useState } from 'react';
import type { Book } from './BookList';

export interface Skill {
  id: string;
  name: string;
}

interface BookFormProps {
  skills: Skill[];
  onCreated: (optimistic: Book, body: { title: string; author: string; totalPages: number; linkedSkillId?: string }) => void;
}

export default function BookForm({ skills, onCreated }: BookFormProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [linkedSkillId, setLinkedSkillId] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pages = parseInt(totalPages, 10);
    if (!title.trim() || !author.trim() || isNaN(pages) || pages <= 0) return;

    const optimistic: Book = {
      id: `temp-${Date.now()}`,
      title: title.trim(),
      author: author.trim(),
      status: 'want_to_read',
      totalPages: pages,
      currentPage: 0,
      notes: null,
      linkedSkillId: linkedSkillId || null,
      startedAt: null,
      finishedAt: null,
    };

    const body: any = { title: title.trim(), author: author.trim(), totalPages: pages };
    if (linkedSkillId) body.linkedSkillId = linkedSkillId;

    onCreated(optimistic, body);
    setTitle('');
    setAuthor('');
    setTotalPages('');
    setLinkedSkillId('');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <div>
        <label htmlFor="book-title" className="text-text-secondary text-xs block mb-1">Title</label>
        <input
          id="book-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
          required
        />
      </div>
      <div>
        <label htmlFor="book-author" className="text-text-secondary text-xs block mb-1">Author</label>
        <input
          id="book-author"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
          required
        />
      </div>
      <div>
        <label htmlFor="book-pages" className="text-text-secondary text-xs block mb-1">Total Pages</label>
        <input
          id="book-pages"
          type="number"
          min={1}
          value={totalPages}
          onChange={(e) => setTotalPages(e.target.value)}
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
          required
        />
      </div>
      {skills.length > 0 && (
        <div>
          <label htmlFor="book-skill" className="text-text-secondary text-xs block mb-1">Link to Skill (optional)</label>
          <select
            id="book-skill"
            value={linkedSkillId}
            onChange={(e) => setLinkedSkillId(e.target.value)}
            className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
          >
            <option value="">None</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      <button
        type="submit"
        className="bg-accent-primary text-primary px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
      >
        Add Book
      </button>
    </form>
  );
}
