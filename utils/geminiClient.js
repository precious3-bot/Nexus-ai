import dotenv from 'dotenv';

dotenv.config();

export const generateGeminiResponse = async (message) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return `Gemini API key is not configured. Please set GEMINI_API_KEY in your environment.\n\nYou said: ${message}`;
  }

  // Placeholder for future Gemini API integration.
  // Replace this with a real call to Google's Gemini endpoint when ready.
  return `Gemini integration is ready for wiring.\n\nYou said: ${message}`;
};
