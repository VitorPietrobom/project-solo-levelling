import { Router } from 'express';
import { listSkills, createSkill, deleteSkill } from '../controllers/skills';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listSkills);
router.post('/', authMiddleware, ensureUser, createSkill);
router.delete('/:id', authMiddleware, ensureUser, deleteSkill);

export default router;
