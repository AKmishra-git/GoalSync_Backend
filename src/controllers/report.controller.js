import GoalSheet from '../models/goalSheet.model.js';
import User from '../models/user.model.js';

// ─── GET ACHIEVEMENT REPORT ────────────────────────────────
// GET /api/reports/achievement?year=2025
export const getAchievementReport = async (req, res) => {
  try {
    const cycleYear = parseInt(req.query.year) || new Date().getFullYear();
    const { department, status } = req.query;

    let query = { cycleYear };
    if (status) query.status = status;

    const goalSheets = await GoalSheet.find(query)
      .populate('employeeId', 'name email department managerId')
      .populate('approvedBy', 'name email');

    // Filter by department if provided
    const filtered = department
      ? goalSheets.filter((s) => s.employeeId?.department === department)
      : goalSheets;

    // Build flat report rows
    const rows = [];
    filtered.forEach((sheet) => {
      sheet.goals.forEach((goal) => {
        const q1 = goal.quarterlyData.find((q) => q.quarter === 'Q1');
        const q2 = goal.quarterlyData.find((q) => q.quarter === 'Q2');
        const q3 = goal.quarterlyData.find((q) => q.quarter === 'Q3');
        const q4 = goal.quarterlyData.find((q) => q.quarter === 'Q4');

        rows.push({
          employeeName:   sheet.employeeId?.name,
          employeeEmail:  sheet.employeeId?.email,
          department:     sheet.employeeId?.department,
          cycleYear:      sheet.cycleYear,
          sheetStatus:    sheet.status,
          goalTitle:      goal.title,
          thrustArea:     goal.thrustArea,
          uomType:        goal.uomType,
          target:         goal.target,
          weightage:      goal.weightage,
          isShared:       goal.isShared,
          q1Actual:       q1?.actualAchieved ?? null,
          q1Status:       q1?.status         ?? null,
          q1Score:        q1?.score          ?? null,
          q2Actual:       q2?.actualAchieved ?? null,
          q2Status:       q2?.status         ?? null,
          q2Score:        q2?.score          ?? null,
          q3Actual:       q3?.actualAchieved ?? null,
          q3Status:       q3?.status         ?? null,
          q3Score:        q3?.score          ?? null,
          q4Actual:       q4?.actualAchieved ?? null,
          q4Status:       q4?.status         ?? null,
          q4Score:        q4?.score          ?? null,
        });
      });
    });

    res.json({ cycleYear, totalRows: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── EXPORT AS CSV ─────────────────────────────────────────
// GET /api/reports/export?year=2025
export const exportCSV = async (req, res) => {
  try {
    const cycleYear = parseInt(req.query.year) || new Date().getFullYear();

    const goalSheets = await GoalSheet.find({ cycleYear })
      .populate('employeeId', 'name email department');

    // CSV headers
    const headers = [
      'Employee Name', 'Email', 'Department', 'Cycle Year',
      'Sheet Status', 'Goal Title', 'Thrust Area', 'UoM Type',
      'Target', 'Weightage', 'Is Shared',
      'Q1 Actual', 'Q1 Status', 'Q1 Score',
      'Q2 Actual', 'Q2 Status', 'Q2 Score',
      'Q3 Actual', 'Q3 Status', 'Q3 Score',
      'Q4 Actual', 'Q4 Status', 'Q4 Score'
    ];

    const csvRows = [headers.join(',')];

    goalSheets.forEach((sheet) => {
      sheet.goals.forEach((goal) => {
        const q1 = goal.quarterlyData.find((q) => q.quarter === 'Q1');
        const q2 = goal.quarterlyData.find((q) => q.quarter === 'Q2');
        const q3 = goal.quarterlyData.find((q) => q.quarter === 'Q3');
        const q4 = goal.quarterlyData.find((q) => q.quarter === 'Q4');

        const row = [
          sheet.employeeId?.name        || '',
          sheet.employeeId?.email       || '',
          sheet.employeeId?.department  || '',
          sheet.cycleYear,
          sheet.status,
          goal.title,
          goal.thrustArea,
          goal.uomType,
          goal.target,
          goal.weightage,
          goal.isShared,
          q1?.actualAchieved ?? '',
          q1?.status         ?? '',
          q1?.score          ?? '',
          q2?.actualAchieved ?? '',
          q2?.status         ?? '',
          q2?.score          ?? '',
          q3?.actualAchieved ?? '',
          q3?.status         ?? '',
          q3?.score          ?? '',
          q4?.actualAchieved ?? '',
          q4?.status         ?? '',
          q4?.score          ?? ''
        ];

        // Wrap values with commas in quotes
        csvRows.push(row.map((v) => `"${v}"`).join(','));
      });
    });

    const csvContent = csvRows.join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=achievement_report_${cycleYear}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── COMPLETION DASHBOARD ──────────────────────────────────
// GET /api/reports/completion?year=2025
export const getCompletionDashboard = async (req, res) => {
  try {
    const cycleYear = parseInt(req.query.year) || new Date().getFullYear();

    const employees = await User.find({ role: 'employee' });
    const managers  = await User.find({ role: 'manager' });

    const employeeStats = await Promise.all(
      employees.map(async (emp) => {
        const sheet = await GoalSheet.findOne({
          employeeId: emp._id,
          cycleYear
        });

        return {
          name:       emp.name,
          email:      emp.email,
          department: emp.department,
          status:     sheet?.status || 'not started',
          submitted:  !!sheet?.submittedAt,
          approved:   !!sheet?.approvedAt
        };
      })
    );

    const managerStats = await Promise.all(
      managers.map(async (mgr) => {
        const team        = await User.find({ managerId: mgr._id });
        const teamIds     = team.map((e) => e._id);
        const sheets      = await GoalSheet.find({ employeeId: { $in: teamIds }, cycleYear });
        const approved    = sheets.filter((s) => s.status === 'approved').length;
        const checkinDone = sheets.filter((s) =>
          s.goals.some((g) => g.quarterlyData.length > 0)
        ).length;

        return {
          name:            mgr.name,
          email:           mgr.email,
          teamSize:        team.length,
          approvedCount:   approved,
          checkinDone,
          completionRate:  team.length === 0 ? '0%' :
            `${(approved / team.length * 100).toFixed(1)}%`
        };
      })
    );

    res.json({
      cycleYear,
      employees: employeeStats,
      managers:  managerStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};