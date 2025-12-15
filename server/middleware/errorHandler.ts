import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Winston logger setup
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    ...(process.env.NODE_ENV !== 'production' ? [new winston.transports.Console({
      format: winston.format.simple()
    })] : [])
  ],
});

// Centralized error handler
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get project root - try multiple approaches
  let logPath: string;
  try {
    // Try to get project root by going up from server directory
    const currentFile = import.meta.url;
    const filePath = new URL(currentFile).pathname;
    // Remove leading slash on Windows
    const normalizedPath = process.platform === 'win32' ? filePath.substring(1) : filePath;
    const middlewareDir = path.dirname(normalizedPath);
    const serverDir = path.resolve(middlewareDir, '..');
    const projectRoot = path.resolve(serverDir, '..');
    logPath = path.join(projectRoot, '.cursor', 'debug.log');
  } catch (e) {
    // Fallback to process.cwd()
    logPath = path.join(process.cwd(), '.cursor', 'debug.log');
  }
  const logEntry = {
    location: 'server/middleware/errorHandler.ts',
    message: 'Error handler called',
    data: {
      errorMessage: err?.message || String(err),
      errorName: err?.name,
      errorStatus: err?.status,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'H'
  };
  try {
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  } catch (e) {}
  
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

