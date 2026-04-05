import { Router } from 'express';
import { listNotes, getNote, createNote, updateNote, deleteNote } from '../controllers/notes';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listNotes);
router.get('/:id', authMiddleware, ensureUser, getNote);
router.post('/', authMiddleware, ensureUser, createNote);
router.patch('/:id', authMiddleware, ensureUser, updateNote);
router.delete('/:id', authMiddleware, ensureUser, deleteNote);

export default router;
