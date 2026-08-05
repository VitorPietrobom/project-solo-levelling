import prisma from '../lib/prisma';

/** Stable graph identity for a book, so the projection stays idempotent. */
export function bookNodeKey(bookId: string): string {
  return `book:${bookId}`;
}

/** Content body shown on a book's graph node. */
export function bookNodeBody(author: string, status: string, currentPage: number, totalPages: number): string {
  const label = status === 'finished' ? 'Finished' : status === 'reading' ? `Reading — ${currentPage}/${totalPages}` : 'Want to read';
  return `by ${author}\n\n${label}`;
}

/**
 * Projects the bookshelf into the graph as `source` nodes.
 *
 * The bookshelf stays the system of record — these nodes exist so notes can
 * point at the book they came from. Reconciling (rather than only creating on
 * insert) means renames, progress changes and books added before the graph
 * existed all converge. Only writes when something actually differs.
 */
export async function syncBookNodes(userId: string): Promise<{ created: number; updated: number; removed: number }> {
  const [books, nodes] = await Promise.all([
    prisma.book.findMany({ where: { userId } }),
    prisma.knowledgeNode.findMany({
      where: { userId, bookId: { not: null } },
      select: { id: true, bookId: true, title: true, content: true },
    }),
  ]);

  const byBookId = new Map(nodes.map((n) => [n.bookId!, n]));
  let created = 0;
  let updated = 0;

  for (const book of books) {
    const body = bookNodeBody(book.author, book.status, book.currentPage, book.totalPages);
    const existing = byBookId.get(book.id);
    if (!existing) {
      await prisma.knowledgeNode.create({
        data: {
          userId,
          kind: 'source',
          title: book.title,
          content: body,
          bookId: book.id,
          legacyId: bookNodeKey(book.id),
          linkedSkillId: book.linkedSkillId,
        },
      });
      created += 1;
      continue;
    }
    if (existing.title !== book.title || existing.content !== body) {
      await prisma.knowledgeNode.update({ where: { id: existing.id }, data: { title: book.title, content: body } });
      updated += 1;
    }
  }

  // Drop projections for books that no longer exist.
  const liveIds = new Set(books.map((b) => b.id));
  const orphaned = nodes.filter((n) => !liveIds.has(n.bookId!)).map((n) => n.id);
  if (orphaned.length) {
    await prisma.knowledgeNode.deleteMany({ where: { id: { in: orphaned } } });
  }

  return { created, updated, removed: orphaned.length };
}

/** Removes a single book's graph node (and, by cascade, its edges). */
export async function removeBookNode(userId: string, bookId: string): Promise<void> {
  await prisma.knowledgeNode.deleteMany({ where: { userId, bookId } });
}
