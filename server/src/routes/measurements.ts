import { Router } from 'express';
import { listMeasurements, createMeasurement } from '../controllers/measurements';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listMeasurements);
router.post('/', authMiddleware, ensureUser, createMeasurement);

export default router;
