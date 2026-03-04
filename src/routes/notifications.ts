/**
 * Push Notifications Routes
 */

import { Router, Response, NextFunction } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  registerPushToken,
  sendDailyReminder,
  getActiveTokensCount,
} from "../services/notifications.js";

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

/**
 * POST /notifications/register
 * Register push token for device
 */
router.post(
  "/register",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
      }

      const { deviceId, token, platform } = req.body;

      if (!deviceId || !token || !platform) {
        throw new AppError(
          400,
          "deviceId, token, and platform required",
          "VALIDATION_ERROR"
        );
      }

      await registerPushToken(req.userId, deviceId, token, platform);

      res.json({
        message: "Push token registered successfully",
        deviceId,
        platform,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /notifications/test
 * Send test notification
 */
router.post(
  "/test",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
      }

      const { title, body } = req.body;

      if (!title || !body) {
        throw new AppError(400, "title and body required", "VALIDATION_ERROR");
      }

      await sendDailyReminder(req.userId, 3);

      res.json({
        message: "Test notification sent",
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /notifications/status
 * Get notification status
 */
router.get("/status", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const activeTokens = await getActiveTokensCount(req.userId);

    res.json({
      notificationsEnabled: activeTokens > 0,
      activeDevices: activeTokens,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
