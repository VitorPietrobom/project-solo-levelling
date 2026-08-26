import { Router } from 'express';
import { createFeedback } from '../controllers/feedback';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.post('/', authMiddleware, ensureUser, createFeedback);

export default router;
