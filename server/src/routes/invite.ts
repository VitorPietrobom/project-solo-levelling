import { Router } from 'express';
import { getInviteStatus, redeemInvite, generateInviteCode, listInviteCodes } from '../controllers/invite';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// Deliberately NOT behind ensureUser — these routes are how an unactivated
// user gets unstuck, so they must work before activation.
router.get('/status', authMiddleware, getInviteStatus);
router.post('/redeem', authMiddleware, redeemInvite);

router.get('/codes', authMiddleware, requireAdmin, listInviteCodes);
router.post('/codes', authMiddleware, requireAdmin, generateInviteCode);

export default router;
