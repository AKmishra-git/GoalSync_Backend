import express from 'express';
import {
  getAchievementReport,
  exportCSV,
  getCompletionDashboard
} from '../controllers/report.controller.js';
import { protect, authorizeRoles } from '../middleware/middleware.auth.js';

const router = express.Router();

// Admin and manager can access reports
router.get('/achievement', protect, authorizeRoles('admin', 'manager'), getAchievementReport);
router.get('/completion',  protect, authorizeRoles('admin', 'manager'), getCompletionDashboard);

// CSV export — admin only
router.get('/export',      protect, authorizeRoles('admin'), exportCSV);

export default router;