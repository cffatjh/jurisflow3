import { Matter, Task, TimeEntry, Lead, CalendarEvent, Invoice, TaskStatus, Expense, Employee } from "../types";

// Use relative path when in browser (proxy will handle it), fallback to full URL for SSR
const API_URL = typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api';

const fetchJson = async (endpoint: string, options: RequestInit = {}) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api.ts:6', message: 'API call started', data: { endpoint, method: options.method || 'GET' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...options
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api.ts:15', message: 'API response received', data: { endpoint, status: res.status, statusText: res.statusText, hasToken: !!token }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    // Handle 401 Unauthorized gracefully - return null instead of throwing
    if (res.status === 401) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api.ts:18', message: 'API 401 Unauthorized', data: { endpoint }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion
        return null;
    }
    if (!res.ok) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api.ts:22', message: 'API error', data: { endpoint, status: res.status, statusText: res.statusText }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion
        throw new Error(`API Error: ${res.statusText}`);
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api.ts:25', message: 'API call succeeded', data: { endpoint }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    return res.json();
};

export const api = {
    // Auth
    login: (data: { email: string; password: string }) => fetchJson('/login', { method: 'POST', body: JSON.stringify(data) }),

    // Matters
    getMatters: () => fetchJson('/matters'),
    createMatter: (data: Partial<Matter>) => fetchJson('/matters', { method: 'POST', body: JSON.stringify(data) }),
    updateMatter: (id: string, data: Partial<Matter>) => fetchJson(`/matters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteMatter: (id: string) => fetchJson(`/matters/${id}`, { method: 'DELETE' }),

    // Tasks
    getTasks: () => fetchJson('/tasks'),
    createTask: (data: Partial<Task>) => fetchJson('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    updateTaskStatus: (id: string, status: TaskStatus) => fetchJson(`/tasks/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    updateTask: (id: string, data: Partial<Task>) => fetchJson(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTask: (id: string) => fetchJson(`/tasks/${id}`, { method: 'DELETE' }),

    // Task Templates
    getTaskTemplates: () => fetchJson('/task-templates'),
    createTasksFromTemplate: (data: { templateId: string; matterId?: string; assignedTo?: string; baseDate?: string }) =>
        fetchJson('/tasks/from-template', { method: 'POST', body: JSON.stringify(data) }),

    // Time & Expenses
    getTimeEntries: () => fetchJson('/time-entries'),
    createTimeEntry: (data: Partial<TimeEntry>) => fetchJson('/time-entries', { method: 'POST', body: JSON.stringify(data) }),
    getExpenses: () => fetchJson('/expenses'),
    createExpense: (data: Partial<Expense>) => fetchJson('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    markAsBilled: (matterId: string) => fetchJson('/billing/mark-billed', { method: 'POST', body: JSON.stringify({ matterId }) }),

    // CRM
    getClients: () => fetchJson('/clients'),
    createClient: (data: any) => fetchJson('/clients', { method: 'POST', body: JSON.stringify(data) }),
    getLeads: () => fetchJson('/leads'),
    createLead: (data: Partial<Lead>) => fetchJson('/leads', { method: 'POST', body: JSON.stringify(data) }),
    updateLead: (id: string, data: Partial<Lead>) => fetchJson(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteLead: (id: string) => fetchJson(`/leads/${id}`, { method: 'DELETE' }),

    // Calendar
    getEvents: () => fetchJson('/events'),
    createEvent: (data: Partial<CalendarEvent>) => fetchJson('/events', { method: 'POST', body: JSON.stringify(data) }),
    deleteEvent: (id: string) => fetchJson(`/events/${id}`, { method: 'DELETE' }),

    // Invoices
    getInvoices: () => fetchJson('/invoices'),
    getInvoice: (id: string) => fetchJson(`/invoices/${id}`),
    createInvoice: (data: any) => {
        const payload = { ...data, clientId: data.client?.id || data.clientId };
        return fetchJson('/invoices', { method: 'POST', body: JSON.stringify(payload) });
    },
    updateInvoice: (id: string, data: any) => fetchJson(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteInvoice: (id: string) => fetchJson(`/invoices/${id}`, { method: 'DELETE' }),

    // Invoice Workflow
    approveInvoice: (id: string) => fetchJson(`/invoices/${id}/approve`, { method: 'POST' }),
    sendInvoice: (id: string) => fetchJson(`/invoices/${id}/send`, { method: 'POST' }),

    // Invoice Line Items
    addInvoiceLineItem: (invoiceId: string, data: any) => fetchJson(`/invoices/${invoiceId}/line-items`, { method: 'POST', body: JSON.stringify(data) }),
    updateInvoiceLineItem: (invoiceId: string, itemId: string, data: any) => fetchJson(`/invoices/${invoiceId}/line-items/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteInvoiceLineItem: (invoiceId: string, itemId: string) => fetchJson(`/invoices/${invoiceId}/line-items/${itemId}`, { method: 'DELETE' }),

    // Invoice Payments
    recordPayment: (invoiceId: string, data: any) => fetchJson(`/invoices/${invoiceId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
    refundPayment: (invoiceId: string, paymentId: string, data: any) => fetchJson(`/invoices/${invoiceId}/payments/${paymentId}/refund`, { method: 'POST', body: JSON.stringify(data) }),

    // Notifications
    getNotifications: () => fetchJson('/notifications'),
    markNotificationRead: (id: string) => fetchJson(`/notifications/${id}/read`, { method: 'PUT' }),
    markNotificationUnread: (id: string) => fetchJson(`/notifications/${id}/unread`, { method: 'PUT' }),
    markAllNotificationsRead: () => fetchJson('/notifications/read-all', { method: 'PUT' }),

    // Reports
    getReportOverview: (params: { from?: string; to?: string; matterId?: string } = {}) => {
        const qs = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (!v) return;
            qs.set(k, v);
        });
        const query = qs.toString() ? `?${qs.toString()}` : '';
        return fetchJson(`/reports/overview${query}`);
    },

    // User Profile
    updateUserProfile: (data: any) => fetchJson('/user/profile', { method: 'PUT', body: JSON.stringify(data) }),

    // Admin: User Management
    admin: {
        getUsers: () => fetchJson('/admin/users'),
        createUser: (data: any) => fetchJson('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
        updateUser: (id: string, data: any) => fetchJson(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteUser: (id: string) => fetchJson(`/admin/users/${id}`, { method: 'DELETE' }),

        // Admin: Client Management
        getClients: () => fetchJson('/admin/clients'),
        updateClient: (id: string, data: any) => fetchJson(`/admin/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteClient: (id: string) => fetchJson(`/admin/clients/${id}`, { method: 'DELETE' }),

        // Admin: Audit Logs
        getAuditLogs: (params: {
            page?: number;
            limit?: number;
            action?: string;
            entityType?: string;
            entityId?: string;
            userId?: string;
            clientId?: string;
            email?: string;
            q?: string;
            from?: string;
            to?: string;
        } = {}) => {
            const qs = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => {
                if (v === undefined || v === null || v === '') return;
                qs.set(k, String(v));
            });
            const query = qs.toString() ? `?${qs.toString()}` : '';
            return fetchJson(`/admin/audit-logs${query}`);
        }
    },

    // Documents
    uploadDocument: async (file: File, matterId?: string, description?: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const formData = new FormData();
        formData.append('file', file);
        if (matterId) formData.append('matterId', matterId);
        if (description) formData.append('description', description);

        const res = await fetch(`${API_URL}/documents/upload`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: formData
        });
        if (res.status === 401) return null;
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
    },
    getDocuments: (params?: { matterId?: string; q?: string }) => {
        const qs = new URLSearchParams();
        if (params?.matterId) qs.set('matterId', params.matterId);
        if (params?.q) qs.set('q', params.q);
        const query = qs.toString() ? `?${qs.toString()}` : '';
        return fetchJson(`/documents${query}`);
    },
    deleteDocument: (id: string) => fetchJson(`/documents/${id}`, { method: 'DELETE' }),
    updateDocument: (id: string, data: { matterId?: string | null; description?: string | null; tags?: string[] | string | null }) =>
        fetchJson(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    bulkAssignDocuments: (data: { ids: string[]; matterId?: string | null }) =>
        fetchJson('/documents/bulk-assign', { method: 'PUT', body: JSON.stringify(data) }),

    // Password Reset
    forgotPassword: (email: string, userType: 'attorney' | 'client') =>
        fetchJson('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email, userType }) }),
    resetPassword: (token: string, password: string) =>
        fetchJson('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

    // ========== V2.0 APIs ==========

    // Trust Accounting
    getTrustTransactions: (matterId: string) => fetchJson(`/matters/${matterId}/trust`),
    createTrustTransaction: (matterId: string, data: { type: string; amount: number; description: string; reference?: string }) =>
        fetchJson(`/matters/${matterId}/trust`, { method: 'POST', body: JSON.stringify(data) }),

    // Workflows
    getWorkflows: () => fetchJson('/workflows'),
    createWorkflow: (data: { name: string; description?: string; trigger: string; actions: any[]; isActive?: boolean }) =>
        fetchJson('/workflows', { method: 'POST', body: JSON.stringify(data) }),
    updateWorkflow: (id: string, data: Partial<{ name: string; description: string; trigger: string; actions: any[]; isActive: boolean }>) =>
        fetchJson(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteWorkflow: (id: string) => fetchJson(`/workflows/${id}`, { method: 'DELETE' }),

    // Appointments (Attorney)
    getAppointments: () => fetchJson('/appointments'),
    updateAppointment: (id: string, data: { status: string; approvedDate?: string; assignedTo?: string }) =>
        fetchJson(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    // Intake Forms
    getIntakeForms: () => fetchJson('/intake-forms'),
    createIntakeForm: (data: { name: string; description?: string; fields: any[]; practiceArea?: string }) =>
        fetchJson('/intake-forms', { method: 'POST', body: JSON.stringify(data) }),
    getIntakeSubmissions: () => fetchJson('/intake-submissions'),
    updateIntakeSubmission: (id: string, data: { status: string; notes?: string }) =>
        fetchJson(`/intake-submissions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    // Settlement Statements
    getSettlementStatements: (matterId: string) => fetchJson(`/matters/${matterId}/settlement`),
    createSettlementStatement: (matterId: string, data: { grossSettlement: number; attorneyFees: number; expenses: number; liens?: number }) =>
        fetchJson(`/matters/${matterId}/settlement`, { method: 'POST', body: JSON.stringify(data) }),

    // Signature Requests
    createSignatureRequest: (documentId: string, data: { clientId: string; expiresAt?: string }) =>
        fetchJson(`/documents/${documentId}/signature`, { method: 'POST', body: JSON.stringify(data) }),
    getDocumentSignatures: (documentId: string) => fetchJson(`/documents/${documentId}/signatures`),

    // Employees (Çalışanlar)
    getEmployees: () => fetchJson('/employees'),
    getEmployee: (id: string) => fetchJson(`/employees/${id}`),
    createEmployee: (data: Partial<Employee>) => fetchJson('/employees', { method: 'POST', body: JSON.stringify(data) }),
    updateEmployee: (id: string, data: Partial<Employee>) => fetchJson(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEmployee: (id: string) => fetchJson(`/employees/${id}`, { method: 'DELETE' }),
    resetEmployeePassword: (id: string) => fetchJson(`/employees/${id}/reset-password`, { method: 'POST' }),
    assignTaskToEmployee: (employeeId: string, taskId: string) => fetchJson(`/employees/${employeeId}/assign-task`, { method: 'POST', body: JSON.stringify({ taskId }) }),
};
