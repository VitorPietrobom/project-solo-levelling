import { Router } from 'express';
import { getStatus } from '../controllers/gamification';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/status', authMiddleware, ensureUser, getStatus);

export default router;
