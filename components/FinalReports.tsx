// Fix: Implemented the FinalReports component to calculate and display financial statements.
import React, { useMemo } from 'react';
import { JournalEntry, Account } from '../types.ts';
import { Printer } from 'lucide-react';
import ExportDropdown from './ExportDropdown.tsx';

interface FinalReportsProps {
  journalEntries: JournalEntry[];
  accounts: Account[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
};

const ReportSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-primary p-6 rounded-2xl shadow-neumo-sm printable-section">
        <h2 className="text-2xl font-extrabold mb-4 text-text-primary border-b-2 border-primary-dark/20 pb-2">{title}</h2>
        {children}
    </div>
);

const ReportRow: React.FC<{ label: string; value: number; isTotal?: boolean; indent?: boolean }> = ({ label, value, isTotal = false, indent = false }) => (
    <div className={`flex justify-between py-2 ${isTotal ? 'font-extrabold border-t border-primary-dark/20 mt-2 pt-2' : ''} ${indent ? 'pr-4' : ''}`}>
        <span>{label}</span>
        <span className="font-mono">{formatCurrency(value)}</span>
    </div>
);


const FinalReports: React.FC<FinalReportsProps> = ({ journalEntries, accounts }) => {
    
    const financialData = useMemo(() => {
        // --- Income Statement Calculations ---
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
                            accountTotal += (acc.type === 'Revenue' ? line.credit - line.debit : line.debit - line.credit);
                        }
                    });
                });
                if (accountTotal !== 0) {
                     breakdown.push({ name: acc.name, total: accountTotal });
                     total += accountTotal;
                }
            });
            return { breakdown, total };
        };

        const { breakdown: revenueBreakdown, total: totalRevenue } = calculateCategoryTotal(revenueAccounts);
        const { breakdown: expenseBreakdown, total: totalExpenses } = calculateCategoryTotal(expenseAccounts);
        const netIncome = totalRevenue - totalExpenses;

        // --- Balance Sheet Calculations ---
        const bsAccounts = accounts.filter(a => ['Asset', 'Liability', 'Equity'].includes(a.type));
        const accountBalances: { [key: string]: number } = {};

        bsAccounts.forEach(acc => {
            let balance = acc.openingBalance || 0;
            journalEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (line.accountId === acc.id) {
                        if (['Asset'].includes(acc.type)) {
                            balance += line.debit - line.credit;
                        } else { // Liability, Equity
                            balance += line.credit - line.debit;
                        }
                    }
                });
            });
            accountBalances[acc.id] = balance;
        });
        
        const assets = accounts.filter(a => a.type === 'Asset').map(a => ({ name: a.name, balance: accountBalances[a.id] || 0 })).filter(a => Math.abs(a.balance) > 0.01);
        const liabilities = accounts.filter(a => a.type === 'Liability').map(a => ({ name: a.name, balance: accountBalances[a.id] || 0 })).filter(a => Math.abs(a.balance) > 0.01);
        
        const equityBeginning = accounts.filter(a => a.type === 'Equity').map(a => ({ name: a.name, balance: a.openingBalance || 0 }));
        
        const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);

        const trueTotalEndingEquity = accounts
            .filter(a => a.type === 'Equity')
            .reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0);
        
        const totalBeginningEquity = equityBeginning.reduce((sum, e) => sum + e.balance, 0);
        const otherEquityChanges = trueTotalEndingEquity - totalBeginningEquity - netIncome;

        return {
            revenueBreakdown,
            totalRevenue,
            expenseBreakdown,
            totalExpenses,
            netIncome,
            assets,
            liabilities,
            equityBeginning,
            otherEquityChanges,
            totalAssets,
            totalLiabilities,
            totalEndingEquity: trueTotalEndingEquity,
        };

    }, [journalEntries, accounts]);
    
    // Data for Export
    const exportCsvHeaders = ["البيان", "المبلغ"];
    const exportCsvData = [
        ["قائمة الدخل", ""],
        ["الإيرادات", ""],
        ...financialData.revenueBreakdown.map(item => [item.name, item.total]),
        ["إجمالي الإيرادات", financialData.totalRevenue],
        ["المصروفات", ""],
        ...financialData.expenseBreakdown.map(item => [item.name, item.total]),
        ["إجمالي المصروفات", financialData.totalExpenses],
        ["صافي الدخل", financialData.netIncome],
        ["", ""], // Separator
        ["الميزانية العمومية", ""],
        ["الأصول", ""],
        ...financialData.assets.map(item => [item.name, item.balance]),
        ["إجمالي الأصول", financialData.totalAssets],
        ["الالتزامات", ""],
        ...financialData.liabilities.map(item => [item.name, item.balance]),
        ["إجمالي الالتزامات", financialData.totalLiabilities],
        ["حقوق الملكية", ""],
        ...financialData.equityBeginning.map(item => [item.name, item.balance]),
        ["صافي دخل الفترة", financialData.netIncome],
        ...(financialData.otherEquityChanges !== 0 ? [[
            financialData.otherEquityChanges > 0 ? "إضافات أخرى على حقوق الملكية" : "تخفيضات أخرى من حقوق الملكية",
            financialData.otherEquityChanges
        ]] : []),
        ["إجمالي حقوق الملكية", financialData.totalEndingEquity],
        ["إجمالي الالتزامات وحقوق الملكية", financialData.totalLiabilities + financialData.totalEndingEquity]
    ];
    
     const exportEmailBody = `
        ملخص القوائم المالية
        =========================
        صافي الدخل: ${formatCurrency(financialData.netIncome)}
        إجمالي الأصول: ${formatCurrency(financialData.totalAssets)}
        إجمالي الالتزامات وحقوق الملكية: ${formatCurrency(financialData.totalLiabilities + financialData.totalEndingEquity)}
        =========================
        التقرير تم إنشاؤه بواسطة المساعد المحاسبي الذكي.
    `;


    return (
        <div className="printable-area">
            <div className="flex justify-end items-center mb-6 no-print">
                <ExportDropdown
                    title="القوائم المالية"
                    csvHeaders={exportCsvHeaders}
                    csvData={exportCsvData}
                    emailBodyContent={exportEmailBody}
                    onPrint={() => window.print()}
                />
            </div>

            <div className="space-y-8">
                {/* Income Statement */}
                <ReportSection title="قائمة الدخل">
                    <h3 className="font-extrabold text-lg text-text-primary mt-4">الإيرادات</h3>
                    {financialData.revenueBreakdown.map(item => (
                        <ReportRow key={item.name} label={item.name} value={item.total} indent />
                    ))}
                    <ReportRow label="إجمالي الإيرادات" value={financialData.totalRevenue} isTotal />

                    <h3 className="font-extrabold text-lg text-text-primary mt-6">المصروفات</h3>
                    {financialData.expenseBreakdown.map(item => (
                        <ReportRow key={item.name} label={item.name} value={item.total} indent />
                    ))}
                    <ReportRow label="إجمالي المصروفات" value={financialData.totalExpenses} isTotal />

                    <div className={`flex justify-between py-3 text-xl font-extrabold border-t-2 border-primary-dark/30 mt-4 pt-3`}>
                        <span>صافي الدخل</span>
                        <span className={`font-mono ${financialData.netIncome >= 0 ? 'text-credit' : 'text-debit'}`}>{formatCurrency(financialData.netIncome)}</span>
                    </div>
                </ReportSection>

                {/* Balance Sheet */}
                <ReportSection title="الميزانية العمومية">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-extrabold text-lg text-text-primary">الأصول</h3>
                            {financialData.assets.map(item => (
                                <ReportRow key={item.name} label={item.name} value={item.balance} />
                            ))}
                            <ReportRow label="إجمالي الأصول" value={financialData.totalAssets} isTotal />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-lg text-text-primary">الالتزامات وحقوق الملكية</h3>
                            
                            <h4 className="font-bold text-md text-text-secondary mt-2">الالتزامات</h4>
                            {financialData.liabilities.map(item => (
                                <ReportRow key={item.name} label={item.name} value={item.balance} indent />
                            ))}
                            <ReportRow label="إجمالي الالتزامات" value={financialData.totalLiabilities} isTotal />

                            <h4 className="font-bold text-md text-text-secondary mt-4">حقوق الملكية</h4>
                            {financialData.equityBeginning.map(item => (
                                <ReportRow key={item.name} label={item.name} value={item.balance} indent />
                            ))}
                             <ReportRow label="صافي دخل الفترة" value={financialData.netIncome} indent />
                             {Math.abs(financialData.otherEquityChanges) > 0.01 && (
                                <ReportRow 
                                    label={financialData.otherEquityChanges > 0 ? "إضافات أخرى" : "مسحوبات وتخفيضات"} 
                                    value={financialData.otherEquityChanges} 
                                    indent 
                                />
                            )}
                            <ReportRow label="إجمالي حقوق الملكية" value={financialData.totalEndingEquity} isTotal />
                            
                            <div className="flex justify-between py-2 font-extrabold border-t border-primary-dark/20 mt-2 pt-2">
                                <span>إجمالي الالتزامات وحقوق الملكية</span>
                                <span className="font-mono">{formatCurrency(financialData.totalLiabilities + financialData.totalEndingEquity)}</span>
                            </div>
                        </div>
                    </div>
                     {Math.abs(financialData.totalAssets - (financialData.totalLiabilities + financialData.totalEndingEquity)) > 0.01 && (
                        <p className="mt-4 text-center font-extrabold text-red-600 bg-red-100 p-3 rounded-md">
                            تحذير: الميزانية غير متوازنة! الفارق: {formatCurrency(Math.abs(financialData.totalAssets - (financialData.totalLiabilities + financialData.totalEndingEquity)))}
                        </p>
                    )}
                </ReportSection>
            </div>
        </div>
    );
};

export default FinalReports;