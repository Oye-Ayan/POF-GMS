/* ════════════════════════════════════════════════════════════════════
   POF GMS — Authentication Routes
   *** PREVIOUS VERSION is preserved in auth.js.bak ***
   POST /api/auth/login           → Authenticate & return JWT
   POST /api/auth/register        → Create new staff account
   POST /api/auth/forgot-password → Send reset email via Gmail SMTP
   POST /api/auth/reset-password  → Verify token & set new password
   ════════════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { User } = require('../models');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    // Validation
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    // Check if username already taken
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username is already taken.',
      });
    }

    // Check if email already registered
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.',
      });
    }

    // Create user (always as 'staff' — manager is created via seed only)
    const user = await User.create({
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password_hash: password, // Will be hashed by beforeCreate hook
      role: 'staff',
    });

    // Generate JWT immediately (auto-login after register)
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role, fullName: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to POF GMS.',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors.map(e => e.message).join(', '),
      });
    }
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
      });
    }

    // Find user by username (case-insensitive)
    const user = await User.findOne({ where: { username: username.toLowerCase() } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    // Generate JWT (include role)
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role, fullName: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ── POST /api/auth/forgot-password ──
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return res.json({
        success: true,
        message: 'If this email is registered, a reset link has been sent.',
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save hashed token + expiry (30 minutes)
    user.reset_token = resetTokenHash;
    user.reset_token_expiry = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    // Build reset URL
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/?resetToken=${resetToken}`;

    // Send email via Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'POF GMS'}" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: '🔐 POF GMS — Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; background:#050810; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
          <div style="max-width:520px; margin:40px auto; background:#0c1120; border:1px solid rgba(148,163,184,0.1); border-radius:16px; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#7c3aed,#a855f7); padding:32px; text-align:center;">
              <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:8px 20px; border-radius:8px; font-weight:800; font-size:20px; color:#fff; letter-spacing:2px;">POF GMS</div>
              <p style="color:rgba(255,255,255,0.85); font-size:12px; letter-spacing:3px; margin-top:8px; text-transform:uppercase;">Gym Management System</p>
            </div>
            <div style="padding:32px 28px;">
              <h2 style="color:#f0f6ff; font-size:20px; margin-bottom:8px;">Password Reset Request</h2>
              <p style="color:#94a3b8; font-size:14px; line-height:1.7; margin-bottom:24px;">
                Hello <strong style="color:#a855f7;">${user.full_name || user.username}</strong>,<br><br>
                We received a request to reset your password. Click the button below to create a new password. This link is valid for <strong style="color:#f59e0b;">30 minutes</strong>.
              </p>
              <div style="text-align:center; margin:28px 0;">
                <a href="${resetURL}" style="display:inline-block; background:linear-gradient(135deg,#7c3aed,#a855f7); color:#fff; text-decoration:none; padding:14px 36px; border-radius:10px; font-weight:700; font-size:14px; letter-spacing:1.5px;">RESET MY PASSWORD</a>
              </div>
              <p style="color:#5a7090; font-size:12px; line-height:1.6;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.<br><br>
                If the button doesn't work, copy this link:<br>
                <span style="color:#a855f7; word-break:break-all; font-size:11px;">${resetURL}</span>
              </p>
            </div>
            <div style="padding:18px 28px; border-top:1px solid rgba(148,163,184,0.1); text-align:center;">
              <p style="color:#2d4060; font-size:11px; margin:0;">
                POF GMS v3.0 · Pakistan Ordnance Factories<br>
                Developed by Muhammad Ayan Khan
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'If this email is registered, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reset email. Please check SMTP configuration.',
    });
  }
});

// ── POST /api/auth/reset-password ──
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: { reset_token: tokenHash },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.',
      });
    }

    if (user.reset_token_expiry && new Date(user.reset_token_expiry) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired. Please request a new one.',
      });
    }

    const salt = await bcrypt.genSalt(12);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    user.reset_token = null;
    user.reset_token_expiry = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
