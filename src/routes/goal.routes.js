import express from 'express';
import {
  createGoalSheet,
  addGoalToSheet,
  updateGoal,
  deleteGoal,
  submitGoalSheet,
  getMyGoalSheet
} from '../controllers/goal.controller.js';
import { protect, authorizeRoles } from '../middleware/middleware.auth.js';

const router = express.Router();

// All routes require login

router.post('/',                              protect, authorizeRoles('employee'), createGoalSheet);
router.get('/my',                             protect, authorizeRoles('employee'), getMyGoalSheet);
router.post('/:sheetId/add-goal',             protect, authorizeRoles('employee'), addGoalToSheet);
router.put('/:sheetId/goal/:goalId',          protect, authorizeRoles('employee'), updateGoal);
router.delete('/:sheetId/goal/:goalId',       protect, authorizeRoles('employee'), deleteGoal);
router.put('/:sheetId/submit',                protect, authorizeRoles('employee'), submitGoalSheet);

export default router;