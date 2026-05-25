const express = require('express');
const router  = express.Router();
const {
  logPeriod, updatePeriodLog, getPeriodHistory,
  predictNextPeriod, getPeriodInsights, deletePeriodLog,
} = require('../controllers/periodController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // all period routes are protected

router.post  ('/log',          logPeriod);
router.put   ('/log/:id',      updatePeriodLog);
router.delete('/log/:id',      deletePeriodLog);
router.get   ('/history',      getPeriodHistory);
router.get   ('/predict',      predictNextPeriod);
router.get   ('/insights',     getPeriodInsights);

module.exports = router;