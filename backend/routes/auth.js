import express from 'express';
const router = express.Router();
import * as authController from '../controllers/authController.js';
import * as userController from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';

// Public routes
router.post('/signup', authController.register);
router.post('/login', authController.login);
router.post('/reset-password', authController.requestPasswordReset);

// Protected routes
router.get('/me', authMiddleware, userController.getProfile);

export default router;