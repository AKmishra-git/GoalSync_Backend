import GoalSheet from '../models/goalSheet.model.js';
import User from '../models/user.model.js';

// ─── PUSH SHARED GOAL TO MULTIPLE EMPLOYEES ────────────────
// POST /api/shared-goals/push
export const pushSharedGoal = async (req, res) => {
  try {
    const {
      employeeIds,
      cycleYear,
      title,
      description,
      thrustArea,
      uomType,
      target,
      weightage
    } = req.body;

    if (!employeeIds || employeeIds.length === 0)
      return res.status(400).json({ message: 'No employees selected' });

    if (weightage < 10)
      return res.status(400).json({ message: 'Minimum weightage is 10%' });

    const results = [];
    const errors  = [];

    for (const employeeId of employeeIds) {
      try {
        // Find employee's goal sheet for this cycle
        let goalSheet = await GoalSheet.findOne({ employeeId, cycleYear });

        if (!goalSheet) {
          errors.push({ employeeId, reason: 'No goal sheet found for this cycle' });
          continue;
        }

        if (goalSheet.status === 'approved') {
          errors.push({ employeeId, reason: 'Goal sheet is already approved and locked' });
          continue;
        }

        if (goalSheet.goals.length >= 8) {
          errors.push({ employeeId, reason: 'Goal sheet already has maximum 8 goals' });
          continue;
        }

        // Push shared goal
        goalSheet.goals.push({
          title,
          description,
          thrustArea,
          uomType,
          target,
          weightage,
          isShared:       true,
          primaryOwnerId: req.user._id
        });

        goalSheet.totalWeightage = goalSheet.goals.reduce((sum, g) => sum + g.weightage, 0);
        await goalSheet.save();

        results.push({ employeeId, goalSheetId: goalSheet._id });
      } catch (err) {
        errors.push({ employeeId, reason: err.message });
      }
    }

    res.status(201).json({
      message: `Shared goal pushed to ${results.length} employees`,
      success: results,
      failed:  errors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET ALL SHARED GOALS PUSHED BY THIS USER ──────────────
// GET /api/shared-goals/pushed
export const getPushedSharedGoals = async (req, res) => {
  try {
    const cycleYear = parseInt(req.query.year) || new Date().getFullYear();

    const goalSheets = await GoalSheet.find({ cycleYear })
      .populate('employeeId', 'name email department');

    // Filter sheets that have shared goals pushed by this user
    const result = goalSheets
      .map((sheet) => ({
        employee:    sheet.employeeId,
        goalSheetId: sheet._id,
        sharedGoals: sheet.goals.filter(
          (g) => g.isShared && g.primaryOwnerId?.toString() === req.user._id.toString()
        )
      }))
      .filter((item) => item.sharedGoals.length > 0);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── UPDATE ACHIEVEMENT ON SHARED GOAL (primary owner) ─────
// PUT /api/shared-goals/:sheetId/goal/:goalId/achievement
// When primary owner updates actual, it syncs across all linked sheets
export const updateSharedGoalAchievement = async (req, res) => {
  try {
    const { quarter, actualAchieved, status } = req.body;

    // Find the primary owner's sheet
    const primarySheet = await GoalSheet.findById(req.params.sheetId);
    if (!primarySheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    const primaryGoal = primarySheet.goals.id(req.params.goalId);
    if (!primaryGoal)
      return res.status(404).json({ message: 'Goal not found' });

    if (!primaryGoal.isShared)
      return res.status(400).json({ message: 'This is not a shared goal' });

    if (primaryGoal.primaryOwnerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the primary owner can update achievement' });

    // Update in primary sheet
    const qData = primaryGoal.quarterlyData.find((q) => q.quarter === quarter);
    if (qData) {
      qData.actualAchieved = actualAchieved;
      qData.status         = status;
      qData.updatedAt      = new Date();
    } else {
      primaryGoal.quarterlyData.push({ quarter, actualAchieved, status });
    }
    await primarySheet.save();

    // Sync to all other sheets that have this shared goal
    const allSheets = await GoalSheet.find({
      'goals.isShared':       true,
      'goals.primaryOwnerId': primaryGoal.primaryOwnerId
    });

    for (const sheet of allSheets) {
      if (sheet._id.toString() === primarySheet._id.toString()) continue;

      for (const goal of sheet.goals) {
        if (
          goal.isShared &&
          goal.primaryOwnerId?.toString() === primaryGoal.primaryOwnerId.toString() &&
          goal.title === primaryGoal.title
        ) {
          const qEntry = goal.quarterlyData.find((q) => q.quarter === quarter);
          if (qEntry) {
            qEntry.actualAchieved = actualAchieved;
            qEntry.status         = status;
            qEntry.updatedAt      = new Date();
          } else {
            goal.quarterlyData.push({ quarter, actualAchieved, status });
          }
        }
      }
      await sheet.save();
    }

    res.json({ message: 'Achievement synced across all linked goal sheets' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};