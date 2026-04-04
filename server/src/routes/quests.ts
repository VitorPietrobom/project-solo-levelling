import { Router } from 'express';
import { listQuests, createQuest, completeStep } from '../controllers/quests';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listQuests);
router.post('/', authMiddleware, ensureUser, createQuest);
router.patch('/:id/steps/:stepId', authMiddleware, ensureUser, completeStep);

export default router;
