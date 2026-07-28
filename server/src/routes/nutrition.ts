import { Router } from 'express';
import { getNutritionTarget, getNutritionSettings, updateNutritionSettings, claimNutritionXp } from '../controllers/nutrition';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/target', authMiddleware, ensureUser, getNutritionTarget);
router.get('/settings', authMiddleware, ensureUser, getNutritionSettings);
router.put('/settings', authMiddleware, ensureUser, updateNutritionSettings);
router.post('/claim', authMiddleware, ensureUser, claimNutritionXp);

export default router;
