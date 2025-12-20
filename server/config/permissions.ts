export type Permission =
    | 'system.admin'
    | 'system.config'
    | 'user.manage'
    | 'matter.view'
    | 'matter.create'
    | 'matter.edit'
    | 'matter.delete'
    | 'billing.view'
    | 'billing.manage'
    | 'billing.approve'
    | 'trust.view'
    | 'trust.manage'
    | 'document.view'
    | 'document.create'
    | 'document.edit'
    | 'document.delete'
    | 'report.financial'
    | 'calendar.manage'
    | 'task.manage'
    | 'client.manage';

// Matches Prisma EmployeeRole + User Role fallbacks
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    // --- Employee Roles ---
    'INTERN_LAWYER': ['matter.view', 'document.view', 'document.create', 'document.edit', 'calendar.manage', 'task.manage'],
    'SECRETARY': ['calendar.manage', 'client.manage', 'task.manage', 'matter.view', 'document.view'],
    'PARALEGAL': ['matter.create', 'matter.view', 'matter.edit', 'document.create', 'document.edit', 'document.view', 'calendar.manage', 'task.manage', 'client.manage', 'billing.manage'],
    'ACCOUNTANT': ['billing.view', 'billing.manage', 'billing.approve', 'trust.view', 'trust.manage', 'report.financial', 'matter.view', 'document.view'],
    'ATTORNEY': [
        'user.manage',
        'matter.view', 'matter.create', 'matter.edit', 'matter.delete',
        'billing.view', 'billing.manage', 'billing.approve',
        'trust.view', 'trust.manage',
        'document.view', 'document.create', 'document.edit', 'document.delete',
        'report.financial',
        'calendar.manage', 'task.manage', 'client.manage'
    ],

    // --- User Roles (Fallbacks) ---
    'Partner': [ // Same as ATTORNEY + potentially more system access if needed, but keeping consistent
        'user.manage',
        'matter.view', 'matter.create', 'matter.edit', 'matter.delete',
        'billing.view', 'billing.manage', 'billing.approve',
        'trust.view', 'trust.manage',
        'document.view', 'document.create', 'document.edit', 'document.delete',
        'report.financial',
        'calendar.manage', 'task.manage', 'client.manage'
    ],
    'Admin': ['*'] as any // Admin gets everything bypassed check usually, but good to have
};
