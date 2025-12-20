/**
 * IOLTA Trust Accounting Service
 * ABA Model Rule 1.15 Compliant
 * 
 * Core trust accounting operations with:
 * - Negative balance prevention
 * - Transaction immutability
 * - Three-way reconciliation
 * - Immutable audit logging
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const Decimal = Prisma.Decimal;

// ============================================
// CONSTANTS
// ============================================

const APPROVAL_THRESHOLDS = {
    withdrawal: 5000,    // Withdrawals >= $5,000 require partner approval
    deposit: 50000,      // Large deposits may trigger AML review
    transfer: 10000      // Trust→Operating >= $10,000 requires approval
};

// ============================================
// AUDIT LOGGING (IMMUTABLE)
// ============================================

interface AuditLogParams {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    ipAddress?: string;
    userAgent?: string;
    action: string;
    entityType: string;
    entityId?: string;
    previousState?: any;
    newState?: any;
    metadata?: any;
    amount?: number;
    trustAccountId?: string;
    clientLedgerId?: string;
    transactionId?: string;
}

async function createTrustAuditLog(params: AuditLogParams): Promise<void> {
    await prisma.trustAuditLog.create({
        data: {
            userId: params.userId,
            userEmail: params.userEmail,
            userRole: params.userRole,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            previousState: params.previousState ? JSON.stringify(params.previousState) : null,
            newState: params.newState ? JSON.stringify(params.newState) : null,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null,
            amount: params.amount ? new Decimal(params.amount) : null,
            trustAccountId: params.trustAccountId,
            clientLedgerId: params.clientLedgerId,
            transactionId: params.transactionId
        }
    });
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Prevents negative client ledger balance
 * HARD RULE: Cannot withdraw more than available
 */
async function validateLedgerBalance(
    ledgerId: string,
    withdrawalAmount: number
): Promise<{ valid: boolean; error?: string; availableBalance?: number }> {
    const ledger = await prisma.clientTrustLedger.findUnique({
        where: { id: ledgerId }
    });

    if (!ledger) {
        return { valid: false, error: 'LEDGER_NOT_FOUND' };
    }

    if (ledger.status !== 'ACTIVE') {
        return { valid: false, error: 'LEDGER_NOT_ACTIVE', availableBalance: Number(ledger.runningBalance) };
    }

    const available = Number(ledger.runningBalance);
    if (withdrawalAmount > available) {
        return {
            valid: false,
            error: 'INSUFFICIENT_FUNDS',
            availableBalance: available
        };
    }

    return { valid: true, availableBalance: available };
}

/**
 * Prevents trust account overdraft
 */
async function validateTrustAccountBalance(
    trustAccountId: string,
    totalWithdrawal: number
): Promise<{ valid: boolean; error?: string; availableBalance?: number }> {
    const account = await prisma.trustBankAccount.findUnique({
        where: { id: trustAccountId }
    });

    if (!account) {
        return { valid: false, error: 'TRUST_ACCOUNT_NOT_FOUND' };
    }

    if (account.status !== 'ACTIVE') {
        return { valid: false, error: 'TRUST_ACCOUNT_NOT_ACTIVE' };
    }

    const available = Number(account.currentBalance);
    if (totalWithdrawal > available) {
        return {
            valid: false,
            error: 'TRUST_ACCOUNT_OVERDRAFT',
            availableBalance: available
        };
    }

    return { valid: true, availableBalance: available };
}

/**
 * Validates allocation totals match transaction amount
 */
function validateAllocationTotals(
    transactionAmount: number,
    allocations: { amount: number }[]
): { valid: boolean; error?: string } {
    const total = allocations.reduce((sum, a) => sum + Math.abs(a.amount), 0);

    // Allow small floating point differences
    if (Math.abs(total - transactionAmount) > 0.01) {
        return {
            valid: false,
            error: `ALLOCATION_MISMATCH: Total allocations (${total}) must equal transaction amount (${transactionAmount})`
        };
    }

    return { valid: true };
}

// ============================================
// DEPOSIT OPERATIONS
// ============================================

interface DepositParams {
    trustAccountId: string;
    amount: number;
    payorPayee: string;
    description: string;
    checkNumber?: string;
    wireReference?: string;
    allocations: {
        ledgerId: string;
        amount: number;
        description?: string;
    }[];
    createdBy: string;
    userEmail?: string;
    userRole?: string;
    ipAddress?: string;
}

interface DepositResult {
    success: boolean;
    error?: string;
    transactionId?: string;
    requiresApproval?: boolean;
}

async function createDeposit(params: DepositParams): Promise<DepositResult> {
    // Validate allocation totals
    const allocationValidation = validateAllocationTotals(params.amount, params.allocations);
    if (!allocationValidation.valid) {
        return { success: false, error: allocationValidation.error };
    }

    // Validate all ledgers exist and are active
    for (const alloc of params.allocations) {
        const ledger = await prisma.clientTrustLedger.findUnique({
            where: { id: alloc.ledgerId }
        });
        if (!ledger) {
            return { success: false, error: `LEDGER_NOT_FOUND: ${alloc.ledgerId}` };
        }
        if (ledger.status !== 'ACTIVE') {
            return { success: false, error: `LEDGER_NOT_ACTIVE: ${alloc.ledgerId}` };
        }
    }

    // Get current account balance
    const account = await prisma.trustBankAccount.findUnique({
        where: { id: params.trustAccountId }
    });
    if (!account || account.status !== 'ACTIVE') {
        return { success: false, error: 'TRUST_ACCOUNT_NOT_ACTIVE' };
    }

    const requiresApproval = params.amount >= APPROVAL_THRESHOLDS.deposit;
    const accountBalanceBefore = Number(account.currentBalance);
    const accountBalanceAfter = accountBalanceBefore + params.amount;

    // Create transaction and allocations in a transaction
    const result = await prisma.$transaction(async (tx) => {
        // Create the trust transaction
        const trustTx = await tx.trustTransactionV2.create({
            data: {
                trustAccountId: params.trustAccountId,
                type: 'DEPOSIT',
                amount: new Decimal(params.amount),
                description: params.description,
                payorPayee: params.payorPayee,
                checkNumber: params.checkNumber,
                wireReference: params.wireReference,
                status: requiresApproval ? 'PENDING' : 'APPROVED',
                createdBy: params.createdBy,
                approvedBy: requiresApproval ? null : params.createdBy,
                approvedAt: requiresApproval ? null : new Date(),
                isEarned: false,
                accountBalanceBefore: new Decimal(accountBalanceBefore),
                accountBalanceAfter: new Decimal(accountBalanceAfter)
            }
        });

        // Create allocation lines and update ledger balances
        for (const alloc of params.allocations) {
            const ledger = await tx.clientTrustLedger.findUnique({
                where: { id: alloc.ledgerId }
            });
            const newBalance = Number(ledger!.runningBalance) + alloc.amount;

            await tx.trustAllocationLine.create({
                data: {
                    transactionId: trustTx.id,
                    ledgerId: alloc.ledgerId,
                    amount: new Decimal(alloc.amount),
                    description: alloc.description,
                    ledgerBalanceAfter: new Decimal(newBalance)
                }
            });

            // Update ledger balance (only if approved)
            if (!requiresApproval) {
                await tx.clientTrustLedger.update({
                    where: { id: alloc.ledgerId },
                    data: { runningBalance: new Decimal(newBalance) }
                });
            }
        }

        // Update trust account balance (only if approved)
        if (!requiresApproval) {
            await tx.trustBankAccount.update({
                where: { id: params.trustAccountId },
                data: { currentBalance: new Decimal(accountBalanceAfter) }
            });
        }

        return trustTx;
    });

    // Audit log
    await createTrustAuditLog({
        userId: params.createdBy,
        userEmail: params.userEmail,
        userRole: params.userRole,
        ipAddress: params.ipAddress,
        action: 'TRUST_DEPOSIT',
        entityType: 'TrustTransactionV2',
        entityId: result.id,
        amount: params.amount,
        trustAccountId: params.trustAccountId,
        transactionId: result.id,
        metadata: {
            payorPayee: params.payorPayee,
            checkNumber: params.checkNumber,
            allocations: params.allocations.length,
            requiresApproval
        }
    });

    return {
        success: true,
        transactionId: result.id,
        requiresApproval
    };
}

// ============================================
// WITHDRAWAL OPERATIONS
// ============================================

interface WithdrawalParams {
    trustAccountId: string;
    ledgerId: string;
    amount: number;
    payorPayee: string;
    description: string;
    checkNumber?: string;
    createdBy: string;
    userEmail?: string;
    userRole?: string;
    ipAddress?: string;
}

interface WithdrawalResult {
    success: boolean;
    error?: string;
    transactionId?: string;
    requiresApproval?: boolean;
    newLedgerBalance?: number;
}

async function createWithdrawal(params: WithdrawalParams): Promise<WithdrawalResult> {
    // HARD VALIDATION: Check ledger balance
    const ledgerValidation = await validateLedgerBalance(params.ledgerId, params.amount);
    if (!ledgerValidation.valid) {
        // Log attempted violation
        await createTrustAuditLog({
            userId: params.createdBy,
            userEmail: params.userEmail,
            action: 'WITHDRAWAL_REJECTED',
            entityType: 'ClientTrustLedger',
            entityId: params.ledgerId,
            amount: params.amount,
            metadata: {
                error: ledgerValidation.error,
                availableBalance: ledgerValidation.availableBalance,
                attemptedAmount: params.amount
            }
        });
        return {
            success: false,
            error: `${ledgerValidation.error}: Available balance is $${ledgerValidation.availableBalance?.toFixed(2)}`
        };
    }

    // HARD VALIDATION: Check trust account balance
    const accountValidation = await validateTrustAccountBalance(params.trustAccountId, params.amount);
    if (!accountValidation.valid) {
        await createTrustAuditLog({
            userId: params.createdBy,
            action: 'WITHDRAWAL_REJECTED_OVERDRAFT',
            entityType: 'TrustBankAccount',
            entityId: params.trustAccountId,
            amount: params.amount,
            metadata: { error: accountValidation.error }
        });
        return { success: false, error: accountValidation.error };
    }

    const account = await prisma.trustBankAccount.findUnique({
        where: { id: params.trustAccountId }
    });
    const ledger = await prisma.clientTrustLedger.findUnique({
        where: { id: params.ledgerId }
    });

    const requiresApproval = params.amount >= APPROVAL_THRESHOLDS.withdrawal;
    const accountBalanceBefore = Number(account!.currentBalance);
    const accountBalanceAfter = accountBalanceBefore - params.amount;
    const ledgerBalanceBefore = Number(ledger!.runningBalance);
    const ledgerBalanceAfter = ledgerBalanceBefore - params.amount;

    const result = await prisma.$transaction(async (tx) => {
        // Create the withdrawal transaction
        const trustTx = await tx.trustTransactionV2.create({
            data: {
                trustAccountId: params.trustAccountId,
                type: 'WITHDRAWAL',
                amount: new Decimal(params.amount),
                description: params.description,
                payorPayee: params.payorPayee,
                checkNumber: params.checkNumber,
                status: requiresApproval ? 'PENDING' : 'APPROVED',
                createdBy: params.createdBy,
                approvedBy: requiresApproval ? null : params.createdBy,
                approvedAt: requiresApproval ? null : new Date(),
                isEarned: false,
                accountBalanceBefore: new Decimal(accountBalanceBefore),
                accountBalanceAfter: new Decimal(accountBalanceAfter)
            }
        });

        // Create allocation line (negative amount for withdrawal)
        await tx.trustAllocationLine.create({
            data: {
                transactionId: trustTx.id,
                ledgerId: params.ledgerId,
                amount: new Decimal(-params.amount), // Negative for withdrawal
                description: params.description,
                ledgerBalanceAfter: new Decimal(ledgerBalanceAfter)
            }
        });

        // Update balances (only if approved)
        if (!requiresApproval) {
            await tx.clientTrustLedger.update({
                where: { id: params.ledgerId },
                data: { runningBalance: new Decimal(ledgerBalanceAfter) }
            });

            await tx.trustBankAccount.update({
                where: { id: params.trustAccountId },
                data: { currentBalance: new Decimal(accountBalanceAfter) }
            });
        }

        return trustTx;
    });

    // Audit log
    await createTrustAuditLog({
        userId: params.createdBy,
        userEmail: params.userEmail,
        userRole: params.userRole,
        ipAddress: params.ipAddress,
        action: 'TRUST_WITHDRAWAL',
        entityType: 'TrustTransactionV2',
        entityId: result.id,
        amount: params.amount,
        trustAccountId: params.trustAccountId,
        clientLedgerId: params.ledgerId,
        transactionId: result.id,
        metadata: {
            payorPayee: params.payorPayee,
            checkNumber: params.checkNumber,
            requiresApproval,
            ledgerBalanceBefore,
            ledgerBalanceAfter
        }
    });

    return {
        success: true,
        transactionId: result.id,
        requiresApproval,
        newLedgerBalance: requiresApproval ? ledgerBalanceBefore : ledgerBalanceAfter
    };
}

// ============================================
// VOID/REVERSAL
// ============================================

interface VoidParams {
    transactionId: string;
    reason: string;
    voidedBy: string;
    userEmail?: string;
    ipAddress?: string;
}

async function voidTransaction(params: VoidParams): Promise<{ success: boolean; error?: string; reversalTxId?: string }> {
    const tx = await prisma.trustTransactionV2.findUnique({
        where: { id: params.transactionId },
        include: { allocations: true }
    });

    if (!tx) {
        return { success: false, error: 'TRANSACTION_NOT_FOUND' };
    }

    if (tx.isVoided) {
        return { success: false, error: 'TRANSACTION_ALREADY_VOIDED' };
    }

    if (tx.status !== 'APPROVED') {
        return { success: false, error: 'ONLY_APPROVED_TRANSACTIONS_CAN_BE_VOIDED' };
    }

    // For withdrawals, we need to add funds back - no validation needed
    // For deposits, we need to remove funds - must validate sufficient balance
    if (tx.type === 'DEPOSIT') {
        for (const alloc of tx.allocations) {
            const validation = await validateLedgerBalance(alloc.ledgerId, Number(alloc.amount));
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Cannot void: Ledger has insufficient balance to reverse deposit. ${validation.error}`
                };
            }
        }
    }

    const result = await prisma.$transaction(async (prismaClient) => {
        // Mark original as voided
        await prismaClient.trustTransactionV2.update({
            where: { id: params.transactionId },
            data: {
                isVoided: true,
                voidedAt: new Date(),
                voidedBy: params.voidedBy,
                voidReason: params.reason
            }
        });

        // Get current account balance
        const account = await prismaClient.trustBankAccount.findUnique({
            where: { id: tx.trustAccountId }
        });
        const currentAccountBalance = Number(account!.currentBalance);

        // Calculate new account balance (reverse the original)
        const reversalAmount = Number(tx.amount);
        const newAccountBalance = tx.type === 'DEPOSIT'
            ? currentAccountBalance - reversalAmount
            : currentAccountBalance + reversalAmount;

        // Create reversal transaction
        const reversalTx = await prismaClient.trustTransactionV2.create({
            data: {
                trustAccountId: tx.trustAccountId,
                type: 'WITHDRAWAL', // Reversal uses opposite type conceptually
                amount: tx.amount,
                description: `VOID: ${tx.description}`,
                payorPayee: tx.payorPayee,
                checkNumber: tx.checkNumber,
                originalTxId: tx.id,
                status: 'APPROVED',
                createdBy: params.voidedBy,
                approvedBy: params.voidedBy,
                approvedAt: new Date(),
                isEarned: false,
                accountBalanceBefore: new Decimal(currentAccountBalance),
                accountBalanceAfter: new Decimal(newAccountBalance)
            }
        });

        // Reverse allocations
        for (const alloc of tx.allocations) {
            const ledger = await prismaClient.clientTrustLedger.findUnique({
                where: { id: alloc.ledgerId }
            });

            // Reverse the amount (if original was positive deposit, make it negative)
            const reversalAllocAmount = -Number(alloc.amount);
            const newLedgerBalance = Number(ledger!.runningBalance) + reversalAllocAmount;

            await prismaClient.trustAllocationLine.create({
                data: {
                    transactionId: reversalTx.id,
                    ledgerId: alloc.ledgerId,
                    amount: new Decimal(reversalAllocAmount),
                    description: `VOID: ${alloc.description || tx.description}`,
                    ledgerBalanceAfter: new Decimal(newLedgerBalance)
                }
            });

            await prismaClient.clientTrustLedger.update({
                where: { id: alloc.ledgerId },
                data: { runningBalance: new Decimal(newLedgerBalance) }
            });
        }

        // Update account balance
        await prismaClient.trustBankAccount.update({
            where: { id: tx.trustAccountId },
            data: { currentBalance: new Decimal(newAccountBalance) }
        });

        return reversalTx;
    });

    // Audit log
    await createTrustAuditLog({
        userId: params.voidedBy,
        userEmail: params.userEmail,
        ipAddress: params.ipAddress,
        action: 'TRANSACTION_VOIDED',
        entityType: 'TrustTransactionV2',
        entityId: params.transactionId,
        amount: Number(tx.amount),
        trustAccountId: tx.trustAccountId,
        transactionId: params.transactionId,
        previousState: tx,
        metadata: {
            reason: params.reason,
            reversalTxId: result.id,
            originalType: tx.type
        }
    });

    return { success: true, reversalTxId: result.id };
}

// ============================================
// THREE-WAY RECONCILIATION
// ============================================

interface ReconciliationParams {
    trustAccountId: string;
    periodStart: Date;
    periodEnd: Date;
    bankStatementBalance: number;
    outstandingChecks?: { checkNumber: string; amount: number; date: string }[];
    depositsInTransit?: { reference: string; amount: number; date: string }[];
    notes?: string;
    preparedBy: string;
    userEmail?: string;
    ipAddress?: string;
}

interface ReconciliationResult {
    success: boolean;
    reconciliationId?: string;
    isReconciled: boolean;
    bankBalance: number;
    trustLedgerBalance: number;
    clientLedgerTotal: number;
    discrepancy: number;
    requiresPartnerReview: boolean;
}

async function performReconciliation(params: ReconciliationParams): Promise<ReconciliationResult> {
    // Get trust account balance
    const trustAccount = await prisma.trustBankAccount.findUnique({
        where: { id: params.trustAccountId }
    });

    if (!trustAccount) {
        throw new Error('Trust account not found');
    }

    const trustLedgerBalance = Number(trustAccount.currentBalance);

    // Sum all client ledgers for this trust account
    const clientLedgerSum = await prisma.clientTrustLedger.aggregate({
        where: {
            trustAccountId: params.trustAccountId,
            status: 'ACTIVE'
        },
        _sum: { runningBalance: true }
    });

    const clientLedgerTotal = Number(clientLedgerSum._sum.runningBalance || 0);

    // Calculate adjusted bank balance
    const outstandingChecksTotal = (params.outstandingChecks || []).reduce((sum, c) => sum + c.amount, 0);
    const depositsInTransitTotal = (params.depositsInTransit || []).reduce((sum, d) => sum + d.amount, 0);
    const adjustedBankBalance = params.bankStatementBalance + depositsInTransitTotal - outstandingChecksTotal;

    // Three-way check
    const discrepancy = adjustedBankBalance - clientLedgerTotal;
    const isReconciled = Math.abs(discrepancy) < 0.01; // Allow for small rounding

    // Check trust ledger vs client ledger sum
    const internalDiscrepancy = trustLedgerBalance - clientLedgerTotal;

    const exceptions: string[] = [];
    if (Math.abs(internalDiscrepancy) >= 0.01) {
        exceptions.push(`Internal discrepancy: Trust ledger (${trustLedgerBalance}) != Client ledgers (${clientLedgerTotal})`);
    }

    // Create reconciliation record
    const reconciliation = await prisma.reconciliationRecord.create({
        data: {
            trustAccountId: params.trustAccountId,
            periodStart: params.periodStart,
            periodEnd: params.periodEnd,
            bankStatementBalance: new Decimal(params.bankStatementBalance),
            trustLedgerBalance: new Decimal(trustLedgerBalance),
            clientLedgerSumBalance: new Decimal(clientLedgerTotal),
            isReconciled,
            discrepancyAmount: isReconciled ? null : new Decimal(discrepancy),
            outstandingChecks: params.outstandingChecks ? JSON.stringify(params.outstandingChecks) : null,
            depositsInTransit: params.depositsInTransit ? JSON.stringify(params.depositsInTransit) : null,
            exceptions: exceptions.length > 0 ? JSON.stringify(exceptions) : null,
            notes: params.notes,
            preparedBy: params.preparedBy,
            preparedAt: new Date()
        }
    });

    // Audit log
    await createTrustAuditLog({
        userId: params.preparedBy,
        userEmail: params.userEmail,
        ipAddress: params.ipAddress,
        action: 'RECONCILIATION_PERFORMED',
        entityType: 'ReconciliationRecord',
        entityId: reconciliation.id,
        trustAccountId: params.trustAccountId,
        metadata: {
            isReconciled,
            discrepancy,
            bankStatementBalance: params.bankStatementBalance,
            trustLedgerBalance,
            clientLedgerTotal,
            outstandingChecksTotal,
            depositsInTransitTotal
        }
    });

    return {
        success: true,
        reconciliationId: reconciliation.id,
        isReconciled,
        bankBalance: params.bankStatementBalance,
        trustLedgerBalance,
        clientLedgerTotal,
        discrepancy,
        requiresPartnerReview: !isReconciled
    };
}

// ============================================
// EXPORTS
// ============================================

export const trustService = {
    // Validation
    validateLedgerBalance,
    validateTrustAccountBalance,
    validateAllocationTotals,

    // Operations
    createDeposit,
    createWithdrawal,
    voidTransaction,

    // Reconciliation
    performReconciliation,

    // Audit
    createTrustAuditLog,

    // Constants
    APPROVAL_THRESHOLDS
};

export default trustService;
