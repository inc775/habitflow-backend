/**
 * Error Handling Middleware
 */

import { Request, Response, NextFunction } from "express";
import { ErrorResponse } from "../types/index.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public error?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  const error = err.error || "SERVER_ERROR";

  const response: ErrorResponse = {
    error,
    message,
    statusCode,
    timestamp: new Date(),
  };

  res.status(statusCode).json(response);
}

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new AppError(404, "Route not found", "NOT_FOUND");
  errorHandler(error, req, res, next);
}
