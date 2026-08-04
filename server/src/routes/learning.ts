import { Router } from 'express';
import { getLearningStats, updateReadingGoal } from '../controllers/learning';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/stats', authMiddleware, ensureUser, getLearningStats);
router.put('/goal', authMiddleware, ensureUser, updateReadingGoal);

export default router;
