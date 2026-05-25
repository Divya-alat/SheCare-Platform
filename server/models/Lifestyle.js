const mongoose = require('mongoose');

const LifestyleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  date: { type: Date, required: true },

  sleep: {
    hours:   { type: Number, min: 0, max: 12 },
    quality: { type: Number, min: 1, max: 5 },  // 1=Poor, 5=Amazing
  },

  water: {
    glasses: { type: Number, min: 0, max: 20, default: 0 },
  },

  stress: {
    level:   { type: Number, min: 1, max: 10 },
    factors: [{ type: String }],
  },

  exercise: {
    type:     { type: String },     // e.g. 'Yoga', 'Running'
    duration: { type: Number },     // minutes
  },

  mood: {
    type: String,
    enum: ['great', 'good', 'okay', 'low', 'stressed'],
  },

  journalNote: { type: String, maxlength: 1000 },
}, { timestamps: true });

// One log per user per day
LifestyleSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Lifestyle', LifestyleSchema);