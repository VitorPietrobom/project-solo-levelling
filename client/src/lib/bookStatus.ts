import type { Book } from '../components/BookList';

/** Optimistic local view of a status change, mirroring the server's PATCH /api/books/:id rules. */
export function applyBookStatus(book: Book, status: Book['status']): Book {
  const next: Book = { ...book, status };
  if (status === 'finished') next.currentPage = book.totalPages;
  return next;
}
