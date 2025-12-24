// server/index.ts
console.log('[SERVER] Starting server initialization...');
console.log('[SERVER] NODE_ENV:', process.env.NODE_ENV);
console.log('[SERVER] PORT:', process.env.PORT);

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { errorHandler, asyncHandler, logger } from './middleware/errorHandler';
import { auditLog, createAuditLog, getUserInfoFromRequest } from './middleware/auditLog';
import { checkPermission } from './middleware/rbac';
import { sendEmail, emailTemplates } from './services/emailService';
import { generateInvoicePDF } from './services/pdfService';
import { uploadSingle, uploadMultiple } from './middleware/fileUpload';
import trustRoutes from './routes/trustRoutes';
import crmRoutes from './routes/crmRoutes';
import clientRoutes from './routes/clientRoutes';
import matterRoutes from './routes/matterRoutes';
import taskRoutes from './routes/taskRoutes';
import { verifyToken, verifyAdmin } from './middleware/auth';

declare global {
  namespace Express {
    interface Request {
      adminId?: string;
      clientId?: string;
      user?: any;
    }
  }
}

// verifyToken imported from middleware/auth

const app = express();
const prisma = new PrismaClient();

// Trust proxy - required for Railway/Heroku/etc behind reverse proxy
app.set('trust proxy', 1);

// Security middleware - Disable CSP in production for Vite SPA
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP in production
  }));
} else {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
      },
    },
  }));
}

// CORS configuration - MUST be before rate limiting to handle preflight OPTIONS requests
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? true // In production with same-origin, allow all (served from same domain)
    : function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow all localhost ports in development
      if (!origin || origin.match(/^http:\/\/localhost:\d+$/)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Rate limiting middleware with logging
const rateLimitLogger = (req: any, res: any, next: any) => {
  const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
  const logEntry = {
    location: 'server/index.ts:rateLimitLogger',
    message: 'Rate limit check',
    data: {
      path: req.path,
      method: req.method,
      ip: req.ip || req.socket.remoteAddress,
      timestamp: new Date().toISOString()
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'A'
  };
  try {
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  } catch (e) { }
  next();
};

// Rate limiting - Increased limits for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 for development (allows ~66 requests per minute)
  message: 'Too many requests from this IP, please try again later.',
  handler: (req: any, res: any) => {
    const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
    const logEntry = {
      location: 'server/index.ts:rateLimitHandler',
      message: 'Rate limit exceeded',
      data: {
        path: req.path,
        method: req.method,
        ip: req.ip || req.socket.remoteAddress,
        status: 429
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    };
    try {
      fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    } catch (e) { }
    res.status(429).json({ message: 'Too many requests from this IP, please try again later.' });
  }
});

// Stricter rate limit for auth endpoints - Very permissive for development
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // 100 attempts per 15 min in dev, 10 in prod
  message: 'Too many login attempts, please try again later.',
  handler: (req: any, res: any) => {
    const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
    const logEntry = {
      location: 'server/index.ts:authRateLimitHandler',
      message: 'Auth rate limit exceeded',
      data: {
        path: req.path,
        method: req.method,
        ip: req.ip || req.socket.remoteAddress,
        status: 429,
        nodeEnv: process.env.NODE_ENV,
        maxAllowed: process.env.NODE_ENV === 'production' ? 10 : 100
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B'
    };
    try {
      fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    } catch (e) { }
    res.status(429).json({
      message: 'Too many login attempts, please try again later.',
      retryAfter: '15 minutes',
      maxAttempts: process.env.NODE_ENV === 'production' ? 10 : 100
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting (skip for login endpoints - they have their own limiter)
app.use('/api/', (req: any, res: any, next: any) => {
  // Skip rate limiting for login endpoints (they have authLimiter)
  if (req.path === '/login' || req.path === '/client/login') { // Note: req.path here is relative to /api
    return next();
  }

  // Use auth limiter for normal API calls if strictly needed, or use the general limiter
  // For now, general limiter is 'limiter', auth is 'authLimiter'
  rateLimitLogger(req, res, () => {
    limiter(req, res, next);
  });
});

app.use('/api/login', authLimiter);
app.use('/api/trust', trustRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/matters', matterRoutes);
app.use('/api', taskRoutes); // Mounting at /api because it contains both /tasks and /task-templates logic defined as /tasks and /task-templates
app.use('/api/client/login', authLimiter);

app.use(express.json({ limit: '10mb' }));

// Request logging middleware - log ALL requests to see if they reach backend
app.use((req: any, res: any, next: any) => {
  if (req.path === '/api/login') {
    console.log('[REQUEST] Login endpoint hit - Method:', req.method, 'Path:', req.path, 'Body:', req.body);
  }
  next();
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Audit logging middleware
app.use(auditLog);

// Auth Middleware - Protects all API routes below
app.use('/api', verifyToken);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'cffatjh@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '4354e643a83C9';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// Ensure an admin user exists for real authentication
const ensureAdmin = async () => {
  try {
    console.log('🔧 Checking/creating main admin user...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (existing) {
      // Always update password to ensure it's correct
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { passwordHash, role: 'Admin' }
      });
      console.log(`✅ Main admin password updated: ${ADMIN_EMAIL}`);
    } else {
      await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          name: 'Admin User',
          role: 'Admin',
          passwordHash,
        },
      });
      console.log(`✅ Main admin created: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error('❌ Failed to ensure admin:', err);
  }
};
// NOTE: ensureAdmin is called from startServer() after server starts listening

// Ensure test accounts exist (silently)
const ensureTestAccounts = async () => {
  try {
    // Test Admin Account
    const testAdminEmail = 'testadmin@jurisflow.com';
    const testAdminPassword = 'testadmin123';
    let testAdmin = await prisma.user.findUnique({ where: { email: testAdminEmail } });
    if (!testAdmin) {
      const passwordHash = await bcrypt.hash(testAdminPassword, 10);
      await prisma.user.create({
        data: {
          email: testAdminEmail,
          name: 'Test Admin',
          role: 'Admin',
          passwordHash,
        },
      });
    }

    // Test Attorney Account
    const testAttorneyEmail = 'avukat@gmail.com';
    const testAttorneyPassword = 'avukat';
    let testAttorney = await prisma.user.findUnique({ where: { email: testAttorneyEmail } });
    if (!testAttorney) {
      const passwordHash = await bcrypt.hash(testAttorneyPassword, 10);
      await prisma.user.create({
        data: {
          email: testAttorneyEmail,
          name: 'Test Avukat',
          role: 'Partner',
          passwordHash,
          phone: '555-0200',
          address: '456 Attorney Street',
          city: 'Istanbul',
          state: 'Istanbul',
          zipCode: '34000',
          country: 'Turkey'
        }
      });
    } else {
      // Update password if exists
      const passwordHash = await bcrypt.hash(testAttorneyPassword, 10);
      await prisma.user.update({
        where: { email: testAttorneyEmail },
        data: {
          passwordHash,
          role: 'Partner'
        }
      });
    }

    // Test Client Account
    const testClientEmail = 'müvekkil@jurisflow.com';
    const testClientPassword = 'müvekkil123';
    let testClient = await prisma.client.findUnique({ where: { email: testClientEmail } });
    if (!testClient) {
      const passwordHash = await bcrypt.hash(testClientPassword, 10);
      await prisma.client.create({
        data: {
          name: 'Test Müvekkil',
          email: testClientEmail,
          passwordHash,
          portalEnabled: true,
          type: 'Individual',
          status: 'Active',
          phone: '555-0300',
          address: '789 Client Street',
          city: 'Istanbul',
          state: 'Istanbul',
          zipCode: '34000',
          country: 'Turkey'
        }
      });
    } else if (!testClient.portalEnabled || !testClient.passwordHash) {
      const passwordHash = await bcrypt.hash(testClientPassword, 10);
      await prisma.client.update({
        where: { email: testClientEmail },
        data: {
          passwordHash,
          portalEnabled: true
        }
      });
    }

    // Additional English Test Client Account
    const testClientEmailEn = 'client@test.com';
    const testClientPasswordEn = 'client123';
    let testClientEn = await prisma.client.findUnique({ where: { email: testClientEmailEn } });
    if (!testClientEn) {
      const passwordHash = await bcrypt.hash(testClientPasswordEn, 10);
      await prisma.client.create({
        data: {
          name: 'Test Client',
          email: testClientEmailEn,
          passwordHash,
          portalEnabled: true,
          type: 'Individual',
          status: 'Active',
          phone: '555-0100',
          address: '123 Test Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      });
      console.log(`✅ Test Client created: ${testClientEmailEn}`);
    } else if (!testClientEn.portalEnabled || !testClientEn.passwordHash) {
      const passwordHash = await bcrypt.hash(testClientPasswordEn, 10);
      await prisma.client.update({
        where: { email: testClientEmailEn },
        data: {
          passwordHash,
          portalEnabled: true
        }
      });
      console.log(`✅ Test Client updated: ${testClientEmailEn}`);
    }

    // JF Admin Accounts

    const jfAdmins = [
      { email: 'hilal@jf.com', password: 'hilal123', name: 'Hilal' },
      { email: 'tdeniz@jf.com', password: 'tdeniz123', name: 'TDeniz' }
    ];

    for (const admin of jfAdmins) {
      try {
        const existing = await prisma.user.findUnique({ where: { email: admin.email } });
        const passwordHash = await bcrypt.hash(admin.password, 10);

        if (existing) {
          await prisma.user.update({
            where: { email: admin.email },
            data: { passwordHash, role: 'Admin', name: admin.name }
          });
          console.log(`✅ JF Admin updated: ${admin.email}`);
        } else {
          await prisma.user.create({
            data: {
              email: admin.email,
              name: admin.name,
              role: 'Admin',
              passwordHash
            }
          });
          console.log(`✅ JF Admin created: ${admin.email}`);
        }
      } catch (adminErr) {
        console.error(`❌ Failed to create/update JF Admin ${admin.email}:`, adminErr);
      }
    }
  } catch (err) {
    console.error('❌ ensureTestAccounts error:', err);
  }
};
// NOTE: ensureTestAccounts is called from startServer() after server starts listening

// Ensure a test attorney account exists (Partner role - NOT Admin)
const ensureTestAttorney = async () => {
  const attorneys = [
    { email: 'avukat@gmail.com', password: 'avukat123', name: 'Test Avukat' },
    { email: 'avukat@jf.com', password: 'avukat123', name: 'JF Avukat' }
  ];

  for (const attorney of attorneys) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: attorney.email } });
      const passwordHash = await bcrypt.hash(attorney.password, 10);

      if (existing) {
        await prisma.user.update({
          where: { email: attorney.email },
          data: { passwordHash, role: 'Partner', name: attorney.name }
        });
        console.log(`✅ Attorney updated: ${attorney.email}`);
      } else {
        await prisma.user.create({
          data: {
            email: attorney.email,
            name: attorney.name,
            role: 'Partner',
            passwordHash,
            phone: '555-0200',
            city: 'Istanbul',
            country: 'Turkey'
          }
        });
        console.log(`✅ Attorney created: ${attorney.email}`);
      }
    } catch (err) {
      console.error(`❌ Failed to create/update attorney ${attorney.email}:`, err);
    }
  }
};
// NOTE: ensureTestAttorney is called from startServer() after server starts listening

// ===================== HEALTH CHECK =====================
// Required for Railway/production health monitoring
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===================== TRUST ACCOUNTING (IOLTA) =====================
// ABA Model Rule 1.15 Compliant Trust Accounting
app.use('/api/trust', trustRoutes);

// ===================== AUTH =====================
// Note: authLimiter is already applied via app.use('/api/login', authLimiter) above
app.post('/api/login', asyncHandler(async (req: any, res: any) => {
  // Use process.cwd() which should be the project root when server is started from project root
  const logPath = path.join(process.cwd(), '.cursor', 'debug.log');

  // ALWAYS log to console first for debugging
  // Login request logged to file only

  const logEntry = {
    location: 'server/index.ts:login',
    message: 'Login endpoint called',
    data: { email: req.body.email, hasPassword: !!req.body.password, logPath, cwd: process.cwd() },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'H'
  };
  try {
    // Ensure .cursor directory exists
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    // Log written successfully
  } catch (e: any) {
    // Log to console as fallback
    console.error('[LOGIN] Failed to write debug log:', e?.message, 'Path:', logPath, 'Error:', e);
  }

  try {
    const { email, password } = req.body;
    const logEntry1 = {
      location: 'server/index.ts:login',
      message: 'Login - extracted body',
      data: { hasEmail: !!email, hasPassword: !!password },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H'
    };
    try {
      fs.appendFileSync(logPath, JSON.stringify(logEntry1) + '\n');
    } catch (e) { }

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const logEntry2 = {
      location: 'server/index.ts:login',
      message: 'Login - querying database',
      data: { email },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H'
    };
    try {
      fs.appendFileSync(logPath, JSON.stringify(logEntry2) + '\n');
    } catch (e) { }

    const user = await prisma.user.findUnique({ where: { email } });

    const logEntry3 = {
      location: 'server/index.ts:login',
      message: 'Login - database query result',
      data: { userFound: !!user, userId: user?.id },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H'
    };
    try {
      fs.appendFileSync(logPath, JSON.stringify(logEntry3) + '\n');
    } catch (e) { }

    if (!user) {
      const logEntry4 = {
        location: 'server/index.ts:login',
        message: 'Login failed - user not found',
        data: { email },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H'
      };
      try {
        fs.appendFileSync(logPath, JSON.stringify(logEntry4) + '\n');
      } catch (e) { }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const logEntry5 = {
      location: 'server/index.ts:login',
      message: 'Login - comparing password',
      data: { email, userId: user.id, hasPasswordHash: !!user.passwordHash },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H'
    };
    try {
      fs.appendFileSync(logPath, JSON.stringify(logEntry5) + '\n');
    } catch (e) { }

    const valid = await bcrypt.compare(password, user.passwordHash);

    const logEntry6 = {
      location: 'server/index.ts:login',
      message: 'Login - password comparison result',
      data: { email, userId: user.id, valid },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H'
    };
    try {
      fs.appendFileSync(logPath, JSON.stringify(logEntry6) + '\n');
    } catch (e) { }

    if (!valid) {
      const logEntry7 = {
        location: 'server/index.ts:login',
        message: 'Login failed - invalid password',
        data: { email, userId: user.id },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H'
      };
      try {
        fs.appendFileSync(logPath, JSON.stringify(logEntry7) + '\n');
      } catch (e) { }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const logEntry8 = {
      location: 'server/index.ts:login',
      message: 'Login - generating token',
      data: { email, userId: user.id, role: user.role, hasJwtSecret: !!JWT_SECRET },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H'
    };
    try {
      fs.appendFileSync(logPath, JSON.stringify(logEntry8) + '\n');
    } catch (e) { }

    const effectiveRole = user.employeeRole || user.role;

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: effectiveRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const logEntry9 = {
      location: 'server/index.ts:login',
      message: 'Login - token generated',
      data: { email, userId: user.id, role: effectiveRole, hasToken: !!token },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H'
    };
    try {
      fs.appendFileSync(logPath, JSON.stringify(logEntry9) + '\n');
    } catch (e) { }

    // Log login action (don't block login if audit log fails)
    try {
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN',
        entityType: 'USER',
        entityId: user.id,
        details: `User logged in: ${user.email} (${user.role})`,
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
        userAgent: req.get('user-agent') || undefined,
      });
    } catch (auditError) {
      // Log error but don't fail login
      const logEntry10 = {
        location: 'server/index.ts:login',
        message: 'Login - audit log error',
        data: { email, userId: user.id, errorMessage: auditError instanceof Error ? auditError.message : String(auditError) },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H'
      };
      try {
        fs.appendFileSync(logPath, JSON.stringify(logEntry10) + '\n');
      } catch (e) { }
      console.error('Audit log error during login:', auditError);
    }

    const logEntry11 = {
      location: 'server/index.ts:login',
      message: 'Login - sending response',
      data: { email, userId: user.id, role: user.role },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H'
    };
    try {
      fs.appendFileSync(logPath, JSON.stringify(logEntry11) + '\n');
    } catch (e) { }

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: effectiveRole,
        initials: user.name
          .split(' ')
          .map((p) => p[0])
          .join('')
          .toUpperCase(),
      },
    });
  } catch (error: any) {
    const logEntryError = {
      location: 'server/index.ts:login',
      message: 'Login - exception caught',
      data: {
        errorMessage: error?.message || String(error),
        errorName: error?.name,
        errorStack: error?.stack,
        email: req.body?.email
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H'
    };
    try {
      fs.appendFileSync(logPath, JSON.stringify(logEntryError) + '\n');
    } catch (e) { }
    throw error; // Re-throw to let asyncHandler handle it
  }
}));

// ===================== CLIENT AUTH =====================
// Note: authLimiter is already applied via app.use('/api/client/login', authLimiter) above
app.post('/api/client/login', asyncHandler(async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  const client = await prisma.client.findUnique({ where: { email } });
  if (!client) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (!client.portalEnabled) {
    return res.status(403).json({ message: 'Client portal access is not enabled for this account' });
  }
  if (!client.passwordHash) {
    return res.status(403).json({ message: 'Password not set. Please contact your attorney.' });
  }

  const valid = await bcrypt.compare(password, client.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Update last login
  await prisma.client.update({
    where: { id: client.id },
    data: { lastLogin: new Date() }
  });

  const token = jwt.sign(
    { sub: client.id, email: client.email, type: 'client' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  // Log client login action
  await createAuditLog({
    clientId: client.id,
    clientEmail: client.email,
    action: 'LOGIN',
    entityType: 'CLIENT',
    entityId: client.id,
    details: `Client logged in: ${client.email}`,
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.get('user-agent') || undefined,
  });

  res.json({
    token,
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      mobile: client.mobile,
      company: client.company,
      type: client.type,
      status: client.status,
    },
  });
}));

// ===================== MATTERS =====================
// Moved to routes/matterRoutes.ts

// ===================== TASKS & TEMPLATES =====================
// Moved to routes/taskRoutes.ts

// ===================== TIME ENTRIES =====================
app.get('/api/time-entries', async (req, res) => {
  try {
    const user = req.user;
    const where: any = {};
    if (user && user.role !== 'Admin' && user.id) {
      where.userId = user.id;
    }

    const entries = await prisma.timeEntry.findMany({ where, orderBy: { date: 'desc' } });
    res.json(entries);
  } catch (err) {
    console.error('Error fetching time entries:', err);
    res.status(500).json({ message: 'Failed to load time entries' });
  }
});

app.post('/api/time-entries', async (req, res) => {
  try {
    const data = req.body; // Partial<TimeEntry>
    const created = await prisma.timeEntry.create({
      data: {
        matterId: data.matterId ?? null,
        description: data.description,
        duration: data.duration,
        rate: data.rate,
        date: data.date ? new Date(data.date) : new Date(),
        billed: data.billed ?? false,
        type: data.type ?? 'time',
        // @ts-ignore
        userId: req.user?.id || null, // Set owner
      },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating time entry:', err);
    res.status(500).json({ message: 'Failed to create time entry' });
  }
});

// ===================== BILLING: markAsBilled =====================
app.post('/api/billing/mark-billed', async (req, res) => {
  try {
    const { matterId } = req.body;

    await prisma.timeEntry.updateMany({
      where: { matterId },
      data: { billed: true },
    });

    await prisma.expense.updateMany({
      where: { matterId },
      data: { billed: true },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking billed:', err);
    res.status(500).json({ message: 'Failed to mark billed' });
  }
});

// ===================== CLIENTS & LEADS =====================
// Clients moved to routes/clientRoutes.ts

app.get('/api/leads', async (req, res) => {
  try {
    const leads = await prisma.lead.findMany();
    res.json(leads);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ message: 'Failed to load leads' });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const data = req.body; // Partial<Lead>
    const created = await prisma.lead.create({
      data: {
        name: data.name,
        source: data.source,
        status: data.status,
        estimatedValue: data.estimatedValue ?? 0,
        practiceArea: data.practiceArea,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ message: 'Failed to create lead' });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    const updated = await prisma.lead.update({
      where: { id },
      data: {
        name: data.name,
        source: data.source,
        status: data.status,
        estimatedValue: data.estimatedValue,
        practiceArea: data.practiceArea,
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.lead.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
});

// ===================== EVENTS =====================
app.get('/api/events', async (req, res) => {
  try {
    const user = req.user;
    const where: any = {};
    if (user && user.role !== 'Admin' && user.id) {
      where.userId = user.id;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { date: 'asc' }
    });
    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ message: 'Failed to load events' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const data = req.body; // Partial<CalendarEvent>
    const created = await prisma.calendarEvent.create({
      data: {
        title: data.title,
        date: data.date ? new Date(data.date) : new Date(),
        type: data.type,
        matterId: data.matterId ?? null,
        // @ts-ignore
        userId: req.user?.id || null, // Set owner
      },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ message: 'Failed to create event' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.calendarEvent.delete({
      where: { id },
    });
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

// ===================== EXPENSES =====================
app.get('/api/expenses', async (req, res) => {
  try {
    const user = req.user;
    const where: any = {};
    if (user && user.role !== 'Admin' && user.id) {
      where.userId = user.id;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { matter: true },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ message: 'Failed to load expenses' });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const data = req.body;
    const created = await prisma.expense.create({
      data: {
        ...(data.matterId ? { matter: { connect: { id: data.matterId } } } : {}),
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: data.date ? new Date(data.date) : new Date(),
        billed: data.billed || false,
        type: data.type ?? 'expense',
        // @ts-ignore
        userId: req.user?.id || null, // Set owner
      },
      include: { matter: true }
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ message: 'Failed to create expense' });
  }
});

// ===================== INVOICES =====================

// Get all invoices with line items and payments
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        client: true,
        matter: true,
        lineItems: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ message: 'Failed to load invoices' });
  }
});

// Get single invoice with details
app.get('/api/invoices/:id', asyncHandler(async (req: any, res: any) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      matter: true,
      lineItems: true,
      payments: true
    }
  });
  if (!invoice) {
    return res.status(404).json({ message: 'Fatura bulunamadı' });
  }
  res.json(invoice);
}));

// Create invoice with line items
app.post('/api/invoices', checkPermission('billing.manage'), asyncHandler(async (req: any, res: any) => {
  const { number, clientId, matterId, dueDate, lineItems, notes, terms, taxRate } = req.body;

  // Calculate totals from line items
  let subtotal = 0;
  if (lineItems && lineItems.length > 0) {
    subtotal = lineItems.reduce((sum: number, item: any) => {
      const itemAmount = (item.quantity || 1) * (item.rate || 0);
      return sum + (item.type === 'DISCOUNT' ? -itemAmount : itemAmount);
    }, 0);
  }

  const taxAmount = taxRate ? subtotal * (taxRate / 100) : 0;
  const amount = subtotal + taxAmount;

  const created = await prisma.invoice.create({
    data: {
      number: number || `INV-${Date.now()}`,
      clientId,
      matterId: matterId || null,
      subtotal,
      taxRate: taxRate || null,
      taxAmount,
      discount: 0,
      amount,
      amountPaid: 0,
      balance: amount,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      status: 'DRAFT',
      notes,
      terms,
      lineItems: lineItems ? {
        create: lineItems.map((item: any) => ({
          type: item.type || 'OTHER',
          description: item.description,
          quantity: item.quantity || 1,
          rate: item.rate || 0,
          amount: (item.quantity || 1) * (item.rate || 0),
          utbmsActivityCode: item.utbmsActivityCode,
          utbmsExpenseCode: item.utbmsExpenseCode,
          taxable: item.taxable !== false,
          billable: item.billable !== false,
          timeEntryId: item.timeEntryId,
          expenseId: item.expenseId
        }))
      } : undefined
    },
    include: { client: true, lineItems: true }
  });

  res.status(201).json(created);
}));

// Update invoice
app.put('/api/invoices/:id', checkPermission('billing.manage'), asyncHandler(async (req: any, res: any) => {
  const { notes, terms, dueDate, taxRate } = req.body;

  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { lineItems: true }
  });

  if (!invoice) {
    return res.status(404).json({ message: 'Fatura bulunamadı' });
  }

  if (invoice.status !== 'DRAFT') {
    return res.status(400).json({ message: 'Sadece taslak faturalar düzenlenebilir' });
  }

  // Recalculate if tax rate changed
  const newTaxRate = taxRate !== undefined ? taxRate : invoice.taxRate;
  const newTaxAmount = newTaxRate ? invoice.subtotal * (newTaxRate / 100) : 0;
  const newAmount = invoice.subtotal + newTaxAmount - invoice.discount;

  const updated = await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      notes,
      terms,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      taxRate: newTaxRate,
      taxAmount: newTaxAmount,
      amount: newAmount,
      balance: newAmount - invoice.amountPaid
    },
    include: { client: true, lineItems: true, payments: true }
  });

  res.json(updated);
}));

// Delete invoice (only drafts)
app.delete('/api/invoices/:id', checkPermission('billing.manage'), asyncHandler(async (req: any, res: any) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });

  if (!invoice) {
    return res.status(404).json({ message: 'Fatura bulunamadı' });
  }

  if (invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED') {
    return res.status(400).json({ message: 'Sadece taslak veya iptal edilmiş faturalar silinebilir' });
  }

  await prisma.invoice.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

// ===================== INVOICE WORKFLOW =====================

// Approve invoice (DRAFT -> APPROVED)
app.post('/api/invoices/:id/approve', checkPermission('billing.approve'), asyncHandler(async (req: any, res: any) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });

  if (!invoice) {
    return res.status(404).json({ message: 'Fatura bulunamadı' });
  }

  if (invoice.status !== 'DRAFT' && invoice.status !== 'PENDING_APPROVAL') {
    return res.status(400).json({ message: 'Sadece taslak veya onay bekleyen faturalar onaylanabilir' });
  }

  const updated = await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: req.body.approvedBy || 'Admin'
    },
    include: { client: true, lineItems: true }
  });

  res.json(updated);
}));

// Send invoice (APPROVED -> SENT)
app.post('/api/invoices/:id/send', asyncHandler(async (req: any, res: any) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { client: true }
  });

  if (!invoice) {
    return res.status(404).json({ message: 'Fatura bulunamadı' });
  }

  if (invoice.status !== 'APPROVED' && invoice.status !== 'DRAFT') {
    return res.status(400).json({ message: 'Fatura gönderilemez, önce onaylanmalı' });
  }

  const updated = await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      status: 'SENT',
      sentAt: new Date()
    },
    include: { client: true, lineItems: true }
  });

  // Send email notification
  if (updated.client) {
    const template = emailTemplates.invoiceSent(
      updated.number,
      updated.amount,
      new Date(updated.dueDate).toLocaleDateString('tr-TR'),
      updated.client.name
    );
    await sendEmail({
      to: updated.client.email,
      subject: template.subject,
      html: template.html,
    });
  }

  res.json(updated);
}));

// ===================== INVOICE LINE ITEMS =====================

// Add line item
app.post('/api/invoices/:id/line-items', asyncHandler(async (req: any, res: any) => {
  const { type, description, quantity, rate, utbmsActivityCode, utbmsExpenseCode, taxable } = req.body;

  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice || invoice.status !== 'DRAFT') {
    return res.status(400).json({ message: 'Sadece taslak faturalara kalem eklenebilir' });
  }

  const amount = (quantity || 1) * (rate || 0);

  const lineItem = await prisma.invoiceLineItem.create({
    data: {
      invoiceId: req.params.id,
      type: type || 'OTHER',
      description,
      quantity: quantity || 1,
      rate: rate || 0,
      amount,
      utbmsActivityCode,
      utbmsExpenseCode,
      taxable: taxable !== false
    }
  });

  // Recalculate invoice totals
  const allItems = await prisma.invoiceLineItem.findMany({ where: { invoiceId: req.params.id } });
  const subtotal = allItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = invoice.taxRate ? subtotal * (invoice.taxRate / 100) : 0;
  const newAmount = subtotal + taxAmount - invoice.discount;

  await prisma.invoice.update({
    where: { id: req.params.id },
    data: { subtotal, taxAmount, amount: newAmount, balance: newAmount - invoice.amountPaid }
  });

  res.status(201).json(lineItem);
}));

// Delete line item
app.delete('/api/invoices/:invoiceId/line-items/:itemId', asyncHandler(async (req: any, res: any) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.invoiceId } });
  if (!invoice || invoice.status !== 'DRAFT') {
    return res.status(400).json({ message: 'Sadece taslak faturalardan kalem silinebilir' });
  }

  await prisma.invoiceLineItem.delete({ where: { id: req.params.itemId } });

  // Recalculate
  const allItems = await prisma.invoiceLineItem.findMany({ where: { invoiceId: req.params.invoiceId } });
  const subtotal = allItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = invoice.taxRate ? subtotal * (invoice.taxRate / 100) : 0;
  const newAmount = subtotal + taxAmount - invoice.discount;

  await prisma.invoice.update({
    where: { id: req.params.invoiceId },
    data: { subtotal, taxAmount, amount: newAmount, balance: newAmount - invoice.amountPaid }
  });

  res.json({ success: true });
}));

// ===================== INVOICE PAYMENTS =====================

// Record payment (partial or full)
app.post('/api/invoices/:id/payments', asyncHandler(async (req: any, res: any) => {
  const { amount, method, reference, notes } = req.body;

  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) {
    return res.status(404).json({ message: 'Fatura bulunamadı' });
  }

  if (amount <= 0) {
    return res.status(400).json({ message: 'Ödeme tutarı pozitif olmalıdır' });
  }

  if (amount > invoice.balance) {
    return res.status(400).json({ message: 'Ödeme tutarı kalan bakiyeyi aşamaz' });
  }

  const payment = await prisma.invoicePayment.create({
    data: {
      invoiceId: req.params.id,
      amount,
      method: method || 'cash',
      reference,
      notes,
      isRefund: false
    }
  });

  const newAmountPaid = invoice.amountPaid + amount;
  const newBalance = invoice.amount - newAmountPaid;
  let newStatus = invoice.status;

  if (newBalance <= 0) {
    newStatus = 'PAID';
  } else if (newAmountPaid > 0) {
    newStatus = 'PARTIALLY_PAID';
  }

  await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      amountPaid: newAmountPaid,
      balance: newBalance,
      status: newStatus,
      paidDate: newStatus === 'PAID' ? new Date() : undefined
    }
  });

  res.status(201).json(payment);
}));

// Refund payment
app.post('/api/invoices/:invoiceId/payments/:paymentId/refund', asyncHandler(async (req: any, res: any) => {
  const { reason } = req.body;

  const payment = await prisma.invoicePayment.findUnique({ where: { id: req.params.paymentId } });
  if (!payment || payment.isRefund) {
    return res.status(400).json({ message: 'Geçersiz ödeme veya zaten iade edilmiş' });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.invoiceId } });
  if (!invoice) {
    return res.status(404).json({ message: 'Fatura bulunamadı' });
  }

  // Create refund record
  const refund = await prisma.invoicePayment.create({
    data: {
      invoiceId: req.params.invoiceId,
      amount: -payment.amount,
      method: payment.method,
      reference: `Refund: ${payment.reference || payment.id}`,
      isRefund: true,
      refundReason: reason,
      notes: `Refund of payment ${payment.id}`
    }
  });

  const newAmountPaid = invoice.amountPaid - payment.amount;
  const newBalance = invoice.amount - newAmountPaid;

  await prisma.invoice.update({
    where: { id: req.params.invoiceId },
    data: {
      amountPaid: newAmountPaid,
      balance: newBalance,
      status: newBalance > 0 ? 'SENT' : 'PAID',
      paidDate: null
    }
  });

  res.json(refund);
}));

// Generate invoice PDF
app.get('/api/invoices/:id/pdf', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  // Get time entries and expenses for this invoice's client matters
  const matters = await prisma.matter.findMany({
    where: { clientId: invoice.clientId },
    include: {
      timeEntries: { where: { billed: false } },
      expenses: { where: { billed: false } },
    },
  });

  // Build invoice items
  const items: Array<{ description: string; quantity: number; rate: number; amount: number }> = [];

  matters.forEach(matter => {
    matter.timeEntries.forEach(entry => {
      items.push({
        description: `${matter.name} - ${entry.description}`,
        quantity: entry.duration / 60, // Convert minutes to hours
        rate: entry.rate,
        amount: (entry.duration / 60) * entry.rate,
      });
    });

    matter.expenses.forEach(expense => {
      items.push({
        description: `${matter.name} - ${expense.description}`,
        quantity: 1,
        rate: expense.amount,
        amount: expense.amount,
      });
    });
  });

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = 0; // Add tax calculation if needed
  const total = subtotal + tax;

  const invoiceData = {
    number: invoice.number,
    date: new Date().toLocaleDateString('tr-TR'),
    dueDate: new Date(invoice.dueDate).toLocaleDateString('tr-TR'),
    clientName: invoice.client.name,
    clientAddress: invoice.client.address || undefined,
    clientCity: invoice.client.city || undefined,
    clientState: invoice.client.state || undefined,
    clientZipCode: invoice.client.zipCode || undefined,
    clientCountry: invoice.client.country || undefined,
    items,
    subtotal,
    tax,
    total: invoice.amount,
    notes: 'Payment terms: Net 30 days',
  };

  const pdfPath = await generateInvoicePDF(invoiceData);
  res.json({ pdfPath, url: `http://localhost:3001${pdfPath}` });
}));

// ===================== NOTIFICATIONS =====================
app.get('/api/notifications', async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const notifications = await prisma.notification.findMany({
      where: { userId: decoded.sub },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    res.json(updated);
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ message: 'Failed to mark notification read' });
  }
});

app.put('/api/notifications/:id/unread', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await prisma.notification.update({
      where: { id },
      data: { read: false }
    });
    res.json(updated);
  } catch (err) {
    console.error('Error marking notification unread:', err);
    res.status(500).json({ message: 'Failed to mark notification unread' });
  }
});

app.put('/api/notifications/read-all', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await prisma.notification.updateMany({
      where: { userId: decoded.sub, read: false },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ message: 'Failed to mark all notifications read' });
  }
});

// ===================== REPORTS =====================
app.get('/api/reports/overview', asyncHandler(async (req: any, res: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  const decoded = jwt.verify(token, JWT_SECRET) as any;

  const { from, to, matterId } = req.query;
  const fromDate = from ? new Date(String(from)) : null;
  const toDate = to ? new Date(String(to)) : null;

  const timeWhere: any = {};
  const expenseWhere: any = {};
  const invoiceWhere: any = {};

  if (matterId) {
    timeWhere.matterId = String(matterId);
    expenseWhere.matterId = String(matterId);
  }
  if (fromDate || toDate) {
    timeWhere.date = {};
    expenseWhere.date = {};
    if (fromDate) {
      timeWhere.date.gte = fromDate;
      expenseWhere.date.gte = fromDate;
    }
    if (toDate) {
      timeWhere.date.lte = toDate;
      expenseWhere.date.lte = toDate;
    }
  }

  const [timeEntries, expenses, invoices] = await prisma.$transaction([
    prisma.timeEntry.findMany({ where: timeWhere }),
    prisma.expense.findMany({ where: expenseWhere }),
    prisma.invoice.findMany({ where: invoiceWhere }),
  ]);

  const unbilledTimeValue = timeEntries.filter(t => !t.billed).reduce((sum, t) => sum + ((t.duration / 60) * (t.rate || 0)), 0);
  const billedTimeValue = timeEntries.filter(t => t.billed).reduce((sum, t) => sum + ((t.duration / 60) * (t.rate || 0)), 0);
  const unbilledExpenseValue = expenses.filter(e => !e.billed).reduce((sum, e) => sum + (e.amount || 0), 0);
  const billedExpenseValue = expenses.filter(e => e.billed).reduce((sum, e) => sum + (e.amount || 0), 0);

  const paidInvoicesTotal = invoices.filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const outstandingInvoicesTotal = invoices.filter((i: any) => i.status === 'SENT' || i.status === 'OVERDUE').reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const overdueInvoicesTotal = invoices.filter((i: any) => i.status === 'OVERDUE').reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

  res.json({
    scope: {
      from: fromDate ? fromDate.toISOString() : null,
      to: toDate ? toDate.toISOString() : null,
      matterId: matterId ? String(matterId) : null,
      requestedBy: { userId: decoded.sub, role: decoded.role },
    },
    wip: {
      unbilledTimeValue,
      unbilledExpenseValue,
      totalWip: unbilledTimeValue + unbilledExpenseValue,
    },
    billed: {
      billedTimeValue,
      billedExpenseValue,
      totalBilledValue: billedTimeValue + billedExpenseValue,
    },
    invoices: {
      paidInvoicesTotal,
      outstandingInvoicesTotal,
      overdueInvoicesTotal,
      overdueCount: invoices.filter((i: any) => i.status === 'OVERDUE').length,
    },
  });
}));

// ===================== USER PROFILE =====================
app.put('/api/user/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const data = req.body;

    // Get old user data for audit log
    const oldUser = await prisma.user.findUnique({ where: { id: decoded.sub } });

    const updated = await prisma.user.update({
      where: { id: decoded.sub },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        barNumber: data.barNumber,
        bio: data.bio
      }
    });

    // Log profile update
    await createAuditLog({
      userId: decoded.sub,
      userEmail: decoded.email || updated.email,
      action: 'UPDATE',
      entityType: 'USER',
      entityId: decoded.sub,
      oldValues: oldUser ? {
        name: oldUser.name,
        email: oldUser.email,
      } : null,
      newValues: {
        name: updated.name,
        email: updated.email,
      },
      details: `User updated profile: ${updated.email}`,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// ===================== ADMIN MIDDLEWARE =====================
// Sadece Admin rolündeki kullanıcılar admin panel API'lerine erişebilir
// Partner ve Associate avukatlar erişemez
// verifyAdmin imported from middleware/auth

// ===================== ADMIN: USER MANAGEMENT =====================
// Get all users
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        mobile: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        barNumber: true,
        bio: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// Create user
app.post('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const { email, name, password, role, phone, mobile, address, city, state, zipCode, country, barNumber, bio } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ message: 'Email, name, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role || 'Associate',
        passwordHash,
        phone: phone || null,
        mobile: mobile || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        country: country || null,
        barNumber: barNumber || null,
        bio: bio || null
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        mobile: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        barNumber: true,
        bio: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Get admin info for audit log
    const admin = await prisma.user.findUnique({ where: { id: req.adminId } });

    // Log user creation
    await createAuditLog({
      userId: req.adminId,
      userEmail: admin?.email || undefined,
      action: 'CREATE',
      entityType: 'USER',
      entityId: user.id,
      newValues: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
      details: `Admin created user: ${user.email} (${user.role})`,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });

    res.status(201).json(user);
  } catch (err: any) {
    console.error('Error creating user:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Update user
app.put('/api/admin/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, password, role, phone, mobile, address, city, state, zipCode, country, barNumber, bio } = req.body;

    const updateData: any = {
      ...(email && { email }),
      ...(name && { name }),
      ...(role && { role }),
      ...(phone !== undefined && { phone }),
      ...(mobile !== undefined && { mobile }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(zipCode !== undefined && { zipCode }),
      ...(country !== undefined && { country }),
      ...(barNumber !== undefined && { barNumber }),
      ...(bio !== undefined && { bio })
    };

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Get old user data for audit log
    const oldUser = await prisma.user.findUnique({ where: { id } });

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        mobile: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        barNumber: true,
        bio: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Get admin info for audit log
    const admin = await prisma.user.findUnique({ where: { id: req.adminId } });

    // Log user update
    await createAuditLog({
      userId: req.adminId,
      userEmail: admin?.email || undefined,
      action: 'UPDATE',
      entityType: 'USER',
      entityId: id,
      oldValues: oldUser ? {
        email: oldUser.email,
        name: oldUser.name,
        role: oldUser.role,
      } : null,
      newValues: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
      details: `Admin updated user: ${user.email}${password ? ' (password changed)' : ''}`,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json(user);
  } catch (err: any) {
    console.error('Error updating user:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/admin/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token!, JWT_SECRET) as any;
    if (decoded.sub === id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Get user data before deletion for audit log
    const deletedUser = await prisma.user.findUnique({ where: { id } });

    await prisma.user.delete({ where: { id } });

    // Get admin info for audit log
    const admin = await prisma.user.findUnique({ where: { id: req.adminId } });

    // Log user deletion
    await createAuditLog({
      userId: req.adminId,
      userEmail: admin?.email || undefined,
      action: 'DELETE',
      entityType: 'USER',
      entityId: id,
      oldValues: deletedUser ? {
        email: deletedUser.email,
        name: deletedUser.name,
        role: deletedUser.role,
      } : null,
      details: `Admin deleted user: ${deletedUser?.email || id}`,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// ===================== ADMIN: CLIENT MANAGEMENT =====================
// Moved to routes/clientRoutes.ts

// ===================== ADMIN: AUDIT LOGS =====================
// List audit logs with pagination & filters (Admin only)
// Query params:
// - page (default 1), limit (default 50, max 200)
// - action, entityType, entityId, userId, clientId
// - email (matches userEmail/clientEmail)
// - q (searches action/entityType/entityId/details/userEmail/clientEmail/ipAddress)
// - from, to (ISO date range on createdAt)
app.get('/api/admin/audit-logs', verifyAdmin, async (req: any, res: any) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
    const skip = (page - 1) * limit;

    const action = req.query.action ? String(req.query.action) : undefined;
    const entityType = req.query.entityType ? String(req.query.entityType) : undefined;
    const entityId = req.query.entityId ? String(req.query.entityId) : undefined;
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const clientId = req.query.clientId ? String(req.query.clientId) : undefined;
    const email = req.query.email ? String(req.query.email) : undefined;
    const q = req.query.q ? String(req.query.q) : undefined;
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;

    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (clientId) where.clientId = clientId;

    const and: any[] = [];

    if (email) {
      and.push({
        OR: [
          { userEmail: { contains: email } },
          { clientEmail: { contains: email } },
        ],
      });
    }

    if (q) {
      and.push({
        OR: [
          { action: { contains: q } },
          { entityType: { contains: q } },
          { entityId: { contains: q } },
          { details: { contains: q } },
          { userEmail: { contains: q } },
          { clientEmail: { contains: q } },
          { ipAddress: { contains: q } },
        ],
      });
    }

    if (from || to) {
      const createdAt: any = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) createdAt.gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime())) createdAt.lte = d;
      }
      if (Object.keys(createdAt).length > 0) {
        and.push({ createdAt });
      }
    }

    if (and.length > 0) {
      where.AND = and;
    }

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const safeParse = (value: any) => {
      if (!value || typeof value !== 'string') return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };

    const mapped = items.map((i: any) => ({
      ...i,
      oldValuesRaw: i.oldValues ?? null,
      newValuesRaw: i.newValues ?? null,
      oldValues: safeParse(i.oldValues),
      newValues: safeParse(i.newValues),
    }));

    res.json({
      page,
      limit,
      total,
      items: mapped,
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ message: 'Failed to load audit logs' });
  }
});

// ===================== GOOGLE OAUTH2 =====================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

app.post('/api/google/oauth', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' });
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens in database (in production, associate with user)
    // For now, return tokens to frontend (store in localStorage)
    res.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });
  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).json({ message: 'Failed to exchange authorization code' });
  }
});

// ===================== VIDEO CALL API =====================
// Google Meet - Create meeting via Calendar API
app.post('/api/video-calls/google-meet', async (req, res) => {
  try {
    const { accessToken, title, startTime, endTime, description } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: 'Access token required' });
    }

    const event = {
      summary: title,
      description: description || '',
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${error}`);
    }

    const data = await response.json();

    res.json({
      id: data.id,
      title: data.summary,
      startTime: data.start.dateTime,
      endTime: data.end.dateTime,
      meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri || '',
      hangoutLink: data.hangoutLink,
      conferenceId: data.conferenceData?.conferenceId
    });
  } catch (err: any) {
    console.error('Error creating Google Meet:', err);
    res.status(500).json({ message: err.message || 'Failed to create Google Meet' });
  }
});

// Microsoft Teams - Create meeting via Graph API
app.post('/api/video-calls/teams', async (req, res) => {
  try {
    const { accessToken, subject, startTime, endTime, content } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: 'Access token required' });
    }

    const event = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: content || ''
      },
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness'
    };

    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${error}`);
    }

    const data = await response.json();

    res.json({
      id: data.id,
      subject: data.subject,
      startTime: data.start.dateTime,
      endTime: data.end.dateTime,
      joinUrl: data.onlineMeeting?.joinUrl || '',
      meetingUrl: data.webLink || ''
    });
  } catch (err: any) {
    console.error('Error creating Teams meeting:', err);
    res.status(500).json({ message: err.message || 'Failed to create Teams meeting' });
  }
});

// Zoom - Create meeting via Zoom API
app.post('/api/video-calls/zoom', async (req, res) => {
  try {
    const { accessToken, topic, startTime, duration, password } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: 'Access token required' });
    }

    const meeting = {
      topic: topic,
      type: 2, // Scheduled meeting
      start_time: new Date(startTime).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      duration: duration || 60,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      password: password || Math.random().toString(36).substring(2, 10),
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: false,
        waiting_room: false
      }
    };

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(meeting)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zoom API error: ${error}`);
    }

    const data = await response.json();

    res.json({
      id: String(data.id),
      topic: data.topic,
      startTime: data.start_time,
      duration: data.duration,
      joinUrl: data.join_url,
      startUrl: data.start_url,
      password: data.password
    });
  } catch (err: any) {
    console.error('Error creating Zoom meeting:', err);
    res.status(500).json({ message: err.message || 'Failed to create Zoom meeting' });
  }
});

// ===================== MICROSOFT OAUTH2 =====================
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/microsoft/callback';

app.post('/api/microsoft/oauth', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code: code,
        redirect_uri: MICROSOFT_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Microsoft OAuth error: ${error}`);
    }

    const tokens = await tokenResponse.json();

    res.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: Date.now() + (tokens.expires_in * 1000)
    });
  } catch (err: any) {
    console.error('Microsoft OAuth error:', err);
    res.status(500).json({ message: err.message || 'Failed to exchange authorization code' });
  }
});

// ===================== ZOOM OAUTH2 =====================
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID || '';
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || '';
const ZOOM_REDIRECT_URI = process.env.ZOOM_REDIRECT_URI || 'http://localhost:3000/auth/zoom/callback';

app.post('/api/zoom/oauth', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: ZOOM_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Zoom OAuth error: ${error}`);
    }

    const tokens = await tokenResponse.json();

    res.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: Date.now() + (tokens.expires_in * 1000)
    });
  } catch (err: any) {
    console.error('Zoom OAuth error:', err);
    res.status(500).json({ message: err.message || 'Failed to exchange authorization code' });
  }
});

// ===================== CLIENT PORTAL API =====================
// Middleware to verify client token
const verifyClientToken = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'client') return res.status(403).json({ message: 'Invalid token type' });

    const client = await prisma.client.findUnique({ where: { id: decoded.sub } });
    if (!client || !client.portalEnabled) return res.status(403).json({ message: 'Client portal access denied' });

    req.clientId = decoded.sub;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get client's matters
app.get('/api/client/matters', verifyClientToken, async (req, res) => {
  try {
    const matters = await prisma.matter.findMany({
      where: { clientId: req.clientId },
      include: {
        timeEntries: { orderBy: { date: 'desc' } }, // All time entries, not just unbilled
        expenses: { orderBy: { date: 'desc' } }, // All expenses, not just unbilled
        tasks: { orderBy: { dueDate: 'asc' } },
        events: { orderBy: { date: 'asc' } }
      },
      orderBy: { openDate: 'desc' }
    });
    res.json(matters);
  } catch (err) {
    console.error('Error fetching client matters:', err);
    res.status(500).json({ message: 'Failed to load matters' });
  }
});

// Get client's invoices
app.get('/api/client/invoices', verifyClientToken, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { clientId: req.clientId },
      orderBy: { dueDate: 'desc' }
    });
    res.json(invoices);
  } catch (err) {
    console.error('Error fetching client invoices:', err);
    res.status(500).json({ message: 'Failed to load invoices' });
  }
});

// Get client's documents (filtered by matters)
app.get('/api/client/documents', verifyClientToken, async (req, res) => {
  try {
    const matters = await prisma.matter.findMany({
      where: { clientId: req.clientId },
      select: { id: true }
    });
    const matterIds = matters.map(m => m.id);

    // Note: Documents are stored locally in frontend, but we can return matter IDs
    // In production, you'd have a Document model linked to matters
    res.json({ matterIds, message: 'Documents are managed per matter' });
  } catch (err) {
    console.error('Error fetching client documents:', err);
    res.status(500).json({ message: 'Failed to load documents' });
  }
});

// Get client messages
app.get('/api/client/messages', verifyClientToken, async (req, res) => {
  try {
    const messages = await prisma.clientMessage.findMany({
      where: { clientId: req.clientId },
      include: { matter: { select: { id: true, name: true, caseNumber: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(messages);
  } catch (err) {
    console.error('Error fetching client messages:', err);
    res.status(500).json({ message: 'Failed to load messages' });
  }
});

// Send message to attorney
app.post('/api/client/messages', verifyClientToken, express.json({ limit: '50mb' }), async (req, res) => {
  try {
    // Handle both JSON and FormData
    let matterId, subject, message, attachments;

    if (req.headers['content-type']?.includes('application/json')) {
      ({ matterId, subject, message, attachments } = req.body);
    } else {
      // For FormData, we'd need multer, but for now we'll accept JSON with base64 files
      ({ matterId, subject, message, attachments } = req.body);
    }

    if (!subject || !message) return res.status(400).json({ message: 'Subject and message required' });

    const created = await prisma.clientMessage.create({
      data: {
        clientId: req.clientId,
        matterId: matterId || null,
        subject,
        message,
        // Store attachments metadata if provided
        ...(attachments && { attachments: JSON.stringify(attachments) })
      }
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating client message:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Get client notifications
app.get('/api/client/notifications', verifyClientToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { clientId: req.clientId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching client notifications:', err);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
});

// Mark notification as read
app.put('/api/client/notifications/:id/read', verifyClientToken, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, clientId: req.clientId },
      data: { read: true }
    });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

// Mark notification as unread
app.put('/api/client/notifications/:id/unread', verifyClientToken, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, clientId: req.clientId },
      data: { read: false }
    });
    res.json({ message: 'Notification marked as unread' });
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

// Get client profile
app.get('/api/client/profile', verifyClientToken, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        mobile: true,
        company: true,
        type: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true
      }
    });
    res.json(client);
  } catch (err) {
    console.error('Error fetching client profile:', err);
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

// Update client profile
app.put('/api/client/profile', verifyClientToken, async (req, res) => {
  try {
    const { name, phone, mobile, address, city, state, zipCode, country } = req.body;

    // Get old client data for audit log
    const oldClient = await prisma.client.findUnique({ where: { id: req.clientId } });

    const updated = await prisma.client.update({
      where: { id: req.clientId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(mobile !== undefined && { mobile }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode }),
        ...(country !== undefined && { country })
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        mobile: true,
        company: true,
        type: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true
      }
    });

    // Get client info for audit log
    const client = await prisma.client.findUnique({ where: { id: req.clientId } });

    // Log client profile update
    await createAuditLog({
      clientId: req.clientId,
      clientEmail: client?.email || undefined,
      action: 'UPDATE',
      entityType: 'CLIENT',
      entityId: req.clientId,
      oldValues: oldClient ? {
        name: oldClient.name,
        email: oldClient.email,
      } : null,
      newValues: {
        name: updated.name,
        email: updated.email,
      },
      details: `Client updated profile: ${updated.email}`,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating client profile:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Upload client document
app.post('/api/client/documents/upload', verifyClientToken, uploadSingle, asyncHandler(async (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const { matterId, description, tags } = req.body;
  const originalName = req.file.originalname || 'document';
  const groupKey = `${matterId || 'unassigned'}:${originalName}`.toLowerCase();

  const latest = await prisma.document.findFirst({
    where: { groupKey },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (latest?.version || 0) + 1;

  const document = await prisma.document.create({
    data: {
      name: originalName,
      fileName: req.file.filename,
      filePath: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      matterId: matterId || null,
      uploadedBy: req.clientId,
      description: description || null,
      groupKey,
      version: nextVersion,
      tags: tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
    },
  });

  // Get client info for audit log
  const client = await prisma.client.findUnique({ where: { id: req.clientId } });

  // Log document upload
  await createAuditLog({
    clientId: req.clientId,
    clientEmail: client?.email || undefined,
    action: 'UPLOAD',
    entityType: 'DOCUMENT',
    entityId: document.id,
    newValues: {
      name: document.name,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      matterId: document.matterId,
    },
    details: `Client uploaded document: ${document.name} (${(document.fileSize / 1024).toFixed(2)} KB)`,
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.get('user-agent') || undefined,
  });

  res.status(201).json(document);
}));

// ===================== DOCUMENT UPLOAD (Attorney) =====================
// Upload single document
// ===================== ADMIN: USERS (ATTORNEYS) =====================
app.get('/api/admin/users', verifyAdmin, asyncHandler(async (req: any, res: any) => {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      mobile: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      country: true,
      barNumber: true,
      bio: true
    }
  });
  res.json(users);
}));

app.post('/api/admin/users', verifyAdmin, asyncHandler(async (req: any, res: any) => {
  const { email, name, password, role, phone, mobile } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: role || 'Associate',
      phone,
      mobile
    }
  });

  const { passwordHash: _, ...userWithoutPassword } = user;
  res.status(201).json(userWithoutPassword);
}));

app.put('/api/admin/users/:id', verifyAdmin, asyncHandler(async (req: any, res: any) => {
  const { name, role, phone, mobile, address, city, state, zipCode, country, barNumber, bio } = req.body;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      name,
      role,
      phone,
      mobile,
      address,
      city,
      state,
      zipCode,
      country,
      barNumber,
      bio
    }
  });

  const { passwordHash: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
}));

app.delete('/api/admin/users/:id', verifyAdmin, asyncHandler(async (req: any, res: any) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }

  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: 'User deleted' });
}));

// ===================== ADMIN: CLIENTS =====================
app.get('/api/admin/clients', verifyAdmin, asyncHandler(async (req: any, res: any) => {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' }
  });
  res.json(clients);
}));

app.put('/api/admin/clients/:id', verifyAdmin, asyncHandler(async (req: any, res: any) => {
  const { name, email, phone, mobile, company, type, status, address, city, state, zipCode, country, taxId, notes, password, portalEnabled } = req.body;

  const data: any = {
    name, email, phone, mobile, company, type, status,
    address, city, state, zipCode, country, taxId, notes, portalEnabled
  };

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const client = await prisma.client.update({
    where: { id: req.params.id },
    data
  });

  res.json(client);
}));

app.delete('/api/admin/clients/:id', verifyAdmin, asyncHandler(async (req: any, res: any) => {
  await prisma.client.delete({ where: { id: req.params.id } });
  res.json({ message: 'Client deleted' });
}));

// ===================== ADMIN: AUDIT LOGS =====================
app.get('/api/admin/audit-logs', verifyAdmin, asyncHandler(async (req: any, res: any) => {
  const { page = 1, limit = 50, action, entityType, entityId, userId, clientId, email, q, from, to } = req.query;

  const where: any = {};

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (clientId) where.clientId = clientId;
  if (email) {
    where.OR = [
      { userEmail: { contains: email as string } },
      { clientEmail: { contains: email as string } }
    ];
  }
  if (q) {
    where.details = { contains: q as string };
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from as string);
    if (to) where.createdAt.lte = new Date(to as string);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    }),
    prisma.auditLog.count({ where })
  ]);

  res.json({
    data: logs,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    }
  });
}));

// ===================== DOCUMENT UPLOAD (Attorney) =====================
// Upload single document
app.post('/api/documents/upload', uploadSingle, asyncHandler(async (req: any, res: any) => {
  try {
    if (!req.file) {
      console.error('[UPLOAD] No file received. Headers:', req.headers);
      return res.status(400).json({ message: 'No file uploaded. Please select a file.' });
    }

    const { matterId, description, tags } = req.body;

    // Check if user is authenticated (token check is done by verifyToken global middleware or manual check)
    // Here we check if req.user is populated OR if we need to verify manually
    let userId = req.user?.id;
    let userRole = req.user?.role;

    if (!userId) {
      // Fallback manual check if global middleware didn't populate it (unlikely but safe)
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ message: 'Unauthorized - Login required' });

      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        userId = decoded.sub;
        userRole = decoded.role;
      } catch (err) {
        return res.status(401).json({ message: 'Unauthorized - Invalid token' });
      }
    }

    const originalName = req.file.originalname || 'document';
    const groupKey = `${matterId || 'unassigned'}:${originalName}`.toLowerCase();

    const latest = await prisma.document.findFirst({
      where: { groupKey },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version || 0) + 1;

    // Fix path separators for Windows
    const relativePath = `/uploads/${req.file.filename}`;

    const document = await prisma.document.create({
      data: {
        name: originalName,
        fileName: req.file.filename,
        filePath: relativePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        matterId: matterId || null,
        uploadedBy: userId,
        description: description || null,
        groupKey,
        version: nextVersion,
        tags: tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
      },
    });

    // Log document upload
    const user = await prisma.user.findUnique({ where: { id: userId } });

    try {
      await createAuditLog({
        userId: userId,
        userEmail: user?.email,
        action: 'UPLOAD',
        entityType: 'DOCUMENT',
        entityId: document.id,
        newValues: {
          name: document.name,
          fileName: document.fileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          matterId: document.matterId,
        },
        details: `User uploaded document: ${document.name} (${(document.fileSize / 1024).toFixed(2)} KB)`,
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
        userAgent: req.get('user-agent') || undefined,
      });
    } catch (auditErr) {
      console.error('Audit log error on upload:', auditErr);
      // Don't fail the upload just because audit log failed
    }

    res.status(201).json(document);
  } catch (error: any) {
    console.error('[UPLOAD ERROR] Full error:', error);
    res.status(500).json({
      message: 'Dosya yüklenirken sunucu hatası oluştu',
      error: error.message
    });
  }
}));


// Get documents
app.get('/api/documents', asyncHandler(async (req: any, res: any) => {
  const { matterId, q } = req.query;
  const where: any = {};
  if (matterId) where.matterId = matterId as string;
  if (q) {
    const query = String(q);
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { tags: { contains: query, mode: 'insensitive' } },
      { textContent: { contains: query, mode: 'insensitive' } },
    ];
  }
  const documents = await prisma.document.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { createdAt: 'desc' },
  });
  res.json(documents);
}));

// Bulk assign documents to a matter
app.put('/api/documents/bulk-assign', asyncHandler(async (req: any, res: any) => {
  const { ids, matterId } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids[] is required' });
  }
  const updated = await prisma.document.updateMany({
    where: { id: { in: ids } },
    data: { matterId: matterId || null },
  });

  const userInfo = getUserInfoFromRequest(req);
  await createAuditLog({
    ...userInfo,
    action: 'UPDATE',
    entityType: 'DOCUMENT',
    details: `Bulk assigned ${ids.length} documents to matterId=${matterId || 'null'}`,
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.get('user-agent') || undefined,
  });

  res.json({ success: true, updated });
}));

// Update document (assign matter, tags, description)
app.put('/api/documents/:id', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { matterId, description, tags } = req.body || {};

  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Document not found' });

  const updated = await prisma.document.update({
    where: { id },
    data: {
      matterId: matterId === '' ? null : matterId ?? undefined,
      description: description === '' ? null : description ?? undefined,
      tags: tags === '' ? null : (tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : undefined),
    },
  });

  // Audit
  const userInfo = getUserInfoFromRequest(req);
  await createAuditLog({
    ...userInfo,
    action: 'UPDATE',
    entityType: 'DOCUMENT',
    entityId: id,
    oldValues: {
      matterId: existing.matterId,
      description: existing.description,
      tags: existing.tags,
    },
    newValues: {
      matterId: updated.matterId,
      description: updated.description,
      tags: updated.tags,
    },
    details: `Document updated: ${updated.name}`,
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.get('user-agent') || undefined,
  });

  res.json(updated);
}));

// Delete document
app.delete('/api/documents/:id', checkPermission('document.delete'), asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    return res.status(404).json({ message: 'Document not found' });
  }

  // Get user info for audit log
  const userInfo = getUserInfoFromRequest(req);

  // Delete file from filesystem
  const filePath = path.join(uploadsDir, document.fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.document.delete({ where: { id } });

  // Log document deletion
  await createAuditLog({
    ...userInfo,
    action: 'DELETE',
    entityType: 'DOCUMENT',
    entityId: id,
    oldValues: {
      name: document.name,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
    },
    details: `Document deleted: ${document.name}`,
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.get('user-agent') || undefined,
  });

  res.json({ success: true });
}));

// ===================== PASSWORD RESET =====================
// Request password reset
app.post('/api/auth/forgot-password', asyncHandler(async (req: any, res: any) => {
  const { email, userType } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  let user: any = null;
  if (userType === 'client') {
    user = await prisma.client.findUnique({ where: { email } });
  } else {
    user = await prisma.user.findUnique({ where: { email } });
  }

  if (!user) {
    // Don't reveal if user exists for security
    return res.json({ message: 'If the email exists, a password reset link has been sent.' });
  }

  // Generate reset token
  const resetToken = jwt.sign(
    { email, userType, type: 'password-reset' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Save token to database
  await prisma.passwordResetToken.create({
    data: {
      email,
      token: resetToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  // Send email
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  const template = emailTemplates.passwordReset(resetLink, user.name);
  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });

  res.json({ message: 'If the email exists, a password reset link has been sent.' });
}));

// Reset password with token
app.post('/api/auth/reset-password', asyncHandler(async (req: any, res: any) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  // Verify token
  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  if (decoded.type !== 'password-reset') {
    return res.status(400).json({ message: 'Invalid token type' });
  }

  // Check if token exists and is not used
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  // Update password
  const passwordHash = await bcrypt.hash(password, 10);
  if (decoded.userType === 'client') {
    await prisma.client.update({
      where: { email: decoded.email },
      data: { passwordHash },
    });
  } else {
    await prisma.user.update({
      where: { email: decoded.email },
      data: { passwordHash },
    });
  }

  // Mark token as used
  await prisma.passwordResetToken.update({
    where: { token },
    data: { used: true },
  });

  res.json({ message: 'Password reset successfully' });
}));

// ===================== DOCUMENT TEMPLATES API =====================

// Get all templates
app.get('/api/templates', asyncHandler(async (req, res) => {
  const templates = await prisma.documentTemplate.findMany({
    orderBy: { updatedAt: 'desc' },
  });
  res.json(templates);
}));

// Get single template
app.get('/api/templates/:id', asyncHandler(async (req, res) => {
  const template = await prisma.documentTemplate.findUnique({
    where: { id: req.params.id },
  });
  if (!template) {
    return res.status(404).json({ message: 'Template not found' });
  }
  res.json(template);
}));

// Create template
app.post('/api/templates', asyncHandler(async (req, res) => {
  const { name, category, description, content, variables, isActive } = req.body;

  if (!name || !category || !content) {
    return res.status(400).json({ message: 'Name, category, and content are required' });
  }

  const template = await prisma.documentTemplate.create({
    data: {
      name,
      category,
      description,
      content,
      variables,
      isActive: isActive ?? true,
    },
  });

  res.status(201).json(template);
}));

// Update template
app.put('/api/templates/:id', asyncHandler(async (req, res) => {
  const { name, category, description, content, variables, isActive } = req.body;

  const template = await prisma.documentTemplate.update({
    where: { id: req.params.id },
    data: {
      name,
      category,
      description,
      content,
      variables,
      isActive,
    },
  });

  res.json(template);
}));

// Delete template
app.delete('/api/templates/:id', asyncHandler(async (req, res) => {
  await prisma.documentTemplate.delete({
    where: { id: req.params.id },
  });
  res.status(204).send();
}));

// ===================== TRUST ACCOUNTING =====================

// Get trust transactions for a matter
app.get('/api/matters/:matterId/trust', asyncHandler(async (req, res) => {
  const { matterId } = req.params;
  const transactions = await prisma.trustTransaction.findMany({
    where: { matterId },
    orderBy: { createdAt: 'desc' },
  });
  const matter = await prisma.matter.findUnique({ where: { id: matterId }, select: { trustBalance: true } });
  res.json({ transactions, currentBalance: matter?.trustBalance || 0 });
}));

// Create trust transaction
app.post('/api/matters/:matterId/trust', checkPermission('trust.manage'), asyncHandler(async (req, res) => {
  const { matterId } = req.params;
  const { type, amount, description, reference } = req.body;

  const matter = await prisma.matter.findUnique({ where: { id: matterId } });
  if (!matter) return res.status(404).json({ error: 'Matter not found' });

  let newBalance = matter.trustBalance;
  if (type === 'deposit') newBalance += amount;
  else if (type === 'withdrawal' || type === 'transfer') newBalance -= amount;
  else if (type === 'refund') newBalance -= amount;

  const transaction = await prisma.trustTransaction.create({
    data: {
      matterId,
      type,
      amount,
      description,
      reference,
      balanceBefore: matter.trustBalance,
      balanceAfter: newBalance,
      createdBy: req.adminId
    },
  });

  await prisma.matter.update({ where: { id: matterId }, data: { trustBalance: newBalance } });

  // Calculate total deposits to check for 15% threshold
  const deposits = await prisma.trustTransaction.aggregate({
    where: { matterId, type: 'DEPOSIT' },
    _sum: { amount: true }
  });
  const totalDeposited = (deposits._sum.amount || 0); // Aggregate already includes the current deposit if type is 'deposit'

  // Notification Logic
  if (totalDeposited > 0) {
    const ratio = newBalance / totalDeposited;
    if (ratio <= 0.15 && ratio > 0) {
      // Low balance warning
      await prisma.notification.create({
        data: {
          userId: req.adminId, // Notify admin/attorney
          title: 'Low Trust Balance Warning',
          message: `Trust balance for matter is below 15% ($${newBalance.toFixed(2)} / $${totalDeposited.toFixed(2)})`,
          type: 'warning',
          link: `/matters/${matterId}?tab=trust`
        }
      });
    } else if (newBalance <= 0) {
      // Negative/Zero balance warning
      await prisma.notification.create({
        data: {
          userId: req.adminId,
          title: 'Trust Balance Depleted',
          message: `Trust balance for matter is zero or negative ($${newBalance.toFixed(2)})`,
          type: 'error',
          link: `/matters/${matterId}?tab=trust`
        }
      });
    }
  }

  const userInfo = getUserInfoFromRequest(req);
  await createAuditLog({ ...userInfo, action: 'CREATE', entityType: 'TRUST_TRANSACTION', entityId: transaction.id, details: `${type} $${amount}` });

  res.status(201).json(transaction);
}));

// ===================== DOCUMENTS =====================

// Delete document
app.delete('/api/documents/:id', checkPermission('document.delete'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Potentially add logic here to delete the actual file from storage if applicable
  await prisma.document.delete({
    where: { id },
  });
  const userInfo = getUserInfoFromRequest(req);
  await createAuditLog({ ...userInfo, action: 'DELETE', entityType: 'DOCUMENT', entityId: id, details: `Document ${id} deleted` });
  res.status(204).send();
}));

// ===================== EMPLOYEES =====================

// Get all employees
app.get('/api/employees', asyncHandler(async (req, res) => {
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json(employees);
}));

// Get single employee
app.get('/api/employees/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return res.status(404).json({ message: 'Employee not found' });
  res.json(employee);
}));

// Create employee
app.post('/api/employees', checkPermission('user.manage'), asyncHandler(async (req, res) => {
  const data = req.body;
  // If password provided, hash it for user account creation handled by trigger or separate logic?
  // For simplicity, we create the employee record. If user account is needed, it should be linked.
  // The frontend sends password, so we might want to create a User account too.

  let userId = undefined;
  let tempPassword = undefined;

  // Auto-create user account logic
  if (data.email) {
    // If password provided use it, otherwise generate one
    const rawPassword = data.password || Math.random().toString(36).slice(-8);

    // Only create user if password provided OR we generated one (always true now if email exists)
    if (rawPassword) {
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      try {
        const user = await prisma.user.create({
          data: {
            email: data.email,
            name: `${data.firstName} ${data.lastName}`,
            role: 'Employee', // General role
            employeeRole: data.role, // Specific role (PARALEGAL etc.)
            passwordHash
          }
        });
        userId = user.id;
        if (!data.password) {
          tempPassword = rawPassword; // Return this to frontend
        }
      } catch (userErr: any) {
        if (userErr.code === 'P2002') {
          // User already exists. Link it and UPDATE attributes (password/role)
          const existing = await prisma.user.findUnique({ where: { email: data.email } });
          if (existing) {
            userId = existing.id;
            // Update the existing user with new role/password if generated
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                passwordHash, // Update to the new password hash (whether provided or generated)
                employeeRole: data.role, // Update role matches new employee
                role: 'Employee'
              }
            });
            if (!data.password) {
              tempPassword = rawPassword; // Ensure we return the password that is now active
            }
          }
        } else {
          console.error('Failed to create user account for employee:', userErr);
        }
      }
    }
  }

  const employee = await prisma.employee.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      role: data.role,
      status: data.status || 'ACTIVE',
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
      hourlyRate: data.hourlyRate,
      salary: data.salary,
      notes: data.notes,
      address: data.address,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      userId // Link to system user if created
    }
  });

  const userInfo = getUserInfoFromRequest(req);
  await createAuditLog({ ...userInfo, action: 'CREATE', entityType: 'EMPLOYEE', entityId: employee.id, details: `Employee ${employee.firstName} ${employee.lastName} created` });

  res.status(201).json({ ...employee, tempPassword });
}));

// Update employee
app.put('/api/employees/:id', checkPermission('user.manage'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      role: data.role,
      status: data.status,
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
      hourlyRate: data.hourlyRate,
      salary: data.salary,
      notes: data.notes,
      address: data.address,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone
    }
  });

  const userInfo = getUserInfoFromRequest(req);
  await createAuditLog({ ...userInfo, action: 'UPDATE', entityType: 'EMPLOYEE', entityId: id, details: 'Employee updated' });

  res.json(employee);
}));

// Delete employee
app.delete('/api/employees/:id', checkPermission('user.manage'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Remove assignment from Tasks
  await prisma.task.updateMany({
    where: { assignedEmployeeId: id },
    data: { assignedEmployeeId: null }
  });

  // 2. Remove supervisor role from other Employees
  await prisma.employee.updateMany({
    where: { supervisorId: id },
    data: { supervisorId: null }
  });

  // 3. Delete the Employee
  await prisma.employee.delete({ where: { id } });

  const userInfo = getUserInfoFromRequest(req);
  await createAuditLog({ ...userInfo, action: 'DELETE', entityType: 'EMPLOYEE', entityId: id, details: 'Employee deleted' });

  res.status(204).send();
}));

// Reset employee password
app.post('/api/employees/:id/reset-password', checkPermission('user.manage'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee || !employee.userId) {
    return res.status(404).json({ message: 'Employee or linked user account not found' });
  }

  // Generate random password
  const tempPassword = Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({
    where: { id: employee.userId },
    data: { passwordHash }
  });

  // Ideally send email here

  const userInfo = getUserInfoFromRequest(req);
  await createAuditLog({ ...userInfo, action: 'UPDATE', entityType: 'EMPLOYEE', entityId: id, details: 'Password reset' });

  res.json({ message: 'Password reset successfully', tempPassword });
}));

// ===================== WORKFLOWS =====================

// Get all workflows
app.get('/api/workflows', asyncHandler(async (req, res) => {
  const workflows = await prisma.workflow.findMany({ orderBy: { createdAt: 'desc' }, include: { executions: { take: 5, orderBy: { executedAt: 'desc' } } } });
  res.json(workflows);
}));

// Create workflow
app.post('/api/workflows', asyncHandler(async (req, res) => {
  const { name, description, trigger, triggerConfig, actions, isActive } = req.body;
  const workflow = await prisma.workflow.create({
    data: { name, description, trigger, triggerConfig, actions: JSON.stringify(actions), isActive: isActive ?? true, createdBy: req.adminId },
  });
  res.status(201).json(workflow);
}));

// Update workflow
app.put('/api/workflows/:id', asyncHandler(async (req, res) => {
  const { name, description, trigger, triggerConfig, actions, isActive } = req.body;
  const workflow = await prisma.workflow.update({
    where: { id: req.params.id },
    data: { name, description, trigger, triggerConfig, actions: actions ? JSON.stringify(actions) : undefined, isActive },
  });
  res.json(workflow);
}));

// Delete workflow
app.delete('/api/workflows/:id', asyncHandler(async (req, res) => {
  await prisma.workflow.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

// ===================== APPOINTMENT REQUESTS =====================

// Get appointment requests (for attorneys)
app.get('/api/appointments', asyncHandler(async (req, res) => {
  const appointments = await prisma.appointmentRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: { select: { id: true, name: true, email: true } } },
  });
  res.json(appointments);
}));

// Update appointment status (approve/reject)
app.put('/api/appointments/:id', asyncHandler(async (req, res) => {
  const { status, approvedDate, assignedTo } = req.body;
  const appointment = await prisma.appointmentRequest.update({
    where: { id: req.params.id },
    data: { status, approvedDate: approvedDate ? new Date(approvedDate) : undefined, assignedTo },
  });
  res.json(appointment);
}));

// Client: Create appointment request
app.post('/api/client/appointments', asyncHandler(async (req: any, res) => {
  if (!req.clientId) return res.status(401).json({ error: 'Client auth required' });
  const { matterId, requestedDate, duration, type, notes } = req.body;
  const appointment = await prisma.appointmentRequest.create({
    data: { clientId: req.clientId, matterId, requestedDate: new Date(requestedDate), duration: duration || 30, type, notes },
  });
  res.status(201).json(appointment);
}));

// Client: Get my appointments
app.get('/api/client/appointments', asyncHandler(async (req: any, res) => {
  if (!req.clientId) return res.status(401).json({ error: 'Client auth required' });
  const appointments = await prisma.appointmentRequest.findMany({
    where: { clientId: req.clientId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(appointments);
}));

// ===================== INTAKE FORMS =====================

// Get intake forms
app.get('/api/intake-forms', asyncHandler(async (req, res) => {
  const forms = await prisma.intakeForm.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  res.json(forms);
}));

// Create intake form
app.post('/api/intake-forms', asyncHandler(async (req, res) => {
  const { name, description, fields, practiceArea, isActive } = req.body;
  const form = await prisma.intakeForm.create({
    data: { name, description, fields: JSON.stringify(fields), practiceArea, isActive: isActive ?? true, createdBy: req.adminId },
  });
  res.status(201).json(form);
}));

// Get intake submissions
app.get('/api/intake-submissions', asyncHandler(async (req, res) => {
  const submissions = await prisma.intakeSubmission.findMany({
    orderBy: { createdAt: 'desc' },
    include: { form: { select: { name: true } } },
  });
  res.json(submissions);
}));

// Public: Submit intake form
app.post('/api/public/intake/:formId', asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const form = await prisma.intakeForm.findUnique({ where: { id: formId } });
  if (!form || !form.isActive) return res.status(404).json({ error: 'Form not found' });

  const submission = await prisma.intakeSubmission.create({
    data: { formId, data: JSON.stringify(req.body) },
  });
  res.status(201).json({ success: true, id: submission.id });
}));

// Update intake submission (review, convert)
app.put('/api/intake-submissions/:id', asyncHandler(async (req, res) => {
  const { status, notes, convertedToClientId, convertedToMatterId } = req.body;
  const submission = await prisma.intakeSubmission.update({
    where: { id: req.params.id },
    data: { status, notes, convertedToClientId, convertedToMatterId, reviewedBy: req.adminId, reviewedAt: new Date() },
  });
  res.json(submission);
}));

// ===================== SETTLEMENT STATEMENTS =====================

// Get settlement statements for a matter
app.get('/api/matters/:matterId/settlement', asyncHandler(async (req, res) => {
  const statements = await prisma.settlementStatement.findMany({
    where: { matterId: req.params.matterId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(statements);
}));

// Create settlement statement
app.post('/api/matters/:matterId/settlement', asyncHandler(async (req, res) => {
  const { grossSettlement, attorneyFees, expenses, liens, breakdown } = req.body;
  const netToClient = grossSettlement - attorneyFees - expenses - (liens || 0);

  const statement = await prisma.settlementStatement.create({
    data: {
      matterId: req.params.matterId,
      grossSettlement,
      attorneyFees,
      expenses,
      liens,
      netToClient,
      breakdown: breakdown ? JSON.stringify(breakdown) : undefined,
    },
  });
  res.status(201).json(statement);
}));

// Update settlement statement
app.put('/api/settlement/:id', asyncHandler(async (req, res) => {
  const { status, clientApprovedAt } = req.body;
  const statement = await prisma.settlementStatement.update({
    where: { id: req.params.id },
    data: { status, clientApprovedAt: clientApprovedAt ? new Date(clientApprovedAt) : undefined },
  });
  res.json(statement);
}));

// ===================== SIGNATURE REQUESTS =====================

// Create signature request
app.post('/api/documents/:documentId/signature', asyncHandler(async (req, res) => {
  const { clientId, expiresAt } = req.body;
  const request = await prisma.signatureRequest.create({
    data: { documentId: req.params.documentId, clientId, expiresAt: expiresAt ? new Date(expiresAt) : undefined },
  });
  res.status(201).json(request);
}));

// Client: Sign document
app.post('/api/client/sign/:requestId', asyncHandler(async (req: any, res) => {
  if (!req.clientId) return res.status(401).json({ error: 'Client auth required' });
  const { signatureData } = req.body;

  const request = await prisma.signatureRequest.findUnique({ where: { id: req.params.requestId } });
  if (!request || request.clientId !== req.clientId) return res.status(404).json({ error: 'Signature request not found' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

  const updated = await prisma.signatureRequest.update({
    where: { id: req.params.requestId },
    data: { status: 'signed', signedAt: new Date(), signatureData, ipAddress: req.ip, userAgent: req.get('user-agent') },
  });
  res.json(updated);
}));

// Get signature requests for a document
app.get('/api/documents/:documentId/signatures', asyncHandler(async (req, res) => {
  const requests = await prisma.signatureRequest.findMany({
    where: { documentId: req.params.documentId },
    include: { client: { select: { name: true, email: true } } },
  });
  res.json(requests);
}));

// ===================== STATIC FILES & FRONTEND =====================
// Serve static files from dist folder in production
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const distPath = process.platform === 'win32'
  ? path.join(__dirname, '..', 'dist')
  : path.join(__dirname.replace(/^\/([A-Za-z]:)/, '$1'), '..', 'dist');

if (process.env.NODE_ENV === 'production') {
  // Serve static files
  app.use(express.static(distPath));

  // Handle React Router - serve index.html for all non-API routes
  // Express 5 requires named wildcard parameters
  app.get('/{*splat}', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Development mode - just show API info
  app.get('/', (req, res) => {
    res.json({
      message: 'JurisFlow API Server',
      frontend: 'Please access the frontend at http://localhost:3000',
      api: 'API endpoints are available at /api/*'
    });
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===================== EMPLOYEES (Çalışanlar) =====================

// Get all employees
app.get('/api/employees', asyncHandler(async (req: any, res: any) => {
  const employees = await prisma.employee.findMany({
    include: {
      user: { select: { id: true, email: true, name: true } },
      supervisor: { select: { id: true, firstName: true, lastName: true } },
      assignedTasks: { select: { id: true, title: true, status: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(employees);
}));

// Get single employee
app.get('/api/employees/:id', asyncHandler(async (req: any, res: any) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      supervisor: { select: { id: true, firstName: true, lastName: true } },
      subordinates: { select: { id: true, firstName: true, lastName: true, role: true } },
      assignedTasks: true
    }
  });
  if (!employee) {
    return res.status(404).json({ message: 'Çalışan bulunamadı' });
  }
  res.json(employee);
}));

// Create employee with user account
app.post('/api/employees', asyncHandler(async (req: any, res: any) => {
  const { firstName, lastName, email, phone, mobile, role, hireDate, hourlyRate, salary, notes, address, emergencyContact, emergencyPhone, supervisorId, password } = req.body;

  if (!firstName || !lastName || !email || !role) {
    return res.status(400).json({ message: 'Ad, soyad, e-posta ve rol zorunludur' });
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  const existingEmployee = await prisma.employee.findUnique({ where: { email } });
  if (existingUser || existingEmployee) {
    return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
  }

  // Create user account for employee login
  const defaultPassword = password || 'calisankisi123'; // Default temp password
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: `${firstName} ${lastName}`,
      role: 'Employee', // Employee role for staff
      employeeRole: role,
      passwordHash
    }
  });

  // Create employee record
  const employee = await prisma.employee.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      mobile,
      role, // SECRETARY | PARALEGAL | INTERN_LAWYER | ACCOUNTANT
      hireDate: hireDate ? new Date(hireDate) : new Date(),
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      salary: salary ? parseFloat(salary) : null,
      notes,
      address,
      emergencyContact,
      emergencyPhone,
      supervisorId: supervisorId || null,
      userId: user.id
    },
    include: {
      user: { select: { id: true, email: true, name: true } }
    }
  });

  res.status(201).json(employee);
}));

// Update employee
app.put('/api/employees/:id', asyncHandler(async (req: any, res: any) => {
  const { firstName, lastName, phone, mobile, role, status, hireDate, terminationDate, hourlyRate, salary, notes, address, emergencyContact, emergencyPhone, supervisorId } = req.body;

  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) {
    return res.status(404).json({ message: 'Çalışan bulunamadı' });
  }

  const updated = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      firstName: firstName ?? employee.firstName,
      lastName: lastName ?? employee.lastName,
      phone,
      mobile,
      role: role ?? employee.role,
      status: status ?? employee.status,
      hireDate: hireDate ? new Date(hireDate) : employee.hireDate,
      terminationDate: terminationDate ? new Date(terminationDate) : null,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : employee.hourlyRate,
      salary: salary ? parseFloat(salary) : employee.salary,
      notes,
      address,
      emergencyContact,
      emergencyPhone,
      supervisorId: supervisorId || null
    },
    include: {
      user: { select: { id: true, email: true, name: true } }
    }
  });

  // Update user's employeeRole if role changed
  if (role && employee.userId) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { employeeRole: role }
    });
  }

  res.json(updated);
}));

// Delete employee
app.delete('/api/employees/:id', asyncHandler(async (req: any, res: any) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) {
    return res.status(404).json({ message: 'Çalışan bulunamadı' });
  }

  // Delete associated user account if exists
  if (employee.userId) {
    await prisma.user.delete({ where: { id: employee.userId } }).catch(() => { });
  }

  await prisma.employee.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Çalışan silindi' });
}));

// Reset employee password
app.post('/api/employees/:id/reset-password', asyncHandler(async (req: any, res: any) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee || !employee.userId) {
    return res.status(404).json({ message: 'Çalışan veya hesabı bulunamadı' });
  }

  const tempPassword = 'gecici' + Math.random().toString(36).slice(-6);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({
    where: { id: employee.userId },
    data: { passwordHash }
  });

  // In production, send email with new password
  res.json({ success: true, tempPassword, message: 'Şifre sıfırlandı' });
}));

// Assign task to employee
app.post('/api/employees/:id/assign-task', asyncHandler(async (req: any, res: any) => {
  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ message: 'Görev ID gerekli' });
  }

  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) {
    return res.status(404).json({ message: 'Çalışan bulunamadı' });
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { assignedEmployeeId: req.params.id }
  });

  res.json({ success: true, task });
}));


// Error handler (must be last)
app.use(errorHandler);

// ===================== SERVER =====================
const PORT = process.env.PORT || 3001;

// Create logs directory if it doesn't exist
// ================================
// DEADLINE RULES API
// ================================

// Get all deadline rules
app.get('/api/deadline-rules', asyncHandler(async (req, res) => {
  const rules = await prisma.deadlineRule.findMany({
    orderBy: { priority: 'desc' },
    include: { calculatedDeadlines: { take: 5, orderBy: { dueDate: 'asc' } } }
  });
  res.json(rules);
}));

// Create deadline rule
app.post('/api/deadline-rules', asyncHandler(async (req, res) => {
  const { name, description, type, baseDays, useBusinessDays, excludeHolidays, triggerEvent, jurisdiction, practiceArea, reminderDays, priority } = req.body;
  const rule = await prisma.deadlineRule.create({
    data: {
      name,
      description,
      type,
      baseDays,
      useBusinessDays: useBusinessDays ?? true,
      excludeHolidays: excludeHolidays ?? true,
      triggerEvent,
      jurisdiction,
      practiceArea,
      reminderDays: reminderDays ? JSON.stringify(reminderDays) : '[30, 7, 1]',
      priority: priority ?? 0,
      createdBy: req.adminId
    }
  });
  res.status(201).json(rule);
}));

// Update deadline rule
app.put('/api/deadline-rules/:id', asyncHandler(async (req, res) => {
  const { name, description, baseDays, useBusinessDays, excludeHolidays, reminderDays, isActive, priority } = req.body;
  const rule = await prisma.deadlineRule.update({
    where: { id: req.params.id },
    data: { name, description, baseDays, useBusinessDays, excludeHolidays, reminderDays: reminderDays ? JSON.stringify(reminderDays) : undefined, isActive, priority }
  });
  res.json(rule);
}));

// Delete deadline rule
app.delete('/api/deadline-rules/:id', asyncHandler(async (req, res) => {
  await prisma.deadlineRule.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

// Calculate deadline from a rule
app.post('/api/deadline-rules/:ruleId/calculate', asyncHandler(async (req, res) => {
  const { matterId, triggerDate } = req.body;
  const rule = await prisma.deadlineRule.findUnique({ where: { id: req.params.ruleId } });
  if (!rule) return res.status(404).json({ error: 'Rule not found' });

  const trigger = new Date(triggerDate);
  let dueDate = new Date(trigger);

  if (rule.useBusinessDays) {
    // Add business days (skip weekends)
    let daysAdded = 0;
    while (daysAdded < rule.baseDays) {
      dueDate.setDate(dueDate.getDate() + 1);
      const day = dueDate.getDay();
      if (day !== 0 && day !== 6) daysAdded++; // Skip Saturday/Sunday
    }
  } else {
    dueDate.setDate(dueDate.getDate() + rule.baseDays);
  }

  const deadline = await prisma.calculatedDeadline.create({
    data: {
      ruleId: rule.id,
      matterId,
      triggerDate: trigger,
      dueDate,
      status: 'pending'
    },
    include: { rule: true }
  });
  res.status(201).json(deadline);
}));

// Get calculated deadlines for a matter
app.get('/api/matters/:matterId/deadlines', asyncHandler(async (req, res) => {
  const deadlines = await prisma.calculatedDeadline.findMany({
    where: { matterId: req.params.matterId },
    include: { rule: true },
    orderBy: { dueDate: 'asc' }
  });
  res.json(deadlines);
}));

// Update deadline status
app.put('/api/deadlines/:id', asyncHandler(async (req, res) => {
  const { status, notes, completedAt } = req.body;
  const deadline = await prisma.calculatedDeadline.update({
    where: { id: req.params.id },
    data: { status, notes, completedAt: status === 'completed' ? new Date() : completedAt }
  });
  res.json(deadline);
}));

// Get all upcoming deadlines (for dashboard/notifications)
app.get('/api/deadlines/upcoming', asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const deadlines = await prisma.calculatedDeadline.findMany({
    where: {
      status: 'pending',
      dueDate: { lte: thirtyDaysLater }
    },
    include: { rule: true },
    orderBy: { dueDate: 'asc' }
  });
  res.json(deadlines);
}));

// ================================
// DOCUMENT VERSION API
// ================================

// Get document versions
app.get('/api/documents/:documentId/versions', asyncHandler(async (req, res) => {
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: req.params.documentId },
    orderBy: { versionNumber: 'desc' }
  });
  res.json(versions);
}));

// Create new document version
app.post('/api/documents/:documentId/versions', asyncHandler(async (req, res) => {
  const { fileName, filePath, fileSize, mimeType, changeNote, checksum } = req.body;
  const documentId = req.params.documentId;

  // Get current version number
  const latestVersion = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { versionNumber: 'desc' }
  });

  const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  // Mark all previous as not latest
  await prisma.documentVersion.updateMany({
    where: { documentId },
    data: { isLatest: false }
  });

  // Create new version
  const version = await prisma.documentVersion.create({
    data: {
      documentId,
      versionNumber: newVersionNumber,
      fileName,
      filePath,
      fileSize,
      mimeType,
      changeNote,
      checksum,
      changedBy: req.adminId,
      isLatest: true
    }
  });

  // Update document's version number
  await prisma.document.update({
    where: { id: documentId },
    data: { version: newVersionNumber }
  });

  res.status(201).json(version);
}));

// Restore a previous version
app.post('/api/documents/:documentId/versions/:versionId/restore', asyncHandler(async (req, res) => {
  const { documentId, versionId } = req.params;

  const oldVersion = await prisma.documentVersion.findUnique({ where: { id: versionId } });
  if (!oldVersion) return res.status(404).json({ error: 'Version not found' });

  // Create a new version with old version's content
  const latestVersion = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { versionNumber: 'desc' }
  });

  const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  await prisma.documentVersion.updateMany({
    where: { documentId },
    data: { isLatest: false }
  });

  const restoredVersion = await prisma.documentVersion.create({
    data: {
      documentId,
      versionNumber: newVersionNumber,
      fileName: oldVersion.fileName,
      filePath: oldVersion.filePath,
      fileSize: oldVersion.fileSize,
      mimeType: oldVersion.mimeType,
      changeNote: `Restored from version ${oldVersion.versionNumber}`,
      checksum: oldVersion.checksum,
      changedBy: req.adminId,
      isLatest: true
    }
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { version: newVersionNumber }
  });

  res.status(201).json(restoredVersion);
}));

// ================================
// TRUST ACCOUNT API
// ================================

// Get trust transactions for a matter
app.get('/api/matters/:matterId/trust', asyncHandler(async (req, res) => {
  const transactions = await prisma.trustTransaction.findMany({
    where: { matterId: req.params.matterId },
    orderBy: { createdAt: 'desc' }
  });
  res.json(transactions);
}));

// Record trust transaction
app.post('/api/matters/:matterId/trust', asyncHandler(async (req, res) => {
  const { type, amount, description, reference, isEarned } = req.body;
  const matterId = req.params.matterId;

  // Get current balance
  const lastTransaction = await prisma.trustTransaction.findFirst({
    where: { matterId },
    orderBy: { createdAt: 'desc' }
  });

  const balanceBefore = lastTransaction?.balanceAfter ?? 0;
  let balanceAfter = balanceBefore;

  // Calculate new balance
  if (['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes(type)) {
    balanceAfter = balanceBefore + amount;
  } else if (['WITHDRAWAL', 'TRANSFER_OUT', 'REFUND_TO_CLIENT', 'FEE_EARNED'].includes(type)) {
    balanceAfter = balanceBefore - amount;
  }

  const transaction = await prisma.trustTransaction.create({
    data: {
      matterId,
      type,
      amount,
      description,
      reference,
      isEarned: isEarned ?? false,
      earnedDate: isEarned ? new Date() : null,
      balanceBefore,
      balanceAfter,
      createdBy: req.adminId
    }
  });

  res.status(201).json(transaction);
}));

// Get trust balance summary
app.get('/api/trust/summary', asyncHandler(async (req, res) => {
  const transactions = await prisma.trustTransaction.findMany();

  const matterBalances: Record<string, { total: number; earned: number; unearned: number }> = {};

  transactions.forEach(t => {
    if (!matterBalances[t.matterId]) {
      matterBalances[t.matterId] = { total: 0, earned: 0, unearned: 0 };
    }
    const balance = matterBalances[t.matterId];
    balance.total = t.balanceAfter;
    if (t.isEarned) balance.earned += t.amount;
    else balance.unearned = t.balanceAfter;
  });

  const totalTrust = Object.values(matterBalances).reduce((sum, b) => sum + b.total, 0);
  const totalEarned = Object.values(matterBalances).reduce((sum, b) => sum + b.earned, 0);

  res.json({ totalTrust, totalEarned, matterBalances });
}));

// Create trust replenishment request
app.post('/api/trust-requests', asyncHandler(async (req, res) => {
  const { matterId, clientId, requestedAmount, currentBalance, minimumRequired, notes } = req.body;

  const request = await prisma.trustRequest.create({
    data: {
      matterId,
      clientId,
      requestedAmount,
      currentBalance,
      minimumRequired,
      notes,
      createdBy: req.adminId
    }
  });
  res.status(201).json(request);
}));

// Get trust requests
app.get('/api/trust-requests', asyncHandler(async (req, res) => {
  const requests = await prisma.trustRequest.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json(requests);
}));

// ===================== EMPLOYEES =====================
app.get('/api/employees', asyncHandler(async (req, res) => {
  const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'desc' }, include: { user: true } });
  res.json(employees);
}));

app.get('/api/employees/:id', asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!employee) return res.status(404).json({ message: 'Çalışan bulunamadı' });
  res.json(employee);
}));

app.post('/api/employees', asyncHandler(async (req, res) => {
  const { firstName, lastName, email, role, phone, hourlyRate, salary, hireDate } = req.body;

  // Check email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ message: 'Bu e-posta adresi kullanımda.' });

  // Create User account first (Default password: email prefix + 123)
  const defaultPassword = email.split('@')[0] + '123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const userRole = role === 'PARALEGAL' || role === 'INTERN_LAWYER' ? 'Employee' : 'Associate';

  const user = await prisma.user.create({
    data: {
      email,
      name: `${firstName} ${lastName}`,
      role: userRole,
      employeeRole: role,
      passwordHash,
      phone
    }
  });

  const employee = await prisma.employee.create({
    data: {
      firstName,
      lastName,
      email,
      role,
      phone,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      salary: salary ? parseFloat(salary) : null,
      hireDate: hireDate ? new Date(hireDate) : new Date(),
      userId: user.id
    }
  });

  res.status(201).json(employee);
}));

app.put('/api/employees/:id', asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, hourlyRate, salary, status } = req.body;
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      firstName,
      lastName,
      phone,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      salary: salary ? parseFloat(salary) : undefined,
      status
    }
  });

  if (employee.userId) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { name: `${firstName} ${lastName}` }
    });
  }

  res.json(employee);
}));

app.delete('/api/employees/:id', asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (employee && employee.userId) {
    try { await prisma.user.delete({ where: { id: employee.userId } }); } catch (e) { }
  }
  await prisma.employee.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

app.post('/api/employees/:id/reset-password', asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee || !employee.email) return res.status(404).json({ message: 'Çalışan veya email bulunamadı' });

  const newPassword = employee.email.split('@')[0] + '123';
  const passwordHash = await bcrypt.hash(newPassword, 10);

  if (employee.userId) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { passwordHash }
    });
  }

  res.json({ message: 'Şifre sıfırlandı', tempPassword: newPassword });
}));

app.post('/api/employees/:id/assign-task', asyncHandler(async (req, res) => {
  const { taskId } = req.body;
  await prisma.task.update({
    where: { id: taskId },
    data: { assignedEmployeeId: req.params.id }
  });
  res.json({ success: true });
}));

// ===================== NOTIFICATIONS =====================
app.get('/api/notifications', asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json(notifications);
}));

app.put('/api/notifications/:id/read', asyncHandler(async (req, res) => {
  await prisma.notification.update({
    where: { id: req.params.id },
    data: { read: true }
  });
  res.json({ success: true });
}));

app.put('/api/notifications/read-all', asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true }
  });
  res.json({ success: true });
}));

// ===================== NOTIFICATION LOOP =====================
const startNotificationLoop = () => {
  setInterval(async () => {
    try {
      const now = new Date();

      // 1. Calendar Events (15 mins before)
      const upcomingEvents = await (prisma.calendarEvent as any).findMany({
        where: {
          date: {
            gt: now,
            lte: new Date(now.getTime() + 15 * 60 * 1000)
          }
        },
        include: { matter: true }
      });

      for (const event of upcomingEvents) {
        const evt = event as any;
        if (evt.reminderSent) continue;
        const targetUserId = evt.userId;
        if (targetUserId) {
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              title: 'Yaklaşan Etkinlik',
              message: `${evt.title} 15 dakika içinde başlayacak.`,
              type: 'info',
              link: '/calendar',
            }
          });
          try {
            await (prisma.calendarEvent as any).update({
              where: { id: evt.id },
              data: { reminderSent: true }
            });
          } catch (e) { /* Field may not exist */ }
        }
      }

      // 2. Tasks (Due within 24 hours)
      const upcomingTasks = await (prisma.task as any).findMany({
        where: {
          dueDate: {
            gt: now,
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000)
          },
          status: { not: 'Done' }
        }
      });

      for (const task of upcomingTasks) {
        const t = task as any;
        if (t.reminderSent) continue;
        let notifyUserId = t.userId;
        if (t.assignedEmployeeId) {
          const emp = await prisma.employee.findUnique({ where: { id: t.assignedEmployeeId } });
          if (emp && emp.userId) notifyUserId = emp.userId;
        }
        if (notifyUserId) {
          await prisma.notification.create({
            data: {
              userId: notifyUserId,
              title: 'Son Tarih Yaklaşıyor',
              message: `Görev: ${t.title} için son tarih yarın.`,
              type: 'warning',
              link: `/tasks`,
            }
          });
          try {
            await (prisma.task as any).update({
              where: { id: t.id },
              data: { reminderSent: true }
            });
          } catch (e) { /* Field may not exist */ }
        }
      }

    } catch (e) {
      console.error("Notification Loop Error:", e);
    }
  }, 60 * 1000);
};

// NOTE: startNotificationLoop is called after server starts - see below

// ================================

if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs', { recursive: true });
}

// Run database migrations on startup (for production)
// Run database migrations on startup (for production)
const runDbMigrations = async () => {
  console.log('Starting startup sequence...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    try {
      const { execSync } = await import('child_process');
      console.log('Running prisma db push...');
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        stdio: 'inherit',
        env: process.env as NodeJS.ProcessEnv
      });
      console.log('Database schema synced successfully');
    } catch (error) {
      console.error('Failed to sync database schema:', error);
    }
  } else {
    console.log('Skipping migration. Reason: ' +
      (process.env.NODE_ENV !== 'production' ? 'Not production. ' : '') +
      (!process.env.DATABASE_URL ? 'DATABASE_URL missing.' : '')
    );
  }
};

// Start server immediately (don't wait for migrations)
const startServer = () => {
  console.log('[SERVER] Starting server...');
  const HOST = '0.0.0.0';
  const port = Number(process.env.PORT) || 3001;

  // Serve static files in production (Vite build output)
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    console.log('[SERVER] Serving static files from:', distPath);
    app.use(express.static(distPath));

    // SPA fallback middleware - serve index.html for all non-API routes
    app.use((req, res, next) => {
      // Skip API and upload routes
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }
      // Only handle GET requests for SPA fallback
      if (req.method !== 'GET') {
        return next();
      }
      // Serve index.html for all other routes (SPA routing)
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, HOST, () => {
    console.log(`[SERVER] Server running on http://${HOST}:${port}`);
    logger.info(`Server running on http://${HOST}:${port}`);

    // Run migrations in background (non-blocking)
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
      console.log('[SERVER] Running prisma db push in background...');
      import('child_process').then(({ exec }) => {
        exec('npx prisma db push --skip-generate --accept-data-loss', (error, stdout, stderr) => {
          if (error) {
            console.error('[SERVER] Migration error:', error.message);
          } else {
            console.log('[SERVER] Migration completed:', stdout);
          }
        });
      }).catch(err => console.error('[SERVER] Failed to import child_process:', err));
    }

    // Start notification loop AFTER server is listening
    startNotificationLoop();

    // Initialize admin and test accounts in background (non-blocking)
    // These run after server is listening so healthcheck can respond
    console.log('[SERVER] Initializing admin and test accounts in background...');
    ensureAdmin().catch((err) => console.error('❌ ensureAdmin error:', err));
    ensureTestAccounts().catch((err) => console.error('❌ ensureTestAccounts failed:', err));
    ensureTestAttorney().catch((err) => console.error('❌ ensureTestAttorney failed:', err));
  });
};

console.log('[SERVER] Calling startServer()...');
startServer();
