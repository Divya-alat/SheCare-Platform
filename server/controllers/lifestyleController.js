const Lifestyle = require('../models/Lifestyle');

// ── Helper: strip time from date (compare by day only) ───────
const toDateOnly = (d) => {
  const date = new Date(d || Date.now());
  date.setHours(0, 0, 0, 0);
  return date;
};

// ── @POST /api/lifestyle/log ─────────────────────────────────
// Create or update today's log (upsert by user+date)
exports.upsertLog = async (req, res, next) => {
  try {
    const { sleep, water, stress, exercise, mood, journalNote, date } = req.body;
    const logDate = toDateOnly(date);

    const log = await Lifestyle.findOneAndUpdate(
      { user: req.user._id, date: logDate },
      { sleep, water, stress, exercise, mood, journalNote },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, log });
  } catch (err) { next(err); }
};

// ── @GET /api/lifestyle/today ────────────────────────────────
exports.getTodayLog = async (req, res, next) => {
  try {
    const today = toDateOnly();
    const log   = await Lifestyle.findOne({ user: req.user._id, date: today });
    res.json({ success: true, log: log || null });
  } catch (err) { next(err); }
};

// ── @GET /api/lifestyle/week ─────────────────────────────────
// Last 7 days of logs
exports.getWeekLogs = async (req, res, next) => {
  try {
    const sevenDaysAgo = toDateOnly(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const logs = await Lifestyle.find({
      user: req.user._id,
      date: { $gte: sevenDaysAgo },
    }).sort({ date: -1 });

    res.json({ success: true, logs });
  } catch (err) { next(err); }
};

// ── @GET /api/lifestyle/history ──────────────────────────────
// Paginated history
exports.getHistory = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip  = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      Lifestyle.find({ user: req.user._id }).sort({ date: -1 }).skip(skip).limit(limit),
      Lifestyle.countDocuments({ user: req.user._id }),
    ]);

    res.json({ success: true, logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// ── @GET /api/lifestyle/stats ────────────────────────────────
// Aggregated weekly averages
exports.getStats = async (req, res, next) => {
  try {
    const sevenDaysAgo = toDateOnly(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const logs = await Lifestyle.find({
      user: req.user._id,
      date: { $gte: sevenDaysAgo },
    });

    if (logs.length === 0) {
      return res.json({ success: true, stats: null, message: 'No data yet' });
    }

    const avg = (arr) => arr.length ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;

    const stats = {
      avgSleepHours:    avg(logs.map(l => l.sleep?.hours).filter(Boolean)),
      avgSleepQuality:  avg(logs.map(l => l.sleep?.quality).filter(Boolean)),
      avgWaterGlasses:  avg(logs.map(l => l.water?.glasses).filter(v => v != null)),
      avgStressLevel:   avg(logs.map(l => l.stress?.level).filter(Boolean)),
      totalExerciseMins:logs.reduce((a, l) => a + (l.exercise?.duration || 0), 0),
      activeDays:       logs.filter(l => l.exercise?.type).length,
      logsThisWeek:     logs.length,
    };

    res.json({ success: true, stats });
  } catch (err) { next(err); }
};

// ── @DELETE /api/lifestyle/log/:id ───────────────────────────
exports.deleteLog = async (req, res, next) => {
  try {
    const log = await Lifestyle.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
    res.json({ success: true, message: 'Log deleted' });
  } catch (err) { next(err); }
};