const mongoose = require('mongoose');

const PregnancySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  lmpDate:       { type: Date },   // Last menstrual period date
  dueDate:       { type: Date },   // Calculated: lmpDate + 280 days
  currentWeek:   { type: Number, min: 1, max: 42 },
  isActive:      { type: Boolean, default: true },

  // Weekly log entries
  weekLogs: [{
    week:    { type: Number, required: true },
    logDate: { type: Date, default: Date.now },
    weight:  { type: Number },   // kg
    symptoms: [{
      type: String,
      enum: [
        'nausea', 'vomiting', 'fatigue', 'heartburn', 'back_pain',
        'swelling', 'headache', 'mood_swings', 'insomnia', 'frequent_urination',
        'breast_tenderness', 'food_cravings', 'constipation', 'shortness_of_breath',
      ],
    }],
    mood:     { type: String },
    notes:    { type: String, maxlength: 500 },
    babyKicks:{ type: Number, default: 0 }, // count per day
  }],

  // Milestone tracking
  milestones: [{
    week:        { type: Number },
    title:       { type: String },
    achievedOn:  { type: Date },
    shared:      { type: Boolean, default: false },
  }],
}, { timestamps: true });

PregnancySchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('Pregnancy', PregnancySchema);