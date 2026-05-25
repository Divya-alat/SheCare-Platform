const express = require('express');
const router  = express.Router();
const {
  upsertLog, getTodayLog, getWeekLogs, getHistory, getStats, deleteLog,
} = require('../controllers/lifestyleController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post  ('/log',        upsertLog);       // create or update today
router.get   ('/today',      getTodayLog);
router.get   ('/week',       getWeekLogs);
router.get   ('/history',    getHistory);
router.get   ('/stats',      getStats);
router.delete('/log/:id',    deleteLog);

module.exports = router;