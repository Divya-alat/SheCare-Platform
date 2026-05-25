const mongoose = require('mongoose');

const PeriodSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  startDate: { type: Date, required: true },
  endDate:   { type: Date },

  flowLevel: {
    type: String, enum: ['spotting', 'light', 'medium', 'heavy', 'very_heavy'],
  },
  mood: {
    type: String,
    enum: ['happy', 'sad', 'irritable', 'anxious', 'calm', 'tired', 'energetic'],
  },
  symptoms: [{
    type: String,
    enum: [
      'cramps', 'bloating', 'headache', 'backache', 'breast_tenderness',
      'nausea', 'fatigue', 'acne', 'mood_swings', 'insomnia', 'food_cravings', 'dizziness',
    ],
  }],
  notes: { type: String, maxlength: 500 },

  // Calculated fields (populated by backend)
  cycleLength:   { type: Number }, // days since last period start
  periodLength:  { type: Number }, // endDate - startDate
}, { timestamps: true });

// Index for fast user queries sorted by date
PeriodSchema.index({ user: 1, startDate: -1 });

module.exports = mongoose.model('Period', PeriodSchema);