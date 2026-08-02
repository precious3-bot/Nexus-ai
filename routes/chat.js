import express from 'express';
import { validateChatRequest } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/auth.js';
import { generateGeminiResponse } from '../utils/geminiClient.js';
import { getWorkspaceById } from '../utils/workspaces.js';

const router = express.Router();

router.post('/', authenticate, validateChatRequest, async (req, res, next) => {
  try {
    const { message, history, workspace } = req.body;
    const activeWorkspace = getWorkspaceById(workspace) || getWorkspaceById('general-ai');
    const reply = await generateGeminiResponse(message, history, activeWorkspace?.systemPrompt);
    const activeModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-pro';

    res.set('Cache-Control', 'no-store');
    res.status(200).json({
      reply,
      model: activeModel,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.set('Cache-Control', 'no-store');
    res.status(statusCode).json({
      error: error.message || 'An unexpected error occurred.',
    });
  }
});

export default router;
