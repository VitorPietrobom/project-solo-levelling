import { Router } from 'express';
import { getMealPrepPlan, createOrUpdateMealPrepPlan, importMealPrepPlan, getGroceryList, deleteMealPrepPlan } from '../controllers/meal-prep';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

// Register grocery-list route BEFORE /:day to avoid conflicts
router.get('/grocery-list/:day', authMiddleware, ensureUser, getGroceryList);
router.get('/', authMiddleware, ensureUser, getMealPrepPlan);
router.post('/', authMiddleware, ensureUser, createOrUpdateMealPrepPlan);
router.post('/import', authMiddleware, ensureUser, importMealPrepPlan);

router.delete('/:id', authMiddleware, ensureUser, deleteMealPrepPlan);

export default router;
