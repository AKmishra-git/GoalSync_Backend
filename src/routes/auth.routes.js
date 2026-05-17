import express from 'express';
import {register, login, getMe, getAllUsers, getTeam} from '../controllers/auth.controller.js';
import {protect, authorizeRoles} from '../middleware/middleware.auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/users', protect, authorizeRoles('admin'), getAllUsers);
router.get('/team', protect, authorizeRoles('manager'), getTeam);

export default router;