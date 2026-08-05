import { useState } from 'react';
import { X, BookOpen, Star, Clock, Image as ImageIcon } from 'lucide-react';
import XPBar from './ui/XPBar';

export interface Book {
  id: string;
  title: string;
  author: string;
  status: 'want_to_read' | 'reading' | 'finished';
  totalPages: number;
  currentPage: number;
  notes: string | null;
  rating?: number | null;
  coverUrl?: string | null;
  linkedSkillId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

interface BookListProps {
  books: Book[];
  onUpdateStatus: (id: string, status: Book['status']) => void;
  onUpdateProgress: (id: string, currentPage: number) => void;
  onUpdateRating?: (id: string, rating: number | null) => void;
  onRefreshCover?: (id: string) => void;
  onDelete: (id: string) => void;
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" onClick={() => onChange(value === n ? 0 : n)} aria-label={`Rate ${n}`}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', lineHeight: 1 }}
        >
          <Star size={14} fill={n <= value ? 'var(--warn)' : 'none'} color={n <= value ? 'var(--warn)' : 'var(--line)'} />
        </button>
      ))}
    </div>
  );
}

function readingPace(book: Book): string | null {
  if (!book.startedAt || book.currentPage <= 0) return null;
  const days = Math.max(1, (Date.now() - new Date(book.startedAt).getTime()) / 86400000);
  const perDay = book.currentPage / days;
  if (perDay < 0.5) return null;
  const remaining = book.totalPages - book.currentPage;
  if (remaining <= 0) return null;
  const daysLeft = Math.ceil(remaining / perDay);
  const finish = new Date(Date.now() + daysLeft * 86400000);
  return `~${Math.round(perDay)} p/day · finish ${finish.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

const STATUS_COLOR: Record<Book['status'], string> = {
  want_to_read: 'var(--info)',
  reading: 'var(--accent)',
  finished: 'var(--good)',
};

function BookCover({ book, onRefreshCover }: { book: Book; onRefreshCover?: (id: string) => void }) {
  const [failed, setFailed] = useState(false);
  const [fetching, setFetching] = useState(false);
  const show = book.coverUrl && !failed;
  return (
    <div style={{ width: 46, height: 66, flexShrink: 0, borderRadius: 5, overflow: 'hidden', background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {show ? (
        <img src={book.coverUrl!} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : onRefreshCover ? (
        <button
          title="Find cover" aria-label="Find cover"
          onClick={() => { setFetching(true); setFailed(false); onRefreshCover(book.id); }}
          style={{ width: '100%', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {fetching ? <ImageIcon size={16} className="spin" /> : <ImageIcon size={16} />}
        </button>
      ) : (
        <BookOpen size={16} color="var(--text-faint)" />
      )}
    </div>
  );
}

function BookCard({ book, onUpdateStatus, onUpdateProgress, onUpdateRating, onRefreshCover, onDelete }: {
  book: Book;
  onUpdateStatus: (id: string, status: Book['status']) => void;
  onUpdateProgress: (id: string, currentPage: number) => void;
  onUpdateRating: (id: string, rating: number | null) => void;
  onRefreshCover?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [pageInput, setPageInput] = useState('');
  const pct = book.totalPages > 0 ? Math.round(Math.min((book.currentPage / book.totalPages) * 100, 100)) : 0;

  function handleLogPages() {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 0 && page <= book.totalPages) {
      onUpdateProgress(book.id, page);
      setPageInput('');
    }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: 13 }}>
      <div style={{ display: 'flex', gap: 11, marginBottom: 10 }}>
        <BookCover book={book} onRefreshCover={onRefreshCover} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.25 }}>{book.title}</span>
            <button onClick={() => onDelete(book.id)} aria-label={`Delete ${book.title}`}
              style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', flexShrink: 0, display: 'flex', lineHeight: 1 }}><X size={13} /></button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{book.author}</p>
        </div>
      </div>

      <XPBar value={book.currentPage} max={book.totalPages || 1} height={6} color={STATUS_COLOR[book.status]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{book.currentPage} / {book.totalPages}</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{pct}%</span>
      </div>

      {book.status === 'reading' && readingPace(book) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 11, color: 'var(--text-faint)' }}>
          <Clock size={11} />{readingPace(book)}
        </div>
      )}

      {book.status === 'finished' && (
        <div style={{ marginTop: 10 }}>
          <Stars value={book.rating ?? 0} onChange={(n) => onUpdateRating(book.id, n === 0 ? null : n)} />
        </div>
      )}

      {book.status === 'reading' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input
            type="number" min={0} max={book.totalPages} value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogPages(); }}
            placeholder="Page #" aria-label={`Log page for ${book.title}`}
            style={{ width: 84, background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '5px 8px', fontSize: 12, outline: 'none' }}
          />
          <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={handleLogPages}>Log</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {(['want_to_read', 'reading', 'finished'] as const).filter((s) => s !== book.status).map((s) => (
          <button key={s} onClick={() => onUpdateStatus(book.id, s)}
            style={{ fontSize: 11, fontWeight: 600, background: 'var(--surface-inset)', color: 'var(--text-3)', border: '1px solid var(--line-soft)', borderRadius: 99, padding: '4px 10px', cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = STATUS_COLOR[s]; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--line-soft)'; }}
          >
            {s === 'want_to_read' ? 'Want to read' : s === 'reading' ? 'Reading' : 'Finished'}
          </button>
        ))}
      </div>
    </div>
  );
}

function Column({ title, count, color, children }: { title: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface-inset)', borderRadius: 'var(--r)', padding: 12, minHeight: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 4px' }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
        <span className="eyebrow">{title}</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto' }}>{count}</span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>{children}</div>
    </div>
  );
}

export default function BookList({ books = [], onUpdateStatus, onUpdateProgress, onUpdateRating = () => {}, onRefreshCover, onDelete }: BookListProps) {
  const wantToRead = books.filter((b) => b.status === 'want_to_read');
  const reading = books.filter((b) => b.status === 'reading');
  const finished = books.filter((b) => b.status === 'finished');

  if (books.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 0', color: 'var(--text-faint)' }}>
        <BookOpen size={26} />
        <p style={{ fontSize: 13 }}>No books yet. Add one to start your shelf.</p>
      </div>
    );
  }

  return (
    <div className="grid-3-col">
      <Column title="Want to Read" count={wantToRead.length} color={STATUS_COLOR.want_to_read}>
        {wantToRead.map((b) => <BookCard key={b.id} book={b} onUpdateStatus={onUpdateStatus} onUpdateProgress={onUpdateProgress} onUpdateRating={onUpdateRating} onRefreshCover={onRefreshCover} onDelete={onDelete} />)}
      </Column>
      <Column title="Reading" count={reading.length} color={STATUS_COLOR.reading}>
        {reading.map((b) => <BookCard key={b.id} book={b} onUpdateStatus={onUpdateStatus} onUpdateProgress={onUpdateProgress} onUpdateRating={onUpdateRating} onRefreshCover={onRefreshCover} onDelete={onDelete} />)}
      </Column>
      <Column title="Finished" count={finished.length} color={STATUS_COLOR.finished}>
        {finished.map((b) => <BookCard key={b.id} book={b} onUpdateStatus={onUpdateStatus} onUpdateProgress={onUpdateProgress} onUpdateRating={onUpdateRating} onRefreshCover={onRefreshCover} onDelete={onDelete} />)}
      </Column>
    </div>
  );
}
