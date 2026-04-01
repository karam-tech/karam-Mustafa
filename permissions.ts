import { Role } from './types';

// Defines which views each role can access.
const PERMISSIONS: Record<Role, string[]> = {
  admin: ['dashboard', 'operations', 'journal', 'payroll', 'accounts', 'customerManagement', 'bankAndCash', 'taskCalendar', 'accountAnalysis', 'aiReports', 'userManagement', 'taxReport', 'expenseReport', 'operationalCostReport', 'dataManagement', 'trialBalance', 'finalReports', 'profitAndLoss', 'auditLog'],
  accountant: ['dashboard', 'operations', 'journal', 'payroll', 'accounts', 'customerManagement', 'bankAndCash', 'taskCalendar', 'accountAnalysis', 'aiReports', 'taxReport', 'expenseReport', 'operationalCostReport', 'dataManagement', 'trialBalance', 'finalReports', 'profitAndLoss'],
  clerk: ['dashboard', 'operations', 'journal', 'customerManagement', 'taskCalendar'],
  viewer: ['dashboard', 'operations', 'journal', 'accounts', 'customerManagement', 'bankAndCash', 'accountAnalysis', 'trialBalance', 'taxReport', 'expenseReport', 'operationalCostReport', 'finalReports', 'profitAndLoss'],
};

// Defines which roles can create new entries.
const CAN_CREATE: Role[] = ['admin', 'accountant', 'clerk'];

// Defines which roles can edit entries.
const CAN_EDIT: Role[] = ['admin', 'accountant', 'clerk'];

// Defines which roles can delete entries.
const CAN_DELETE: Role[] = ['admin', 'accountant'];

// Defines roles that can perform sensitive actions like posting journals.
const CAN_POST: Role[] = ['admin', 'accountant'];

/**
 * Checks if a role has permission to access a specific view.
 * @param role The user's role.
 * @param viewId The ID of the view to check.
 * @returns True if the user has permission, false otherwise.
 */
export const hasPermission = (role: Role, viewId: string): boolean => {
  return PERMISSIONS[role]?.includes(viewId) ?? false;
};

/**
 * Checks if a role has permission to perform a specific action.
 * @param role The user's role.
 * @param action The action to check ('create', 'edit', 'delete', 'post').
 * @returns True if the user has permission, false otherwise.
 */
export const canPerformAction = (role: Role, action: 'create' | 'edit' | 'delete' | 'post'): boolean => {
    switch (action) {
        case 'create':
            return CAN_CREATE.includes(role);
        case 'edit':
            return CAN_EDIT.includes(role);
        case 'delete':
            return CAN_DELETE.includes(role);
        case 'post':
            return CAN_POST.includes(role);
        default:
            return false;
    }
}