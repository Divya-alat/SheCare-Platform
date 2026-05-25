const express = require('express');
const router  = express.Router();
const {
  submitAssessment, getAssessmentHistory, getLatestAssessment,
} = require('../controllers/pcosController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/assess',   submitAssessment);
router.get ('/history',  getAssessmentHistory);
router.get ('/latest',   getLatestAssessment);

module.exports = router;