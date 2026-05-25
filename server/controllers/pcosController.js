const axios  = require('axios');
const PCOS   = require('../models/PCOS');

// ── @POST /api/pcos/assess ───────────────────────────────────
// Submit questionnaire → call Flask ML API → save result
exports.submitAssessment = async (req, res, next) => {
  try {
    const { symptoms, age, weight, height } = req.body;

    // Calculate BMI
    const bmi = weight && height
      ? parseFloat((weight / ((height / 100) ** 2)).toFixed(1))
      : null;

    // ── Call Flask ML API ──────────────────────────────────
    let mlResult = { prediction: 0, probability: 0.2 };
    try {
      const flaskRes = await axios.post(
        `${process.env.ML_API_URL || 'http://localhost:8000'}/predict`,
        { symptoms, age, weight, height, bmi },
        { timeout: 8000 }
      );
      mlResult = flaskRes.data;
    } catch (flaskErr) {
      console.warn('⚠️ Flask ML API unreachable, using fallback scoring');
      // Fallback: count positive symptoms
      const positiveCount = Object.values(symptoms || {}).filter(Boolean).length;
      mlResult.probability = Math.min(positiveCount / 10, 0.95);
      mlResult.prediction  = mlResult.probability > 0.5 ? 1 : 0;
    }

    // ── Derive risk score & level ──────────────────────────
    const riskScore = Math.round((mlResult.probability || mlResult.riskScore || 0.2) * 100);
    const riskLevel = riskScore >= 65 ? 'high' : riskScore >= 35 ? 'moderate' : 'low';

    // ── Build personalised recommendations ────────────────
    const recommendations = buildRecommendations(symptoms, riskLevel, bmi);

    const assessment = await PCOS.create({
      user: req.user._id,
      symptoms,
      age, weight, height, bmi,
      riskScore,
      riskLevel,
      mlPrediction: mlResult.prediction,
      recommendations,
    });

    res.status(201).json({ success: true, assessment });
  } catch (err) { next(err); }
};

// ── @GET /api/pcos/history ───────────────────────────────────
exports.getAssessmentHistory = async (req, res, next) => {
  try {
    const assessments = await PCOS.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, assessments });
  } catch (err) { next(err); }
};

// ── @GET /api/pcos/latest ────────────────────────────────────
exports.getLatestAssessment = async (req, res, next) => {
  try {
    const assessment = await PCOS.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (!assessment) return res.status(404).json({ success: false, message: 'No assessments found' });
    res.json({ success: true, assessment });
  } catch (err) { next(err); }
};

// ── Helper: personalised recommendations ─────────────────────
function buildRecommendations(symptoms = {}, riskLevel, bmi) {
  const recs = [];

  if (riskLevel === 'high') {
    recs.push('Please consult a gynaecologist for a comprehensive evaluation');
    recs.push('Ask your doctor about getting an ultrasound and hormone panel done');
  }
  if (symptoms.irregularPeriods)
    recs.push('Track your cycles consistently — irregularity is a key PCOS indicator');
  if (symptoms.weightGain || (bmi && bmi > 25))
    recs.push('A low-GI diet and regular exercise can significantly help manage PCOS');
  if (symptoms.acne || symptoms.excessHairGrowth)
    recs.push('Elevated androgens may be causing these — a hormone test can confirm');
  if (symptoms.fatigue)
    recs.push('Prioritise 7–9 hrs of sleep and check your Vitamin D and iron levels');
  if (symptoms.moodSwings)
    recs.push('Stress management techniques like yoga and mindfulness help with hormonal balance');
  if (riskLevel === 'low')
    recs.push('Your risk appears low — maintain a healthy lifestyle and regular check-ups');

  recs.push('Avoid processed sugar and refined carbs which worsen insulin resistance');
  return recs.slice(0, 5);
}