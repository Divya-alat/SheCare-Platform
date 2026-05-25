const express = require('express');
const router  = express.Router();
const {
  register, verifyOTP, resendOTP, login, getMe, updateProfile, changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public
router.post('/register',    register);
router.post('/verify-otp',  verifyOTP);
router.post('/resend-otp',  resendOTP);
router.post('/login',       login);

// Protected
router.get ('/me',              protect, getMe);
router.put ('/profile',         protect, updateProfile);
router.put ('/change-password', protect, changePassword);

module.exports = router;