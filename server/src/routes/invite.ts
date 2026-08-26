import { Router } from 'express';
import { getInviteStatus, redeemInvite } from '../controllers/invite';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Deliberately NOT behind ensureUser — these routes are how an unactivated
// user gets unstuck, so they must work before activation.
router.get('/status', authMiddleware, getInviteStatus);
router.post('/redeem', authMiddleware, redeemInvite);

export default router;
