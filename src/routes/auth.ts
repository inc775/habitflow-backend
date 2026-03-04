/**
 * Authentication Routes
 */

import { Router, Request, Response, NextFunction } from "express";
import Joi from "joi";
import { pool } from "../db/config.js";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { AuthRequest } from "../middleware/auth.js";

const router = Router();

// Validation schemas
const signUpSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  deviceId: Joi.string().optional(),
});

const signInSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  deviceId: Joi.string().optional(),
});

/**
 * POST /auth/signup
 * Create new user account
 */
router.post("/signup", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = signUpSchema.validate(req.body);
    if (error) {
      throw new AppError(400, error.details[0].message, "VALIDATION_ERROR");
    }

    const { email, password, deviceId } = value;

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError(409, "Email already registered", "EMAIL_EXISTS");
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, device_id, last_login_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, email, created_at, is_active`,
      [email, passwordHash, deviceId]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, deviceId);
    const refreshToken = generateRefreshToken(user.id, deviceId);

    // Store refresh token (in production, use secure storage)
    await pool.query(
      `INSERT INTO sync_metadata (user_id, device_id, last_sync_at, last_sync_version)
       VALUES ($1, $2, CURRENT_TIMESTAMP, 0)
       ON CONFLICT (user_id, device_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
      [user.id, deviceId || "unknown"]
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        is_active: user.is_active,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/signin
 * Authenticate user
 */
router.post("/signin", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = signInSchema.validate(req.body);
    if (error) {
      throw new AppError(400, error.details[0].message, "VALIDATION_ERROR");
    }

    const { email, password, deviceId } = value;

    // Find user
    const result = await pool.query(
      "SELECT id, email, password_hash, is_active FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError(401, "Invalid email or password", "AUTH_FAILED");
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new AppError(403, "Account is inactive", "ACCOUNT_INACTIVE");
    }

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      throw new AppError(401, "Invalid email or password", "AUTH_FAILED");
    }

    // Update last login
    await pool.query(
      "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, deviceId);
    const refreshToken = generateRefreshToken(user.id, deviceId);

    // Update sync metadata
    await pool.query(
      `INSERT INTO sync_metadata (user_id, device_id, last_sync_at, last_sync_version)
       VALUES ($1, $2, CURRENT_TIMESTAMP, 0)
       ON CONFLICT (user_id, device_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
      [user.id, deviceId || "unknown"]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, "Refresh token required", "MISSING_TOKEN");
    }

    try {
      const payload = verifyRefreshToken(refreshToken);
      const { userId, deviceId } = payload;

      // Get user
      const result = await pool.query(
        "SELECT id, email, is_active FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        throw new AppError(401, "User not found", "USER_NOT_FOUND");
      }

      const user = result.rows[0];

      // Generate new tokens
      const newAccessToken = generateAccessToken(user.id, user.email, deviceId);
      const newRefreshToken = generateRefreshToken(user.id, deviceId);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err: any) {
      throw new AppError(401, err.message || "Invalid refresh token", "INVALID_TOKEN");
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Get current user
 */
router.get("/me", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const result = await pool.query(
      "SELECT id, email, created_at, is_active FROM users WHERE id = $1",
      [req.userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
