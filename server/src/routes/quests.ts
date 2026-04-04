import { Router } from 'express';
import { listQuests, createQuest, completeStep } from '../controllers/quests';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, listQuests);
router.post('/', authMiddleware, createQuest);
router.patch('/:id/steps/:stepId', authMiddleware, completeStep);

export default router;
