import { Router } from 'express';
import { listJournalEntries, createJournalEntry, deleteJournalEntry } from '../controllers/journal';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listJournalEntries);
router.post('/', authMiddleware, ensureUser, createJournalEntry);
router.delete('/:id', authMiddleware, ensureUser, deleteJournalEntry);

export default router;
