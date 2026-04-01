import React, { useMemo } from 'react';
import { JournalEntry, Account } from '../types.ts';
import { Printer } from 'lucide-react';

interface ExpenseTableProps {
  journalEntries: JournalEntry[];
  accounts: Account[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
};

const ExpenseTable: React.FC<ExpenseTableProps> = ({ journalEntries, accounts }) => {
  const expenseData = useMemo(() => {
    const expenseAccounts = accounts.filter(a => a.type === 'Expense');
    
    const data = expenseAccounts.map(account => {
        let total = 0;
        journalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (line.accountId === account.id) {
                    total += line.debit - line.credit;
                }
            });
        });

        if (total > 0) {
            return {
                id: account.id,
                name: account.name,
                total: total,
            };
        }
        return null;
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return data;
  }, [journalEntries, accounts]);
  
  const totalExpenses = useMemo(() => expenseData.reduce((sum, item) => sum + item.total, 0), [expenseData]);

  return (
    <div className="printable-area">
        <div className="flex justify-between items-center mb-6 no-print">
             <h2 className="text-2xl font-extrabold text-text-primary">تقرير المصروفات التفصيلي</h2>
            <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset active:shadow-neumo-inset shadow-neumo-sm font-bold transition-all"
            >
                <Printer size={18} />
                طباعة التقرير
            </button>
        </div>

        <div className="bg-primary p-8 rounded-2xl shadow-neumo print:shadow-none print:p-0">
             <div className="print:block hidden text-center mb-4">
                <h1 className="text-2xl font-extrabold">تقرير المصروفات التفصيلي</h1>
                <p>بتاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b-2 border-primary-dark/30 print:border-black">
                  <th className="p-3 font-extrabold text-lg text-text-primary">بند المصروف</th>
                  <th className="p-3 font-extrabold text-lg text-text-primary text-center">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {expenseData.map(item => (
                  <tr key={item.id} className="border-b border-primary-dark/20 print:border-gray-400">
                    <td className="p-3 font-bold text-text-primary">{item.name}</td>
                    <td className="p-3 text-center text-text-primary font-mono">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                  <tr className="font-extrabold text-lg border-t-2 border-primary-dark/30 print:border-black bg-primary-light">
                      <td className="p-4">الإجمالي الكلي للمصروفات</td>
                      <td className="p-4 text-center text-text-primary font-mono">{formatCurrency(totalExpenses)}</td>
                  </tr>
              </tfoot>
            </table>
            {expenseData.length === 0 && <p className="text-center text-text-secondary p-8">لا توجد مصروفات مسجلة.</p>}
          </div>
        </div>
    </div>
  );
};

export default ExpenseTable;