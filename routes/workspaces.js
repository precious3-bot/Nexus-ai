import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getWorkspaceMetadata } from '../utils/workspaces.js';

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  res.status(200).json({ workspaces: getWorkspaceMetadata() });
});

export default router;
