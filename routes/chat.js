import express from 'express';
import { validateChatRequest } from '../middleware/validateRequest.js';
import { generateGeminiResponse } from '../utils/geminiClient.js';

const router = express.Router();

router.post('/', validateChatRequest, async (req, res, next) => {
  try {
    const { message } = req.body;

    const response = await generateGeminiResponse(message);

    res.status(200).json({
      success: true,
      reply: response,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
