import { Router } from 'express';
import { login, logout, getMe } from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);

export default router;
