import { Router } from 'express';
import { listSkills, createSkill, updateSkill, deleteSkill } from '../controllers/skills';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listSkills);
router.post('/', authMiddleware, ensureUser, createSkill);
router.patch('/:id', authMiddleware, ensureUser, updateSkill);
router.delete('/:id', authMiddleware, ensureUser, deleteSkill);

export default router;
