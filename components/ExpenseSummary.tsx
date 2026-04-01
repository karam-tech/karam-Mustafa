import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { JournalEntry, Account } from '../types';
import { useChartStyles } from '../contexts/ChartStyleContext';

interface ExpenseSummaryProps {
  journalEntries: JournalEntry[];
  accounts: Account[];
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const getLegendProps = (position: 'top' | 'bottom' | 'right' | 'left') => {
    switch (position) {
        case 'top': return { verticalAlign: 'top' as const, align: 'center' as const, layout: 'horizontal' as const };
        case 'bottom': return { verticalAlign: 'bottom' as const, align: 'center' as const, layout: 'horizontal' as const };
        case 'left': return { verticalAlign: 'middle' as const, align: 'left' as const, layout: 'vertical' as const };
        case 'right': return { verticalAlign: 'middle' as const, align: 'right' as const, layout: 'vertical' as const };
        default: return { verticalAlign: 'bottom' as const, align: 'center' as const, layout: 'horizontal' as const };
    }
};


const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({ journalEntries, accounts }) => {
    const { settings: chartSettings } = useChartStyles();

    const expenseData = useMemo(() => {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setDate(today.getDate() - 30);
        const lastMonthISO = lastMonth.toISOString().split('T')[0];

        const recentEntries = journalEntries.filter(entry => entry.date >= lastMonthISO);

        const expenseAccounts = accounts.filter(a => a.type === 'Expense');
        const expenseMap = new Map<string, number>();

        expenseAccounts.forEach(acc => expenseMap.set(acc.name, 0));

        recentEntries.forEach(entry => {
            entry.lines.forEach(line => {
                const account = accounts.find(a => a.id === line.accountId);
                if (account && account.type === 'Expense') {
                    const currentAmount = expenseMap.get(account.name) || 0;
                    expenseMap.set(account.name, currentAmount + line.debit - line.credit);
                }
            });
        });

        return Array.from(expenseMap.entries())
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);

    }, [journalEntries, accounts]);

    return (
        <div className="bg-primary p-6 rounded-2xl shadow-neumo">
            <h2 className="text-xl font-extrabold mb-4 text-slate-700">ملخص مصروفات آخر 30 يوم</h2>
            {expenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart style={{ fontFamily: chartSettings.fontFamily }}>
                        <Pie 
                            data={expenseData} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={100} 
                            labelLine={false}
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                                const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                                return percent > 0.05 ? (<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12px" fontWeight="extrabold"> {`${(percent * 100).toFixed(0)}%`} </text>) : null;
                            }}
                        >
                            {expenseData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartSettings.colors[index % chartSettings.colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value: number) => formatCurrency(value)} 
                            contentStyle={{ fontFamily: chartSettings.fontFamily, backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '1rem' }}
                        />
                        <Legend {...getLegendProps(chartSettings.legendPosition)} />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-[300px]">
                    <p className="text-text-secondary">لا توجد بيانات مصروفات لآخر 30 يومًا.</p>
                </div>
            )}
        </div>
    );
};

export default ExpenseSummary;