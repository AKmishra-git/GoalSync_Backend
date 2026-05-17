import GoalSheet from '../models/goalSheet.model.js';
import User from '../models/user.model.js';
import Cycle from '../models/cycle.model.js';
import AuditLog from '../models/auditLog.model.js';

// ─── GET DASHBOARD STATS ───────────────────────────────────
// GET /api/admin/dashboard?year=2025
export const getDashboard = async (req, res) => {
  try {
    const cycleYear = parseInt(req.query.year) || new Date().getFullYear();

    const totalEmployees  = await User.countDocuments({ role: 'employee' });
    const totalManagers   = await User.countDocuments({ role: 'manager' });
    const totalGoalSheets = await GoalSheet.countDocuments({ cycleYear });

    const statusCounts = await GoalSheet.aggregate([
      { $match: { cycleYear } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusMap = {};
    statusCounts.forEach((s) => { statusMap[s._id] = s.count; });

    res.json({
      cycleYear,
      totalEmployees,
      totalManagers,
      totalGoalSheets,
      draft:     statusMap.draft     || 0,
      submitted: statusMap.submitted || 0,
      approved:  statusMap.approved  || 0,
      rework:    statusMap.rework    || 0,
      completionRate: totalEmployees === 0 ? 0 :
        `${((statusMap.approved || 0) / totalEmployees * 100).toFixed(1)}%`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET ALL GOAL SHEETS ───────────────────────────────────
// GET /api/admin/goal-sheets?year=2025
export const getAllGoalSheets = async (req, res) => {
  try {
    const cycleYear = parseInt(req.query.year) || new Date().getFullYear();
    const { status, department } = req.query;

    let query = { cycleYear };
    if (status) query.status = status;

    const goalSheets = await GoalSheet.find(query)
      .populate('employeeId', 'name email department managerId')
      .populate('approvedBy', 'name email');

    // Filter by department if provided
    const filtered = department
      ? goalSheets.filter((s) => s.employeeId?.department === department)
      : goalSheets;

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── CREATE CYCLE ──────────────────────────────────────────
// POST /api/admin/cycle
export const createCycle = async (req, res) => {
  try {
    const { year, goalSettingWindow, q1Window, q2Window, q3Window, q4Window } = req.body;

    const existing = await Cycle.findOne({ year });
    if (existing)
      return res.status(400).json({ message: `Cycle for ${year} already exists` });

    const cycle = await Cycle.create({
      year,
      goalSettingWindow,
      q1Window,
      q2Window,
      q3Window,
      q4Window,
      createdBy: req.user._id
    });

    res.status(201).json(cycle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── UPDATE CYCLE ──────────────────────────────────────────
// PUT /api/admin/cycle/:year
export const updateCycle = async (req, res) => {
  try {
    const cycle = await Cycle.findOne({ year: parseInt(req.params.year) });
    if (!cycle)
      return res.status(404).json({ message: 'Cycle not found' });

    const { goalSettingWindow, q1Window, q2Window, q3Window, q4Window, isActive } = req.body;

    if (goalSettingWindow) cycle.goalSettingWindow = goalSettingWindow;
    if (q1Window)          cycle.q1Window          = q1Window;
    if (q2Window)          cycle.q2Window          = q2Window;
    if (q3Window)          cycle.q3Window          = q3Window;
    if (q4Window)          cycle.q4Window          = q4Window;
    if (isActive !== undefined) cycle.isActive     = isActive;

    await cycle.save();
    res.json(cycle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET CYCLE ─────────────────────────────────────────────
// GET /api/admin/cycle/:year
export const getCycle = async (req, res) => {
  try {
    const cycle = await Cycle.findOne({ year: parseInt(req.params.year) });
    if (!cycle)
      return res.status(404).json({ message: 'Cycle not found' });

    res.json(cycle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET AUDIT LOGS ────────────────────────────────────────
// GET /api/admin/audit?sheetId=xxx
export const getAuditLogs = async (req, res) => {
  try {
    const { sheetId } = req.query;

    const query = sheetId ? { goalSheetId: sheetId } : {};

    const logs = await AuditLog.find(query)
      .populate('changedBy', 'name email role')
      .populate('goalSheetId')
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET COMPLETION STATS PER MANAGER ─────────────────────
// GET /api/admin/manager-stats?year=2025
export const getManagerStats = async (req, res) => {
  try {
    const cycleYear = parseInt(req.query.year) || new Date().getFullYear();

    const managers = await User.find({ role: 'manager' });

    const stats = await Promise.all(
      managers.map(async (manager) => {
        const teamMembers = await User.find({ managerId: manager._id });
        const teamIds     = teamMembers.map((e) => e._id);

        const sheets = await GoalSheet.find({
          employeeId: { $in: teamIds },
          cycleYear
        });

        const approved  = sheets.filter((s) => s.status === 'approved').length;
        const submitted = sheets.filter((s) => s.status === 'submitted').length;
        const draft     = sheets.filter((s) => s.status === 'draft').length;
        const rework    = sheets.filter((s) => s.status === 'rework').length;

        return {
          manager:        { id: manager._id, name: manager.name, email: manager.email },
          teamSize:       teamMembers.length,
          totalSheets:    sheets.length,
          approved,
          submitted,
          draft,
          rework,
          completionRate: teamMembers.length === 0 ? '0%' :
            `${(approved / teamMembers.length * 100).toFixed(1)}%`
        };
      })
    );

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};