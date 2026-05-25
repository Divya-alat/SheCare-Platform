const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const User       = require('../models/User');

// ── Helper: generate JWT ─────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// ── Helper: send OTP email ───────────────────────────────────
const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.sendMail({
    from: `"SheCare 🌸" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your SheCare Verification Code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#FDF8F4;border-radius:16px;">
        <h2 style="color:#8C2E42;font-family:Georgia,serif;margin-bottom:8px;">Welcome to SheCare 🌸</h2>
        <p style="color:#7A6A65;margin-bottom:24px;">Your email verification code is:</p>
        <div style="background:#fff;border:2px solid #F2D4DA;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:2rem;font-weight:700;color:#8C2E42;">${otp}</div>
        <p style="color:#7A6A65;margin-top:20px;font-size:0.85rem;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `,
  });
};

// ── @POST /api/auth/register ─────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, age } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Generate 6-digit OTP
    const otp          = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const user = await User.create({ name, email, password, role, age, otp, otpExpiresAt });

    await sendOTPEmail(email, otp);

    res.status(201).json({
      success: true,
      message: 'Registration successful. OTP sent to your email.',
      userId: user._id,
    });
  } catch (err) { next(err); }
};

// ── @POST /api/auth/verify-otp ───────────────────────────────
exports.verifyOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId).select('+otp +otpExpiresAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Already verified' });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (user.otpExpiresAt < new Date()) return res.status(400).json({ success: false, message: 'OTP expired' });

    user.isVerified  = true;
    user.otp         = undefined;
    user.otpExpiresAt= undefined;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully!',
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) { next(err); }
};

// ── @POST /api/auth/resend-otp ───────────────────────────────
exports.resendOTP = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId).select('+otp +otpExpiresAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Already verified' });

    const otp          = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.otp           = otp;
    user.otpExpiresAt  = otpExpiresAt;
    await user.save();

    await sendOTPEmail(user.email, otp);
    res.json({ success: true, message: 'New OTP sent to your email.' });
  } catch (err) { next(err); }
};

// ── @POST /api/auth/login ────────────────────────────────────
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
    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email first', userId: user._id });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) { next(err); }
};

// ── @GET /api/auth/me ────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// ── @PUT /api/auth/profile ───────────────────────────────────
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

// ── @PUT /api/auth/change-password ──────────────────────────
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