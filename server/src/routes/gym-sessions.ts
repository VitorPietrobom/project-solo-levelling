import { Router } from 'express';
import { listGymSessions, createGymSession, getHeatmap, deleteGymSession } from '../controllers/gym-sessions';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/heatmap', authMiddleware, ensureUser, getHeatmap);
router.get('/', authMiddleware, ensureUser, listGymSessions);
router.post('/', authMiddleware, ensureUser, createGymSession);
router.delete('/:id', authMiddleware, ensureUser, deleteGymSession);

export default router;
