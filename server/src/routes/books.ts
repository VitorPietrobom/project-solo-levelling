import { Router } from 'express';
import { listBooks, createBook, updateBook, deleteBook } from '../controllers/books';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listBooks);
router.post('/', authMiddleware, ensureUser, createBook);
router.patch('/:id', authMiddleware, ensureUser, updateBook);
router.delete('/:id', authMiddleware, ensureUser, deleteBook);

export default router;
