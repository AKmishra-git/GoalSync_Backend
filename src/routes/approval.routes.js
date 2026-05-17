import express from 'express';
import {
  getTeamGoalSheets,
  getGoalSheet,
  approveGoalSheet,
  returnGoalSheet,
  managerEditGoal,
  unlockGoalSheet
} from '../controllers/approval.controller.js';
import { protect, authorizeRoles } from '../middleware/middleware.auth.js';

const router = express.Router();

// Manager routes
router.get('/team',                       protect, authorizeRoles('manager'), getTeamGoalSheets);
router.get('/:sheetId',                   protect, authorizeRoles('manager', 'admin'), getGoalSheet);
router.put('/:sheetId/approve',           protect, authorizeRoles('manager'), approveGoalSheet);
router.put('/:sheetId/return',            protect, authorizeRoles('manager'), returnGoalSheet);
router.put('/:sheetId/goal/:goalId',      protect, authorizeRoles('manager'), managerEditGoal);

// Admin only
router.put('/:sheetId/unlock',            protect, authorizeRoles('admin'), unlockGoalSheet);

export default router;