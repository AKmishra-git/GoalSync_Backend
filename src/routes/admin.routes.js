import express from 'express';
import {
  getDashboard,
  getAllGoalSheets,
  createCycle,
  updateCycle,
  getCycle,
  getAuditLogs,
  getManagerStats
} from '../controllers/admin.controller.js';
import { protect, authorizeRoles } from '../middleware/middleware.auth.js';

const router = express.Router();

// All admin routes
router.use(protect, authorizeRoles('admin'));

router.get('/dashboard',      getDashboard);
router.get('/goal-sheets',    getAllGoalSheets);
router.get('/manager-stats',  getManagerStats);
router.get('/audit',          getAuditLogs);
router.post('/cycle',         createCycle);
router.get('/cycle/:year',    getCycle);
router.put('/cycle/:year',    updateCycle);

export default router;