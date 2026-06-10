import { Router } from 'express';
import { listSkills, createSkill, logActivity, deleteSkill } from '../controllers/skills';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listSkills);
router.post('/', authMiddleware, ensureUser, createSkill);
router.post('/:id/log', authMiddleware, ensureUser, logActivity);
router.delete('/:id', authMiddleware, ensureUser, deleteSkill);

export default router;
