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

export interface Invoice {
  id: string;
  number: string;
  client: Client;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Overdue' | 'Sent' | 'Draft';
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  reminderAt?: string;
  priority: 'High' | 'Medium' | 'Low';
  status: TaskStatus;
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