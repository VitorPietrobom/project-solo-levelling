import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAriseAddXP } from '../components/Dashboard';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import BookList from '../components/BookList';
import type { Book } from '../components/BookList';
import BookForm from '../components/BookForm';
import JournalList from '../components/JournalList';
import type { JournalEntry } from '../components/JournalList';
import JournalForm from '../components/JournalForm';
import LessonsList from '../components/LessonsList';
import type { Lesson } from '../components/LessonsList';
import LessonForm from '../components/LessonForm';
import NoteList from '../components/NoteList';
import type { Note } from '../components/NoteList';
import NoteEditor from '../components/NoteEditor';
import NoteViewer from '../components/NoteViewer';
import LearningStats from '../components/LearningStats';

interface Skill { id: string; name: string }
type DeleteTarget = { kind: 'book' | 'journal' | 'lesson' | 'note'; id: string; label: string };

const BOOK_FINISH_XP = 80;
const JOURNAL_XP = 10;
const LESSON_XP = 15;

export default function LearningTab() {
  const addXP = useAriseAddXP();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [showBookForm, setShowBookForm] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteViewMode, setNoteViewMode] = useState<'list' | 'view' | 'edit'>('list');

  // Global knowledge filter + stats refresh + delete confirm
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [statsKey, setStatsKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<DeleteTarget | null>(null);
  const bumpStats = () => setStatsKey((k) => k + 1);

  const fetchSkills = useCallback(async () => { try { setSkills((await apiClient.get('/api/skills')) as Skill[]); } catch { /* */ } }, []);
  const fetchBooks = useCallback(async () => { try { setBooks((await apiClient.get('/api/books')) as Book[]); } catch { /* */ } }, []);
  const fetchJournal = useCallback(async () => { try { setJournalEntries((await apiClient.get('/api/journal')) as JournalEntry[]); } catch { /* */ } }, []);
  const fetchLessons = useCallback(async () => { try { setLessons((await apiClient.get('/api/lessons')) as Lesson[]); } catch { /* */ } }, []);
  const fetchNotes = useCallback(async () => { try { setNotes((await apiClient.get('/api/notes')) as Note[]); } catch { /* */ } }, []);
  const fetchNote = useCallback(async (id: string) => { try { setSelectedNote((await apiClient.get(`/api/notes/${id}`)) as Note); } catch { /* */ } }, []);

  useEffect(() => { fetchSkills(); fetchBooks(); fetchJournal(); fetchLessons(); fetchNotes(); }, [fetchSkills, fetchBooks, fetchJournal, fetchLessons, fetchNotes]);
  useEffect(() => { if (selectedNoteId) fetchNote(selectedNoteId); else setSelectedNote(null); }, [selectedNoteId, fetchNote]);

  // ── Books ──
  function handleBookCreated(optimistic: Book, body: any) {
    setBooks((prev) => [optimistic, ...prev]); setShowBookForm(false); bumpStats();
    apiClient.post('/api/books', { body })
      .then((data) => setBooks((prev) => prev.map((b) => (b.id === optimistic.id ? (data as Book) : b))))
      .catch(() => setBooks((prev) => prev.filter((b) => b.id !== optimistic.id)));
  }
  function handleBookUpdateStatus(id: string, status: Book['status']) {
    const wasFinished = books.find((b) => b.id === id)?.status === 'finished';
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    if (status === 'finished' && !wasFinished) addXP(BOOK_FINISH_XP, 'Finished a book');
    bumpStats();
    apiClient.patch(`/api/books/${id}`, { body: { status } }).catch(() => fetchBooks());
  }
  function handleBookUpdateProgress(id: string, currentPage: number) {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, currentPage } : b)));
    apiClient.patch(`/api/books/${id}`, { body: { currentPage } }).catch(() => fetchBooks());
  }
  function handleBookUpdateRating(id: string, rating: number | null) {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, rating } : b)));
    apiClient.patch(`/api/books/${id}`, { body: { rating } }).catch(() => fetchBooks());
  }

  // ── Journal ──
  function handleJournalCreated(optimistic: JournalEntry, body: any) {
    setJournalEntries((prev) => [optimistic, ...prev]); setShowJournalForm(false); addXP(JOURNAL_XP, 'Journal entry'); bumpStats();
    apiClient.post('/api/journal', { body })
      .then((data) => setJournalEntries((prev) => prev.map((e) => (e.id === optimistic.id ? (data as JournalEntry) : e))))
      .catch(() => setJournalEntries((prev) => prev.filter((e) => e.id !== optimistic.id)));
  }

  // ── Lessons ──
  function handleLessonCreated(optimistic: Lesson, body: any) {
    setLessons((prev) => [optimistic, ...prev]); setShowLessonForm(false); addXP(LESSON_XP, 'Lesson learned'); bumpStats();
    apiClient.post('/api/lessons', { body })
      .then((data) => setLessons((prev) => prev.map((l) => (l.id === optimistic.id ? (data as Lesson) : l))))
      .catch(() => setLessons((prev) => prev.filter((l) => l.id !== optimistic.id)));
  }

  // ── Notes ──
  function handleNoteSelect(id: string) { setSelectedNoteId(id); setNoteViewMode('view'); setShowNoteEditor(false); }
  function handleNoteCreate(body: { title: string; content: string; tags: string[] }) {
    const optimistic: Note = { id: `temp-${Date.now()}`, title: body.title, tags: body.tags, updatedAt: new Date().toISOString(), content: body.content };
    setNotes((prev) => [optimistic, ...prev]); setShowNoteEditor(false); setNoteViewMode('list'); bumpStats();
    apiClient.post('/api/notes', { body })
      .then((data) => setNotes((prev) => prev.map((n) => (n.id === optimistic.id ? (data as Note) : n))))
      .catch(() => setNotes((prev) => prev.filter((n) => n.id !== optimistic.id)));
  }
  function handleNoteUpdate(body: { title: string; content: string; tags: string[] }) {
    if (!selectedNoteId) return;
    const prev = notes;
    setNotes((ns) => ns.map((n) => (n.id === selectedNoteId ? { ...n, ...body, updatedAt: new Date().toISOString() } : n)));
    setSelectedNote((n) => (n ? { ...n, ...body, updatedAt: new Date().toISOString() } : n));
    setNoteViewMode('view');
    apiClient.patch(`/api/notes/${selectedNoteId}`, { body }).catch(() => setNotes(prev));
  }
  function handleNoteSave(body: { title: string; content: string; tags: string[] }) {
    if (selectedNote && noteViewMode === 'edit') handleNoteUpdate(body); else handleNoteCreate(body);
  }

  // ── Delete (confirmed) ──
  function runDelete() {
    if (!confirmDelete) return;
    const { kind, id } = confirmDelete;
    if (kind === 'book') { const p = books; setBooks((b) => b.filter((x) => x.id !== id)); apiClient.delete(`/api/books/${id}`).catch(() => setBooks(p)); }
    if (kind === 'journal') { const p = journalEntries; setJournalEntries((e) => e.filter((x) => x.id !== id)); apiClient.delete(`/api/journal/${id}`).catch(() => setJournalEntries(p)); }
    if (kind === 'lesson') { const p = lessons; setLessons((l) => l.filter((x) => x.id !== id)); apiClient.delete(`/api/lessons/${id}`).catch(() => setLessons(p)); }
    if (kind === 'note') { const p = notes; setNotes((n) => n.filter((x) => x.id !== id)); if (selectedNoteId === id) { setSelectedNoteId(null); setSelectedNote(null); setNoteViewMode('list'); } apiClient.delete(`/api/notes/${id}`).catch(() => setNotes(p)); }
    bumpStats();
    setConfirmDelete(null);
  }

  // ── Global filter ──
  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const n of notes) n.tags.forEach((t) => s.add(t));
    for (const l of lessons) l.tags.forEach((t) => s.add(t));
    for (const j of journalEntries) j.tags.forEach((t) => s.add(t));
    return [...s].sort();
  }, [notes, lessons, journalEntries]);

  const q = query.trim().toLowerCase();
  const matchTags = (tags: string[]) => activeTags.every((t) => tags.includes(t));
  const filtering = q !== '' || activeTags.length > 0;

  const fBooks = books.filter((b) => !q || `${b.title} ${b.author}`.toLowerCase().includes(q));
  const fJournal = journalEntries.filter((e) => (!q || e.content.toLowerCase().includes(q)) && matchTags(e.tags));
  const fLessons = lessons.filter((l) => (!q || l.content.toLowerCase().includes(q)) && matchTags(l.tags));
  const fNotes = notes.filter((n) => (!q || `${n.title} ${n.content ?? ''}`.toLowerCase().includes(q)) && matchTags(n.tags));

  function toggleTag(t: string) {
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 'var(--gap)' }}>
        {/* Stats header */}
        <LearningStats refreshKey={statsKey} />

        {/* Global search + tag filter */}
        <section className="card arise-in" style={{ padding: '16px var(--pad)' }}>
          <div style={{ position: 'relative', marginBottom: allTags.length ? 12 : 0 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search everything"
              placeholder="Search books, notes, lessons & journal…"
              style={{ width: '100%', background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '10px 12px 10px 36px', fontSize: 14, outline: 'none' }}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', display: 'flex' }}><X size={15} /></button>
            )}
          </div>
          {allTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allTags.map((t) => {
                const on = activeTags.includes(t);
                return (
                  <button key={t} onClick={() => toggleTag(t)}
                    style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 99, cursor: 'pointer',
                      background: on ? 'var(--accent-soft)' : 'var(--surface-inset)',
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
                      color: on ? 'var(--accent)' : 'var(--text-3)' }}
                  >{t}</button>
                );
              })}
              {activeTags.length > 0 && (
                <button onClick={() => setActiveTags([])} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11.5 }}>Clear tags</button>
              )}
            </div>
          )}
        </section>

        {/* Books */}
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>Bookshelf</h3>
            <button className="btn btn-ghost" onClick={() => setShowBookForm(!showBookForm)}>{showBookForm ? 'Cancel' : '+ Add Book'}</button>
          </div>
          {showBookForm && <div style={{ marginBottom: 16 }}><BookForm skills={skills} onCreated={handleBookCreated} /></div>}
          <BookList
            books={fBooks}
            onUpdateStatus={handleBookUpdateStatus}
            onUpdateProgress={handleBookUpdateProgress}
            onUpdateRating={handleBookUpdateRating}
            onDelete={(id) => { const b = books.find((x) => x.id === id); setConfirmDelete({ kind: 'book', id, label: b?.title ?? 'this book' }); }}
          />
        </section>

        {/* Journal + Lessons */}
        <div className="grid-2-col">
          <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17 }}>Learning Journal</h3>
              <button className="btn btn-ghost" onClick={() => setShowJournalForm(!showJournalForm)}>{showJournalForm ? 'Cancel' : '+ New Entry'}</button>
            </div>
            {showJournalForm && <div style={{ marginBottom: 16 }}><JournalForm skills={skills} onCreated={handleJournalCreated} /></div>}
            <JournalList entries={fJournal} onDelete={(id) => setConfirmDelete({ kind: 'journal', id, label: 'this entry' })} />
          </section>

          <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17 }}>Lessons Learned</h3>
              <button className="btn btn-ghost" onClick={() => setShowLessonForm(!showLessonForm)}>{showLessonForm ? 'Cancel' : '+ New Lesson'}</button>
            </div>
            {showLessonForm && <div style={{ marginBottom: 16 }}><LessonForm skills={skills} onCreated={handleLessonCreated} /></div>}
            <LessonsList lessons={fLessons} onDelete={(id) => setConfirmDelete({ kind: 'lesson', id, label: 'this lesson' })} searchTerm="" onSearchChange={() => {}} hideSearch />
          </section>
        </div>

        {/* Notes */}
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>Notes</h3>
            <button className="btn btn-ghost" onClick={() => { setShowNoteEditor(!showNoteEditor); setSelectedNoteId(null); setSelectedNote(null); setNoteViewMode(showNoteEditor ? 'list' : 'edit'); }}>
              {showNoteEditor && noteViewMode === 'edit' && !selectedNote ? 'Cancel' : '+ New Note'}
            </button>
          </div>

          {noteViewMode === 'edit' && (
            <div style={{ marginBottom: 16 }}>
              <NoteEditor note={selectedNote} onSave={handleNoteSave} onClose={() => { setShowNoteEditor(false); setNoteViewMode(selectedNoteId ? 'view' : 'list'); }} />
            </div>
          )}

          {noteViewMode === 'view' && selectedNote && (
            <div style={{ marginBottom: 16 }}>
              <NoteViewer note={selectedNote} onEdit={() => setNoteViewMode('edit')} onClose={() => { setSelectedNoteId(null); setSelectedNote(null); setNoteViewMode('list'); }} />
            </div>
          )}

          {noteViewMode !== 'edit' && (
            <NoteList
              notes={fNotes}
              onSelect={handleNoteSelect}
              onDelete={(id) => { const n = notes.find((x) => x.id === id); setConfirmDelete({ kind: 'note', id, label: n?.title ?? 'this note' }); }}
              searchTerm="" onSearchChange={() => {}} hideSearch
            />
          )}
        </section>

        {filtering && fBooks.length === 0 && fNotes.length === 0 && fLessons.length === 0 && fJournal.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Nothing matches your search.</p>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`Delete ${confirmDelete.label}? This cannot be undone.`}
          onConfirm={runDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
