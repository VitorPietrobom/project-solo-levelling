import { Router } from 'express';
import { listRecipes, createRecipe, getRecipe, deleteRecipe } from '../controllers/recipes';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listRecipes);
router.post('/', authMiddleware, ensureUser, createRecipe);
router.get('/:id', authMiddleware, ensureUser, getRecipe);
router.delete('/:id', authMiddleware, ensureUser, deleteRecipe);

export default router;
