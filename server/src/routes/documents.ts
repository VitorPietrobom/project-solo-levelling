import { Router } from 'express';
import { listDocuments, createDocument, getDocument, listCategories, deleteDocument } from '../controllers/documents';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, listDocuments);
router.post('/', authMiddleware, ensureUser, createDocument);
router.get('/categories', authMiddleware, ensureUser, listCategories);
router.get('/:id', authMiddleware, ensureUser, getDocument);
router.delete('/:id', authMiddleware, ensureUser, deleteDocument);

export default router;
