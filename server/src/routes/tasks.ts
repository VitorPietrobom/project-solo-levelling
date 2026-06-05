import { Router } from 'express';
import { listTasks, createTask, completeTask, uncompleteTask } from '../controllers/tasks';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listTasks);
router.post('/', authMiddleware, ensureUser, createTask);
router.patch('/:id/complete', authMiddleware, ensureUser, completeTask);
router.patch('/:id/uncomplete', authMiddleware, ensureUser, uncompleteTask);

export default router;
