import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

// Only endpoint needed: verify token and return user info
router.get('/me', authMiddleware, ensureUser, (req, res) => {
  res.json({ user: req.user });
});

export default router;
