const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User       = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// @POST /api/auth/register — no OTP, direct signup
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, age } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({
      name, email, password, role, age,
      isVerified: true,
    });
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) { next(err); }
};

// @POST /api/auth/verify-otp — kept for compatibility
exports.verifyOTP = async (req, res, next) => {
  res.json({ success: true, message: 'Auto verified' });
};

// @POST /api/auth/resend-otp — kept for compatibility
exports.resendOTP = async (req, res, next) => {
  res.json({ success: true, message: 'Auto verified' });
};

// @POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) { next(err); }
};

// @POST /api/auth/google
exports.googleAuth = async (req, res, next) => {
  try {
    const { name, email, googleId, avatar } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }
    let user = await User.findOne({ email });
    let needsRole = false;
    if (!user) {
      user = await User.create({
        name, email,
        googleId,
        avatar,
        isVerified: true,
        password:   googleId + process.env.JWT_SECRET,
        role:       'student',
      });
      needsRole = true;
    } else {
      user.googleId  = googleId;
      user.isVerified= true;
      await user.save();
    }
    const token = generateToken(user._id);
    res.json({
      success: true, token, needsRole,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) { next(err); }
};

// @GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// @PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, age, role, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, age, role, avatar },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// @PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) { next(err); }
};