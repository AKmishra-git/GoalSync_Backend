import express from 'express';
import {
  logAchievement,
  addManagerComment,
  getCheckinData,
  getTeamCheckinOverview
} from '../controllers/checkin.controller.js';
import { protect, authorizeRoles } from '../middleware/middleware.auth.js';

const router = express.Router();

// Employee logs achievement
router.put('/:sheetId/quarter/:quarter',         protect, authorizeRoles('employee'), logAchievement);

// Manager adds comment
router.put('/:sheetId/quarter/:quarter/comment', protect, authorizeRoles('manager'), addManagerComment);

// View check-in data
router.get('/team',                              protect, authorizeRoles('manager'), getTeamCheckinOverview);
router.get('/:sheetId',                          protect, authorizeRoles('employee', 'manager', 'admin'), getCheckinData);

export default router;