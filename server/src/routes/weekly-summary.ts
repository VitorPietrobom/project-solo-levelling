import { Router } from 'express';
import { getWeeklySummary } from '../controllers/weekly-summary';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, getWeeklySummary);

export default router;
