import { Router } from 'express';
import { getCalorieGoal, setCalorieGoal } from '../controllers/calorie-goal';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, getCalorieGoal);
router.put('/', authMiddleware, ensureUser, setCalorieGoal);

export default router;
