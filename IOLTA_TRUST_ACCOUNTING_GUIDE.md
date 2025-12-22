# IOLTA Trust Accounting Guide
## JurisFlow Legal Practice Management System

**Document Version:** 1.0  
**Last Updated:** December 22, 2025  
**Compliance:** ABA Model Rule 1.15

---

## Table of Contents

1. [What is IOLTA?](#what-is-iolta)
2. [Key Concepts](#key-concepts)
3. [Transaction Types](#transaction-types)
4. [Three-Way Reconciliation](#three-way-reconciliation)
5. [Step-by-Step Guide](#step-by-step-guide)
6. [Compliance Rules](#compliance-rules)
7. [Dashboard Overview](#dashboard-overview)
8. [FAQ](#faq)

---

## What is IOLTA?

**IOLTA** = **Interest on Lawyers Trust Accounts** (Avukat Emanet Hesapları Faizi)

In the United States, attorneys are **legally required** to keep client funds separate from their personal or firm accounts. This is mandated by ABA Model Rule 1.15 - Safekeeping Property.

### Why is it Important?

| Reason | Explanation |
|--------|-------------|
| **Legal Requirement** | Violating trust accounting rules can result in disbarment |
| **Client Protection** | Ensures client funds are always available when needed |
| **Transparency** | Clear audit trail for all client money movements |
| **Professional Ethics** | Maintains the integrity of the legal profession |

---

## Key Concepts

### 1. Trust Bank Account (Emanet Banka Hesabı)

A special IOLTA bank account opened by the law firm. Client funds are held here.

```
┌─────────────────────────────────────────────────────────────────┐
│  TRUST BANK ACCOUNT                                             │
│  ─────────────────────────────────────────────────────────────  │
│  Total Balance: $50,000                                         │
│                                                                 │
│  ⚠️ This money belongs to CLIENTS, NOT THE FIRM!               │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- One or more IOLTA accounts per firm
- Must be at an approved financial institution
- Interest goes to state bar foundation (IOLTA program)
- Account numbers are encrypted for security

### 2. Client Ledger (Müvekkil Defteri)

A sub-account for each client showing how much of the trust account belongs to them.

```
┌─────────────────────────────────────────────────────────────────┐
│  TRUST BANK ACCOUNT: $50,000                                    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ├── Client Ledger: John Smith        → $15,000                │
│  ├── Client Ledger: ABC Corporation   → $25,000                │
│  └── Client Ledger: Jane Doe          → $10,000                │
│                                         ─────────               │
│                              TOTAL:     $50,000 ✓              │
└─────────────────────────────────────────────────────────────────┘
```

**Important:**
- Sum of all client ledgers MUST equal trust account balance
- Each client can have multiple ledgers (one per matter)
- Ledgers can be Active, Closed, or Frozen

### 3. Trust Transaction

Every movement of money into or out of the trust account is recorded as a transaction.

---

## Transaction Types

### ➕ Deposit (Para Yatırma)

When a client sends money to the attorney (retainer, case expenses, etc.)

```
Example:
├── Client John Smith sends $5,000 retainer
├── Money enters Trust Bank Account
├── Recorded in John's Client Ledger
└── Balance updates automatically
```

**Required Information:**
- Trust Account (which bank account)
- Amount
- Payor (who sent the money)
- Description (what is it for)
- Check/Reference Number (optional)
- Allocation (which client ledger(s) to credit)

### ➖ Withdrawal (Para Çekme)

When the attorney spends money on behalf of the client.

```
Example:
├── Pay $500 court filing fee for John's case
├── Money exits Trust Bank Account
├── Deducted from John's Client Ledger
└── Payee: Superior Court of California
```

**Required Information:**
- Trust Account
- Client Ledger (whose money to use)
- Amount
- Payee (who receives the money)
- Description
- Check Number (optional)

### 🔄 Fee Earned (Kazanılmış Ücret)

When attorney's work is complete, invoiced, and approved - transferring earned fees from Trust to Operating account.

```
┌─────────────────────────────────────────────────────────────────┐
│  TRUST ACCOUNT → OPERATING ACCOUNT (Firm's Money)              │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  1. Attorney worked 10 hours ($2,000 value)                     │
│  2. Invoice created and sent to client                          │
│  3. Client approves invoice                                     │
│  4. $2,000 transferred from Trust to Operating                  │
│  5. Transaction recorded as "Fee Earned"                        │
│                                                                 │
│  ✅ Now the money legally belongs to the firm                   │
└─────────────────────────────────────────────────────────────────┘
```

### 🔁 Transfer

Moving funds between client ledgers (within the same trust account).

```
Example:
├── Client has two matters: Case A and Case B
├── Transfer $1,000 from Case A ledger to Case B ledger
└── Trust account total remains unchanged
```

### ↩️ Refund to Client

Returning unused funds to the client when a case is closed.

---

## Three-Way Reconciliation

**Required monthly!** This is the core compliance check for trust accounts.

### What Must Match?

| # | Source | Description |
|---|--------|-------------|
| 1 | **Bank Statement Balance** | The actual balance per bank statement |
| 2 | **Trust Ledger Balance** | The trust account balance in software |
| 3 | **Client Ledgers Total** | Sum of all client ledger balances |

### Example - Successful Reconciliation

```
┌─────────────────────────────────────────────────────────────────┐
│  THREE-WAY RECONCILIATION - December 2025                       │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Bank Statement Balance:      $50,000.00                        │
│  Trust Ledger Balance:        $50,000.00  ✓                     │
│  Client Ledgers Total:        $50,000.00  ✓                     │
│                                                                 │
│  Difference: $0.00                                              │
│  Status: ✅ RECONCILED                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Example - Discrepancy Found

```
┌─────────────────────────────────────────────────────────────────┐
│  THREE-WAY RECONCILIATION - December 2025                       │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Bank Statement Balance:      $50,000.00                        │
│  Trust Ledger Balance:        $49,500.00  ⚠️                    │
│  Client Ledgers Total:        $49,500.00                        │
│                                                                 │
│  Difference: $500.00                                            │
│  Status: ❌ REQUIRES REVIEW                                     │
│                                                                 │
│  Possible Causes:                                               │
│  - Outstanding checks not yet cleared                           │
│  - Deposit in transit                                           │
│  - Unrecorded transaction                                       │
│  - Bank error                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### How to Perform Reconciliation in JurisFlow

1. Navigate to **Trust (IOLTA)** → Click **Mutabakat** button
2. Select the Trust Account
3. Enter the Period End Date
4. Enter the Bank Statement Balance (from your bank statement)
5. Add any outstanding checks (optional)
6. Add any deposits in transit (optional)
7. Add notes if needed
8. Click **Perform Reconciliation**
9. System will calculate and show if reconciled

---

## Step-by-Step Guide

### Step 1: Create a Trust Bank Account

```
Trust (IOLTA) → Click "+ New Account"

Fill in:
├── Account Name: "Primary IOLTA Account"
├── Bank Name: "Chase Bank"
├── Routing Number: 123456789 (exactly 9 digits)
├── Account Number: 9876543210
└── State/Jurisdiction: CA

Click "Create Account"
```

### Step 2: Create a Client Ledger

```
Trust (IOLTA) → Client Ledgers tab → Click "+ New Ledger"

Fill in:
├── Trust Account: Primary IOLTA Account
├── Client: John Smith
├── Matter: Smith v. Jones (optional)
└── Notes: Initial retainer deposit (optional)

Click "Create Ledger"
```

### Step 3: Record a Deposit

```
Trust (IOLTA) → Click "Deposit" button

Fill in:
├── Trust Account: Primary IOLTA Account
├── Amount: $5,000.00
├── Payor: John Smith
├── Description: Initial retainer for divorce case
├── Check/Reference #: 1234 (optional)
│
└── Allocation:
    └── John Smith Ledger → $5,000.00

Click "Save Deposit"
```

### Step 4: Record a Withdrawal

```
Trust (IOLTA) → Click "Withdrawal" button

Fill in:
├── Trust Account: Primary IOLTA Account
├── Client Ledger: John Smith
├── Amount: $500.00
├── Payee: Superior Court of California
├── Description: Court filing fee
└── Check #: 1001 (optional)

Click "Save Withdrawal"
```

### Step 5: Perform Monthly Reconciliation

```
Trust (IOLTA) → Click "Mutabakat" button

Fill in:
├── Trust Account: Primary IOLTA Account
├── Period End Date: 12/31/2025
├── Bank Statement Balance: $4,500.00
└── Notes: December 2025 reconciliation (optional)

Click "Perform Reconciliation"

Result:
├── Bank Statement: $4,500.00
├── Trust Ledger: $4,500.00
├── Client Ledgers: $4,500.00
└── Status: ✅ Reconciled
```

---

## Compliance Rules

### ABA Model Rule 1.15 Requirements

| Rule | Description |
|------|-------------|
| **Separation** | Client funds MUST be kept separate from firm funds |
| **Record Keeping** | All transactions must be recorded with full details |
| **Monthly Reconciliation** | Three-way reconciliation required monthly |
| **Approval Requirements** | Large withdrawals may require partner approval |
| **Audit Ready** | Records must be available for Bar Association audits |
| **Prompt Delivery** | Client funds must be delivered promptly when due |
| **Notification** | Client must be notified when funds are received |

### Approval Thresholds (JurisFlow Defaults)

| Transaction Type | Threshold | Approval Required |
|-----------------|-----------|-------------------|
| Deposit | Any amount | No |
| Withdrawal | > $10,000 | Partner approval |
| Fee Earned | > $5,000 | Partner approval |
| Void Transaction | Any amount | Partner approval |

### Prohibited Actions

❌ **NEVER DO:**
- Mix client funds with firm operating funds
- Use one client's funds for another client's matter
- Withdraw fees before they are earned and invoiced
- Delay delivering funds owed to clients
- Fail to maintain accurate records

---

## Dashboard Overview

### Main Statistics

```
┌─────────────────────────────────────────────────────────────────┐
│  IOLTA Trust Accounting                                         │
│  ABA Model Rule 1.15 Compliant Trust Account Management         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐│
│  │ Trust Hesap │  │   Client    │  │  Bekleyen   │  │ Recon   ││
│  │  Bakiyesi   │  │  Ledgers    │  │   Onay      │  │ Status  ││
│  │  $50,000    │  │  $50,000    │  │     0       │  │Up to Dt ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tabs

| Tab | Purpose |
|-----|---------|
| **Overview** | Summary stats, recent transactions, client balances |
| **Accounts** | Manage trust bank accounts |
| **Client Ledgers** | View and manage client ledgers |
| **Transactions** | Full transaction history with filtering |
| **Reconciliation** | View past reconciliations and perform new ones |

### Quick Actions

| Button | Action |
|--------|--------|
| **Deposit** | Record incoming client funds |
| **Withdrawal** | Record outgoing payments |
| **Mutabakat** | Perform three-way reconciliation |

---

## FAQ

### Q: What happens if reconciliation fails?

**A:** If the three amounts don't match:
1. Check for outstanding checks (issued but not cleared)
2. Check for deposits in transit (received but not cleared)
3. Review recent transactions for errors
4. Contact the bank if discrepancy persists
5. Document the discrepancy and resolution

### Q: Can I have multiple trust accounts?

**A:** Yes. Some firms have:
- General IOLTA account
- Real estate trust account
- Personal injury settlement account
- etc.

### Q: What if a client has multiple matters?

**A:** Create a separate client ledger for each matter. This keeps funds organized and prevents commingling between cases.

### Q: How long must I keep trust account records?

**A:** Most jurisdictions require **5-7 years** minimum. Check your state bar requirements.

### Q: What if I need to void a transaction?

**A:** 
1. Find the transaction in the Transactions tab
2. Click the void button
3. Enter a reason (required)
4. Partner approval may be required
5. A reversing transaction is created automatically

### Q: Can clients see their trust balance?

**A:** In the Client Portal, clients can see their trust balance as a read-only summary. They cannot see detailed transaction history for confidentiality reasons.

---

## Support

For questions about IOLTA compliance, consult:
- Your state bar's trust accounting guidelines
- ABA Model Rule 1.15 and comments
- Your firm's managing partner

For technical issues with JurisFlow:
- Check the [README.md](./README.md) for general documentation
- Contact system administrator

---

*This document is for informational purposes only and does not constitute legal advice. Always consult your state bar's specific trust accounting rules.*
