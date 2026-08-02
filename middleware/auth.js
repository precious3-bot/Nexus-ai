import { verifyToken } from '../utils/auth.js';
import { getUserById } from '../models/user.js';

export function getAuthenticatedUser(req) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded?.userId) return null;

    const user = getUserById(decoded.userId);
    if (!user || user.sessionId !== decoded.sessionId) return null;

    return user;
  } catch (error) {
    return null;
  }
}

export function authenticate(req, res, next) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      const error = new Error('Authentication required.');
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
