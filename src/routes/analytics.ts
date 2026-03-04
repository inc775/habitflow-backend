/**
 * Analytics and Data Export/Import Routes
 */

import { Router, Response, NextFunction } from "express";
import { pool } from "../db/config.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { AnalyticsData } from "../types/index.js";

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

/**
 * GET /analytics
 * Get analytics data
 */
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    // Get all habits
    const habitsResult = await pool.query(
      `SELECT * FROM habits WHERE user_id = $1 AND is_deleted = false`,
      [req.userId]
    );

    const habits = habitsResult.rows;
    const activeHabits = habits.filter((h) => !h.archived_at);

    // Get completions for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completionsResult = await pool.query(
      `SELECT * FROM habit_completions 
       WHERE user_id = $1 AND completion_date >= $2`,
      [req.userId, thirtyDaysAgo.toISOString().split("T")[0]]
    );

    const completions = completionsResult.rows;
    const totalCompletions = completions.length;

    // Calculate metrics
    const totalPossible = activeHabits.length * 30;
    const completionRate =
      totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;

    const avgDaily =
      activeHabits.length > 0
        ? Math.round((totalCompletions / 30) * 10) / 10
        : 0;

    // Calculate per-habit stats
    const habitStats = activeHabits.map((habit) => {
      const habitCompletions = completions.filter(
        (c) => c.habit_id === habit.id
      );

      // Calculate streak
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split("T")[0];
        const hasCompletion = habitCompletions.some(
          (c) => c.completion_date === dateKey
        );
        if (hasCompletion) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      // Calculate longest streak
      let longestStreak = 0;
      let currentStreak = 0;
      for (let i = 365; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split("T")[0];
        const hasCompletion = habitCompletions.some(
          (c) => c.completion_date === dateKey
        );
        if (hasCompletion) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      // Calculate 7-day rate
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDayCompletions = habitCompletions.filter(
        (c) => new Date(c.completion_date) >= sevenDaysAgo
      );
      const rate7d = Math.round((sevenDayCompletions.length / 7) * 100);

      // Calculate 30-day rate
      const thirtyDayCompletions = habitCompletions.length;
      const rate30d = Math.round((thirtyDayCompletions / 30) * 100);

      return {
        id: habit.id,
        name: habit.name,
        streak,
        longest_streak: longestStreak,
        completion_rate_7d: rate7d,
        completion_rate_30d: rate30d,
      };
    });

    // Find best streak
    const bestStreak = Math.max(...habitStats.map((h) => h.streak), 0);

    const analytics: AnalyticsData = {
      total_habits: habits.length,
      active_habits: activeHabits.length,
      total_completions: totalCompletions,
      completion_rate: completionRate,
      average_daily_completions: avgDaily,
      best_streak: bestStreak,
      habits: habitStats,
    };

    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /analytics/daily
 * Get daily completion data
 */
router.get("/daily", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const days = parseInt(req.query.days as string) || 30;

    const result = await pool.query(
      `SELECT 
         completion_date,
         COUNT(*) as completions,
         (SELECT COUNT(DISTINCT id) FROM habits WHERE user_id = $1 AND is_deleted = false) as total_habits
       FROM habit_completions
       WHERE user_id = $1 AND completion_date >= CURRENT_DATE - INTERVAL '1 day' * $2
       GROUP BY completion_date
       ORDER BY completion_date DESC`,
      [req.userId, days]
    );

    const data = result.rows.map((row) => ({
      date: row.completion_date,
      completions: parseInt(row.completions),
      rate: Math.round((parseInt(row.completions) / parseInt(row.total_habits)) * 100),
    }));

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /analytics/export
 * Export all user data
 */
router.post("/export", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    // Get user
    const userResult = await pool.query(
      "SELECT id, email, created_at FROM users WHERE id = $1",
      [req.userId]
    );

    // Get habits
    const habitsResult = await pool.query(
      "SELECT * FROM habits WHERE user_id = $1",
      [req.userId]
    );

    // Get completions
    const completionsResult = await pool.query(
      "SELECT * FROM habit_completions WHERE user_id = $1",
      [req.userId]
    );

    const exportData = {
      user: userResult.rows[0],
      habits: habitsResult.rows,
      completions: completionsResult.rows,
      exported_at: new Date(),
    };

    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /analytics/import
 * Import user data
 */
router.post("/import", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const { habits, completions } = req.body;

    if (!Array.isArray(habits) || !Array.isArray(completions)) {
      throw new AppError(400, "Invalid import data", "VALIDATION_ERROR");
    }

    // Import habits
    for (const habit of habits) {
      await pool.query(
        `INSERT INTO habits (id, user_id, name, description, icon, color, category, frequency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = $3, description = $4, icon = $5, color = $6, category = $7, frequency = $8`,
        [
          habit.id,
          req.userId,
          habit.name,
          habit.description,
          habit.icon,
          habit.color,
          habit.category,
          habit.frequency,
        ]
      );
    }

    // Import completions
    for (const completion of completions) {
      await pool.query(
        `INSERT INTO habit_completions (id, habit_id, user_id, completion_date, completed_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (habit_id, completion_date) DO NOTHING`,
        [
          completion.id,
          completion.habit_id,
          req.userId,
          completion.completion_date,
        ]
      );
    }

    res.json({
      message: "Data imported successfully",
      habits_imported: habits.length,
      completions_imported: completions.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
