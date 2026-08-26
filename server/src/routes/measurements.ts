import { Router } from 'express';
import { listMeasurements, createMeasurement, updateMeasurement, deleteMeasurement } from '../controllers/measurements';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listMeasurements);
router.post('/', authMiddleware, ensureUser, createMeasurement);
router.patch('/:id', authMiddleware, ensureUser, updateMeasurement);
router.delete('/:id', authMiddleware, ensureUser, deleteMeasurement);

export default router;
