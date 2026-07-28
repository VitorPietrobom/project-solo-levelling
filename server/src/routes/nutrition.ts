import { Router } from 'express';
import { getNutritionTarget, getNutritionSettings, updateNutritionSettings } from '../controllers/nutrition';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/target', authMiddleware, ensureUser, getNutritionTarget);
router.get('/settings', authMiddleware, ensureUser, getNutritionSettings);
router.put('/settings', authMiddleware, ensureUser, updateNutritionSettings);

export default router;
