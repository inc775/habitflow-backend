/**
 * Habits CRUD Routes
 */

import { Router, Response, NextFunction } from "express";
import Joi from "joi";
import { pool } from "../db/config.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { CreateHabitRequest, UpdateHabitRequest } from "../types/index.js";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation schemas
const createHabitSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().optional().max(1000),
  icon: Joi.string().required().max(50),
  color: Joi.string().required().regex(/^#[0-9A-F]{6}$/i),
  category: Joi.string().required().max(50),
  frequency: Joi.string().required().valid("daily", "weekly", "custom"),
});

const updateHabitSchema = Joi.object({
  name: Joi.string().optional().max(255),
  description: Joi.string().optional().max(1000),
  icon: Joi.string().optional().max(50),
  color: Joi.string().optional().regex(/^#[0-9A-F]{6}$/i),
  category: Joi.string().optional().max(50),
  frequency: Joi.string().optional().valid("daily", "weekly", "custom"),
});

/**
 * GET /habits
 * Get all habits for user
 */
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const result = await pool.query(
      `SELECT * FROM habits 
       WHERE user_id = $1 AND is_deleted = false
       ORDER BY created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /habits/:id
 * Get specific habit
 */
router.get("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM habits 
       WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "Habit not found", "HABIT_NOT_FOUND");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /habits
 * Create new habit
 */
router.post("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const { error, value } = createHabitSchema.validate(req.body);
    if (error) {
      throw new AppError(400, error.details[0].message, "VALIDATION_ERROR");
    }

    const { name, description, icon, color, category, frequency } = value;

    const result = await pool.query(
      `INSERT INTO habits (user_id, name, description, icon, color, category, frequency, sync_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
       RETURNING *`,
      [req.userId, name, description, icon, color, category, frequency]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /habits/:id
 * Update habit
 */
router.put("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const { id } = req.params;
    const { error, value } = updateHabitSchema.validate(req.body);
    if (error) {
      throw new AppError(400, error.details[0].message, "VALIDATION_ERROR");
    }

    // Check habit exists
    const habitResult = await pool.query(
      "SELECT * FROM habits WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );

    if (habitResult.rows.length === 0) {
      throw new AppError(404, "Habit not found", "HABIT_NOT_FOUND");
    }

    const habit = habitResult.rows[0];
    const updates = Object.keys(value);
    const values = Object.values(value);

    if (updates.length === 0) {
      res.json(habit);
      return;
    }

    // Build update query
    const setClause = updates
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ");

    const result = await pool.query(
      `UPDATE habits 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP, sync_version = sync_version + 1
       WHERE id = $${updates.length + 1} AND user_id = $${updates.length + 2}
       RETURNING *`,
      [...values, id, req.userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /habits/:id
 * Delete habit (soft delete)
 */
router.delete("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const { id } = req.params;

    // Check habit exists
    const habitResult = await pool.query(
      "SELECT * FROM habits WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );

    if (habitResult.rows.length === 0) {
      throw new AppError(404, "Habit not found", "HABIT_NOT_FOUND");
    }

    // Soft delete
    await pool.query(
      `UPDATE habits 
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP, sync_version = sync_version + 1
       WHERE id = $1`,
      [id]
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /habits/:id/completions
 * Mark habit as completed for a date
 */
router.post(
  "/:id/completions",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
      }

      const { id } = req.params;
      const { completion_date } = req.body;

      if (!completion_date) {
        throw new AppError(400, "completion_date required", "VALIDATION_ERROR");
      }

      // Check habit exists
      const habitResult = await pool.query(
        "SELECT * FROM habits WHERE id = $1 AND user_id = $2",
        [id, req.userId]
      );

      if (habitResult.rows.length === 0) {
        throw new AppError(404, "Habit not found", "HABIT_NOT_FOUND");
      }

      // Create or update completion
      const result = await pool.query(
        `INSERT INTO habit_completions (habit_id, user_id, completion_date, completed_at, sync_version)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 1)
         ON CONFLICT (habit_id, completion_date) 
         DO UPDATE SET completed_at = CURRENT_TIMESTAMP, sync_version = sync_version + 1
         RETURNING *`,
        [id, req.userId, completion_date]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /habits/:id/completions/:date
 * Remove completion for a date
 */
router.delete(
  "/:id/completions/:date",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
      }

      const { id, date } = req.params;

      await pool.query(
        `DELETE FROM habit_completions 
         WHERE habit_id = $1 AND user_id = $2 AND completion_date = $3`,
        [id, req.userId, date]
      );

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
