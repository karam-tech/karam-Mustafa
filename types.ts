
// types.ts

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export type AccountCategory = 
    // Assets
    'Cash' | 
    'Bank' | 
    'Customer' | 
    'Inventory' | 
    'Fixed Asset' | 
    // Liabilities
    'Supplier' | 
    'Loan' | 
    'Payable' | 
    'Taxes Payable' |
    // Equity
    'Capital' | 
    'Retained Earnings' |
    // Revenue
    'Service Revenue' |
    // Expenses
    'Operating Expense' |
    'Administrative Expense' |
    'Payroll' |
    'Other';


export type Role = 'admin' | 'accountant' | 'clerk' | 'viewer';

export type TransactionType = 'general' | 'receipt' | 'payment' | 'invoice' | 'adjustment';

export type OperationType = 'import' | 'export' | 'sea-clearance' | 'air-clearance' | 'return' | 'credit-note';
export type OperationStatus = 'in-progress' | 'completed' | 'postponed';
export type TaxType = 'none' | 'schedule' | 'vat';

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'weekend';

export type PayrollStatus = 'Draft' | 'Posted';

export interface Account {
    id: string;
    name: string;
    type: AccountType;
    openingBalance?: number;
    notes?: string;
    currency?: string;

    // New detailed categorization field
    accountCategory?: AccountCategory;

    // For bank/cash accounts
    isBankOrCash?: boolean;
    category?: 'safe' | 'bank';
    currencyType?: 'local' | 'foreign';
    conversionRate?: number;
    country?: string;
    accountNumber?: string;
    email?: string;
    phone?: string;
    minBalance?: number; // Account-specific minimum balance threshold

    // For customer/supplier accounts
    address?: string;
    taxNumber?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankCurrency?: string;
    linkedAccountId?: string;
    priceListId?: string; // ID of the default PriceList
    creditLimit?: number;
    paymentTerms?: string;
    contactPerson?: string;
}

export interface JournalEntryLine {
    accountId: string;
    debit: number;
    credit: number;
    amountForeign?: number;
    currency?: string;
    conversionRate?: number;
}

export interface JournalEntry {
    id: string;
    date: string; // YYYY-MM-DD
    description: string;
    referenceNumber?: string;
    transactionType?: TransactionType;
    lines: JournalEntryLine[];
    checkDetails?: {
        checkNumber?: string;
        checkDate?: string;
    };
}

export interface PriceListItem {
    id: string;
    description: string;
    price: number;
    taxType: TaxType;
}

export interface PriceList {
    id: string;
    customerId: string;
    name: string;
    items: PriceListItem[];
}

export interface OperationLineItem {
    id: string;
    description: string;
    amount: number;
    taxType?: TaxType;
    priceListItemId?: string; // Tracks if this item came from a price list
    isPriceOverridden?: boolean; // Tracks if the price was manually changed from the list price
}

export interface OperationStatusHistory {
  status: OperationStatus;
  timestamp: string; // ISO date string
  userId: string;
  username: string;
  notes?: string;
}

export interface Operation {
    id: string;
    code: string;
    creationDate: string; // YYYY-MM-DD
    clientId: string;
    type: OperationType;
    status: OperationStatus;
    description: string;
    billOfLading?: string;
    containerNumber?: string;
    voyageNumber?: string;
    portOfLoading?: string;
    portOfDischarge?: string;
    lineItems?: OperationLineItem[];
    cost?: number;
    journalEntryId?: string;
    statusHistory?: OperationStatusHistory[];
}

export interface Document {
  id: string;
  name: string;
  type: string; // MIME type
  size: number; // in bytes
  data: string; // base64 data URL
  linkedToId: string; // ID of the Account or Operation
  linkedToType: 'account' | 'operation';
  uploadDate: string; // ISO date string
}

export interface Task {
    id: string;
    text: string;
    date: string; // YYYY-MM-DD
    completed: boolean;
}

export interface User {
    id: string;
    username: string;
    password?: string;
    role: Role;
}

export interface Employee {
    id: string;
    name: string;
    jobTitle: string;
    socialStatus: string;
    nationalId: string;
    insuranceId: string;
    phone?: string;
    leaveBalance: number;
    baseSalary: number;
    bonuses?: number;
    representationAllowance?: number;
    transportAllowance?: number;
    mealAllowance?: number;
    clothingAllowance?: number;
    companyInsuranceShare: number;
    employeeInsuranceShare: number;
    incomeTax: number;
    advancesAndLoans?: number;
}

export type AttendanceRecord = {
    [date: string]: { // YYYY-MM-DD
        [employeeId: string]: AttendanceStatus;
    };
};

export interface PayrollDataRow extends Employee {
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    absenceDays: number;
    absenceDeduction: number;
}

export interface PayrollTotals {
    baseSalary: number;
    bonuses: number;
    representationAllowance: number;
    transportAllowance: number;
    mealAllowance: number;
    clothingAllowance: number;
    grossSalary: number;
    companyInsuranceShare: number;
    employeeInsuranceShare: number;
    incomeTax: number;
    advancesAndLoans: number;
    totalDeductions: number;
    netSalary: number;
    absenceDays: number;
    absenceDeduction: number;
}

export interface PayrollEntry {
    id: string;
    monthYear: string; // YYYY-MM
    status: PayrollStatus;
    payrollData: PayrollDataRow[];
    totals: PayrollTotals;
    journalEntryId?: string;
}

export interface DashboardWidgets {
    showStatCards: boolean;
    showRevenueSummary: boolean;
    showExpenseSummary: boolean;
    showLocalBankBalances: boolean;
    showForeignBankBalances: boolean;
    showLocalSafeBalances: boolean;
    showForeignSafeBalances: boolean;
}

export interface LowBalanceRecord {
    id: string;
    date: string; // ISO string
    accounts: {
        name: string;
        balance: number;
        currency?: string;
    }[];
    threshold: number;
}


export interface AuditFinding {
    finding: string;
    severity: 'info' | 'warning' | 'error';
    recommendation: string;
}

export interface TrendAnalysisDetail {
    trend: 'increasing' | 'decreasing' | 'stable' | 'positive' | 'negative';
    analysis: string;
}

export interface CostSavingSuggestion {
    area: string;
    suggestion: string;
}

export interface FinancialTrendAnalysis {
    overallSummary: string;
    cashFlowPrediction: TrendAnalysisDetail;
    revenueTrend: TrendAnalysisDetail;
    expenseTrend: TrendAnalysisDetail;
    costSavingSuggestions: CostSavingSuggestion[];
}

export interface DecisionOption {
    title: string;
    description: string;
    pros: string[];
    cons: string[];
}


// --- Audit Log Types ---

export interface AuditLogChangeDetail {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  userId: string;
  username: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'Account' | 'Operation' | 'JournalEntry' | 'PriceList' | 'Employee' | 'User' | 'PayrollEntry' | 'Document';
  entityId: string;
  entityDescription: string; 
  changes?: AuditLogChangeDetail[]; 
}
