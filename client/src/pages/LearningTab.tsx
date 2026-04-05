import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
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

interface Skill {
  id: string;
  name: string;
}

export default function LearningTab() {
  // ── Skills (for dropdowns) ──
  const [skills, setSkills] = useState<Skill[]>([]);

  // ── Books ──
  const [books, setBooks] = useState<Book[]>([]);
  const [showBookForm, setShowBookForm] = useState(false);

  // ── Journal ──
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [showJournalForm, setShowJournalForm] = useState(false);

  // ── Lessons ──
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonSearch, setLessonSearch] = useState('');
  const [showLessonForm, setShowLessonForm] = useState(false);

  // ── Notes ──
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteSearch, setNoteSearch] = useState('');
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteViewMode, setNoteViewMode] = useState<'list' | 'view' | 'edit'>('list');

  // ── Fetch all data on mount ──
  const fetchSkills = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/skills')) as Skill[];
      setSkills(data);
    } catch { /* silently fail */ }
  }, []);

  const fetchBooks = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/books')) as Book[];
      setBooks(data);
    } catch { /* silently fail */ }
  }, []);

  const fetchJournal = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/journal')) as JournalEntry[];
      setJournalEntries(data);
    } catch { /* silently fail */ }
  }, []);

  const fetchLessons = useCallback(async (search: string) => {
    try {
      const url = search ? `/api/lessons?search=${encodeURIComponent(search)}` : '/api/lessons';
      const data = (await apiClient.get(url)) as Lesson[];
      setLessons(data);
    } catch { /* silently fail */ }
  }, []);

  const fetchNotes = useCallback(async (search: string) => {
    try {
      const url = search ? `/api/notes?search=${encodeURIComponent(search)}` : '/api/notes';
      const data = (await apiClient.get(url)) as Note[];
      setNotes(data);
    } catch { /* silently fail */ }
  }, []);

  const fetchNote = useCallback(async (id: string) => {
    try {
      const data = (await apiClient.get(`/api/notes/${id}`)) as Note;
      setSelectedNote(data);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    fetchSkills();
    fetchBooks();
    fetchJournal();
    fetchLessons('');
    fetchNotes('');
  }, [fetchSkills, fetchBooks, fetchJournal, fetchLessons, fetchNotes]);

  useEffect(() => { fetchLessons(lessonSearch); }, [lessonSearch, fetchLessons]);
  useEffect(() => { fetchNotes(noteSearch); }, [noteSearch, fetchNotes]);

  useEffect(() => {
    if (selectedNoteId) fetchNote(selectedNoteId);
    else setSelectedNote(null);
  }, [selectedNoteId, fetchNote]);

  // ── Book handlers ──
  function handleBookCreated(optimistic: Book, body: any) {
    setBooks((prev) => [optimistic, ...prev]);
    setShowBookForm(false);
    apiClient.post('/api/books', { body })
      .then((data) => setBooks((prev) => prev.map((b) => (b.id === optimistic.id ? (data as Book) : b))))
      .catch(() => setBooks((prev) => prev.filter((b) => b.id !== optimistic.id)));
  }

  function handleBookUpdateStatus(id: string, status: Book['status']) {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    apiClient.patch(`/api/books/${id}`, { body: { status } }).catch(() => fetchBooks());
  }

  function handleBookUpdateProgress(id: string, currentPage: number) {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, currentPage } : b)));
    apiClient.patch(`/api/books/${id}`, { body: { currentPage } }).catch(() => fetchBooks());
  }

  function handleBookDelete(id: string) {
    const prev = books;
    setBooks((b) => b.filter((x) => x.id !== id));
    apiClient.delete(`/api/books/${id}`).catch(() => setBooks(prev));
  }

  // ── Journal handlers ──
  function handleJournalCreated(optimistic: JournalEntry, body: any) {
    setJournalEntries((prev) => [optimistic, ...prev]);
    setShowJournalForm(false);
    apiClient.post('/api/journal', { body })
      .then((data) => setJournalEntries((prev) => prev.map((e) => (e.id === optimistic.id ? (data as JournalEntry) : e))))
      .catch(() => setJournalEntries((prev) => prev.filter((e) => e.id !== optimistic.id)));
  }

  function handleJournalDelete(id: string) {
    const prev = journalEntries;
    setJournalEntries((e) => e.filter((x) => x.id !== id));
    apiClient.delete(`/api/journal/${id}`).catch(() => setJournalEntries(prev));
  }

  // ── Lesson handlers ──
  function handleLessonCreated(optimistic: Lesson, body: any) {
    setLessons((prev) => [optimistic, ...prev]);
    setShowLessonForm(false);
    apiClient.post('/api/lessons', { body })
      .then((data) => setLessons((prev) => prev.map((l) => (l.id === optimistic.id ? (data as Lesson) : l))))
      .catch(() => setLessons((prev) => prev.filter((l) => l.id !== optimistic.id)));
  }

  function handleLessonDelete(id: string) {
    const prev = lessons;
    setLessons((l) => l.filter((x) => x.id !== id));
    apiClient.delete(`/api/lessons/${id}`).catch(() => setLessons(prev));
  }

  // ── Note handlers ──
  function handleNoteSelect(id: string) {
    setSelectedNoteId(id);
    setNoteViewMode('view');
    setShowNoteEditor(false);
  }

  function handleNoteCreate(body: { title: string; content: string; tags: string[] }) {
    const optimistic: Note = {
      id: `temp-${Date.now()}`,
      title: body.title,
      tags: body.tags,
      updatedAt: new Date().toISOString(),
      content: body.content,
    };
    setNotes((prev) => [optimistic, ...prev]);
    setShowNoteEditor(false);
    setNoteViewMode('list');
    apiClient.post('/api/notes', { body })
      .then((data) => setNotes((prev) => prev.map((n) => (n.id === optimistic.id ? (data as Note) : n))))
      .catch(() => setNotes((prev) => prev.filter((n) => n.id !== optimistic.id)));
  }

  function handleNoteUpdate(body: { title: string; content: string; tags: string[] }) {
    if (!selectedNoteId) return;
    const prev = notes;
    setNotes((ns) => ns.map((n) => (n.id === selectedNoteId ? { ...n, ...body, updatedAt: new Date().toISOString() } : n)));
    setSelectedNote((n) => n ? { ...n, ...body, updatedAt: new Date().toISOString() } : n);
    setNoteViewMode('view');
    apiClient.patch(`/api/notes/${selectedNoteId}`, { body }).catch(() => setNotes(prev));
  }

  function handleNoteSave(body: { title: string; content: string; tags: string[] }) {
    if (selectedNote && noteViewMode === 'edit') {
      handleNoteUpdate(body);
    } else {
      handleNoteCreate(body);
    }
  }

  function handleNoteDelete(id: string) {
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== id));
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
      setSelectedNote(null);
      setNoteViewMode('list');
    }
    apiClient.delete(`/api/notes/${id}`).catch(() => setNotes(prev));
  }

  return (
    <div className="text-text-primary space-y-6">
      <h2 className="text-lg font-semibold">Learning</h2>

      {/* ── Top row: Books (full width, kanban) ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-text-primary font-semibold">📚 Books</h3>
          <button
            onClick={() => setShowBookForm(!showBookForm)}
            className="text-accent-info text-sm hover:opacity-80"
          >
            {showBookForm ? 'Cancel' : '+ New Book'}
          </button>
        </div>
        {showBookForm && (
          <div className="mb-4">
            <BookForm skills={skills} onCreated={handleBookCreated} />
          </div>
        )}
        <BookList
          books={books}
          onUpdateStatus={handleBookUpdateStatus}
          onUpdateProgress={handleBookUpdateProgress}
          onDelete={handleBookDelete}
        />
      </section>

      {/* ── Middle row: Journal (left) + Lessons (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-text-primary font-semibold">📓 Journal</h3>
            <button
              onClick={() => setShowJournalForm(!showJournalForm)}
              className="text-accent-info text-sm hover:opacity-80"
            >
              {showJournalForm ? 'Cancel' : '+ New Entry'}
            </button>
          </div>
          {showJournalForm && (
            <div className="mb-4">
              <JournalForm skills={skills} onCreated={handleJournalCreated} />
            </div>
          )}
          <JournalList entries={journalEntries} onDelete={handleJournalDelete} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-text-primary font-semibold">💡 Lessons Learned</h3>
            <button
              onClick={() => setShowLessonForm(!showLessonForm)}
              className="text-accent-info text-sm hover:opacity-80"
            >
              {showLessonForm ? 'Cancel' : '+ New Lesson'}
            </button>
          </div>
          {showLessonForm && (
            <div className="mb-4">
              <LessonForm skills={skills} onCreated={handleLessonCreated} />
            </div>
          )}
          <LessonsList
            lessons={lessons}
            onDelete={handleLessonDelete}
            searchTerm={lessonSearch}
            onSearchChange={setLessonSearch}
          />
        </section>
      </div>

      {/* ── Bottom row: Notes (full width) ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-text-primary font-semibold">📝 Notes</h3>
          <button
            onClick={() => {
              setShowNoteEditor(!showNoteEditor);
              setSelectedNoteId(null);
              setSelectedNote(null);
              setNoteViewMode(showNoteEditor ? 'list' : 'edit');
            }}
            className="text-accent-info text-sm hover:opacity-80"
          >
            {showNoteEditor && noteViewMode === 'edit' && !selectedNote ? 'Cancel' : '+ New Note'}
          </button>
        </div>

        {noteViewMode === 'edit' && (
          <div className="mb-4">
            <NoteEditor
              note={selectedNote}
              onSave={handleNoteSave}
              onClose={() => {
                setShowNoteEditor(false);
                setNoteViewMode(selectedNoteId ? 'view' : 'list');
              }}
            />
          </div>
        )}

        {noteViewMode === 'view' && selectedNote && (
          <div className="mb-4">
            <NoteViewer
              note={selectedNote}
              onEdit={() => setNoteViewMode('edit')}
              onClose={() => {
                setSelectedNoteId(null);
                setSelectedNote(null);
                setNoteViewMode('list');
              }}
            />
          </div>
        )}

        {(noteViewMode === 'list' || (noteViewMode !== 'edit')) && (
          <NoteList
            notes={notes}
            onSelect={handleNoteSelect}
            onDelete={handleNoteDelete}
            searchTerm={noteSearch}
            onSearchChange={setNoteSearch}
          />
        )}
      </section>

    </div>
  );
}
