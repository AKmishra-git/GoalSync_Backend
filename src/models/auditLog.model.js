import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  goalSheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GoalSheet',
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changeType: {
    type: String,
    enum: ['goal_unlocked', 'goal_edited', 'goal_added', 'goal_deleted', 'status_changed'],
    required: true
  },
  description: {
    type: String,   // human-readable e.g. "Target changed from 100 to 120"
    default: ''
  },
  before: { type: mongoose.Schema.Types.Mixed, default: null },  // snapshot before change
  after:  { type: mongoose.Schema.Types.Mixed, default: null }   // snapshot after change

}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);