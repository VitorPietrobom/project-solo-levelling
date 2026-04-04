import { Router } from 'express';
import { getStatus } from '../controllers/gamification';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/status', authMiddleware, getStatus);

export default router;
