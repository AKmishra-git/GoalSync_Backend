import GoalSheet from '../models/goalSheet.model.js';
import { calculateScore } from '../utils/scoreCalculator.js';

// ─── EMPLOYEE LOGS QUARTERLY ACHIEVEMENT ──────────────────
// PUT /api/checkin/:sheetId/quarter/:quarter
export const logAchievement = async (req, res) => {
  try {
    const { quarter } = req.params;
    const { goalId, actualAchieved, status, completionDate } = req.body;

    const validQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    if (!validQuarters.includes(quarter))
      return res.status(400).json({ message: 'Invalid quarter. Use Q1, Q2, Q3 or Q4' });

    const goalSheet = await GoalSheet.findById(req.params.sheetId);
    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    if (goalSheet.employeeId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your goal sheet' });

    if (goalSheet.status !== 'approved')
      return res.status(400).json({ message: 'Goal sheet must be approved before logging achievements' });

    const goal = goalSheet.goals.id(goalId);
    if (!goal)
      return res.status(404).json({ message: 'Goal not found' });

    // Calculate score based on UoM type
    const score = calculateScore(
      goal.uomType,
      goal.target,
      actualAchieved,
      goal.target,       // deadline for timeline type
      completionDate
    );

    // Check if quarter entry already exists
    const existingEntry = goal.quarterlyData.find((q) => q.quarter === quarter);

    if (existingEntry) {
      existingEntry.actualAchieved = actualAchieved;
      existingEntry.status         = status;
      existingEntry.score          = score;
      existingEntry.updatedAt      = new Date();
    } else {
      goal.quarterlyData.push({
        quarter,
        actualAchieved,
        status,
        score,
        updatedAt: new Date()
      });
    }

    await goalSheet.save();

    res.json({
      message:  `Achievement logged for ${quarter}`,
      quarter,
      actualAchieved,
      status,
      score:    score ? `${score.toFixed(1)}%` : null,
      goalSheet
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── MANAGER ADDS CHECK-IN COMMENT ────────────────────────
// PUT /api/checkin/:sheetId/quarter/:quarter/comment
export const addManagerComment = async (req, res) => {
  try {
    const { quarter } = req.params;
    const { goalId, comment } = req.body;

    const goalSheet = await GoalSheet.findById(req.params.sheetId)
      .populate('employeeId', 'name email managerId');

    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    if (goalSheet.employeeId.managerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'This employee is not in your team' });

    const goal = goalSheet.goals.id(goalId);
    if (!goal)
      return res.status(404).json({ message: 'Goal not found' });

    const qEntry = goal.quarterlyData.find((q) => q.quarter === quarter);
    if (!qEntry)
      return res.status(404).json({
        message: `No achievement logged for ${quarter} yet`
      });

    qEntry.managerComment = comment;
    await goalSheet.save();

    res.json({
      message: `Check-in comment added for ${quarter}`,
      quarter,
      comment,
      goalSheet
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET GOAL SHEET WITH ALL QUARTERLY DATA ────────────────
// GET /api/checkin/:sheetId
export const getCheckinData = async (req, res) => {
  try {
    const goalSheet = await GoalSheet.findById(req.params.sheetId)
      .populate('employeeId', 'name email department');

    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    // Build summary
    const summary = goalSheet.goals.map((goal) => ({
      goalId:    goal._id,
      title:     goal.title,
      thrustArea: goal.thrustArea,
      uomType:   goal.uomType,
      target:    goal.target,
      weightage: goal.weightage,
      quarters:  goal.quarterlyData.map((q) => ({
        quarter:        q.quarter,
        actualAchieved: q.actualAchieved,
        status:         q.status,
        score:          q.score ? `${q.score.toFixed(1)}%` : null,
        managerComment: q.managerComment
      }))
    }));

    res.json({
      employee:   goalSheet.employeeId,
      cycleYear:  goalSheet.cycleYear,
      status:     goalSheet.status,
      goals:      summary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET TEAM CHECK-IN OVERVIEW (manager) ─────────────────
// GET /api/checkin/team?year=2025
export const getTeamCheckinOverview = async (req, res) => {
  try {
    const cycleYear = parseInt(req.query.year) || new Date().getFullYear();

    const goalSheets = await GoalSheet.find({ cycleYear })
      .populate('employeeId', 'name email department managerId');

    // Filter only this manager's team
    const teamSheets = goalSheets.filter(
      (sheet) =>
        sheet.employeeId?.managerId?.toString() === req.user._id.toString()
    );

    const overview = teamSheets.map((sheet) => ({
      employee:    sheet.employeeId,
      goalSheetId: sheet._id,
      status:      sheet.status,
      goals: sheet.goals.map((goal) => ({
        title:     goal.title,
        target:    goal.target,
        weightage: goal.weightage,
        quarters:  goal.quarterlyData
      }))
    }));

    res.json(overview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};