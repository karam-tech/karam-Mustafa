import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { JournalEntry, Account, AccountType } from '../types.ts';
import { useChartStyles } from '../contexts/ChartStyleContext.tsx';
import { X } from 'lucide-react';

interface AccountAnalysisProps {
  journalEntries: JournalEntry[];
  accounts: Account[];
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

const getLegendProps = (position: 'top' | 'bottom' | 'right' | 'left') => {
    switch (position) {
        case 'top': return { verticalAlign: 'top' as const, align: 'center' as const, layout: 'horizontal' as const };
        case 'bottom': return { verticalAlign: 'bottom' as const, align: 'center' as const, layout: 'horizontal' as const };
        case 'left': return { verticalAlign: 'middle' as const, align: 'left' as const, layout: 'vertical' as const };
        case 'right': return { verticalAlign: 'middle' as const, align: 'right' as const, layout: 'vertical' as const };
        default: return { verticalAlign: 'bottom' as const, align: 'center' as const, layout: 'horizontal' as const };
    }
};

const AccountAnalysis: React.FC<AccountAnalysisProps> = ({ journalEntries, accounts }) => {
    const { settings: chartSettings } = useChartStyles();
    const [filter, setFilter] = useState<AccountType | 'all'>('all');
    const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);

    const chartData = useMemo(() => {
        const filteredAccounts = filter === 'all' ? accounts : accounts.filter(acc => acc.type === filter);
        
        return filteredAccounts.map(account => {
            const openingBalance = account.openingBalance || 0;
            const isDebitNormal = ['Asset', 'Expense'].includes(account.type);
            
            let totalDebit = isDebitNormal ? openingBalance : 0;
            let totalCredit = !isDebitNormal ? openingBalance : 0;

            journalEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (line.accountId === account.id) {
                        totalDebit += line.debit;
                        totalCredit += line.credit;
                    }
                });
            });
            
            if(totalDebit > 0.01 || totalCredit > 0.01) {
                 return {
                    name: account.name,
                    debit: totalDebit,
                    credit: totalCredit,
                };
            }
            return null;
        }).filter((item): item is NonNullable<typeof item> => item !== null);
    }, [journalEntries, accounts, filter]);

    const selectedAccount = useMemo(() => {
        if (!selectedAccountName) return null;
        return accounts.find(acc => acc.name === selectedAccountName);
    }, [selectedAccountName, accounts]);

    const ledgerData = useMemo(() => {
        if (!selectedAccount) return null;

        const openingBalance = selectedAccount.openingBalance || 0;
        const isDebitNormal = ['Asset', 'Expense'].includes(selectedAccount.type);
        let runningBalance = openingBalance;

        const relevantEntries = journalEntries
            .map(entry => ({
                ...entry,
                line: entry.lines.find(line => line.accountId === selectedAccount.id)
            }))
            .filter((entry): entry is (JournalEntry & { line: NonNullable<typeof entry['line']>}) => !!entry.line)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const ledgerRows = relevantEntries.map(entry => {
            const line = entry.line;
            const change = line.debit - line.credit;
            runningBalance += isDebitNormal ? change : -change;
            return {
                id: entry.id,
                date: entry.date,
                description: entry.description,
                debit: line.debit,
                credit: line.credit,
                balance: runningBalance
            };
        });

        return {
            openingBalance,
            rows: ledgerRows,
            finalBalance: runningBalance,
            isDebitNormal,
        };
    }, [selectedAccount, journalEntries]);


    const handleBarClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const payload = data.activePayload[0].payload;
            if (payload && payload.name) {
                setSelectedAccountName(prev => prev === payload.name ? null : payload.name);
            }
        }
    };

    const accountTypes: { id: AccountType | 'all', name: string }[] = [
        { id: 'all', name: 'الكل' },
        { id: 'Asset', name: 'الأصول' },
        { id: 'Liability', name: 'الالتزامات' },
        { id: 'Equity', name: 'حقوق الملكية' },
        { id: 'Revenue', name: 'الإيرادات' },
        { id: 'Expense', name: 'المصروفات' },
    ];
    
    return (
        <div className="space-y-8">
            <div className="bg-primary p-6 rounded-2xl shadow-neumo">
                <div className="flex items-center gap-2 mb-6">
                    <span className="font-semibold text-text-secondary">فلتر حسب النوع:</span>
                    {accountTypes.map(type => (
                        <button 
                            key={type.id}
                            onClick={() => setFilter(type.id)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${filter === type.id ? 'bg-primary shadow-neumo-inset text-accent' : 'shadow-neumo-sm hover:shadow-neumo-inset'}`}
                        >
                            {type.name}
                        </button>
                    ))}
                </div>

                <div style={{ width: '100%', height: 600 }}>
                    <ResponsiveContainer>
                        <BarChart
                            data={chartData}
                            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                            style={{ fontFamily: chartSettings.fontFamily, fontSize: `${chartSettings.fontSize}px` }}
                            onClick={handleBarClick}
                        >
                            {chartSettings.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                            <XAxis type="number" tickFormatter={value => new Intl.NumberFormat('ar-EG').format(value as number)} />
                            <YAxis dataKey="name" type="category" width={150} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontFamily: chartSettings.fontFamily, backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '1rem' }} />
                            <Legend {...getLegendProps(chartSettings.legendPosition)}/>
                            <Bar dataKey="debit" name="مدين" fill={chartSettings.colors[1]} radius={[chartSettings.barRadius, chartSettings.barRadius, 0, 0]} cursor="pointer" />
                            <Bar dataKey="credit" name="دائن" fill={chartSettings.colors[3]} radius={[chartSettings.barRadius, chartSettings.barRadius, 0, 0]} cursor="pointer" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                 {chartData.length === 0 && <p className="text-center text-text-secondary p-8">لا توجد بيانات لعرضها حسب الفلتر المختار.</p>}
            </div>

            {selectedAccount && ledgerData && (
                <div className="bg-primary p-6 rounded-2xl shadow-neumo">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-slate-800">
                            دفتر الأستاذ: {selectedAccount.name}
                        </h2>
                        <button 
                            onClick={() => setSelectedAccountName(null)}
                            className="p-2 rounded-full hover:shadow-neumo-sm transition-all"
                            aria-label="إغلاق"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="overflow-y-auto max-h-96">
                        <table className="w-full text-right">
                            <thead className="sticky top-0 bg-primary z-10">
                                <tr className="border-b-2 border-primary-dark/30">
                                    <th className="p-2 font-semibold text-slate-800">التاريخ</th>
                                    <th className="p-2 font-semibold text-slate-800">الوصف</th>
                                    <th className="p-2 font-semibold text-debit text-center">مدين</th>
                                    <th className="p-2 font-semibold text-credit text-center">دائن</th>
                                    <th className="p-2 font-semibold text-slate-800 text-center">الرصيد</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-primary-dark/20 font-semibold bg-primary-light/50">
                                    <td className="p-2" colSpan={4}>رصيد أول المدة</td>
                                    <td className="p-2 text-center font-mono">{formatCurrency(ledgerData.openingBalance)}</td>
                                </tr>
                                {ledgerData.rows.map(row => {
                                     const isDebitBalance = (ledgerData.isDebitNormal && row.balance >= 0) || (!ledgerData.isDebitNormal && row.balance < 0);
                                    return (
                                        <tr key={row.id} className="border-b border-primary-dark/20">
                                            <td className="p-2 text-slate-800">{new Date(row.date).toLocaleDateString('ar-EG-u-nu-latn')}</td>
                                            <td className="p-2 text-slate-800">{row.description}</td>
                                            <td className="p-2 text-center font-mono text-debit">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                                            <td className="p-2 text-center font-mono text-credit">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                                            <td className={`p-2 text-center font-mono font-semibold ${isDebitBalance ? 'text-debit' : 'text-credit'}`}>{formatCurrency(row.balance)}</td>
                                        </tr>
                                    );
                                })}
                                {ledgerData.rows.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center p-4 text-text-secondary">
                                            لا توجد حركات مسجلة لهذا الحساب.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="font-bold text-lg border-t-2 border-primary-dark/30 bg-primary-light">
                                    <td className="p-4" colSpan={4}>الرصيد النهائي</td>
                                    <td className="p-4 text-center font-mono">{formatCurrency(ledgerData.finalBalance)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountAnalysis;