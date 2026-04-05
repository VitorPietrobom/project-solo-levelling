import { Router } from 'express';
import { listWeightEntries, createWeightEntry } from '../controllers/weight';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listWeightEntries);
router.post('/', authMiddleware, ensureUser, createWeightEntry);

export default router;
