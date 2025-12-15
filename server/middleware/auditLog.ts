import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const CLIENT_JWT_SECRET = process.env.CLIENT_JWT_SECRET || 'client-secret-key';

// Helper function to create audit log
export const createAuditLog = async (data: {
  userId?: string | null;
  userEmail?: string | null;
  clientId?: string | null;
  clientEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId || undefined,
        userEmail: data.userEmail || undefined,
        clientId: data.clientId || undefined,
        clientEmail: data.clientEmail || undefined,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || undefined,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        details: data.details || null,
        ipAddress: data.ipAddress || undefined,
        userAgent: data.userAgent || undefined,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
};

// Helper function to extract user info from request
export const getUserInfoFromRequest = (req: Request): {
  userId?: string;
  userEmail?: string;
  clientId?: string;
  clientEmail?: string;
} => {
  let userId: string | undefined;
  let userEmail: string | undefined;
  let clientId: string | undefined;
  let clientEmail: string | undefined;

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      // Try user token first
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.sub;
        userEmail = decoded.email;
      } catch (err) {
        // Try client token
        try {
          const decoded = jwt.verify(token, CLIENT_JWT_SECRET) as any;
          clientId = decoded.sub;
          clientEmail = decoded.email;
        } catch (err2) {
          // Token invalid
        }
      }
    }

    // Also check if clientId is already set in request (from verifyClientToken middleware)
    if ((req as any).clientId) {
      clientId = (req as any).clientId;
    }
  } catch (err) {
    // Ignore errors
  }

  return { userId, userEmail, clientId, clientEmail };
};

// General audit log middleware (for automatic logging)
export const auditLog = async (req: Request, res: Response, next: NextFunction) => {
  // Only log POST, PUT, DELETE, PATCH requests
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Skip sensitive endpoints (they will be logged manually)
  const skipPaths = [
    '/api/login',
    '/api/client/login',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
  ];

  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const userInfo = getUserInfoFromRequest(req);
  
  // Store original json method
  const originalJson = res.json.bind(res);
  
  res.json = function (data: any) {
    // Log after response (only if successful)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const action = req.method === 'POST' ? 'CREATE' : 
                     req.method === 'PUT' || req.method === 'PATCH' ? 'UPDATE' : 
                     req.method === 'DELETE' ? 'DELETE' : 'UNKNOWN';
      
      const entityType = req.path.split('/').filter(Boolean)[1]?.toUpperCase() || 'UNKNOWN';
      const entityId = req.params.id || data?.id || null;
      
      createAuditLog({
        ...userInfo,
        action,
        entityType,
        entityId: entityId || undefined,
        oldValues: req.method === 'PUT' || req.method === 'PATCH' ? req.body : null,
        newValues: req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' ? req.body : null,
        ipAddress: req.ip || (req.socket.remoteAddress as string) || undefined,
        userAgent: req.get('user-agent') || undefined,
      });
    }
    
    return originalJson(data);
  };
  
  next();
};
