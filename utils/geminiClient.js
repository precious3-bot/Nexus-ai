import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const MAX_MESSAGE_LENGTH = 5000;
const DEFAULT_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-20)
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const role = item.role === 'assistant' ? 'model' : 'user';
      const content = sanitizeText(item.content);
      return content ? { role, parts: [{ text: content }] } : null;
    })
    .filter(Boolean);
}

function buildPromptMessages(message, history, systemPrompt) {
  const sanitizedMessage = sanitizeText(message);
  if (!sanitizedMessage) {
    throw new Error('A non-empty message is required.');
  }

  if (sanitizedMessage.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message exceeds the maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`);
  }

  const messages = [...history];
  messages.push({
    role: 'user',
    parts: [{ text: sanitizedMessage }],
  });

  return {
    contents: messages,
    systemInstruction: sanitizeText(systemPrompt) || undefined,
  };
}

function mapGeminiError(error) {
  const status = error?.status || error?.code;
  const message = error?.message || 'Unknown Gemini API error';

  if (status === 400 || /invalid/i.test(message)) {
    return { statusCode: 400, message: 'The request to Gemini was invalid. Please check your prompt and try again.' };
  }

  if (status === 401 || /api key/i.test(message)) {
    return { statusCode: 401, message: 'The Gemini API key is invalid or missing.' };
  }

  if (status === 429 || /quota|rate limit|too many requests/i.test(message)) {
    return { statusCode: 429, message: 'Gemini is currently rate limiting requests. Please try again shortly.' };
  }

  if (status === 404 || /model/i.test(message)) {
    return { statusCode: 404, message: 'The selected Gemini model is unavailable. Please try another model.' };
  }

  if (status === 408 || /timeout/i.test(message)) {
    return { statusCode: 504, message: 'The Gemini request timed out. Please try again.' };
  }

  if (status >= 500 || /network|fetch/i.test(message)) {
    return { statusCode: 502, message: 'Gemini is temporarily unavailable. Please try again in a moment.' };
  }

  return { statusCode: 500, message: 'An unexpected error occurred while contacting Gemini.' };
}

export const generateGeminiResponse = async (message, history = [], systemPrompt = '') => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const sanitizedMessage = sanitizeText(message);

  if (!apiKey) {
    throw Object.assign(new Error('Gemini API key is not configured.'), { statusCode: 401 });
  }

  if (!sanitizedMessage) {
    throw Object.assign(new Error('A non-empty message is required.'), { statusCode: 400 });
  }

  if (sanitizedMessage.length > MAX_MESSAGE_LENGTH) {
    throw Object.assign(new Error(`Message exceeds the maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`), { statusCode: 413 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const normalizedHistory = normalizeHistory(history);
    const { contents, systemInstruction } = buildPromptMessages(sanitizedMessage, normalizedHistory, systemPrompt);

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        systemInstruction,
      },
    });

    const text =
      response?.text ||
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      response?.content?.parts?.[0]?.text ||
      response?.content?.[0]?.parts?.[0]?.text ||
      '';

    if (!text) {
      throw Object.assign(new Error('Gemini returned an empty response.'), { statusCode: 502 });
    }

    return text;
  } catch (error) {
    const mapped = mapGeminiError(error);
    throw Object.assign(new Error(mapped.message), { statusCode: mapped.statusCode });
  }
};
