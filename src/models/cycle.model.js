import mongoose from 'mongoose';

const cycleSchema = new mongoose.Schema({
  year:     { type: Number, required: true, unique: true },
  isActive: { type: Boolean, default: true },

  // Each window has an open and close date
  goalSettingWindow: {
    start: { type: Date },
    end:   { type: Date }
  },
  q1Window: {
    start: { type: Date },
    end:   { type: Date }
  },
  q2Window: {
    start: { type: Date },
    end:   { type: Date }
  },
  q3Window: {
    start: { type: Date },
    end:   { type: Date }
  },
  q4Window: {
    start: { type: Date },
    end:   { type: Date }
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true });

export default mongoose.model('Cycle', cycleSchema);