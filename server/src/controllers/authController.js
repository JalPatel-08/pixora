import User from '../models/User.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateRandomToken,
  hashToken,
  setAuthCookies,
  clearAuthCookies,
} from '../services/tokenService.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../config/email.js';

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return res.status(409).json({
        success: false,
        message: `${field} is already registered.`,
      });
    }

    // Generate verification token
    const verificationToken = generateRandomToken();

    const user = await User.create({
      username,
      email,
      password,
      name: name || username,
      verificationToken: hashToken(verificationToken),
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      rawVerificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(email, verificationToken).catch((err) => {
      console.error("=== EMAIL ERROR START ===");
      console.error(err);
      console.error("=== EMAIL ERROR END ===");
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    }).select('+password');

    // Check if account is locked
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(403).json({
        success: false,
        message: `Account is temporarily locked. Try again in ${remainingMinutes} minutes.`,
      });
    }

    if (!user || !(await user.comparePassword(password))) {
      if (user) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }
        await user.save({ validateBeforeSave: false });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        isVerified: false,
        message: 'Please verify your email before logging in.',
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    user.refreshTokens.push(refreshToken);
    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Login successful.',
      accessToken,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken && req.user) {
      // Remove the refresh token from stored tokens
      req.user.refreshTokens = req.user.refreshTokens.filter(
        (t) => t !== refreshToken
      );
      await req.user.save({ validateBeforeSave: false });
    }

    clearAuthCookies(res);

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 */
export const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided.',
      });
    }

    // Verify the refresh token
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.',
      });
    }

    // Rotate refresh token
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save({ validateBeforeSave: false });

    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    clearAuthCookies(res);
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please login again.',
      });
    }
    next(error);
  }
};

/**
 * GET /api/auth/verify-email/:token
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const hashedToken = hashToken(req.params.token);

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token.',
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    user.rawVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/resend-verification
 */
export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email.',
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'This email is already verified.',
      });
    }

    // Generate verification token
    const verificationToken = generateRandomToken();
    user.verificationToken = hashToken(verificationToken);
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    if (process.env.NODE_ENV === 'development') {
      user.rawVerificationToken = verificationToken;
    }
    await user.save({ validateBeforeSave: false });

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.json({
      success: true,
      message: 'Verification email has been resent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond with success (don't reveal whether email exists)
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    }

    const resetToken = generateRandomToken();
    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    if (process.env.NODE_ENV === 'development') {
      user.rawResetPasswordToken = resetToken;
    }
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetEmail(email, resetToken);

    res.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password/:token
 */
export const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = hashToken(req.params.token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.',
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.rawResetPasswordToken = undefined;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. Please log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/change-password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    // Generate new tokens for current session
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(refreshToken);
    await user.save({ validateBeforeSave: false });

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Password changed successfully.',
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('postsCount');

    res.json({
      success: true,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};
