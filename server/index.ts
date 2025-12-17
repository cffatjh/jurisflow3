// server/index.ts
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
import { errorHandler, asyncHandler, logger } from './middleware/errorHandler.js';
import { auditLog, createAuditLog, getUserInfoFromRequest } from './middleware/auditLog.js';
import { sendEmail, emailTemplates } from './services/emailService.js';
import { generateInvoicePDF } from './services/pdfService.js';
import { uploadSingle, uploadMultiple } from './middleware/fileUpload.js';

declare global {
  namespace Express {
    interface Request {
      adminId?: string;
      clientId?: string;
    }
  }
}

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
  if (req.path === '/api/login' || req.path === '/api/client/login') {
    return next();
  }
  rateLimitLogger(req, res, () => {
    limiter(req, res, next);
  });
});

app.use('/api/login', authLimiter);
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

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'cffatjh@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '4354e643a83C9';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// Ensure an admin user exists for real authentication
const ensureAdmin = async () => {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: 'Admin User',
        role: 'Admin',
        passwordHash,
      },
    });
  }
};
ensureAdmin().catch(() => { });

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
  } catch (err) {
    // Silently ignore errors
  }
};
ensureTestAccounts().catch(() => { });

// Ensure a test attorney account exists (Partner role - NOT Admin)
const ensureTestAttorney = async () => {
  try {
    const attorneyEmail = 'avukat@gmail.com';
    const attorneyPassword = 'avukat';

    let attorney = await prisma.user.findUnique({ where: { email: attorneyEmail } });

    if (!attorney) {
      const passwordHash = await bcrypt.hash(attorneyPassword, 10);
      attorney = await prisma.user.create({
        data: {
          email: attorneyEmail,
          name: 'Test Avukat',
          role: 'Partner', // Normal avukat - Admin değil
          passwordHash,
          phone: '555-0200',
          address: '456 Attorney Street',
          city: 'Istanbul',
          state: 'Istanbul',
          zipCode: '34000',
          country: 'Turkey'
        }
      });
      // Test attorney created silently
      logger.info('Test attorney created', { email: attorneyEmail, role: 'Partner' });
    } else {
      // Update password if exists but password changed
      const passwordHash = await bcrypt.hash(attorneyPassword, 10);
      await prisma.user.update({
        where: { email: attorneyEmail },
        data: {
          passwordHash,
          role: 'Partner' // Ensure it's not Admin
        }
      });
      // Test attorney updated silently
      logger.info('Test attorney updated', { email: attorneyEmail, role: 'Partner' });
    }
  } catch (err) {
    // Ignore errors (might be duplicate email constraint)
    logger.warn('Could not setup test attorney (might already exist)');
  }
};
ensureTestAttorney().catch((err) => console.error('Failed to ensure test attorney', err));

// ===================== HEALTH CHECK =====================
// Required for Railway/production health monitoring
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const logEntry9 = {
      location: 'server/index.ts:login',
      message: 'Login - token generated',
      data: { email, userId: user.id, hasToken: !!token },
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
        role: user.role,
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
app.get('/api/matters', async (req, res) => {
  try {
    const matters = await prisma.matter.findMany({
      include: {
        client: true,
        timeEntries: true,
        expenses: true,
        tasks: true,
        events: true,
      },
    });
    res.json(matters);
  } catch (err) {
    console.error('Error fetching matters:', err);
    res.status(500).json({ message: 'Failed to load matters' });
  }
});

app.post('/api/matters', async (req, res) => {
  try {
    const data = req.body; // Partial<Matter> geliyor

    let clientId = data.clientId as string | undefined;

    // If matter is opened from a Lead, convert Lead -> Client first
    if (!clientId && data.sourceLeadId) {
      const lead = await prisma.lead.findUnique({ where: { id: data.sourceLeadId } });
      if (!lead) {
        return res.status(400).json({ message: 'Lead not found for conversion' });
      }

      const newClient = await prisma.client.create({
        data: {
          name: lead.name,
          email: data.clientEmail ?? '',
          phone: data.clientPhone ?? null,
          mobile: data.clientMobile ?? null,
          company: data.clientCompany ?? null,
          type: data.clientType ?? 'Individual',
          status: 'Active',
          address: data.clientAddress ?? null,
          city: data.clientCity ?? null,
          state: data.clientState ?? null,
          zipCode: data.clientZipCode ?? null,
          country: data.clientCountry ?? null,
          taxId: data.clientTaxId ?? null,
          notes: data.clientNotes ?? null,
        },
      });

      // Remove lead after conversion
      await prisma.lead.delete({ where: { id: lead.id } });
      clientId = newClient.id;
    }

    if (!clientId) {
      return res.status(400).json({ message: 'clientId is required to create a matter' });
    }

    const created = await prisma.matter.create({
      data: {
        caseNumber: data.caseNumber,
        name: data.name,
        practiceArea: data.practiceArea,
        status: data.status,
        feeStructure: data.feeStructure,
        openDate: data.openDate ? new Date(data.openDate) : undefined,
        responsibleAttorney: data.responsibleAttorney,
        billableRate: data.billableRate,
        trustBalance: data.trustBalance ?? 0,
        clientId,
      },
      include: { client: true },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating matter:', err);
    res.status(500).json({ message: 'Failed to create matter' });
  }
});

app.put('/api/matters/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    const updated = await prisma.matter.update({
      where: { id },
      data: {
        name: data.name,
        caseNumber: data.caseNumber,
        practiceArea: data.practiceArea,
        status: data.status,
        feeStructure: data.feeStructure,
        billableRate: data.billableRate,
        trustBalance: data.trustBalance,
      },
      include: { client: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('Error updating matter:', err);
    res.status(500).json({ message: 'Failed to update matter' });
  }
});

app.delete('/api/matters/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.matter.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting matter:', err);
    res.status(500).json({ message: 'Failed to delete matter' });
  }
});

// ===================== TASKS =====================
app.get('/api/tasks', async (req, res) => {
  try {
    const { matterId } = req.query;
    const tasks = await prisma.task.findMany({
      where: matterId ? { matterId: matterId as string } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Failed to load tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const data = req.body; // Partial<Task>
    const created = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
        priority: data.priority,
        status: data.status,
        matterId: data.matterId ?? null,
        assignedTo: data.assignedTo ?? null,
        templateId: data.templateId ?? null,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body; // Partial<Task>

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: data.title ?? undefined,
        description: data.description ?? undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : data.reminderAt === null ? null : undefined,
        priority: data.priority ?? undefined,
        status: data.status ?? undefined,
        matterId: data.matterId === null ? null : data.matterId ?? undefined,
        assignedTo: data.assignedTo === null ? null : data.assignedTo ?? undefined,
        templateId: data.templateId === null ? null : data.templateId ?? undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : data.completedAt === null ? null : undefined,
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

app.put('/api/tasks/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const updated = await prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'Done' ? new Date() : null,
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Error updating task status:', err);
    res.status(500).json({ message: 'Failed to update task status' });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.task.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

// ===================== TASK TEMPLATES =====================
app.get('/api/task-templates', async (req, res) => {
  try {
    const count = await prisma.taskTemplate.count();
    if (count === 0) {
      // Seed a couple of useful templates for first-run UX
      await prisma.taskTemplate.createMany({
        data: [
          {
            name: 'İcra Takibi (Basit)',
            category: 'İcra',
            description: 'İcra dosyası açılışından tebligat ve haciz aşamasına kadar temel görev listesi.',
            definition: JSON.stringify({
              defaults: { priority: 'Medium', status: 'To Do' },
              tasks: [
                { title: 'Dosya açılış evraklarını topla', offsetDays: 0, priority: 'High' },
                { title: 'Borçlu adres/kimlik doğrulama', offsetDays: 0, priority: 'Medium' },
                { title: 'Takip talebi hazırlama', offsetDays: 1, priority: 'High' },
                { title: 'Ödeme emri tebligat takibi', offsetDays: 3, priority: 'Medium' },
                { title: 'İtiraz kontrolü', offsetDays: 10, priority: 'High' },
                { title: 'Haciz talebi hazırlığı', offsetDays: 14, priority: 'Medium' },
              ],
            }),
          },
          {
            name: 'Dava Dosyası Açılış',
            category: 'Genel',
            description: 'Yeni matter açıldığında yapılacak temel checklist.',
            definition: JSON.stringify({
              defaults: { priority: 'Medium', status: 'To Do' },
              tasks: [
                { title: 'Vekalet / sözleşme kontrolü', offsetDays: 0, priority: 'High' },
                { title: 'Müvekkil evraklarını yükle ve etiketle', offsetDays: 0, priority: 'Medium' },
                { title: 'İlk strateji notu / yol haritası', offsetDays: 1, priority: 'Medium' },
                { title: 'İlk duruşma/son tarihleri ajandaya ekle', offsetDays: 1, priority: 'High' },
              ],
            }),
          },
        ],
      });
    }

    const templates = await prisma.taskTemplate.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(templates);
  } catch (err) {
    console.error('Error fetching task templates:', err);
    res.status(500).json({ message: 'Failed to load task templates' });
  }
});

app.post('/api/task-templates', async (req, res) => {
  try {
    const { name, category, description, definition, isActive } = req.body || {};
    if (!name || !definition) {
      return res.status(400).json({ message: 'name and definition are required' });
    }
    const created = await prisma.taskTemplate.create({
      data: {
        name,
        category: category ?? null,
        description: description ?? null,
        definition: typeof definition === 'string' ? definition : JSON.stringify(definition),
        isActive: isActive ?? true,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating task template:', err);
    res.status(500).json({ message: 'Failed to create task template' });
  }
});

app.post('/api/tasks/from-template', async (req, res) => {
  try {
    const { templateId, matterId, assignedTo, baseDate } = req.body || {};
    if (!templateId) return res.status(400).json({ message: 'templateId is required' });

    const template = await prisma.taskTemplate.findUnique({ where: { id: templateId } });
    if (!template) return res.status(404).json({ message: 'Template not found' });

    let parsed: any;
    try {
      parsed = JSON.parse(template.definition);
    } catch {
      return res.status(400).json({ message: 'Template definition is invalid JSON' });
    }

    const tasks: Array<any> = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    const defaults = parsed?.defaults || {};
    const base = baseDate ? new Date(baseDate) : new Date();

    const created = await prisma.$transaction(
      tasks.map((t: any) => {
        const offsetDays = Number(t.offsetDays || 0);
        const due = new Date(base.getTime());
        due.setDate(due.getDate() + offsetDays);

        const reminderAt = t.reminderOffsetDays !== undefined
          ? (() => {
            const r = new Date(base.getTime());
            r.setDate(r.getDate() + Number(t.reminderOffsetDays || 0));
            return r;
          })()
          : null;

        return prisma.task.create({
          data: {
            title: t.title,
            description: t.description ?? null,
            dueDate: due,
            reminderAt,
            priority: t.priority || defaults.priority || 'Medium',
            status: t.status || defaults.status || 'To Do',
            matterId: matterId ?? null,
            assignedTo: assignedTo ?? null,
            templateId: templateId,
          },
        });
      })
    );

    res.status(201).json({ template, tasks: created });
  } catch (err) {
    console.error('Error creating tasks from template:', err);
    res.status(500).json({ message: 'Failed to create tasks from template' });
  }
});

// ===================== TIME ENTRIES =====================
app.get('/api/time-entries', async (req, res) => {
  try {
    const entries = await prisma.timeEntry.findMany();
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
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany();
    res.json(clients);
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ message: 'Failed to load clients' });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const data = req.body;
    const created = await prisma.client.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        mobile: data.mobile ?? null,
        company: data.company ?? null,
        type: data.type ?? 'Individual',
        status: data.status ?? 'Active',
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zipCode: data.zipCode ?? null,
        country: data.country ?? null,
        taxId: data.taxId ?? null,
        notes: data.notes ?? null,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ message: 'Failed to create client' });
  }
});

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
    const events = await prisma.calendarEvent.findMany();
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
    const expenses = await prisma.expense.findMany({
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
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { client: true },
    });
    res.json(invoices);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ message: 'Failed to load invoices' });
  }
});

app.post('/api/invoices', asyncHandler(async (req: any, res: any) => {
  const data = req.body; // { number, amount, dueDate, status, clientId, ... }
  const created = await prisma.invoice.create({
    data: {
      number: data.number,
      amount: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
      status: data.status,
      clientId: data.clientId,
    },
    include: { client: true },
  });

  // Send email notification if status is 'Sent'
  if (data.status === 'Sent' && created.client) {
    const template = emailTemplates.invoiceSent(
      created.number,
      created.amount,
      new Date(created.dueDate).toLocaleDateString('tr-TR'),
      created.client.name
    );
    await sendEmail({
      to: created.client.email,
      subject: template.subject,
      html: template.html,
    });
  }

  res.status(201).json(created);
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

  const paidInvoicesTotal = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (i.amount || 0), 0);
  const outstandingInvoicesTotal = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').reduce((sum, i) => sum + (i.amount || 0), 0);
  const overdueInvoicesTotal = invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + (i.amount || 0), 0);

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
      overdueCount: invoices.filter(i => i.status === 'Overdue').length,
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
const verifyAdmin = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized - Token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Sadece Admin rolündeki kullanıcılar erişebilir
    // Partner ve Associate avukatlar erişemez
    if (user.role !== 'Admin') {
      return res.status(403).json({
        message: 'Admin access required - Only users with Admin role can access this resource',
        userRole: user.role
      });
    }

    req.adminId = decoded.sub;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

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
// Get all clients
app.get('/api/admin/clients', verifyAdmin, async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(clients);
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ message: 'Failed to load clients' });
  }
});

// Update client (including password and portal settings)
app.put('/api/admin/clients/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, mobile, company, type, status,
      address, city, state, zipCode, country, taxId, notes,
      password, portalEnabled
    } = req.body;

    const updateData: any = {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone !== undefined && { phone }),
      ...(mobile !== undefined && { mobile }),
      ...(company !== undefined && { company }),
      ...(type && { type }),
      ...(status && { status }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(zipCode !== undefined && { zipCode }),
      ...(country !== undefined && { country }),
      ...(taxId !== undefined && { taxId }),
      ...(notes !== undefined && { notes }),
      ...(portalEnabled !== undefined && { portalEnabled })
    };

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Get old client data for audit log
    const oldClient = await prisma.client.findUnique({ where: { id } });

    const client = await prisma.client.update({
      where: { id },
      data: updateData
    });

    // Get admin info for audit log
    const admin = await prisma.user.findUnique({ where: { id: req.adminId } });

    // Log client update
    await createAuditLog({
      userId: req.adminId,
      userEmail: admin?.email || undefined,
      action: 'UPDATE',
      entityType: 'CLIENT',
      entityId: id,
      oldValues: oldClient ? {
        email: oldClient.email,
        name: oldClient.name,
        status: oldClient.status,
        portalEnabled: oldClient.portalEnabled,
      } : null,
      newValues: {
        email: client.email,
        name: client.name,
        status: client.status,
        portalEnabled: client.portalEnabled,
      },
      details: `Admin updated client: ${client.email}${password ? ' (password changed)' : ''}${portalEnabled !== undefined ? ` (portal ${portalEnabled ? 'enabled' : 'disabled'})` : ''}`,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json(client);
  } catch (err: any) {
    console.error('Error updating client:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Failed to update client' });
  }
});

// Delete client
app.delete('/api/admin/clients/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get client data before deletion for audit log
    const deletedClient = await prisma.client.findUnique({ where: { id } });

    await prisma.client.delete({ where: { id } });

    // Get admin info for audit log
    const admin = await prisma.user.findUnique({ where: { id: req.adminId } });

    // Log client deletion
    await createAuditLog({
      userId: req.adminId,
      userEmail: admin?.email || undefined,
      action: 'DELETE',
      entityType: 'CLIENT',
      entityId: id,
      oldValues: deletedClient ? {
        email: deletedClient.email,
        name: deletedClient.name,
        status: deletedClient.status,
      } : null,
      details: `Admin deleted client: ${deletedClient?.email || id}`,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting client:', err);
    res.status(500).json({ message: 'Failed to delete client' });
  }
});

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
app.post('/api/documents/upload', uploadSingle, asyncHandler(async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please select a file.' });
    }

    const { matterId, description, tags } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized - please login again' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (jwtError) {
      return res.status(401).json({ message: 'Session expired - please login again' });
    }

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
        uploadedBy: decoded.sub,
        description: description || null,
        groupKey,
        version: nextVersion,
        tags: tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
      },
    });

    // Get user info for audit log
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

    // Log document upload
    await createAuditLog({
      userId: decoded.sub,
      userEmail: decoded.email || user?.email || undefined,
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

    res.status(201).json(document);
  } catch (error: any) {
    console.error('Document upload error:', error);

    // Check for specific error types
    if (error.code === 'ENOENT' || error.code === 'EACCES') {
      return res.status(500).json({
        message: 'File storage temporarily unavailable. Please try again later.',
        error: 'Storage access error'
      });
    }

    if (error.name === 'PrismaClientKnownRequestError') {
      return res.status(500).json({
        message: 'Database error while saving document. Please try again.',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Failed to upload document. Please try again.',
      error: error.message || 'Unknown error'
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
app.delete('/api/documents/:id', asyncHandler(async (req: any, res: any) => {
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
app.post('/api/matters/:matterId/trust', asyncHandler(async (req, res) => {
  const { matterId } = req.params;
  const { type, amount, description, reference } = req.body;

  const matter = await prisma.matter.findUnique({ where: { id: matterId } });
  if (!matter) return res.status(404).json({ error: 'Matter not found' });

  let newBalance = matter.trustBalance;
  if (type === 'deposit') newBalance += amount;
  else if (type === 'withdrawal' || type === 'transfer') newBalance -= amount;
  else if (type === 'refund') newBalance -= amount;

  const transaction = await prisma.trustTransaction.create({
    data: { matterId, type, amount, description, reference, balance: newBalance, createdBy: req.adminId },
  });

  await prisma.matter.update({ where: { id: matterId }, data: { trustBalance: newBalance } });

  const userInfo = getUserInfoFromRequest(req);
  await createAuditLog({ ...userInfo, action: 'CREATE', entityType: 'TRUST_TRANSACTION', entityId: transaction.id, details: `${type} $${amount}` });

  res.status(201).json(transaction);
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



// Error handler (must be last)
app.use(errorHandler);

// ===================== SERVER =====================
const PORT = process.env.PORT || 3001;

// Create logs directory if it doesn't exist
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
      execSync('npx prisma db push --skip-generate', {
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

// Start server
runDbMigrations().then(() => {
  const HOST = '0.0.0.0'; // Required for Railway/Docker
  app.listen(Number(PORT), HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info(`Frontend should be running on http://localhost:3000`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});
