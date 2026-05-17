import goalSheetModel from '../models/goalSheet.model.js';
import cycleModel from '../models/cycle.model.js';

const validateGoals = (goals)=>{
    if(!goals || goals.length === 0){
        return "Atleast one goal is required.";
    }

    if(goals.length>8){
        return "Maximum 8 goals are allowed.";
    }

    for(const goal of goals){
        if(goal.weightage<10){
            return "weightage cannot be less than 10"
        }

    }

    const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);
    if(totalWeightage !== 100){
        return "Total weightage of all goals must be 100.";
    }

    return null;
}

export const createGoalSheet = async (req, res) => {
  try {
    const { cycleYear, goals } = req.body;

    // Check if goal sheet already exists for this employee in this cycle
    const existing = await goalSheetModel.findOne({
      employeeId: req.user._id,
      cycleYear
    });
    if (existing)
      return res.status(400).json({
        message: `You already have a goal sheet for ${cycleYear}`
      });

    // Check if cycle is active and goal setting window is open
    const cycle = await cycleModel.findOne({ year: cycleYear, isActive: true });
    if (!cycle)
      return res.status(400).json({ message: 'No active cycle found for this year' });

    const now = new Date();
    const { start, end } = cycle.goalSettingWindow;
    if (now < new Date(start) || now > new Date(end))
      return res.status(400).json({ message: 'Goal setting window is not open right now' });

    // Validate goals
    const validationError = validateGoals(goals);
    if (validationError)
      return res.status(400).json({ message: validationError });

    const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);

    const goalSheet = await goalSheetModel.create({
      employeeId: req.user._id,
      cycleYear,
      goals,
      totalWeightage,
      status: 'draft'
    });

    res.status(201).json(goalSheet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ADD A SINGLE GOAL TO EXISTING SHEET ──────────────────
// POST /api/goals/:sheetId/add-goal
export const addGoalToSheet = async (req, res) => {
  try {
    const goalSheet = await goalSheetModel.findById(req.params.sheetId);

    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    if (goalSheet.employeeId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your goal sheet' });

    if (goalSheet.status !== 'draft' && goalSheet.status !== 'rework')
      return res.status(400).json({ message: 'Cannot edit a submitted or approved goal sheet' });

    if (goalSheet.goals.length >= 8)
      return res.status(400).json({ message: 'Maximum 8 goals allowed' });

    const { title, description, thrustArea, uomType, target, weightage } = req.body;

    if (weightage < 10)
      return res.status(400).json({ message: 'Minimum weightage per goal is 10%' });

    goalSheet.goals.push({ title, description, thrustArea, uomType, target, weightage });

    // Recalculate total weightage
    goalSheet.totalWeightage = goalSheet.goals.reduce((sum, g) => sum + g.weightage, 0);

    await goalSheet.save();
    res.json(goalSheet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── UPDATE A GOAL IN SHEET ────────────────────────────────
// PUT /api/goals/:sheetId/goal/:goalId
export const updateGoal = async (req, res) => {
  try {
    const goalSheet = await goalSheetModel.findById(req.params.sheetId);

    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    if (goalSheet.employeeId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your goal sheet' });

    if (goalSheet.status !== 'draft' && goalSheet.status !== 'rework')
      return res.status(400).json({ message: 'Cannot edit a submitted or approved goal sheet' });

    const goal = goalSheet.goals.id(req.params.goalId);
    if (!goal)
      return res.status(404).json({ message: 'Goal not found' });

    // Shared goals: only weightage can be changed
    if (goal.isShared) {
      if (req.body.weightage) {
        if (req.body.weightage < 10)
          return res.status(400).json({ message: 'Minimum weightage is 10%' });
        goal.weightage = req.body.weightage;
      } else {
        return res.status(403).json({
          message: 'Shared goals: only weightage can be modified'
        });
      }
    } else {
      const { title, description, thrustArea, uomType, target, weightage } = req.body;
      if (title)       goal.title       = title;
      if (description) goal.description = description;
      if (thrustArea)  goal.thrustArea  = thrustArea;
      if (uomType)     goal.uomType     = uomType;
      if (target)      goal.target      = target;
      if (weightage) {
        if (weightage < 10)
          return res.status(400).json({ message: 'Minimum weightage is 10%' });
        goal.weightage = weightage;
      }
    }

    goalSheet.totalWeightage = goalSheet.goals.reduce((sum, g) => sum + g.weightage, 0);
    await goalSheet.save();
    res.json(goalSheet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE A GOAL FROM SHEET ──────────────────────────────
// DELETE /api/goals/:sheetId/goal/:goalId
export const deleteGoal = async (req, res) => {
  try {
    const goalSheet = await goalSheetModel.findById(req.params.sheetId);

    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    if (goalSheet.employeeId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your goal sheet' });

    if (goalSheet.status !== 'draft' && goalSheet.status !== 'rework')
      return res.status(400).json({ message: 'Cannot edit a submitted or approved goal sheet' });

    goalSheet.goals = goalSheet.goals.filter(
      (g) => g._id.toString() !== req.params.goalId
    );

    goalSheet.totalWeightage = goalSheet.goals.reduce((sum, g) => sum + g.weightage, 0);
    await goalSheet.save();
    res.json(goalSheet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── SUBMIT GOAL SHEET ─────────────────────────────────────
// PUT /api/goals/:sheetId/submit
export const submitGoalSheet = async (req, res) => {
  try {
    const goalSheet = await goalSheetModel.findById(req.params.sheetId);

    if (!goalSheet)
      return res.status(404).json({ message: 'Goal sheet not found' });

    if (goalSheet.employeeId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your goal sheet' });

    if (goalSheet.status === 'submitted' || goalSheet.status === 'approved')
      return res.status(400).json({ message: `Goal sheet is already ${goalSheet.status}` });

    // Final validation before submit
    const validationError = validateGoals(goalSheet.goals);
    if (validationError)
      return res.status(400).json({ message: validationError });

    goalSheet.status      = 'submitted';
    goalSheet.submittedAt = new Date();
    await goalSheet.save();

    res.json({ message: 'Goal sheet submitted successfully', goalSheet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET MY GOAL SHEET ─────────────────────────────────────
// GET /api/goals/my?year=2025
export const getMyGoalSheet = async (
  req,
  res
) => {

  try {

    const cycleYear =
      parseInt(req.query.year) ||
      new Date().getFullYear();

    let goalSheet =
      await goalSheetModel.findOne({

        employeeId: req.user._id,

        cycleYear
      });

    // AUTO CREATE GOAL SHEET
    if (!goalSheet) {

      goalSheet =
        await goalSheetModel.create({

          employeeId: req.user._id,

          cycleYear,

          goals: [],

          status: 'draft'
        });
    }

    res.json(goalSheet);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });
  }
};