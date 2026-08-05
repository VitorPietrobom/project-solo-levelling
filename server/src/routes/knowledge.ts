import { Router } from 'express';
import {
  getGraph, getNode, createNode, updateNode, deleteNode,
  createEdge, deleteEdge, importLegacy,
} from '../controllers/knowledge';
import { authMiddleware } from '../middleware/auth';
import { ensureUser } from '../middleware/ensureUser';

const router = Router();

router.get('/', authMiddleware, ensureUser, getGraph);
router.post('/import-legacy', authMiddleware, ensureUser, importLegacy);
router.post('/edges', authMiddleware, ensureUser, createEdge);
router.delete('/edges/:id', authMiddleware, ensureUser, deleteEdge);
router.get('/:id', authMiddleware, ensureUser, getNode);
router.post('/', authMiddleware, ensureUser, createNode);
router.patch('/:id', authMiddleware, ensureUser, updateNode);
router.delete('/:id', authMiddleware, ensureUser, deleteNode);

export default router;
