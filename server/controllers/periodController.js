const Period = require('../models/Period');

// ── @POST /api/period/log ────────────────────────────────────
// Log a new period start
exports.logPeriod = async (req, res, next) => {
  try {
    const { startDate, flowLevel, mood, symptoms, notes } = req.body;

    // Get previous period to calculate cycle length
    const lastPeriod = await Period.findOne({ user: req.user._id })
      .sort({ startDate: -1 });

    let cycleLength;
    if (lastPeriod) {
      const msInDay   = 1000 * 60 * 60 * 24;
      cycleLength = Math.round((new Date(startDate) - new Date(lastPeriod.startDate)) / msInDay);
    }

    const period = await Period.create({
      user: req.user._id,
      startDate,
      flowLevel,
      mood,
      symptoms,
      notes,
      cycleLength,
    });

    res.status(201).json({ success: true, period });
  } catch (err) { next(err); }
};

// ── @PUT /api/period/log/:id ─────────────────────────────────
// Update an existing log (add endDate, update symptoms, etc.)
exports.updatePeriodLog = async (req, res, next) => {
  try {
    const { endDate, flowLevel, mood, symptoms, notes } = req.body;

    const period = await Period.findOne({ _id: req.params.id, user: req.user._id });
    if (!period) return res.status(404).json({ success: false, message: 'Period log not found' });

    if (endDate) {
      const msInDay      = 1000 * 60 * 60 * 24;
      period.endDate     = endDate;
      period.periodLength= Math.round((new Date(endDate) - new Date(period.startDate)) / msInDay);
    }
    if (flowLevel) period.flowLevel = flowLevel;
    if (mood)      period.mood      = mood;
    if (symptoms)  period.symptoms  = symptoms;
    if (notes !== undefined) period.notes = notes;

    await period.save();
    res.json({ success: true, period });
  } catch (err) { next(err); }
};

// ── @GET /api/period/history ─────────────────────────────────
// Get all period logs for a user (last 12)
exports.getPeriodHistory = async (req, res, next) => {
  try {
    const limit  = parseInt(req.query.limit) || 12;
    const periods = await Period.find({ user: req.user._id })
      .sort({ startDate: -1 })
      .limit(limit);

    res.json({ success: true, count: periods.length, periods });
  } catch (err) { next(err); }
};

// ── @GET /api/period/predict ─────────────────────────────────
// Predict next period & fertile window based on last 3 cycles
exports.predictNextPeriod = async (req, res, next) => {
  try {
    const recentPeriods = await Period.find({ user: req.user._id })
      .sort({ startDate: -1 })
      .limit(4);

    if (recentPeriods.length < 1) {
      return res.status(400).json({ success: false, message: 'Log at least one period to get predictions' });
    }

    // Average cycle length from available data (default 28)
    let avgCycleLength = 28;
    if (recentPeriods.length >= 2) {
      const cycleLengths = recentPeriods
        .slice(0, -1)
        .map(p => p.cycleLength)
        .filter(Boolean);
      if (cycleLengths.length > 0) {
        avgCycleLength = Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length);
      }
    }

    // Average period length (default 5)
    const periodLengths = recentPeriods.map(p => p.periodLength).filter(Boolean);
    const avgPeriodLength = periodLengths.length > 0
      ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
      : 5;

    const lastStart = new Date(recentPeriods[0].startDate);

    // Next period
    const nextPeriodStart = new Date(lastStart);
    nextPeriodStart.setDate(nextPeriodStart.getDate() + avgCycleLength);

    const nextPeriodEnd = new Date(nextPeriodStart);
    nextPeriodEnd.setDate(nextPeriodEnd.getDate() + avgPeriodLength - 1);

    // Ovulation day (14 days before next period)
    const ovulationDay = new Date(nextPeriodStart);
    ovulationDay.setDate(ovulationDay.getDate() - 14);

    // Fertile window: 5 days before ovulation + ovulation day
    const fertileStart = new Date(ovulationDay);
    fertileStart.setDate(fertileStart.getDate() - 5);
    const fertileEnd = new Date(ovulationDay);
    fertileEnd.setDate(fertileEnd.getDate() + 1);

    // Current cycle day
    const today          = new Date();
    const msInDay        = 1000 * 60 * 60 * 24;
    const currentCycleDay= Math.max(1, Math.round((today - lastStart) / msInDay) + 1);

    res.json({
      success: true,
      predictions: {
        avgCycleLength,
        avgPeriodLength,
        currentCycleDay,
        nextPeriodStart,
        nextPeriodEnd,
        ovulationDay,
        fertileWindow: { start: fertileStart, end: fertileEnd },
      },
    });
  } catch (err) { next(err); }
};

// ── @GET /api/period/insights ────────────────────────────────
// Symptom frequencies across all logs
exports.getPeriodInsights = async (req, res, next) => {
  try {
    const periods = await Period.find({ user: req.user._id });

    const symptomCount = {};
    const moodCount    = {};

    periods.forEach(p => {
      p.symptoms.forEach(s => { symptomCount[s] = (symptomCount[s] || 0) + 1; });
      if (p.mood) moodCount[p.mood] = (moodCount[p.mood] || 0) + 1;
    });

    const topSymptoms = Object.entries(symptomCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / periods.length) * 100) }));

    res.json({ success: true, insights: { totalLogs: periods.length, topSymptoms, moodCount } });
  } catch (err) { next(err); }
};

// ── @DELETE /api/period/log/:id ──────────────────────────────
exports.deletePeriodLog = async (req, res, next) => {
  try {
    const period = await Period.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!period) return res.status(404).json({ success: false, message: 'Log not found' });
    res.json({ success: true, message: 'Period log deleted' });
  } catch (err) { next(err); }
};