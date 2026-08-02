import { getWorkspaceIds } from '../utils/workspaces.js';

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

function isValidIdentifier(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const normalized = value.trim();
  const isEmail = isValidEmail(normalized);
  const isUsername = /^[a-zA-Z0-9._-]{3,30}$/.test(normalized);
  return isEmail || isUsername;
}

const ALLOWED_AI_MODES = ['balanced', 'fast', 'precise', 'creative', 'detailed', 'productivity'];

export const validateChatRequest = (req, res, next) => {
  const { message, history, workspace, mode } = req.body || {};

  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      error: 'A non-empty message string is required.',
    });
  }

  if (message.trim().length > 5000) {
    return res.status(413).json({
      error: 'Message exceeds the maximum allowed length of 5000 characters.',
    });
  }

  if (workspace !== undefined && typeof workspace !== 'string') {
    return res.status(400).json({
      error: 'Workspace must be a valid identifier.',
    });
  }

  if (workspace && !getWorkspaceIds().includes(workspace)) {
    return res.status(400).json({
      error: 'Workspace is not recognized.',
    });
  }

  if (mode !== undefined && (typeof mode !== 'string' || !ALLOWED_AI_MODES.includes(mode))) {
    return res.status(400).json({
      error: 'AI mode is not recognized.',
    });
  }

  if (history !== undefined && !Array.isArray(history)) {
    return res.status(400).json({
      error: 'The history field must be an array when provided.',
    });
  }

  if (Array.isArray(history)) {
    const invalidMessage = history.some((item) => item && typeof item === 'object' && typeof item.content !== 'string');
    if (invalidMessage) {
      return res.status(400).json({
        error: 'Conversation history entries must include string content.',
      });
    }
  }

  next();
};

export const validateRegister = (req, res, next) => {
  const { fullName, username, email, password } = req.body || {};
  if (!hasText(fullName)) return res.status(400).json({ error: 'Full name is required.' });
  if (!hasText(username)) return res.status(400).json({ error: 'Username is required.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  next();
};

export const validateLogin = (req, res, next) => {
  const identifier = req.body?.identifier || req.body?.email;
  const { password } = req.body || {};
  if (!isValidIdentifier(identifier)) return res.status(400).json({ error: 'A valid username or email is required.' });
  if (typeof password !== 'string' || password.length < 1) return res.status(400).json({ error: 'Password is required.' });
  next();
};

export const validateForgotPassword = (req, res, next) => {
  const { email } = req.body || {};
  if (!isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });
  next();
};

export const validateResetPassword = (req, res, next) => {
  const { token, password } = req.body || {};
  if (!hasText(token)) return res.status(400).json({ error: 'Reset token is required.' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  next();
};

export const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!hasText(currentPassword)) return res.status(400).json({ error: 'Current password is required.' });
  if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  next();
};

export const validateProfile = (req, res, next) => {
  const { fullName, username, email } = req.body || {};
  if (fullName !== undefined && !hasText(fullName)) return res.status(400).json({ error: 'Full name cannot be empty.' });
  if (username !== undefined && !hasText(username)) return res.status(400).json({ error: 'Username cannot be empty.' });
  if (email !== undefined && !isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });
  next();
};

export const validateSettings = (req, res, next) => {
  const { theme, workspace, fontSize, notifications } = req.body || {};
  if (theme && !['light', 'dark', 'system'].includes(theme)) return res.status(400).json({ error: 'Invalid theme.' });
  if (workspace && ![...getWorkspaceIds(), 'assistant', 'research', 'creative'].includes(workspace)) return res.status(400).json({ error: 'Invalid workspace.' });
  if (fontSize && !['small', 'medium', 'large'].includes(fontSize)) return res.status(400).json({ error: 'Invalid font size.' });
  if (notifications !== undefined && typeof notifications !== 'boolean') return res.status(400).json({ error: 'Notifications must be true or false.' });
  next();
};

export const validateDeleteAccount = (req, res, next) => {
  const { password } = req.body || {};
  if (!hasText(password)) return res.status(400).json({ error: 'Password is required.' });
  next();
};

