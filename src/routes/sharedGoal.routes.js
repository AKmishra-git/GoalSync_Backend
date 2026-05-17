import express from 'express';
import {
  pushSharedGoal,
  getPushedSharedGoals,
  updateSharedGoalAchievement
} from '../controllers/sharedGoal.controller.js';
import { protect, authorizeRoles } from '../middleware/middleware.auth.js';

const router = express.Router();

// Admin or manager can push shared goals
router.post('/push',                                      protect, authorizeRoles('admin', 'manager'), pushSharedGoal);
router.get('/pushed',                                     protect, authorizeRoles('admin', 'manager'), getPushedSharedGoals);

// Primary owner syncs achievement
router.put('/:sheetId/goal/:goalId/achievement',          protect, updateSharedGoalAchievement);

export default router;