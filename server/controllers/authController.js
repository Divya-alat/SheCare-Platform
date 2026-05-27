const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User       = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const sendOTPEmail = async (email, otp) => {
  // ── Debug logs — shows in Render logs ──────────────────
  console.log('📧 Attempting to send OTP email...');
  console.log('   To:', email);
  console.log('   EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('   EMAIL_USER:', process.env.EMAIL_USER);
  console.log('   EMAIL_PASS set:', !!process.env.EMAIL_PASS);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
  } catch (verifyErr) {
    console.log('❌ SMTP verify failed:', verifyErr.message);
    throw verifyErr;
  }

  await transporter.sendMail({
    from: `"SheCare 🌸" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your SheCare Verification Code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#FDF8F4;border-radius:16px;">
        <h2 style="color:#8C2E42;font-family:Georgia,serif;margin-bottom:8px;">Welcome to SheCare 🌸</h2>
        <p style="color:#7A6A65;margin-bottom:24px;">Your email verification code is:</p>
        <div style="background:#fff;border:2px solid #F2D4DA;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:2rem;font-weight:700;color:#8C2E42;">${otp}</div>
        <p style="color:#7A6A65;margin-top:20px;font-size:0.85rem;">This code expires in <strong>10 minutes</strong>.</p>
      </div>
    `,
  });

  console.log('✅ OTP email sent successfully to:', email);
};

// @POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, age } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const otp          = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({ name, email, password, role, age, otp, otpExpiresAt });

    await sendOTPEmail(email, otp);

    res.status(201).json({
      success: true,
      message: 'Registration successful. OTP sent to your email.',
      userId: user._id,
    });
  } catch (err) {
    console.log('❌ Register error:', err.message);
    next(err);
  }
};

// @POST /api/auth/verify-otp
exports.verifyOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId).select('+otp +otpExpiresAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Already verified' });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (user.otpExpiresAt < new Date()) return res.status(400).json({ success: false, message: 'OTP expired' });

    user.isVerified   = true;
    user.otp          = undefined;
    user.otpExpiresAt = undefined;
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

// @POST /api/auth/resend-otp
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

// Add this to server/controllers/authController.js
// New endpoint: POST /api/auth/google

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

exports.googleAuth = async (req, res, next) => {
  try {
    const { name, email, googleId, avatar } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    let needsRole = false;

    if (!user) {
      // New user — create with Google
      user = await User.create({
        name,
        email,
        googleId,
        avatar,
        isVerified: true,      // Google already verified
        password:   googleId + process.env.JWT_SECRET, // dummy password
        role:       'student', // default role
      });
      needsRole = true; // Ask them to select role
    } else {
      // Existing user — update Google info
      user.googleId  = googleId;
      user.avatar    = avatar || user.avatar;
      user.isVerified= true;
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      needsRole,
      user: {
        _id:    user._id,
        name:   user.name,
        email:  user.email,
        role:   user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) { next(err); }
};