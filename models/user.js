import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { loadStore, saveStore } from '../utils/storage.js';

const DEFAULT_SETTINGS = {
  theme: 'system',
  workspace: 'general-ai',
  preferredModel: '',
  fontSize: 'medium',
  notifications: true,
};

function normalizeWorkspaceSetting(value) {
  if (typeof value !== 'string') return DEFAULT_SETTINGS.workspace;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return DEFAULT_SETTINGS.workspace;
  if (normalized === 'assistant' || normalized === 'general') return 'general-ai';
  if (normalized === 'research') return 'research-assistant';
  if (normalized === 'creative') return 'creative-assistant';
  return normalized;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/<[^>]*>/g, '');
}

function getStore() {
  return loadStore();
}

function saveStoreData(store) {
  saveStore(store);
}

function buildUserFromData(data) {
  return {
    id: data.id || crypto.randomUUID(),
    fullName: sanitizeText(data.fullName),
    username: normalizeUsername(data.username || data.email),
    email: normalizeEmail(data.email),
    passwordHash: data.passwordHash,
    avatar: sanitizeText(data.avatar || ''),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    lastLogin: data.lastLogin || null,
    sessionId: data.sessionId || null,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(data.settings || {}),
    },
    conversations: Array.isArray(data.conversations) ? data.conversations : [],
    passwordResetTokenHash: data.passwordResetTokenHash || null,
    passwordResetExpiresAt: data.passwordResetExpiresAt || null,
  };
}

export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, passwordResetTokenHash, passwordResetExpiresAt, sessionId, ...rest } = user;
  return rest;
}

export async function registerUser({ fullName, username, email, password }) {
  const store = getStore();
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username || email);

  if (!normalizedEmail || !password || !fullName) {
    const error = new Error('Full name, email, and password are required.');
    error.statusCode = 400;
    throw error;
  }

  if (store.users.some((entry) => entry.email === normalizedEmail)) {
    const error = new Error('An account with that email already exists.');
    error.statusCode = 409;
    throw error;
  }

  if (store.users.some((entry) => entry.username === normalizedUsername)) {
    const error = new Error('That username is already taken.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = buildUserFromData({
    id: crypto.randomUUID(),
    fullName: sanitizeText(fullName),
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash,
    avatar: '',
    settings: DEFAULT_SETTINGS,
    conversations: [],
  });

  store.users.push(user);
  saveStoreData(store);
  return user;
}

export function getUserByEmail(email) {
  const store = getStore();
  return store.users.find((entry) => entry.email === normalizeEmail(email)) || null;
}

export function getUserByUsername(username) {
  const store = getStore();
  const normalized = normalizeUsername(username);
  return store.users.find((entry) => entry.username === normalized) || null;
}

export function getUserById(id) {
  const store = getStore();
  return store.users.find((entry) => entry.id === id) || null;
}

export function getUserByResetToken(token) {
  const store = getStore();
  if (!token) return null;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  return store.users.find((entry) => entry.passwordResetTokenHash === hashed) || null;
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function updatePassword(userId, newPassword) {
  const store = getStore();
  const user = store.users.find((entry) => entry.id === userId);
  if (!user) return null;
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.updatedAt = new Date().toISOString();
  saveStoreData(store);
  return user;
}

export async function setSession(userId, sessionId) {
  const store = getStore();
  const user = store.users.find((entry) => entry.id === userId);
  if (!user) return null;
  user.sessionId = sessionId;
  user.updatedAt = new Date().toISOString();
  saveStoreData(store);
  return user;
}

export function clearSession(userId) {
  const store = getStore();
  const user = store.users.find((entry) => entry.id === userId);
  if (!user) return null;
  user.sessionId = null;
  user.updatedAt = new Date().toISOString();
  saveStoreData(store);
  return user;
}

export function updateUser(userId, updates) {
  const store = getStore();
  const user = store.users.find((entry) => entry.id === userId);
  if (!user) return null;

  if (updates.fullName !== undefined) user.fullName = sanitizeText(updates.fullName);
  if (updates.username !== undefined) user.username = normalizeUsername(updates.username);
  if (updates.email !== undefined) user.email = normalizeEmail(updates.email);
  if (updates.avatar !== undefined) user.avatar = sanitizeText(updates.avatar);
  if (updates.settings !== undefined) {
    user.settings = { ...DEFAULT_SETTINGS, ...(user.settings || {}), ...updates.settings };
  }
  if (updates.lastLogin !== undefined) user.lastLogin = updates.lastLogin;
  if (updates.conversations !== undefined) user.conversations = Array.isArray(updates.conversations) ? updates.conversations : [];
  if (updates.passwordResetTokenHash !== undefined) user.passwordResetTokenHash = updates.passwordResetTokenHash;
  if (updates.passwordResetExpiresAt !== undefined) user.passwordResetExpiresAt = updates.passwordResetExpiresAt;
  user.updatedAt = new Date().toISOString();
  saveStoreData(store);
  return user;
}

export function deleteUser(userId) {
  const store = getStore();
  const nextUsers = store.users.filter((entry) => entry.id !== userId);
  if (nextUsers.length === store.users.length) return false;
  store.users = nextUsers;
  saveStoreData(store);
  return true;
}

export function buildSettingsFromInput(settings = {}) {
  return {
    theme: settings.theme || DEFAULT_SETTINGS.theme,
    workspace: normalizeWorkspaceSetting(settings.workspace),
    preferredModel: sanitizeText(settings.preferredModel || ''),
    fontSize: settings.fontSize || DEFAULT_SETTINGS.fontSize,
    notifications: settings.notifications !== undefined ? Boolean(settings.notifications) : DEFAULT_SETTINGS.notifications,
  };
}
