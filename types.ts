export enum CaseStatus {
  Open = 'Open',
  Pending = 'Pending',
  Trial = 'Trial',
  Closed = 'Closed',
  Archived = 'Archived'
}

export enum PracticeArea {
  CivilLitigation = 'Civil Litigation',
  Corporate = 'Corporate',
  FamilyLaw = 'Family Law',
  CriminalDefense = 'Criminal Defense',
  EstatePlanning = 'Estate Planning',
  IntellectualProperty = 'Intellectual Property'
}

export enum FeeStructure {
  Hourly = 'Hourly',
  FlatFee = 'Flat Fee',
  Contingency = 'Contingency'
}

// Çalışan Rolleri
export enum EmployeeRole {
  SECRETARY = 'SECRETARY',
  PARALEGAL = 'PARALEGAL',
  INTERN_LAWYER = 'INTERN_LAWYER',
  ACCOUNTANT = 'ACCOUNTANT',
  ATTORNEY = 'ATTORNEY'
}

export type Permission =
  | 'system.admin' // User management, Global config
  | 'system.config' // Infrastructure settings
  | 'user.manage' // Manage staff
  | 'matter.view'
  | 'matter.create'
  | 'matter.edit'
  | 'matter.delete'
  | 'billing.view'
  | 'billing.manage' // Create/Edit invoices
  | 'billing.approve'
  // IOLTA Trust Permissions (Granular)
  | 'trust.view'
  | 'trust.deposit'
  | 'trust.withdraw'
  | 'trust.transfer'
  | 'trust.void'
  | 'trust.reconcile'
  | 'trust.approve'
  | 'trust.close_ledger'
  | 'trust.export'
  | 'trust.admin'
  | 'document.view'
  | 'document.create'
  | 'document.edit'
  | 'document.delete' // Special permission
  | 'report.financial'
  | 'calendar.manage'
  | 'task.manage'
  | 'client.manage';

export const ROLE_PERMISSIONS: Record<EmployeeRole, Permission[]> = {
  [EmployeeRole.INTERN_LAWYER]: [
    'matter.view', 'document.view', 'document.create', 'document.edit',
    'calendar.manage', 'task.manage',
    'trust.view' // View-only trust access
  ],
  [EmployeeRole.SECRETARY]: [
    'calendar.manage', 'client.manage', 'task.manage', 'matter.view', 'document.view',
    'trust.view' // View-only trust access
  ],
  [EmployeeRole.PARALEGAL]: [
    'matter.create', 'matter.view', 'matter.edit',
    'document.create', 'document.edit', 'document.view',
    'calendar.manage', 'task.manage', 'client.manage', 'billing.manage',
    'trust.view', 'trust.deposit' // Can do deposits only
  ],
  [EmployeeRole.ACCOUNTANT]: [
    'billing.view', 'billing.manage', 'billing.approve',
    'report.financial', 'matter.view', 'document.view',
    'trust.view', 'trust.deposit', 'trust.withdraw', 'trust.reconcile', 'trust.export' // Can reconcile, limited withdrawals
  ],
  [EmployeeRole.ATTORNEY]: [
    'user.manage',
    'matter.view', 'matter.create', 'matter.edit', 'matter.delete',
    'billing.view', 'billing.manage', 'billing.approve',
    'document.view', 'document.create', 'document.edit', 'document.delete',
    'report.financial',
    'calendar.manage', 'task.manage', 'client.manage',
    // Full trust access
    'trust.view', 'trust.deposit', 'trust.withdraw', 'trust.transfer',
    'trust.void', 'trust.reconcile', 'trust.approve', 'trust.close_ledger',
    'trust.export', 'trust.admin'
  ]
};

// Çalışan Durumu
export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED'
}

// Çalışan
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  hireDate: string;
  terminationDate?: string;
  hourlyRate?: number;
  salary?: number;
  userId?: string;
  notes?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  supervisorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  mobile?: string;
  company?: string;
  type: 'Individual' | 'Corporate';
  status: 'Active' | 'Inactive';
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  taxId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lead {
  id: string;
  name: string;
  source: string;
  status: 'New' | 'Contacted' | 'Consultation' | 'Retained' | 'Lost';
  estimatedValue: number;
  practiceArea: PracticeArea;
}

export interface Matter {
  id: string;
  caseNumber: string;
  name: string;
  client: Client;
  practiceArea: PracticeArea;
  status: CaseStatus;
  feeStructure: FeeStructure; // Added
  openDate: string;
  responsibleAttorney: string;
  billableRate: number;
  trustBalance: number;
  courtType?: string;
  bailStatus?: 'None' | 'Set' | 'Posted' | 'Forfeited' | 'Exonerated' | 'Returned';
  bailAmount?: number;
  outcome?: string;
}

export interface TimeEntry {
  id: string;
  matterId: string;
  description: string;
  duration: number; // in minutes
  rate: number;
  date: string;
  billed: boolean;
  type: 'time';
}

export interface Expense {
  id: string;
  matterId: string;
  description: string;
  amount: number;
  date: string;
  category: 'Court Fee' | 'Travel' | 'Printing' | 'Research' | 'Expert' | 'Courier' | 'Other';
  billed: boolean;
  type: 'expense';
}

// Fatura Durumu
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WRITTEN_OFF = 'WRITTEN_OFF',
  CANCELLED = 'CANCELLED'
}

// Fatura Kalemi Tipi
export enum LineItemType {
  TIME = 'TIME',
  EXPENSE = 'EXPENSE',
  FIXED_FEE = 'FIXED_FEE',
  DISCOUNT = 'DISCOUNT',
  TAX = 'TAX',
  WRITE_OFF = 'WRITE_OFF',
  RETAINER = 'RETAINER',
  COURT_FEE = 'COURT_FEE',
  OTHER = 'OTHER'
}

// Fatura Kalemi
export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  type: LineItemType;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  utbmsActivityCode?: string;
  utbmsExpenseCode?: string;
  utbmsTaskCode?: string;
  timeEntryId?: string;
  expenseId?: string;
  taxable: boolean;
  billable: boolean;
  writtenOff: boolean;
  date: string;
}

// Fatura Ödemesi
export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'trust';
  reference?: string;
  stripePaymentId?: string;
  isRefund: boolean;
  refundReason?: string;
  notes?: string;
  paidAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  client: Client;
  clientId: string;
  matterId?: string;

  // Tutarlar
  subtotal: number;
  taxRate?: number;
  taxAmount: number;
  discount: number;
  amount: number;
  amountPaid: number;
  balance: number;

  // Tarihler
  issueDate: string;
  dueDate: string;
  paidDate?: string;

  // Workflow
  status: InvoiceStatus;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;

  // LEDES
  ledesCode?: string;

  // Alt tablolar
  lineItems?: InvoiceLineItem[];
  payments?: InvoicePayment[];

  // Notlar
  notes?: string;
  terms?: string;

  createdAt?: string;
  updatedAt?: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done' | 'Archived';
export type TaskOutcome = 'success' | 'failed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  reminderAt?: string;
  priority: 'High' | 'Medium' | 'Low';
  status: TaskStatus;
  outcome?: TaskOutcome; // for completed tasks
  matterId?: string;
  assignedTo?: string; // Initials
  templateId?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  category?: string;
  description?: string;
  definition: string; // JSON string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'Court' | 'Meeting' | 'Deadline';
  matterId?: string;
  reminderMinutes?: number; // Kaç dakika önce bildirim gönderilecek (0, 15, 30, 60, 120, 1440)
  duration?: number; // Etkinlik süresi dakika cinsinden
  reminderSent?: boolean; // Bildirim gönderildi mi
}

export interface DocumentFile {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'folder' | 'img';
  size?: string;
  fileSize?: number;
  updatedAt: string;
  matterId?: string;
  content?: string; // optional data URL for inline open/download
  filePath?: string; // server file path for uploaded documents
  description?: string;
  tags?: string[];
  category?: string;
  version?: number;
}

export interface Message {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  matterId?: string;
}

export interface AIRequest {
  prompt: string;
  tone: 'Professional' | 'Aggressive' | 'Empathetic' | 'Academic' | 'Persuasive';
  context?: string;
  docType?: 'Motion' | 'Email' | 'Memo' | 'Contract' | 'Letter';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  clientId?: string | null;
  clientEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: any | null;
  newValues?: any | null;
  oldValuesRaw?: string | null;
  newValuesRaw?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  page: number;
  limit: number;
  total: number;
  items: AuditLogEntry[];
}

// ========== V2.0 NEW TYPES ==========

export interface TrustTransaction {
  id: string;
  matterId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'refund';
  amount: number;
  description: string;
  reference?: string;
  balance: number;
  createdBy?: string;
  createdAt: string;
}

export interface AppointmentRequest {
  id: string;
  clientId: string;
  matterId?: string;
  requestedDate: string;
  duration: number;
  type: 'consultation' | 'meeting' | 'call' | 'court';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  assignedTo?: string;
  approvedDate?: string;
  createdAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: 'matter_created' | 'status_changed' | 'deadline_approaching' | 'task_completed' | 'invoice_created';
  triggerConfig?: string;
  actions: string;
  isActive: boolean;
  runCount: number;
  lastRunAt?: string;
  createdBy?: string;
  createdAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggeredBy: string;
  status: 'success' | 'failed' | 'partial';
  actionsRun?: string;
  error?: string;
  executedAt: string;
}

export interface SignatureRequest {
  id: string;
  documentId: string;
  clientId: string;
  status: 'pending' | 'signed' | 'declined' | 'expired';
  signedAt?: string;
  signatureData?: string;
  ipAddress?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface IntakeForm {
  id: string;
  name: string;
  description?: string;
  fields: string;
  practiceArea?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface IntakeSubmission {
  id: string;
  formId: string;
  data: string;
  status: 'new' | 'reviewed' | 'converted' | 'rejected';
  convertedToClientId?: string;
  convertedToMatterId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface SettlementStatement {
  id: string;
  matterId: string;
  grossSettlement: number;
  attorneyFees: number;
  expenses: number;
  liens?: number;
  netToClient: number;
  breakdown?: string;
  status: 'draft' | 'sent' | 'approved' | 'disputed';
  clientApprovedAt?: string;
  pdfPath?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  stripePaymentId?: string;
  paymentMethod?: string;
  last4?: string;
  brand?: string;
  receiptUrl?: string;
  paidAt?: string;
  createdAt: string;
}

// Doküman Versiyonu
export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  changeNote?: string;
  changedBy?: string;
  checksum?: string;
  diffSummary?: string;
  isLatest: boolean;
  createdAt: string;
}

// Son Tarih Kural Tipi
export enum DeadlineRuleType {
  COURT_FILING = 'COURT_FILING',
  RESPONSE_DUE = 'RESPONSE_DUE',
  DISCOVERY = 'DISCOVERY',
  MOTION = 'MOTION',
  APPEAL = 'APPEAL',
  STATUTE_OF_LIMIT = 'STATUTE_OF_LIMIT',
  CONTRACT = 'CONTRACT',
  CUSTOM = 'CUSTOM'
}

// Son Tarih Kuralı
export interface DeadlineRule {
  id: string;
  name: string;
  description?: string;
  type: DeadlineRuleType;
  baseDays: number;
  useBusinessDays: boolean;
  excludeHolidays: boolean;
  triggerEvent?: string;
  jurisdiction?: string;
  practiceArea?: string;
  reminderDays?: string; // JSON: [30, 7, 1]
  isActive: boolean;
  priority: number;
  createdBy?: string;
  createdAt: string;
}

// Hesaplanmış Son Tarih
export interface CalculatedDeadline {
  id: string;
  ruleId: string;
  rule?: DeadlineRule;
  matterId: string;
  triggerDate: string;
  dueDate: string;
  reminder30Sent: boolean;
  reminder7Sent: boolean;
  reminder1Sent: boolean;
  status: 'pending' | 'completed' | 'overdue';
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface ActiveTimer {
  startTime: number; // timestamp
  matterId?: string;
  description: string;
  isRunning: boolean;
  elapsed: number; // saved elapsed time if paused
  rate?: number;
}

// ==============================
// IOLTA TRUST ACCOUNTING TYPES
// ABA Model Rule 1.15 Compliant
// ==============================

// Trust Account Status
export enum TrustAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CLOSED = 'CLOSED'
}

// Client Ledger Status
export enum LedgerStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  FROZEN = 'FROZEN'
}

// Trust Transaction Status
export enum TrustTxStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  VOIDED = 'VOIDED'
}

// Trust Transaction Type (V2)
export enum TrustTransactionTypeV2 {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  REFUND_TO_CLIENT = 'REFUND_TO_CLIENT',
  FEE_EARNED = 'FEE_EARNED',
  INTEREST = 'INTEREST'
}

// Trust Bank Account (IOLTA Account)
export interface TrustBankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumberEnc: string; // Encrypted
  routingNumber: string;
  jurisdiction: string; // State code
  currentBalance: number;
  status: TrustAccountStatus;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: string;
}

// Client Trust Ledger (Subsidiary Ledger)
export interface ClientTrustLedger {
  id: string;
  clientId: string;
  client?: Client;
  matterId?: string;
  trustAccountId: string;
  trustAccount?: TrustBankAccount;
  runningBalance: number;
  status: LedgerStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: string;
  closedReason?: string;
}

// Trust Transaction V2 (IOLTA Compliant - Immutable)
export interface TrustTransactionV2 {
  id: string;
  trustAccountId: string;
  trustAccount?: TrustBankAccount;
  type: TrustTransactionTypeV2;
  amount: number;

  // Immutability
  isVoided: boolean;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  originalTxId?: string;

  // Required Metadata
  description: string;
  payorPayee: string;
  checkNumber?: string;
  wireReference?: string;

  // Approval Workflow
  status: TrustTxStatus;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  // IOLTA Tracking
  isEarned: boolean;
  earnedDate?: string;

  // Balance Snapshots
  accountBalanceBefore: number;
  accountBalanceAfter: number;

  createdAt: string;

  // Relations
  allocations?: TrustAllocationLine[];
}

// Trust Allocation Line (Split deposits/withdrawals)
export interface TrustAllocationLine {
  id: string;
  transactionId: string;
  transaction?: TrustTransactionV2;
  ledgerId: string;
  ledger?: ClientTrustLedger;
  amount: number; // Positive = deposit, Negative = withdrawal
  description?: string;
  ledgerBalanceAfter: number;
  createdAt: string;
}

// Earned Fee Event (Trust → Operating)
export interface EarnedFeeEvent {
  id: string;
  invoiceId: string;
  ledgerId: string;
  ledger?: ClientTrustLedger;
  trustTxId: string;
  trustTx?: TrustTransactionV2;
  amount: number;
  approvedBy: string;
  approvedAt: string;
  operatingReference?: string;
  notes?: string;
  createdAt: string;
}

// Reconciliation Record (Three-Way)
export interface ReconciliationRecord {
  id: string;
  trustAccountId: string;
  trustAccount?: TrustBankAccount;
  periodStart: string;
  periodEnd: string;

  // Three-Way Balances
  bankStatementBalance: number;
  trustLedgerBalance: number;
  clientLedgerSumBalance: number;

  // Status
  isReconciled: boolean;
  discrepancyAmount?: number;

  // Outstanding Items
  outstandingChecks?: string; // JSON
  depositsInTransit?: string; // JSON
  otherAdjustments?: string; // JSON

  exceptions?: string; // JSON
  notes?: string;

  // Prepared/Approved
  preparedBy: string;
  preparedAt: string;
  approvedBy?: string;
  approvedAt?: string;

  createdAt: string;
}

// Trust Audit Log (Immutable)
export interface TrustAuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousState?: string; // JSON
  newState?: string; // JSON
  metadata?: string; // JSON
  amount?: number;
  trustAccountId?: string;
  clientLedgerId?: string;
  transactionId?: string;
  createdAt: string;
}

// Jurisdiction Config
export interface JurisdictionConfig {
  id: string;
  stateCode: string;
  stateName: string;
  interestToBar: boolean;
  interestRate?: number;
  retentionYears: number;
  reportingFreq: 'ANNUAL' | 'QUARTERLY';
  minBalanceForInterest?: number;
  specialRules?: string; // JSON
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Trust-specific Permissions
export type TrustPermission =
  | 'trust.view'
  | 'trust.deposit'
  | 'trust.withdraw'
  | 'trust.transfer'
  | 'trust.void'
  | 'trust.reconcile'
  | 'trust.approve'
  | 'trust.close_ledger'
  | 'trust.export'
  | 'trust.admin';

// Trust Operation Result
export interface TrustOperationResult {
  success: boolean;
  error?: string;
  message?: string;
  transactionId?: string;
  ledgerId?: string;
  newBalance?: number;
}

// Reconciliation Input
export interface ReconciliationInput {
  trustAccountId: string;
  periodEnd: string;
  bankStatementBalance: number;
  outstandingChecks?: { checkNumber: string; amount: number; date: string }[];
  depositsInTransit?: { reference: string; amount: number; date: string }[];
  notes?: string;
}

// Trust Deposit Request
export interface TrustDepositRequest {
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
}

// Trust Withdrawal Request
export interface TrustWithdrawalRequest {
  trustAccountId: string;
  ledgerId: string;
  amount: number;
  payorPayee: string;
  description: string;
  checkNumber?: string;
}