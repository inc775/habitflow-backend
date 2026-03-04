/**
 * Cloud Sync Routes with Conflict Resolution
 */

import { Router, Response, NextFunction } from "express";
import { pool } from "../db/config.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { SyncRequest, SyncResponse } from "../types/index.js";

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

/**
 * POST /sync
 * Sync habits and completions with conflict resolution
 */
router.post("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const { device_id, habits, completions, last_sync_version } = req.body as SyncRequest;

    if (!device_id) {
      throw new AppError(400, "device_id required", "VALIDATION_ERROR");
    }

    // Get sync metadata
    const syncMetaResult = await pool.query(
      `SELECT * FROM sync_metadata 
       WHERE user_id = $1 AND device_id = $2`,
      [req.userId, device_id]
    );

    let syncMeta = syncMetaResult.rows[0];
    const serverSyncVersion = syncMeta?.last_sync_version || 0;

    // Fetch server habits
    const serverHabitsResult = await pool.query(
      `SELECT * FROM habits 
       WHERE user_id = $1 AND sync_version > $2`,
      [req.userId, last_sync_version]
    );

    // Fetch server completions
    const serverCompletionsResult = await pool.query(
      `SELECT * FROM habit_completions 
       WHERE user_id = $1 AND sync_version > $2`,
      [req.userId, last_sync_version]
    );

    const serverHabits = serverHabitsResult.rows;
    const serverCompletions = serverCompletionsResult.rows;

    // Merge habits (server wins on conflict)
    for (const clientHabit of habits) {
      const serverHabit = serverHabits.find((h) => h.id === clientHabit.id);

      if (!serverHabit) {
        // Habit only on client, insert it
        await pool.query(
          `INSERT INTO habits (id, user_id, name, description, icon, color, category, frequency, sync_version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             name = $3, description = $4, icon = $5, color = $6, category = $7, frequency = $8, sync_version = $9`,
          [
            clientHabit.id,
            req.userId,
            clientHabit.name,
            clientHabit.description,
            clientHabit.icon,
            clientHabit.color,
            clientHabit.category,
            clientHabit.frequency,
            clientHabit.sync_version + 1,
          ]
        );
      } else if (clientHabit.sync_version > serverHabit.sync_version) {
        // Client version is newer, update server
        await pool.query(
          `UPDATE habits SET
             name = $1, description = $2, icon = $3, color = $4, category = $5, frequency = $6,
             sync_version = $7, updated_at = CURRENT_TIMESTAMP
           WHERE id = $8`,
          [
            clientHabit.name,
            clientHabit.description,
            clientHabit.icon,
            clientHabit.color,
            clientHabit.category,
            clientHabit.frequency,
            clientHabit.sync_version + 1,
            clientHabit.id,
          ]
        );
      }
      // If server version is newer, server wins (no update)
    }

    // Merge completions
    for (const clientCompletion of completions) {
      const serverCompletion = serverCompletions.find(
        (c) =>
          c.habit_id === clientCompletion.habit_id &&
          c.completion_date === clientCompletion.completion_date
      );

      if (!serverCompletion) {
        // Completion only on client, insert it
        await pool.query(
          `INSERT INTO habit_completions (id, habit_id, user_id, completion_date, completed_at, sync_version)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
           ON CONFLICT (habit_id, completion_date) DO UPDATE SET sync_version = $5`,
          [
            clientCompletion.id,
            clientCompletion.habit_id,
            req.userId,
            clientCompletion.completion_date,
            clientCompletion.sync_version + 1,
          ]
        );
      } else if (clientCompletion.sync_version > serverCompletion.sync_version) {
        // Client version is newer
        await pool.query(
          `UPDATE habit_completions SET
             completed_at = CURRENT_TIMESTAMP, sync_version = $1, updated_at = CURRENT_TIMESTAMP
           WHERE habit_id = $2 AND completion_date = $3`,
          [clientCompletion.sync_version + 1, clientCompletion.habit_id, clientCompletion.completion_date]
        );
      }
    }

    // Update sync metadata
    const newSyncVersion = Math.max(
      serverSyncVersion,
      Math.max(...habits.map((h) => h.sync_version), 0),
      Math.max(...completions.map((c) => c.sync_version), 0)
    ) + 1;

    if (syncMeta) {
      await pool.query(
        `UPDATE sync_metadata SET
           last_sync_at = CURRENT_TIMESTAMP, last_sync_version = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND device_id = $3`,
        [newSyncVersion, req.userId, device_id]
      );
    } else {
      await pool.query(
        `INSERT INTO sync_metadata (user_id, device_id, last_sync_at, last_sync_version)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
        [req.userId, device_id, newSyncVersion]
      );
    }

    // Fetch latest data to return
    const latestHabits = await pool.query(
      `SELECT * FROM habits WHERE user_id = $1`,
      [req.userId]
    );

    const latestCompletions = await pool.query(
      `SELECT * FROM habit_completions WHERE user_id = $1`,
      [req.userId]
    );

    const response: SyncResponse = {
      habits: latestHabits.rows,
      completions: latestCompletions.rows,
      sync_version: newSyncVersion,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /sync/status
 * Get sync status
 */
router.get("/status", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const result = await pool.query(
      `SELECT * FROM sync_metadata WHERE user_id = $1`,
      [req.userId]
    );

    res.json({
      synced_devices: result.rows.length,
      devices: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
