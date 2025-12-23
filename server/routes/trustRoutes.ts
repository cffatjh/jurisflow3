/**
 * IOLTA Trust Accounting API Routes
 * ABA Model Rule 1.15 Compliant
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { trustService } from '../services/trustService';

const router = Router();
const prisma = new PrismaClient();
const Decimal = Prisma.Decimal;

// Helper to extract user info from request
const getUserInfo = (req: any) => ({
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
});

// ============================================
// TRUST BANK ACCOUNT ROUTES
// ============================================

// GET /api/trust/accounts - List all trust accounts
router.get('/accounts', async (req: Request, res: Response) => {
    try {
        const accounts = await prisma.trustBankAccount.findMany({
            include: {
                _count: {
                    select: { clientLedgers: true, transactions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Mask account numbers for security
        const masked = accounts.map(a => ({
            ...a,
            accountNumberEnc: `****${a.accountNumberEnc.slice(-4)}`,
            ledgerCount: a._count.clientLedgers,
            transactionCount: a._count.transactions
        }));

        res.json(masked);
    } catch (error: any) {
        console.error('Error fetching trust accounts:', error);
        res.status(500).json({ error: 'Failed to fetch trust accounts' });
    }
});

import { encrypt, decrypt } from '../utils/encryption';

// ... existing imports

// GEÇİCİ ÇÖZÜM: Mevcut veritabanında şifrelenmemiş veriler olabilir.
// Bu yüzden okurken decrypt etmeyi deneyeceğiz.

// POST /api/trust/accounts - Create trust account
router.post('/accounts', async (req: Request, res: Response) => {
    try {
        const { name, bankName, accountNumber, routingNumber, jurisdiction } = req.body;

        if (!name || !bankName || !accountNumber || !routingNumber || !jurisdiction) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const account = await prisma.trustBankAccount.create({
            data: {
                name,
                bankName,
                accountNumberEnc: encrypt(accountNumber), // Encrypting sensitive data
                routingNumber,
                jurisdiction,
                status: 'ACTIVE',
                currentBalance: new Decimal(0)
            }
        });

        const userInfo = getUserInfo(req);
        await trustService.createTrustAuditLog({
            ...userInfo,
            action: 'TRUST_ACCOUNT_CREATED',
            entityType: 'TrustBankAccount',
            entityId: account.id,
            trustAccountId: account.id,
            newState: account
        });

        res.status(201).json({
            ...account,
            accountNumberEnc: `****${account.accountNumberEnc.slice(-4)}`
        });
    } catch (error: any) {
        console.error('Error creating trust account:', error);
        res.status(500).json({ error: 'Failed to create trust account' });
    }
});

// ============================================
// CLIENT LEDGER ROUTES
// ============================================

// GET /api/trust/ledgers - List all client ledgers
router.get('/ledgers', async (req: Request, res: Response) => {
    try {
        const { trustAccountId, clientId, status } = req.query;

        const where: any = {};
        if (trustAccountId) where.trustAccountId = trustAccountId;
        if (clientId) where.clientId = clientId;
        if (status) where.status = status;

        const ledgers = await prisma.clientTrustLedger.findMany({
            where,
            include: {
                client: { select: { id: true, name: true, email: true } },
                trustAccount: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(ledgers);
    } catch (error: any) {
        console.error('Error fetching ledgers:', error);
        res.status(500).json({ error: 'Failed to fetch ledgers' });
    }
});

// POST /api/trust/ledgers - Create client ledger
router.post('/ledgers', async (req: Request, res: Response) => {
    try {
        const { trustAccountId, clientId, matterId, notes } = req.body;

        if (!trustAccountId || !clientId) {
            return res.status(400).json({ error: 'trustAccountId and clientId are required' });
        }

        // Check for duplicate
        const existing = await prisma.clientTrustLedger.findFirst({
            where: { trustAccountId, clientId, matterId: matterId || null }
        });

        if (existing) {
            return res.status(409).json({ error: 'Ledger already exists for this client/matter combination' });
        }

        const ledger = await prisma.clientTrustLedger.create({
            data: {
                trustAccountId,
                clientId,
                matterId: matterId || null,
                notes,
                status: 'ACTIVE',
                runningBalance: new Decimal(0)
            },
            include: {
                client: { select: { id: true, name: true } }
            }
        });

        const userInfo = getUserInfo(req);
        await trustService.createTrustAuditLog({
            ...userInfo,
            action: 'CLIENT_LEDGER_CREATED',
            entityType: 'ClientTrustLedger',
            entityId: ledger.id,
            trustAccountId,
            clientLedgerId: ledger.id,
            newState: ledger
        });

        res.status(201).json(ledger);
    } catch (error: any) {
        console.error('Error creating ledger:', error);
        res.status(500).json({ error: 'Failed to create ledger' });
    }
});

// GET /api/trust/ledgers/:id - Get ledger with transactions
router.get('/ledgers/:id', async (req: Request, res: Response) => {
    try {
        const ledger = await prisma.clientTrustLedger.findUnique({
            where: { id: req.params.id },
            include: {
                client: true,
                trustAccount: true,
                allocations: {
                    include: {
                        transaction: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 100
                }
            }
        });

        if (!ledger) {
            return res.status(404).json({ error: 'Ledger not found' });
        }

        res.json(ledger);
    } catch (error: any) {
        console.error('Error fetching ledger:', error);
        res.status(500).json({ error: 'Failed to fetch ledger' });
    }
});

// ============================================
// TRANSACTION ROUTES
// ============================================

// GET /api/trust/transactions - List transactions
router.get('/transactions', async (req: Request, res: Response) => {
    try {
        const { trustAccountId, type, status, limit = '50' } = req.query;

        const where: any = {};
        if (trustAccountId) where.trustAccountId = trustAccountId;
        if (type) where.type = type;
        if (status) where.status = status;

        const transactions = await prisma.trustTransactionV2.findMany({
            where,
            include: {
                allocations: {
                    include: {
                        ledger: {
                            include: { client: { select: { id: true, name: true } } }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string)
        });

        res.json(transactions);
    } catch (error: any) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// POST /api/trust/deposit - Create deposit
router.post('/deposit', async (req: Request, res: Response) => {
    try {
        const userInfo = getUserInfo(req);

        const result = await trustService.createDeposit({
            ...req.body,
            createdBy: userInfo.userId || 'system',
            userEmail: userInfo.userEmail,
            userRole: userInfo.userRole,
            ipAddress: userInfo.ipAddress
        });

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error creating deposit:', error);
        res.status(500).json({ error: 'Failed to create deposit' });
    }
});

// POST /api/trust/withdrawal - Create withdrawal
router.post('/withdrawal', async (req: Request, res: Response) => {
    try {
        const userInfo = getUserInfo(req);

        const result = await trustService.createWithdrawal({
            ...req.body,
            createdBy: userInfo.userId || 'system',
            userEmail: userInfo.userEmail,
            userRole: userInfo.userRole,
            ipAddress: userInfo.ipAddress
        });

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error creating withdrawal:', error);
        res.status(500).json({ error: 'Failed to create withdrawal' });
    }
});

// POST /api/trust/transactions/:id/void - Void transaction
router.post('/transactions/:id/void', async (req: Request, res: Response) => {
    try {
        const userInfo = getUserInfo(req);
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Void reason is required' });
        }

        const result = await trustService.voidTransaction({
            transactionId: req.params.id,
            reason,
            voidedBy: userInfo.userId || 'system',
            userEmail: userInfo.userEmail,
            ipAddress: userInfo.ipAddress
        });

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json(result);
    } catch (error: any) {
        console.error('Error voiding transaction:', error);
        res.status(500).json({ error: 'Failed to void transaction' });
    }
});

// POST /api/trust/transactions/:id/approve - Approve pending transaction
router.post('/transactions/:id/approve', async (req: Request, res: Response) => {
    try {
        const userInfo = getUserInfo(req);
        const tx = await prisma.trustTransactionV2.findUnique({
            where: { id: req.params.id },
            include: { allocations: true }
        });

        if (!tx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (tx.status !== 'PENDING') {
            return res.status(400).json({ error: 'Only pending transactions can be approved' });
        }

        // For withdrawals, validate balance before approving
        if (tx.type === 'WITHDRAWAL') {
            for (const alloc of tx.allocations) {
                const validation = await trustService.validateLedgerBalance(
                    alloc.ledgerId,
                    Math.abs(Number(alloc.amount))
                );
                if (!validation.valid) {
                    return res.status(400).json({
                        error: `Cannot approve: ${validation.error}. Available: $${validation.availableBalance?.toFixed(2)}`
                    });
                }
            }
        }

        // Apply the transaction
        await prisma.$transaction(async (prismaClient) => {
            // Update transaction status
            await prismaClient.trustTransactionV2.update({
                where: { id: req.params.id },
                data: {
                    status: 'APPROVED',
                    approvedBy: userInfo.userId,
                    approvedAt: new Date()
                }
            });

            // Apply allocations to ledgers
            for (const alloc of tx.allocations) {
                const ledger = await prismaClient.clientTrustLedger.findUnique({
                    where: { id: alloc.ledgerId }
                });
                const newBalance = Number(ledger!.runningBalance) + Number(alloc.amount);

                await prismaClient.clientTrustLedger.update({
                    where: { id: alloc.ledgerId },
                    data: { runningBalance: new Decimal(newBalance) }
                });
            }

            // Update trust account balance
            const balanceChange = tx.type === 'DEPOSIT'
                ? Number(tx.amount)
                : -Number(tx.amount);

            await prismaClient.trustBankAccount.update({
                where: { id: tx.trustAccountId },
                data: {
                    currentBalance: {
                        increment: new Decimal(balanceChange)
                    }
                }
            });
        });

        await trustService.createTrustAuditLog({
            ...userInfo,
            action: 'TRANSACTION_APPROVED',
            entityType: 'TrustTransactionV2',
            entityId: req.params.id,
            amount: Number(tx.amount),
            trustAccountId: tx.trustAccountId,
            transactionId: req.params.id
        });

        res.json({ success: true, message: 'Transaction approved' });
    } catch (error: any) {
        console.error('Error approving transaction:', error);
        res.status(500).json({ error: 'Failed to approve transaction' });
    }
});

// ============================================
// RECONCILIATION ROUTES
// ============================================

// GET /api/trust/reconciliations - List reconciliation records
router.get('/reconciliations', async (req: Request, res: Response) => {
    try {
        const { trustAccountId } = req.query;

        const where: any = {};
        if (trustAccountId) where.trustAccountId = trustAccountId;

        const reconciliations = await prisma.reconciliationRecord.findMany({
            where,
            include: {
                trustAccount: { select: { id: true, name: true } }
            },
            orderBy: { periodEnd: 'desc' }
        });

        res.json(reconciliations);
    } catch (error: any) {
        console.error('Error fetching reconciliations:', error);
        res.status(500).json({ error: 'Failed to fetch reconciliations' });
    }
});

// POST /api/trust/reconcile - Perform reconciliation
router.post('/reconcile', async (req: Request, res: Response) => {
    try {
        const userInfo = getUserInfo(req);
        const {
            trustAccountId,
            periodStart,
            periodEnd,
            bankStatementBalance,
            outstandingChecks,
            depositsInTransit,
            notes
        } = req.body;

        if (!trustAccountId || !periodEnd || bankStatementBalance === undefined) {
            return res.status(400).json({
                error: 'trustAccountId, periodEnd, and bankStatementBalance are required'
            });
        }

        const result = await trustService.performReconciliation({
            trustAccountId,
            periodStart: new Date(periodStart || new Date(periodEnd).setDate(1)),
            periodEnd: new Date(periodEnd),
            bankStatementBalance: parseFloat(bankStatementBalance),
            outstandingChecks,
            depositsInTransit,
            notes,
            preparedBy: userInfo.userId || 'system',
            userEmail: userInfo.userEmail,
            ipAddress: userInfo.ipAddress
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error performing reconciliation:', error);
        res.status(500).json({ error: 'Failed to perform reconciliation' });
    }
});

// POST /api/trust/reconciliations/:id/approve - Approve reconciliation
router.post('/reconciliations/:id/approve', async (req: Request, res: Response) => {
    try {
        const userInfo = getUserInfo(req);

        const reconciliation = await prisma.reconciliationRecord.findUnique({
            where: { id: req.params.id }
        });

        if (!reconciliation) {
            return res.status(404).json({ error: 'Reconciliation not found' });
        }

        if (reconciliation.approvedAt) {
            return res.status(400).json({ error: 'Reconciliation already approved' });
        }

        await prisma.reconciliationRecord.update({
            where: { id: req.params.id },
            data: {
                approvedBy: userInfo.userId,
                approvedAt: new Date()
            }
        });

        await trustService.createTrustAuditLog({
            ...userInfo,
            action: 'RECONCILIATION_APPROVED',
            entityType: 'ReconciliationRecord',
            entityId: req.params.id,
            trustAccountId: reconciliation.trustAccountId
        });

        res.json({ success: true, message: 'Reconciliation approved' });
    } catch (error: any) {
        console.error('Error approving reconciliation:', error);
        res.status(500).json({ error: 'Failed to approve reconciliation' });
    }
});

// ============================================
// AUDIT LOG ROUTES
// ============================================

// GET /api/trust/audit-log - View audit log (read-only)
router.get('/audit-log', async (req: Request, res: Response) => {
    try {
        const { trustAccountId, action, limit = '100' } = req.query;

        const where: any = {};
        if (trustAccountId) where.trustAccountId = trustAccountId;
        if (action) where.action = action;

        const logs = await prisma.trustAuditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string)
        });

        res.json(logs);
    } catch (error: any) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({ error: 'Failed to fetch audit log' });
    }
});

export default router;
