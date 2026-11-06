import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors.js";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ error: err.message || "Internal server error" });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
};
