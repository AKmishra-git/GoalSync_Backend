import GoalSheet from '../models/goalSheet.model.js';
import AuditLog from '../models/auditLog.model.js';

// ─── GET ALL TEAM GOAL SHEETS ──────────────────────────────
// GET /api/approval/team?year=2025
export const getTeamGoalSheets = async (req, res) => {
  try {
    const cycleYear = parseInt(req.query.year) || new Date().getFullYear();

    // Find all employees under this manager
    const goalSheets = await GoalSheet.find({ cycleYear })
      .populate('employeeId', 'name email department managerId')
      .where('employeeId.managerId');

    // Filter only this manager's team
    const teamSheets = goalSheets.filter(
      (sheet) =>
        sheet.employeeId?.managerId?.toString() === req.user._id.toString()
    );

    res.json(teamSheets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET SINGLE GOAL SHEET ─────────────────────────────────
// GET /api/approval/:sheetId
export const getGoalSheet = async (req, res) => {
  try {
    const goalSheet = await GoalSheet.findById(req.params.sheetId)
      .populate('employeeId', 'name email department');

    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    res.json(goalSheet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── APPROVE GOAL SHEET ────────────────────────────────────
// PUT /api/approval/:sheetId/approve
export const approveGoalSheet = async (req, res) => {
  try {
    const goalSheet = await GoalSheet.findById(req.params.sheetId)
      .populate('employeeId', 'name email managerId');

    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    // Make sure this employee belongs to this manager
    if (goalSheet.employeeId.managerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'This employee is not in your team' });

    if (goalSheet.status !== 'submitted')
      return res.status(400).json({
        message: `Cannot approve. Current status is "${goalSheet.status}"`
      });

    goalSheet.status      = 'approved';
    goalSheet.approvedAt  = new Date();
    goalSheet.lockedAt    = new Date();
    goalSheet.approvedBy  = req.user._id;

    await goalSheet.save();

    res.json({ message: 'Goal sheet approved and locked', goalSheet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── RETURN GOAL SHEET FOR REWORK ──────────────────────────
// PUT /api/approval/:sheetId/return
export const returnGoalSheet = async (req, res) => {
  try {
    const { reason } = req.body;

    const goalSheet = await GoalSheet.findById(req.params.sheetId)
      .populate('employeeId', 'name email managerId');

    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    if (goalSheet.employeeId.managerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'This employee is not in your team' });

    if (goalSheet.status !== 'submitted')
      return res.status(400).json({
        message: `Cannot return. Current status is "${goalSheet.status}"`
      });

    goalSheet.status = 'rework';
    await goalSheet.save();

    res.json({
      message: 'Goal sheet returned for rework',
      reason: reason || 'No reason provided',
      goalSheet
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── MANAGER INLINE EDIT GOAL (before approval) ────────────
// PUT /api/approval/:sheetId/goal/:goalId
export const managerEditGoal = async (req, res) => {
  try {
    const goalSheet = await GoalSheet.findById(req.params.sheetId)
      .populate('employeeId', 'name email managerId');

    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    if (goalSheet.employeeId.managerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'This employee is not in your team' });

    if (goalSheet.status !== 'submitted')
      return res.status(400).json({
        message: 'Can only edit goals on submitted sheets'
      });

    const goal = goalSheet.goals.id(req.params.goalId);
    if (!goal)
      return res.status(404).json({ message: 'Goal not found' });

    // Manager can only edit target and weightage
    const { target, weightage } = req.body;

    if (target)   goal.target   = target;
    if (weightage) {
      if (weightage < 10)
        return res.status(400).json({ message: 'Minimum weightage is 10%' });
      goal.weightage = weightage;
    }

    goalSheet.totalWeightage = goalSheet.goals.reduce((sum, g) => sum + g.weightage, 0);
    await goalSheet.save();

    res.json({ message: 'Goal updated', goalSheet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ADMIN UNLOCK GOAL SHEET ───────────────────────────────
// PUT /api/approval/:sheetId/unlock
export const unlockGoalSheet = async (req, res) => {
  try {
    const { reason } = req.body;

    const goalSheet = await GoalSheet.findById(req.params.sheetId);
    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    if (goalSheet.status !== 'approved')
      return res.status(400).json({ message: 'Only approved sheets can be unlocked' });

    // Save audit log before unlocking
    await AuditLog.create({
      goalSheetId: goalSheet._id,
      changedBy:   req.user._id,
      changeType:  'goal_unlocked',
      description: reason || 'Admin unlocked the goal sheet',
      before:      { status: goalSheet.status, lockedAt: goalSheet.lockedAt },
      after:       { status: 'submitted' }
    });

    goalSheet.status   = 'submitted';
    goalSheet.lockedAt = null;
    await goalSheet.save();

    res.json({ message: 'Goal sheet unlocked successfully', goalSheet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};