/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/auth.js";

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  deviceId?: string;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid authorization header",
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = verifyAccessToken(token);
      req.userId = payload.userId;
      req.email = payload.email;
      req.deviceId = payload.deviceId;
      next();
    } catch (err) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }
  } catch (err) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication failed",
    });
  }
}

/**
 * Optional auth middleware (doesn't fail if no token)
 */
export function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const payload = verifyAccessToken(token);
        req.userId = payload.userId;
        req.email = payload.email;
        req.deviceId = payload.deviceId;
      } catch (err) {
        // Silently fail, continue without auth
      }
    }

    next();
  } catch (err) {
    next();
  }
}
