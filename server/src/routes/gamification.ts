import { Router } from 'express';
import { getStatus, updateProfile } from '../controllers/gamification';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/status', authMiddleware, ensureUser, getStatus);
router.put('/profile', authMiddleware, ensureUser, updateProfile);

export default router;
