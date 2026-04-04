import { Router } from 'express';
import { listTasks, createTask, completeTask } from '../controllers/tasks';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listTasks);
router.post('/', authMiddleware, ensureUser, createTask);
router.patch('/:id/complete', authMiddleware, ensureUser, completeTask);

export default router;
