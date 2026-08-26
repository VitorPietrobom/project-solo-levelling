import { Router } from 'express';
import { listWeightEntries, createWeightEntry, updateWeightEntry, deleteWeightEntry } from '../controllers/weight';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listWeightEntries);
router.post('/', authMiddleware, ensureUser, createWeightEntry);
router.patch('/:id', authMiddleware, ensureUser, updateWeightEntry);
router.delete('/:id', authMiddleware, ensureUser, deleteWeightEntry);

export default router;
