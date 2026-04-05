import { Router } from 'express';
import { listLessons, createLesson, deleteLesson } from '../controllers/lessons';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listLessons);
router.post('/', authMiddleware, ensureUser, createLesson);
router.delete('/:id', authMiddleware, ensureUser, deleteLesson);

export default router;
