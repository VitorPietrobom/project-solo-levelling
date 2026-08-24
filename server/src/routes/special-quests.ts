import { Router } from 'express';
import { listSpecialQuests, toggleSpecialQuest } from '../controllers/special-quests';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listSpecialQuests);
router.patch('/:templateId', authMiddleware, ensureUser, toggleSpecialQuest);

export default router;
