const express = require('express');
const router  = express.Router();
const {
  startPregnancy, getActivePregnancy, logWeek, addMilestone, getPregnancyHistory,
} = require('../controllers/pregnancyController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/start',    startPregnancy);
router.get ('/active',   getActivePregnancy);
router.post('/log-week', logWeek);
router.post('/milestone',addMilestone);
router.get ('/history',  getPregnancyHistory);

module.exports = router;