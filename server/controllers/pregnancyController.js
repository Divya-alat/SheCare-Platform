const Pregnancy = require('../models/Pregnancy');

// ── @POST /api/pregnancy/start ───────────────────────────────
exports.startPregnancy = async (req, res, next) => {
  try {
    const { lmpDate } = req.body;

    // Deactivate any existing active pregnancy
    await Pregnancy.updateMany({ user: req.user._id, isActive: true }, { isActive: false });

    const lmp     = new Date(lmpDate);
    const dueDate = new Date(lmp);
    dueDate.setDate(dueDate.getDate() + 280); // Naegele's rule

    const msInDay     = 1000 * 60 * 60 * 24;
    const currentWeek = Math.min(42, Math.max(1, Math.ceil((Date.now() - lmp) / (msInDay * 7))));

    const pregnancy = await Pregnancy.create({
      user: req.user._id,
      lmpDate: lmp,
      dueDate,
      currentWeek,
      isActive: true,
    });

    res.status(201).json({ success: true, pregnancy });
  } catch (err) { next(err); }
};

// ── @GET /api/pregnancy/active ───────────────────────────────
exports.getActivePregnancy = async (req, res, next) => {
  try {
    const pregnancy = await Pregnancy.findOne({ user: req.user._id, isActive: true });
    if (!pregnancy) return res.status(404).json({ success: false, message: 'No active pregnancy found' });

    // Recalculate current week dynamically
    const msInDay     = 1000 * 60 * 60 * 24;
    const currentWeek = Math.min(42, Math.max(1, Math.ceil((Date.now() - pregnancy.lmpDate) / (msInDay * 7))));
    pregnancy.currentWeek = currentWeek;
    await pregnancy.save();

    const daysUntilDue = Math.ceil((pregnancy.dueDate - Date.now()) / msInDay);

    res.json({ success: true, pregnancy, daysUntilDue });
  } catch (err) { next(err); }
};

// ── @POST /api/pregnancy/log-week ────────────────────────────
// Add a weekly log entry
exports.logWeek = async (req, res, next) => {
  try {
    const { week, weight, symptoms, mood, notes, babyKicks } = req.body;

    const pregnancy = await Pregnancy.findOne({ user: req.user._id, isActive: true });
    if (!pregnancy) return res.status(404).json({ success: false, message: 'No active pregnancy' });

    // Remove existing log for this week if any
    pregnancy.weekLogs = pregnancy.weekLogs.filter(l => l.week !== week);
    pregnancy.weekLogs.push({ week, weight, symptoms, mood, notes, babyKicks });
    await pregnancy.save();

    res.json({ success: true, pregnancy });
  } catch (err) { next(err); }
};

// ── @POST /api/pregnancy/milestone ───────────────────────────
exports.addMilestone = async (req, res, next) => {
  try {
    const { week, title } = req.body;

    const pregnancy = await Pregnancy.findOne({ user: req.user._id, isActive: true });
    if (!pregnancy) return res.status(404).json({ success: false, message: 'No active pregnancy' });

    pregnancy.milestones.push({ week, title, achievedOn: new Date() });
    await pregnancy.save();

    res.json({ success: true, milestones: pregnancy.milestones });
  } catch (err) { next(err); }
};

// ── @GET /api/pregnancy/history ──────────────────────────────
exports.getPregnancyHistory = async (req, res, next) => {
  try {
    const pregnancies = await Pregnancy.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, pregnancies });
  } catch (err) { next(err); }
};