import { Router } from 'express';
import { listFoodEntries, createFoodEntry, deleteFoodEntry } from '../controllers/food-entries';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listFoodEntries);
router.post('/', authMiddleware, ensureUser, createFoodEntry);
router.delete('/:id', authMiddleware, ensureUser, deleteFoodEntry);

export default router;
