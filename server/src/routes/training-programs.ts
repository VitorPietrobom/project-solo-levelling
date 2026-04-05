import { Router } from 'express';
import {
  listTrainingPrograms,
  createTrainingProgram,
  activateTrainingProgram,
  deleteTrainingProgram,
} from '../controllers/training-programs';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listTrainingPrograms);
router.post('/', authMiddleware, ensureUser, createTrainingProgram);
router.patch('/:id/activate', authMiddleware, ensureUser, activateTrainingProgram);
router.delete('/:id', authMiddleware, ensureUser, deleteTrainingProgram);

export default router;
