import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { apiClient, errorMessage } from '../lib/apiClient';
import { useAriseAddXP } from '../components/Dashboard';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import BookList from '../components/BookList';
import type { Book } from '../components/BookList';
import BookForm from '../components/BookForm';
import LearningStats from '../components/LearningStats';
import KnowledgeSection from '../components/KnowledgeSection';

interface Skill { id: string; name: string }

const BOOK_FINISH_XP = 80;

export default function LearningTab() {
  const addXP = useAriseAddXP();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [showBookForm, setShowBookForm] = useState(false);

  // Global knowledge filter + stats refresh + delete confirm
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [statsKey, setStatsKey] = useState(0);
  const [confirmDeleteBook, setConfirmDeleteBook] = useState<{ id: string; label: string } | null>(null);
  const bumpStats = useCallback(() => setStatsKey((k) => k + 1), []);

  const fetchSkills = useCallback(async () => { try { setSkills((await apiClient.get('/api/skills')) as Skill[]); } catch { /* */ } }, []);
  const fetchBooks = useCallback(async () => { try { setBooks((await apiClient.get('/api/books')) as Book[]); } catch { /* */ } }, []);

  useEffect(() => {
    Promise.all([fetchSkills(), fetchBooks()]).finally(() => setLoading(false));
  }, [fetchSkills, fetchBooks]);

  // Drop any active tag that no longer exists in the graph.
  const handleTags = useCallback((tags: string[]) => {
    setAllTags(tags);
    setActiveTags((prev) => prev.filter((t) => tags.includes(t)));
  }, []);

  // ── Books ──
  function handleBookCreated(optimistic: Book, body: any) {
    setBooks((prev) => [optimistic, ...prev]); setShowBookForm(false); bumpStats();
    apiClient.post('/api/books', { body })
      .then((data) => setBooks((prev) => prev.map((b) => (b.id === optimistic.id ? (data as Book) : b))))
      .catch((err) => {
        setBooks((prev) => prev.filter((b) => b.id !== optimistic.id));
        showToast(errorMessage(err, 'Failed to add book'));
      });
  }
  function handleBookUpdateStatus(id: string, status: Book['status']) {
    const wasFinished = books.find((b) => b.id === id)?.status === 'finished';
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    if (status === 'finished' && !wasFinished) addXP(BOOK_FINISH_XP, 'Finished a book');
    bumpStats();
    apiClient.patch(`/api/books/${id}`, { body: { status } }).catch((err) => {
      fetchBooks();
      showToast(errorMessage(err, 'Failed to update book status'));
    });
  }
  function handleBookUpdateProgress(id: string, currentPage: number) {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, currentPage } : b)));
    apiClient.patch(`/api/books/${id}`, { body: { currentPage } }).catch((err) => {
      fetchBooks();
      showToast(errorMessage(err, 'Failed to update reading progress'));
    });
  }
  function handleBookUpdateRating(id: string, rating: number | null) {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, rating } : b)));
    apiClient.patch(`/api/books/${id}`, { body: { rating } }).catch((err) => {
      fetchBooks();
      showToast(errorMessage(err, 'Failed to update rating'));
    });
  }
  function handleBookRefreshCover(id: string) {
    apiClient.post(`/api/books/${id}/cover`)
      .then((data) => setBooks((prev) => prev.map((b) => (b.id === id ? (data as Book) : b))))
      .catch((err) => showToast(errorMessage(err, 'Failed to refresh cover')));
  }
  function deleteBook() {
    if (!confirmDeleteBook) return;
    const { id } = confirmDeleteBook;
    const prev = books;
    setBooks((b) => b.filter((x) => x.id !== id));
    apiClient.delete(`/api/books/${id}`).catch((err) => {
      setBooks(prev);
      showToast(errorMessage(err, 'Failed to delete book'));
    });
    setConfirmDeleteBook(null);
    bumpStats();
  }

  const q = query.trim().toLowerCase();
  const fBooks = books.filter((b) => !q || `${b.title} ${b.author}`.toLowerCase().includes(q));

  function toggleTag(t: string) {
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  if (loading) {
    return <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Loading…</p>;
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
              placeholder="Search books and your knowledge graph…"
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

        {/* Knowledge graph — replaces the old notes / journal / lessons lists */}
        <KnowledgeSection
          query={query}
          activeTags={activeTags}
          refreshKey={statsKey}
          onTagsDiscovered={handleTags}
          addXP={addXP}
          onChanged={bumpStats}
        />

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
            onRefreshCover={handleBookRefreshCover}
            onDelete={(id) => { const b = books.find((x) => x.id === id); setConfirmDeleteBook({ id, label: b?.title ?? 'this book' }); }}
          />
        </section>
      </div>

      {confirmDeleteBook && (
        <ConfirmDialog
          message={`Delete ${confirmDeleteBook.label}? This cannot be undone.`}
          onConfirm={deleteBook}
          onCancel={() => setConfirmDeleteBook(null)}
        />
      )}
    </>
  );
}
