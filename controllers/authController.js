import { registerUser, getUserByEmail, getUserByUsername, verifyPassword, updatePassword, setSession, clearSession, updateUser, deleteUser, toPublicUser, buildSettingsFromInput, getUserByResetToken } from '../models/user.js';
import { createToken, createResetToken, hashResetToken } from '../utils/auth.js';

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

function setAuthCookie(res, token, rememberMe = false) {
  const maxAge = rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24;
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
  });
}

function clearAuthCookie(res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

function sanitizeProfilePayload(payload) {
  return {
    fullName: payload.fullName,
    username: payload.username,
    email: payload.email,
    avatar: payload.avatar,
  };
}

export async function register(req, res, next) {
  try {
    const { fullName, username, email, password } = req.body;
    if (!isValidPassword(password)) {
      const error = new Error('Password must be at least 8 characters and include an uppercase letter and a number.');
      error.statusCode = 400;
      throw error;
    }

    const user = await registerUser({ fullName, username, email, password });
    const sessionId = crypto.randomUUID();
    await setSession(user.id, sessionId);
    const token = createToken({ userId: user.id, sessionId });
    setAuthCookie(res, token, Boolean(req.body.rememberMe));

    res.status(201).json({ success: true, user: toPublicUser({ ...user, sessionId }) });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const identifier = req.body?.identifier || req.body?.email;
    const { password, rememberMe } = req.body;
    let user = getUserByEmail(identifier);
    if (!user) {
      user = getUserByUsername(identifier);
    }
    if (!user) {
      const error = new Error('Invalid username, email, or password.');
      error.statusCode = 401;
      throw error;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const error = new Error('Invalid username, email, or password.');
      error.statusCode = 401;
      throw error;
    }

    const sessionId = crypto.randomUUID();
    await setSession(user.id, sessionId);
    const token = createToken({ userId: user.id, sessionId });
    setAuthCookie(res, token, Boolean(rememberMe));
    updateUser(user.id, { lastLogin: new Date().toISOString() });

    res.status(200).json({ success: true, user: toPublicUser({ ...user, sessionId, lastLogin: new Date().toISOString() }) });
  } catch (error) {
    next(error);
  }
}

export function logout(req, res, next) {
  try {
    clearSession(req.user.id);
    clearAuthCookie(res);
    res.status(200).json({ success: true, message: 'Signed out successfully.' });
  } catch (error) {
    next(error);
  }
}

export function me(req, res, next) {
  try {
    res.status(200).json({ success: true, user: toPublicUser(req.user) });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(200).json({ success: true, message: 'If that account exists, a reset link has been sent.' });
    }

    const token = createResetToken();
    const hashedToken = hashResetToken(token);
    updateUser(user.id, {
      passwordResetTokenHash: hashedToken,
      passwordResetExpiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    });

    res.status(200).json({ success: true, message: 'If that account exists, a reset link has been sent.', resetToken: token });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const user = getUserByResetToken(token);
    if (!user) {
      const error = new Error('Invalid or expired reset token.');
      error.statusCode = 400;
      throw error;
    }

    if (!isValidPassword(password)) {
      const error = new Error('Password must be at least 8 characters and include an uppercase letter and a number.');
      error.statusCode = 400;
      throw error;
    }

    await updatePassword(user.id, password);
    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = getUserByEmail(req.user.email);
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      const error = new Error('Current password is incorrect.');
      error.statusCode = 401;
      throw error;
    }

    if (!isValidPassword(newPassword)) {
      const error = new Error('Password must be at least 8 characters and include an uppercase letter and a number.');
      error.statusCode = 400;
      throw error;
    }

    await updatePassword(user.id, newPassword);
    res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const payload = sanitizeProfilePayload(req.body);
    const user = updateUser(req.user.id, payload);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const user = updateUser(req.user.id, { settings: buildSettingsFromInput(req.body) });
    res.status(200).json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const { password } = req.body;
    const user = getUserByEmail(req.user.email);
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const error = new Error('Password is incorrect.');
      error.statusCode = 401;
      throw error;
    }
    deleteUser(req.user.id);
    clearAuthCookie(res);
    res.status(200).json({ success: true, message: 'Account deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
