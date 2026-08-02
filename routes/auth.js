import express from 'express';
import { register, login, logout, me, forgotPassword, resetPassword, changePassword, updateProfile, updateSettings, deleteAccount } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRegister, validateLogin, validateForgotPassword, validateResetPassword, validateChangePassword, validateProfile, validateSettings, validateDeleteAccount } from '../middleware/validateRequest.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/change-password', authenticate, validateChangePassword, changePassword);
router.put('/profile', authenticate, validateProfile, updateProfile);
router.put('/settings', authenticate, validateSettings, updateSettings);
router.delete('/account', authenticate, validateDeleteAccount, deleteAccount);

export default router;
