/**
 * Push Notifications Service
 * Firebase Cloud Messaging integration
 */

import admin from "firebase-admin";
import { pool } from "../db/config.js";

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

function initializeFirebase(): void {
  if (firebaseInitialized) return;

  try {
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
      firebaseInitialized = true;
      console.log("✅ Firebase initialized");
    } else {
      console.warn("⚠️ Firebase credentials not configured");
    }
  } catch (err) {
    console.error("❌ Firebase initialization failed:", err);
  }
}

/**
 * Register push token for device
 */
export async function registerPushToken(
  userId: string,
  deviceId: string,
  token: string,
  platform: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO push_tokens (user_id, device_id, token, platform, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (user_id, device_id) 
       DO UPDATE SET token = $3, platform = $4, is_active = true, updated_at = CURRENT_TIMESTAMP`,
      [userId, deviceId, token, platform]
    );
  } catch (err) {
    console.error("Error registering push token:", err);
    throw err;
  }
}

/**
 * Send notification to user
 */
export async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    if (!firebaseInitialized) {
      console.warn("Firebase not initialized, skipping notification");
      return;
    }

    // Get user's push tokens
    const result = await pool.query(
      `SELECT token FROM push_tokens 
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    const tokens = result.rows.map((row) => row.token);

    if (tokens.length === 0) {
      console.log(`No push tokens found for user ${userId}`);
      return;
    }

    // Send multicast message
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: "high",
        notification: {
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
      },
    };

    const response = await admin.messaging().sendMulticast({
      ...message,
      tokens,
    });

    console.log(`Sent notification to ${response.successCount} devices`);

    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens = response.responses
        .map((resp, idx) => (resp.success ? null : tokens[idx]))
        .filter((token) => token !== null);

      // Mark failed tokens as inactive
      for (const token of failedTokens) {
        await pool.query(
          `UPDATE push_tokens SET is_active = false WHERE token = $1`,
          [token]
        );
      }
    }
  } catch (err) {
    console.error("Error sending notification:", err);
    throw err;
  }
}

/**
 * Send daily reminder notification
 */
export async function sendDailyReminder(
  userId: string,
  habitCount: number
): Promise<void> {
  try {
    const title = "Time for your habits! 🌟";
    const body = `You have ${habitCount} habit${habitCount !== 1 ? "s" : ""} to complete today`;

    await sendNotificationToUser(userId, title, body, {
      type: "daily_reminder",
      habitCount: habitCount.toString(),
    });
  } catch (err) {
    console.error("Error sending daily reminder:", err);
  }
}

/**
 * Send streak milestone notification
 */
export async function sendStreakMilestone(
  userId: string,
  habitName: string,
  streak: number
): Promise<void> {
  try {
    const milestones = [7, 14, 30, 60, 100, 365];
    if (!milestones.includes(streak)) return;

    const title = `🔥 ${streak}-Day Streak!`;
    const body = `Amazing! You've completed "${habitName}" for ${streak} days straight`;

    await sendNotificationToUser(userId, title, body, {
      type: "streak_milestone",
      habitName,
      streak: streak.toString(),
    });
  } catch (err) {
    console.error("Error sending streak milestone:", err);
  }
}

/**
 * Send completion encouragement
 */
export async function sendCompletionEncouragement(
  userId: string,
  completionCount: number
): Promise<void> {
  try {
    let title = "";
    let body = "";

    if (completionCount === 1) {
      title = "Great start! 🎯";
      body = "You've completed your first habit today";
    } else if (completionCount === 3) {
      title = "On fire! 🔥";
      body = "You've completed 3 habits already";
    } else if (completionCount % 5 === 0) {
      title = "Unstoppable! 💪";
      body = `You've completed ${completionCount} habits today`;
    } else {
      return;
    }

    await sendNotificationToUser(userId, title, body, {
      type: "completion_encouragement",
      count: completionCount.toString(),
    });
  } catch (err) {
    console.error("Error sending encouragement:", err);
  }
}

/**
 * Send weekly summary
 */
export async function sendWeeklySummary(
  userId: string,
  completionRate: number,
  bestHabit: string,
  streak: number
): Promise<void> {
  try {
    const title = "📊 Your Weekly Summary";
    const body = `${completionRate}% completion rate. Keep it up!`;

    await sendNotificationToUser(userId, title, body, {
      type: "weekly_summary",
      completionRate: completionRate.toString(),
      bestHabit,
      streak: streak.toString(),
    });
  } catch (err) {
    console.error("Error sending weekly summary:", err);
  }
}

/**
 * Deregister push token
 */
export async function deregisterPushToken(token: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE push_tokens SET is_active = false WHERE token = $1`,
      [token]
    );
  } catch (err) {
    console.error("Error deregistering push token:", err);
    throw err;
  }
}

/**
 * Get user's active tokens count
 */
export async function getActiveTokensCount(userId: string): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM push_tokens 
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  } catch (err) {
    console.error("Error getting active tokens count:", err);
    return 0;
  }
}

// Initialize Firebase on module load
initializeFirebase();

export default {
  registerPushToken,
  sendNotificationToUser,
  sendDailyReminder,
  sendStreakMilestone,
  sendCompletionEncouragement,
  sendWeeklySummary,
  deregisterPushToken,
  getActiveTokensCount,
};
