import { describe, it, expect } from 'vitest';
import { applyBookStatus } from './bookStatus';
import type { Book } from '../components/BookList';

const book = { id: 'b1', title: 'T', author: 'A', totalPages: 300, currentPage: 120, status: 'reading' } as Book;

describe('applyBookStatus', () => {
  it('fills progress when finishing', () => {
    expect(applyBookStatus(book, 'finished')).toMatchObject({ status: 'finished', currentPage: 300 });
  });
  it('keeps progress for other statuses', () => {
    expect(applyBookStatus(book, 'want_to_read')).toMatchObject({ status: 'want_to_read', currentPage: 120 });
  });
  it('does not mutate the input', () => {
    applyBookStatus(book, 'finished');
    expect(book.currentPage).toBe(120);
  });
});
