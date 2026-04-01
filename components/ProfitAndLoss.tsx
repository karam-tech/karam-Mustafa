import React, { useMemo } from 'react';
import { JournalEntry, Account } from '../types.ts';
import { Printer } from 'lucide-react';

interface ProfitAndLossProps {
  journalEntries: JournalEntry[];
  accounts: Account[];
}

const formatCurrency = (amount: number) => {
    const options = { style: 'currency', currency: 'EGP' };
    // Add parentheses for negative numbers, a common accounting practice
    return amount < 0 
        ? `(${new Intl.NumberFormat('ar-EG', options).format(Math.abs(amount))})` 
        : new Intl.NumberFormat('ar-EG', options).format(amount);
};

const ReportSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-slate-800 border-b-2 border-primary-dark/20 pb-2">{title}</h2>
        {children}
    </div>
);

const ReportRow: React.FC<{ label: string; value: number; isTotal?: boolean; indent?: boolean }> = ({ label, value, isTotal = false, indent = false }) => (
    <div className={`flex justify-between py-2 ${isTotal ? 'font-bold border-t border-primary-dark/20 mt-2 pt-2' : ''} ${indent ? 'pr-6' : ''}`}>
        <span>{label}</span>
        <span className="font-mono">{formatCurrency(value)}</span>
    </div>
);

const ProfitAndLoss: React.FC<ProfitAndLossProps> = ({ journalEntries, accounts }) => {
    
    const financialData = useMemo(() => {
        const revenueAccounts = accounts.filter(a => a.type === 'Revenue');
        const expenseAccounts = accounts.filter(a => a.type === 'Expense');

        const calculateCategoryTotal = (categoryAccounts: Account[]) => {
            const breakdown: { name: string; total: number }[] = [];
            let total = 0;
            
            categoryAccounts.forEach(acc => {
                let accountTotal = 0;
                journalEntries.forEach(entry => {
                    entry.lines.forEach(line => {
                        if (line.accountId === acc.id) {
                            // Revenue increases with credit, Expense increases with debit
                            accountTotal += (acc.type === 'Revenue' ? line.credit - line.debit : line.debit - line.credit);
                        }
                    });
                });
                if (Math.abs(accountTotal) > 0.01) { // Only include accounts with activity
                     breakdown.push({ name: acc.name, total: accountTotal });
                     total += accountTotal;
                }
            });
            return { breakdown, total };
        };

        const { breakdown: revenueBreakdown, total: totalRevenue } = calculateCategoryTotal(revenueAccounts);
        const { breakdown: expenseBreakdown, total: totalExpenses } = calculateCategoryTotal(expenseAccounts);
        const netIncome = totalRevenue - totalExpenses;

        return {
            revenueBreakdown,
            totalRevenue,
            expenseBreakdown,
            totalExpenses,
            netIncome,
        };

    }, [journalEntries, accounts]);

    return (
        <div className="printable-area">
            <div className="flex justify-between items-center mb-6 no-print">
                <h1 className="text-3xl font-bold text-slate-800">قائمة الدخل (الأرباح والخسائر)</h1>
                <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset active:shadow-neumo-inset shadow-neumo-sm font-semibold transition-all"
                >
                    <Printer size={18} />
                    طباعة التقرير
                </button>
            </div>

            <div className="bg-primary p-8 rounded-2xl shadow-neumo print:shadow-none print:p-0">
                <div className="print:block hidden text-center mb-6">
                    <h2 className="text-2xl font-bold">قائمة الدخل</h2>
                    <p>عن الفترة المنتهية في: {new Date().toLocaleDateString('ar-EG-u-nu-latn')}</p>
                </div>

                {/* Revenues */}
                <ReportSection title="الإيرادات">
                    {financialData.revenueBreakdown.length > 0 ? (
                        financialData.revenueBreakdown.map(item => (
                            <ReportRow key={item.name} label={item.name} value={item.total} indent />
                        ))
                    ) : (
                        <p className="pr-6 text-text-secondary">لا توجد إيرادات مسجلة.</p>
                    )}
                    <ReportRow label="إجمالي الإيرادات" value={financialData.totalRevenue} isTotal />
                </ReportSection>

                {/* Expenses */}
                <ReportSection title="المصروفات">
                    {financialData.expenseBreakdown.length > 0 ? (
                        financialData.expenseBreakdown.map(item => (
                            <ReportRow key={item.name} label={item.name} value={item.total} indent />
                        ))
                    ) : (
                         <p className="pr-6 text-text-secondary">لا توجد مصروفات مسجلة.</p>
                    )}
                    <ReportRow label="إجمالي المصروفات" value={financialData.totalExpenses} isTotal />
                </ReportSection>

                {/* Net Income */}
                <div className={`flex justify-between py-4 text-xl font-bold border-t-2 border-primary-dark/30 mt-4 pt-4 rounded-lg px-4 ${financialData.netIncome >= 0 ? 'bg-green-100 dark:bg-green-500/20' : 'bg-red-100 dark:bg-red-500/20'}`}>
                    <span className="text-text-primary">صافي الربح / (الخسارة)</span>
                    <span className={`font-mono ${financialData.netIncome >= 0 ? 'text-credit' : 'text-debit'}`}>{formatCurrency(financialData.netIncome)}</span>
                </div>
            </div>
        </div>
    );
};

export default ProfitAndLoss;