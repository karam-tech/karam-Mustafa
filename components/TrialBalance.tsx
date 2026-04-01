import React, { useMemo, useState } from 'react';
import { JournalEntry, Account } from '../types.ts';
import ExportDropdown from './ExportDropdown.tsx';

interface TrialBalanceProps {
  journalEntries: JournalEntry[];
  accounts: Account[];
}

const formatCurrency = (amount: number, currency?: string) => {
    const options = { style: 'currency', currency: currency || 'EGP' };
    return new Intl.NumberFormat(currency === 'EGP' || !currency ? 'ar-EG' : 'en-US', options).format(amount);
};

const TrialBalance: React.FC<TrialBalanceProps> = ({ journalEntries, accounts }) => {
    const [expandedCustomer, setExpandedCustomer] = useState(false);

    const trialBalanceData = useMemo(() => {
        let totalDebit = 0;
        let totalCredit = 0;
        
        // Group all customer accounts into one "Total Customers" line
        const customerAccounts = accounts.filter(a => a.name.startsWith("العملاء - "));
        const otherAccounts = accounts.filter(a => !a.name.startsWith("العملاء - "));

        const calculateEgpBalance = (account: Account): number => {
            let balanceInEGP = 0;
            // 1. Get opening balance in EGP
            const openingBalance = account.openingBalance || 0;
            if (account.currency && account.currency !== 'EGP') {
                balanceInEGP = openingBalance * (account.conversionRate || 1);
            } else {
                balanceInEGP = openingBalance;
            }
            // 2. Sum EGP movements from journal
            journalEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (line.accountId === account.id) {
                        balanceInEGP += line.debit - line.credit;
                    }
                });
            });
            return balanceInEGP;
        }

        const processAccount = (account: Account) => {
            const finalEgpBalance = calculateEgpBalance(account);
            if (Math.abs(finalEgpBalance) < 0.01) return null;

            const isDebitNormal = ['Asset', 'Expense'].includes(account.type);
            const debit = (isDebitNormal && finalEgpBalance > 0) || (!isDebitNormal && finalEgpBalance < 0) ? Math.abs(finalEgpBalance) : 0;
            const credit = (isDebitNormal && finalEgpBalance < 0) || (!isDebitNormal && finalEgpBalance > 0) ? Math.abs(finalEgpBalance) : 0;
            
            return { id: account.id, name: account.name, debit, credit };
        };

        const rows = otherAccounts.map(processAccount).filter(Boolean) as {id: string, name: string, debit: number, credit: number}[];

        // Process customer accounts
        const totalCustomerBalance = customerAccounts.reduce((sum: number, acc) => sum + calculateEgpBalance(acc), 0);
        if (Math.abs(totalCustomerBalance) > 0.01) {
            rows.push({
                id: '1200', // A virtual ID for the total customers account
                name: 'إجمالي العملاء',
                debit: totalCustomerBalance > 0 ? totalCustomerBalance : 0,
                credit: totalCustomerBalance < 0 ? -totalCustomerBalance : 0
            });
        }
        
        // Sort rows by account ID
        rows.sort((a, b) => a.id.localeCompare(b.id));

        rows.forEach(row => {
            totalDebit += row.debit;
            totalCredit += row.credit;
        });

        const customerBreakdown = customerAccounts.map(account => {
            const balances: { [currency: string]: number } = {};
            if (account.openingBalance) balances[account.currency || 'EGP'] = account.openingBalance;

            journalEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (line.accountId === account.id) {
                        if (line.currency && line.currency !== 'EGP') {
                            const change = line.debit > 0 ? (line.amountForeign || 0) : -(line.amountForeign || 0);
                            balances[line.currency] = (balances[line.currency] || 0) + change;
                        } else {
                            const change = line.debit - line.credit;
                            balances['EGP'] = (balances['EGP'] || 0) + change;
                        }
                    }
                });
            });
            return { ...account, multiCurrencyBalances: balances };
        }).filter(c => Object.values(c.multiCurrencyBalances).some(b => Math.abs(b as number) > 0.01));


        return { rows, totalDebit, totalCredit, customerBreakdown };
    }, [journalEntries, accounts]);

    const { rows, totalDebit, totalCredit, customerBreakdown } = trialBalanceData;

    const exportCsvHeaders = ["رقم الحساب", "اسم الحساب", "مدين", "دائن"];
    const exportCsvData = rows.map(row => [row.id, row.name, row.debit, row.credit]);
    exportCsvData.push(["الإجمالي", "", totalDebit, totalCredit]);

    const exportEmailBody = `
        ميزان المراجعة
        =========================
        إجمالي المدين: ${formatCurrency(totalDebit)}
        إجمالي الدائن: ${formatCurrency(totalCredit)}
        =========================
        التقرير تم إنشاؤه بواسطة المساعد المحاسبي الذكي.
    `;

    return (
        <div className="printable-area">
             <div className="flex justify-end items-center mb-6 no-print">
                <ExportDropdown
                    title="ميزان_المراجعة"
                    csvHeaders={exportCsvHeaders}
                    csvData={exportCsvData}
                    emailBodyContent={exportEmailBody}
                    onPrint={() => window.print()}
                />
            </div>
            <div className="bg-primary p-8 rounded-2xl shadow-neumo print:shadow-none print:p-0">
                <div className="print:block hidden text-center mb-6">
                    <h1 className="text-2xl font-extrabold">ميزان المراجعة</h1>
                    <p>في تاريخ: {new Date().toLocaleDateString('ar-EG-u-nu-latn')}</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b-2 border-primary-dark/30 print:border-black">
                                <th className="p-3 font-extrabold text-lg text-text-primary">رقم الحساب</th>
                                <th className="p-3 font-extrabold text-lg text-text-primary">اسم الحساب</th>
                                <th className="p-3 font-extrabold text-lg text-debit text-center">مدين</th>
                                <th className="p-3 font-extrabold text-lg text-credit text-center">دائن</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <React.Fragment key={row.id}>
                                <tr className="border-b border-primary-dark/20 print:border-gray-400">
                                    <td className="p-3 font-mono text-text-primary">{row.id}</td>
                                    <td className="p-3 font-bold text-text-primary">
                                        {row.id === '1200' ? (
                                            <button onClick={() => setExpandedCustomer(!expandedCustomer)} className="font-bold text-accent hover:underline">
                                                {row.name} {expandedCustomer ? '(-)' : '(+)'}
                                            </button>
                                        ) : row.name}
                                    </td>
                                    <td className={`p-3 text-center font-mono ${row.debit > 0 ? 'text-debit' : 'text-text-primary'}`}>{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                                    <td className={`p-3 text-center font-mono ${row.credit > 0 ? 'text-credit' : 'text-text-primary'}`}>{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                                </tr>
                                {row.id === '1200' && expandedCustomer && (
                                     <tr className="bg-primary-light">
                                        <td colSpan={4} className="p-4">
                                            <div className="p-2 bg-primary rounded-md shadow-neumo-inset-sm">
                                            <h4 className="font-bold mb-2">تفاصيل أرصدة العملاء:</h4>
                                            {customerBreakdown.map(cust => (
                                                <div key={cust.id} className="flex justify-between items-center p-1 text-sm">
                                                    <span>{cust.name.replace('العملاء - ', '')}</span>
                                                    <div className="font-mono font-semibold">
                                                        {Object.entries(cust.multiCurrencyBalances).map(([currency, balance]) => (
                                                             <span key={currency} className={`ml-2 ${(balance as number) >= 0 ? 'text-debit' : 'text-credit'}`}>{formatCurrency(balance as number, currency)}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-extrabold text-lg border-t-2 border-primary-dark/30 print:border-black bg-primary-light">
                                <td className="p-4" colSpan={2}>الإجمالي</td>
                                <td className="p-4 text-center text-debit font-mono">{formatCurrency(totalDebit)}</td>
                                <td className="p-4 text-center text-credit font-mono">{formatCurrency(totalCredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                     {Math.abs(totalDebit - totalCredit) > 0.01 && (
                        <p className="mt-4 text-center font-bold text-red-600 bg-red-100 p-2 rounded-md">
                            تحذير: ميزان المراجعة غير متوازن! الفارق: {formatCurrency(Math.abs(totalDebit - totalCredit))}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrialBalance;