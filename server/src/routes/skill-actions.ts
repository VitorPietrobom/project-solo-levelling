import { Router } from 'express';
import {
  listSkillActions, createSkillAction, updateSkillAction, deleteSkillAction, logSkillAction,
} from '../controllers/skillActions';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listSkillActions);
router.post('/', authMiddleware, ensureUser, createSkillAction);
router.patch('/:id', authMiddleware, ensureUser, updateSkillAction);
router.delete('/:id', authMiddleware, ensureUser, deleteSkillAction);
router.post('/:id/log', authMiddleware, ensureUser, logSkillAction);

export default router;
