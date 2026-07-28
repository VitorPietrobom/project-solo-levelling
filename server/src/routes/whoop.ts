import { Router } from 'express';
import {
  authorizeWhoop,
  whoopCallback,
  syncWhoop,
  whoopStatus,
  disconnectWhoop,
} from '../controllers/whoop';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/authorize', authMiddleware, ensureUser, authorizeWhoop);
router.get('/callback', whoopCallback); // no auth — browser redirect, trusted via signed state
router.get('/status', authMiddleware, ensureUser, whoopStatus);
router.post('/sync', authMiddleware, ensureUser, syncWhoop);
router.delete('/', authMiddleware, ensureUser, disconnectWhoop);

export default router;
