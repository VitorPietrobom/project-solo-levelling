import { useState } from 'react';

export interface Book {
  id: string;
  title: string;
  author: string;
  status: 'want_to_read' | 'reading' | 'finished';
  totalPages: number;
  currentPage: number;
  notes: string | null;
  linkedSkillId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

interface BookListProps {
  books: Book[];
  onUpdateStatus: (id: string, status: Book['status']) => void;
  onUpdateProgress: (id: string, currentPage: number) => void;
  onDelete: (id: string) => void;
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div className="w-full bg-primary rounded-full h-1.5 overflow-hidden">
      <div
        className="bg-accent-primary h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Reading progress: ${current} of ${total} pages`}
      />
    </div>
  );
}

function BookCard({
  book,
  onUpdateStatus,
  onUpdateProgress,
  onDelete,
}: {
  book: Book;
  onUpdateStatus: (id: string, status: Book['status']) => void;
  onUpdateProgress: (id: string, currentPage: number) => void;
  onDelete: (id: string) => void;
}) {
  const [pageInput, setPageInput] = useState('');

  function handleLogPages() {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 0 && page <= book.totalPages) {
      onUpdateProgress(book.id, page);
      setPageInput('');
    }
  }

  return (
    <div className="bg-secondary rounded-lg p-3 border border-border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-text-primary font-semibold text-sm">{book.title}</span>
        <button
          onClick={() => onDelete(book.id)}
          className="text-accent-warning text-xs hover:opacity-80"
          aria-label={`Delete ${book.title}`}
        >
          ✕
        </button>
      </div>
      <p className="text-text-secondary text-xs mb-2">{book.author}</p>
      <ProgressBar current={book.currentPage} total={book.totalPages} />
      <p className="text-text-secondary text-xs mt-1 mb-2">
        {book.currentPage} / {book.totalPages} pages
      </p>

      {book.status === 'reading' && (
        <div className="flex items-center gap-1 mb-2">
          <input
            type="number"
            min={0}
            max={book.totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            placeholder="Page #"
            className="w-20 bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary"
            aria-label={`Log page for ${book.title}`}
          />
          <button
            onClick={handleLogPages}
            className="text-accent-info text-xs hover:opacity-80"
          >
            Log
          </button>
        </div>
      )}

      <div className="flex gap-1 flex-wrap">
        {book.status !== 'want_to_read' && (
          <button
            onClick={() => onUpdateStatus(book.id, 'want_to_read')}
            className="text-xs bg-primary text-text-secondary px-2 py-0.5 rounded hover:text-text-primary"
          >
            Want to Read
          </button>
        )}
        {book.status !== 'reading' && (
          <button
            onClick={() => onUpdateStatus(book.id, 'reading')}
            className="text-xs bg-primary text-text-secondary px-2 py-0.5 rounded hover:text-text-primary"
          >
            Reading
          </button>
        )}
        {book.status !== 'finished' && (
          <button
            onClick={() => onUpdateStatus(book.id, 'finished')}
            className="text-xs bg-primary text-text-secondary px-2 py-0.5 rounded hover:text-text-primary"
          >
            Finished
          </button>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${accent}`} />
        <h4 className="text-text-secondary text-sm font-semibold">{title}</h4>
        <span className="text-text-secondary text-xs bg-secondary rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function BookList({ books = [], onUpdateStatus, onUpdateProgress, onDelete }: BookListProps) {
  const wantToRead = books.filter((b) => b.status === 'want_to_read');
  const reading = books.filter((b) => b.status === 'reading');
  const finished = books.filter((b) => b.status === 'finished');

  if (books.length === 0) {
    return <p className="text-text-secondary text-sm">No books yet. Add one to get started.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KanbanColumn title="Want to Read" count={wantToRead.length} accent="bg-accent-info">
        {wantToRead.map((b) => (
          <BookCard key={b.id} book={b} onUpdateStatus={onUpdateStatus} onUpdateProgress={onUpdateProgress} onDelete={onDelete} />
        ))}
      </KanbanColumn>
      <KanbanColumn title="Reading" count={reading.length} accent="bg-accent-primary">
        {reading.map((b) => (
          <BookCard key={b.id} book={b} onUpdateStatus={onUpdateStatus} onUpdateProgress={onUpdateProgress} onDelete={onDelete} />
        ))}
      </KanbanColumn>
      <KanbanColumn title="Finished" count={finished.length} accent="bg-accent-success">
        {finished.map((b) => (
          <BookCard key={b.id} book={b} onUpdateStatus={onUpdateStatus} onUpdateProgress={onUpdateProgress} onDelete={onDelete} />
        ))}
      </KanbanColumn>
    </div>
  );
}
