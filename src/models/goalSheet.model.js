import mongoose from 'mongoose';
import goalSchema from './goal.model.js';

const goalSheetSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cycleYear: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rework'],
    default: 'draft'
  },

  goals: [goalSchema],

  totalWeightage: {
    type: Number,
    default: 0
  },

  // Timestamps for workflow stages
  submittedAt: { type: Date, default: null },
  approvedAt:  { type: Date, default: null },
  lockedAt:    { type: Date, default: null },

  // Manager who approved
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }

}, { timestamps: true });

export default mongoose.model('GoalSheet', goalSheetSchema);