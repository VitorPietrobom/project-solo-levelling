import { Router } from 'express';
import { exportData } from '../controllers/export';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, exportData);

export default router;
