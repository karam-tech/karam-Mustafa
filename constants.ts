
// Mock data to be used throughout the application.
import { Account, JournalEntry, Operation, Task, Employee, User, PriceList } from './types';

export const MOCK_ACCOUNTS: Account[] = [
  // Assets
  { id: '1010', name: 'الصندوق الرئيسي', type: 'Asset', accountCategory: 'Cash', isBankOrCash: true, openingBalance: 50000, category: 'safe', currencyType: 'local', currency: 'EGP', address: '5 شارع باسم الكتبي, الدقي, الجيزة' },
  { id: '1015', name: 'صندوق الدولار', type: 'Asset', accountCategory: 'Cash', isBankOrCash: true, openingBalance: 5000, category: 'safe', currencyType: 'foreign', currency: 'USD', conversionRate: 47.5 },
  { id: '1020', name: 'بنك CIB', type: 'Asset', accountCategory: 'Bank', isBankOrCash: true, openingBalance: 150000, category: 'bank', currencyType: 'local', country: 'مصر', accountNumber: '100012345678', currency: 'EGP' },
  { id: '1025', name: 'Bank of America - USD', type: 'Asset', accountCategory: 'Bank', isBankOrCash: true, openingBalance: 10000, category: 'bank', currencyType: 'foreign', currency: 'USD', country: 'USA', accountNumber: '3005551234' },
  { id: '1030', name: 'بنك QNB', type: 'Asset', accountCategory: 'Bank', isBankOrCash: true, openingBalance: 3200, category: 'bank', currencyType: 'local', country: 'مصر', accountNumber: '200098765432', currency: 'EGP' },
  { id: '1210', name: 'العملاء - شركة النور للاستيراد', type: 'Asset', accountCategory: 'Customer', openingBalance: 25000, address: '123 شارع الهرم, الجيزة', taxNumber: '123-456-789', bankName: 'بنك مصر', bankAccountNumber: '9876543210123', bankCurrency: 'EGP', currency: 'EGP' },
  { id: '1220', name: 'العملاء - المتحدة للتجارة', type: 'Asset', accountCategory: 'Customer', openingBalance: 15000, address: '45 شارع عباس العقاد, القاهرة', taxNumber: '987-654-321', bankName: 'بنك CIB', bankAccountNumber: '1000456789012', bankCurrency: 'USD', currency: 'USD' },
  { id: '1230', name: 'العملاء - ABC Corp', type: 'Asset', accountCategory: 'Customer', openingBalance: 0, address: '123 Main St', phone: '01000000000', currency: 'EGP' },
  // Liabilities
  { id: '2010', name: 'الموردون - خط ميرسك', type: 'Liability', accountCategory: 'Supplier', openingBalance: 40000 },
  { id: '2110', name: 'ضريبة الدخل المستحقة', type: 'Liability', accountCategory: 'Taxes Payable' },
  { id: '2120', name: 'التأمينات الاجتماعية المستحقة', type: 'Liability', accountCategory: 'Taxes Payable' },
  { id: '2130', name: 'رواتب مستحقة الدفع', type: 'Liability', accountCategory: 'Payable' },
  { id: '2140', name: 'ضريبة القيمة المضافة المستحقة', type: 'Liability', accountCategory: 'Taxes Payable' },
  { id: '2150', name: 'ضريبة جدول مستحقة', type: 'Liability', accountCategory: 'Taxes Payable' },
  // Equity
  { id: '3010', name: 'رأس المال', type: 'Equity', accountCategory: 'Capital', openingBalance: 500000 },
  { id: '3020', name: 'الأرباح المحتجزة', type: 'Equity', accountCategory: 'Retained Earnings', openingBalance: 75000 },
  // Revenue
  { id: '4010', name: 'إيرادات تخليص جمركي', type: 'Revenue', accountCategory: 'Service Revenue' },
  { id: '4020', name: 'إيرادات شحن', type: 'Revenue', accountCategory: 'Service Revenue' },
  // Expenses
  { id: '5010', name: 'مصروفات تشغيلية', type: 'Expense', accountCategory: 'Operating Expense' },
  { id: '5020', name: 'مصروفات إدارية', type: 'Expense', accountCategory: 'Administrative Expense' },
  { id: '5030', name: 'رواتب وأجور', type: 'Expense', accountCategory: 'Payroll' },
  { id: '5040', name: 'مصاريف بنكية', type: 'Expense', accountCategory: 'Operating Expense' },
];

export const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
    {
        id: 'je-001',
        date: '2023-11-15',
        description: 'إثبات إيراد عملية تخليص جمركي رقم 2311-002-03 - شركة النور للاستيراد',
        referenceNumber: '2311-002-03',
        transactionType: 'invoice',
        lines: [
            { accountId: '1210', debit: 22900, credit: 0 }, // Total Invoice (20500 + 2100 VAT + 300 Schedule)
            { accountId: '4010', debit: 0, credit: 20500 }, // Total Revenue (15000 + 2500 + 3000)
            { accountId: '2140', debit: 0, credit: 2100 },  // VAT 14% on 15000
            { accountId: '2150', debit: 0, credit: 300 }    // Schedule Tax 10% on 3000
        ]
    }
];

export const MOCK_OPERATIONS: Operation[] = [
  {
    id: 'op-001',
    code: '2311-002-03',
    creationDate: '2023-11-15',
    clientId: '1210', // شركة النور للاستيراد
    type: 'sea-clearance',
    status: 'completed',
    description: 'تخليص جمركي بحري لشحنة ملابس من الصين',
    billOfLading: 'MSCU123456',
    containerNumber: 'MSCU1234567',
    voyageNumber: 'VN098',
    portOfLoading: 'Shanghai, China',
    portOfDischarge: 'Alexandria, Egypt',
    lineItems: [
        { id: 'li-001', description: 'رسوم تخليص جمركي', amount: 15000, taxType: 'vat' },
        { id: 'li-002', description: 'رسوم أرضيات', amount: 2500, taxType: 'none' },
        { id: 'li-003', description: 'نقل داخلي', amount: 3000, taxType: 'schedule' }
    ],
    cost: 12000,
    journalEntryId: 'je-001',
  }
];

export const MOCK_PRICE_LISTS: PriceList[] = [
    {
        id: 'pl-001',
        customerId: '1210', // شركة النور للاستيراد
        name: 'تعاقد تخليص بحري - 2023',
        items: [
            { id: 'pli-001', description: 'رسوم تخليص جمركي للحاوية 20 قدم', price: 15000, taxType: 'vat' },
            { id: 'pli-002', description: 'رسوم تخليص جمركي للحاوية 40 قدم', price: 22000, taxType: 'vat' },
            { id: 'pli-003', description: 'رسوم أرضيات (لليوم)', price: 250, taxType: 'none' },
            { id: 'pli-004', description: 'نقل داخلي (القاهرة)', price: 3000, taxType: 'schedule' },
            { id: 'pli-005', description: 'نقل داخلي (الإسكندرية)', price: 1500, taxType: 'schedule' }
        ]
    }
];

export const MOCK_TASKS: Task[] = [];

export const INITIAL_EMPLOYEES: Employee[] = [
    {
        id: 'emp-001',
        name: 'أحمد محمد علي',
        jobTitle: 'مدير حسابات',
        socialStatus: 'متزوج',
        nationalId: '28510101234567',
        insuranceId: '10203040',
        phone: '01012345678',
        leaveBalance: 21,
        baseSalary: 15000,
        transportAllowance: 1000,
        companyInsuranceShare: 2800,
        employeeInsuranceShare: 1650,
        incomeTax: 1200,
        advancesAndLoans: 0
    },
    {
        id: 'emp-002',
        name: 'سارة محمود حسن',
        jobTitle: 'أخصائي تخليص',
        socialStatus: 'عزباء',
        nationalId: '29005059876543',
        insuranceId: '50607080',
        phone: '01234567890',
        leaveBalance: 15,
        baseSalary: 8000,
        mealAllowance: 500,
        companyInsuranceShare: 1500,
        employeeInsuranceShare: 880,
        incomeTax: 400,
        advancesAndLoans: 200
    },
    {
        id: 'emp-003',
        name: 'كرم سيد مصطفى',
        jobTitle: 'مطور برمجيات',
        socialStatus: 'متزوج',
        nationalId: '29512121122334',
        insuranceId: '90102030',
        phone: '01122334455',
        leaveBalance: 30,
        baseSalary: 12000,
        clothingAllowance: 0,
        companyInsuranceShare: 2250,
        employeeInsuranceShare: 1320,
        incomeTax: 850,
        advancesAndLoans: 0
    }
];

export const MOCK_USERS: User[] = [
    { id: 'user1', username: 'admin', password: 'password123', role: 'admin' },
    { id: 'user2', username: 'accountant', password: 'password123', role: 'accountant' },
    { id: 'user3', username: 'clerk', password: 'password123', role: 'clerk' },
    { id: 'user4', username: 'viewer', password: 'password123', role: 'viewer' },
];
