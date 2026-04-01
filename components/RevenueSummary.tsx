import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { JournalEntry, Account } from '../types';
import { useChartStyles } from '../contexts/ChartStyleContext';

interface RevenueSummaryProps {
  journalEntries: JournalEntry[];
  accounts: Account[];
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const RevenueSummary: React.FC<RevenueSummaryProps> = ({ journalEntries, accounts }) => {
    const { settings: chartSettings } = useChartStyles();

    const revenueByClient = useMemo(() => {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setDate(today.getDate() - 30);
        const lastMonthISO = lastMonth.toISOString().split('T')[0];

        const recentEntries = journalEntries.filter(entry => entry.date >= lastMonthISO);

        const customerAccounts = accounts.filter(acc => acc.type === 'Asset' && acc.name.startsWith('العملاء'));
        const revenueMap = new Map<string, number>();

        customerAccounts.forEach(acc => {
            let customerDebit = 0;
            recentEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (line.accountId === acc.id) {
                        customerDebit += line.debit;
                    }
                });
            });

            if (customerDebit > 0) {
              const clientName = acc.name.replace('العملاء - ', '');
              revenueMap.set(clientName, customerDebit);
            }
        });
        
        return Array.from(revenueMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [accounts, journalEntries]);

    return (
        <div className="bg-primary p-6 rounded-2xl shadow-neumo">
            <h2 className="text-xl font-extrabold mb-4 text-slate-700">أفضل 5 عملاء (آخر 30 يوم)</h2>
            {revenueByClient.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByClient} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }} style={{ fontFamily: chartSettings.fontFamily }}>
                        {chartSettings.showGrid && <CartesianGrid strokeDasharray="3 3" horizontal={false} />}
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
                        <Tooltip 
                            formatter={(value: number) => formatCurrency(value)} 
                            cursor={{fill: 'rgba(0,0,0,0.05)'}} 
                            contentStyle={{ fontFamily: chartSettings.fontFamily, backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '1rem' }} 
                        />
                        <Bar dataKey="value" name="الإيراد" radius={[0, chartSettings.barRadius, chartSettings.barRadius, 0]}>
                            {revenueByClient.map((entry, index) => <Cell key={`cell-${index}`} fill={chartSettings.colors[index % chartSettings.colors.length]} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                 <div className="flex items-center justify-center h-[300px]">
                    <p className="text-text-secondary">لا توجد بيانات إيرادات لآخر 30 يومًا.</p>
                </div>
            )}
        </div>
    );
};

export default RevenueSummary;