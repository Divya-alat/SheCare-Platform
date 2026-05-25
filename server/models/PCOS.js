const mongoose = require('mongoose');

const PCOSSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Questionnaire answers (match Flask ML model features)
  symptoms: {
    irregularPeriods:    { type: Boolean, default: false },
    weightGain:          { type: Boolean, default: false },
    hairLoss:            { type: Boolean, default: false },
    excessHairGrowth:    { type: Boolean, default: false },
    acne:                { type: Boolean, default: false },
    fatigue:             { type: Boolean, default: false },
    moodSwings:          { type: Boolean, default: false },
    darkSkinPatches:     { type: Boolean, default: false },
    pelvicPain:          { type: Boolean, default: false },
    difficultyConceiving:{ type: Boolean, default: false },
  },

  // Physical metrics
  age:    { type: Number },
  weight: { type: Number }, // kg
  height: { type: Number }, // cm
  bmi:    { type: Number },

  // ML result from Flask API
  riskScore:    { type: Number, min: 0, max: 100 }, // 0-100
  riskLevel:    { type: String, enum: ['low', 'moderate', 'high'] },
  mlPrediction: { type: Number }, // raw model output (0 or 1)

  recommendations: [{ type: String }],
}, { timestamps: true });

PCOSSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('PCOS', PCOSSchema);