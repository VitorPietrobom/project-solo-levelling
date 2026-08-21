import { Router } from 'express';
import { listFoodEntries, createFoodEntry, deleteFoodEntry, lookupBarcode, createCustomFoodProduct } from '../controllers/food-entries';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listFoodEntries);
router.post('/', authMiddleware, ensureUser, createFoodEntry);
router.get('/barcode/:code', authMiddleware, ensureUser, lookupBarcode);
router.post('/barcode/:code', authMiddleware, ensureUser, createCustomFoodProduct);
router.delete('/:id', authMiddleware, ensureUser, deleteFoodEntry);

export default router;
