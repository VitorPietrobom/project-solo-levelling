import { Router } from 'express';
import {
  listQuests, createQuest, updateQuest, toggleStep, resetQuest, deleteQuest, completeQuestAll, importTasks,
} from '../controllers/quests';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listQuests);
router.post('/', authMiddleware, ensureUser, createQuest);
router.post('/import-tasks', authMiddleware, ensureUser, importTasks);
router.patch('/:id', authMiddleware, ensureUser, updateQuest);
router.patch('/:id/steps/:stepId', authMiddleware, ensureUser, toggleStep);
router.patch('/:id/reset', authMiddleware, ensureUser, resetQuest);
router.patch('/:id/complete', authMiddleware, ensureUser, completeQuestAll);
router.delete('/:id', authMiddleware, ensureUser, deleteQuest);

export default router;
