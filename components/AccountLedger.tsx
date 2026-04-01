import React from 'react';
import { Account } from '../types';

interface AccountLedgerProps {
  account: Account | null;
  ledgerData: {
    rows: any[];
    openingEgp: number;
    openingForeign: number;
    finalEgpBalance: number;
    finalForeignBalance: number;
    primaryCurrency: string;
  } | null;
}

const formatCurrency = (amount: number, currency: string = 'EGP') => {
    const locale = currency === 'EGP' ? 'ar-EG' : 'en-US';
    // Accounting format for negative numbers (parentheses)
    const formatted = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

const AccountLedger: React.FC<AccountLedgerProps> = ({ account, ledgerData }) => {
  if (!account || !ledgerData) {
    return (
      <div className="bg-primary p-6 rounded-2xl shadow-neumo text-center">
        <h2 className="text-xl font-bold text-slate-700">دفتر الأستاذ</h2>
        <p className="text-text-secondary mt-2">الرجاء اختيار حساب لعرض الحركات الخاصة به.</p>
      </div>
    );
  }
  
  const { 
      rows, 
      openingEgp, 
      openingForeign, 
      finalEgpBalance, 
      finalForeignBalance, 
      primaryCurrency 
  } = ledgerData;

  const showForeignColumns = primaryCurrency !== 'EGP' || rows.some(r => r.foreignDebit > 0 || r.foreignCredit > 0);
  const isDebitNormal = ['Asset', 'Expense'].includes(account.type);

  return (
    <div className="bg-primary p-6 rounded-2xl shadow-neumo print:shadow-none print:p-0">
        <div className="print:block hidden text-center mb-6">
            <h1 className="text-2xl font-extrabold">دفتر الأستاذ: {account.name}</h1>
            <p>في تاريخ: {new Date().toLocaleDateString('ar-EG-u-nu-latn')}</p>
        </div>
       <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead>
                    <tr className="border-b-2 border-primary-dark/30 print:border-black">
                        <th className="p-2 font-bold text-slate-700">التاريخ</th>
                        <th className="p-2 font-bold text-slate-700">البيان</th>
                        {showForeignColumns && <th className="p-2 font-bold text-debit text-center">مدين ({primaryCurrency})</th>}
                        {showForeignColumns && <th className="p-2 font-bold text-credit text-center">دائن ({primaryCurrency})</th>}
                        <th className="p-2 font-bold text-debit text-center">مدين (EGP)</th>
                        <th className="p-2 font-bold text-credit text-center">دائن (EGP)</th>
                        {showForeignColumns && <th className="p-2 font-bold text-slate-700 text-center">رصيد ({primaryCurrency})</th>}
                        <th className="p-2 font-bold text-slate-700 text-center">رصيد (EGP)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-primary-dark/20 print:border-gray-400 font-semibold bg-primary-light/50">
                        <td className="p-2" colSpan={2}>رصيد أول المدة</td>
                        {showForeignColumns && <td colSpan={2}></td>}
                        <td colSpan={2}></td>
                        {showForeignColumns && <td className={`p-2 text-center font-mono ${((isDebitNormal && openingForeign >= 0) || (!isDebitNormal && openingForeign < 0)) ? 'text-debit' : 'text-credit'}`}>{formatCurrency(openingForeign, primaryCurrency)}</td>}
                        <td className={`p-2 text-center font-mono ${((isDebitNormal && openingEgp >= 0) || (!isDebitNormal && openingEgp < 0)) ? 'text-debit' : 'text-credit'}`}>{formatCurrency(openingEgp, 'EGP')}</td>
                    </tr>
                    {rows.map(row => {
                        const isEgpDebitBalance = (isDebitNormal && row.runningEgpBalance >= 0) || (!isDebitNormal && row.runningEgpBalance < 0);
                        const isForeignDebitBalance = (isDebitNormal && row.runningForeignBalance >= 0) || (!isDebitNormal && row.runningForeignBalance < 0);
                        return (
                        <tr key={row.id} className="border-b border-primary-dark/20 print:border-gray-400">
                             <td className="p-2">{new Date(row.date).toLocaleDateString('ar-EG-u-nu-latn')}</td>
                             <td className="p-2">{row.description}</td>
                             {showForeignColumns && <td className="p-2 text-center font-mono text-debit">{row.foreignDebit > 0 ? formatCurrency(row.foreignDebit, primaryCurrency) : '-'}</td>}
                             {showForeignColumns && <td className="p-2 text-center font-mono text-credit">{row.foreignCredit > 0 ? formatCurrency(row.foreignCredit, primaryCurrency) : '-'}</td>}
                             <td className="p-2 text-center font-mono text-debit">{row.egpDebit > 0 ? formatCurrency(row.egpDebit, 'EGP') : '-'}</td>
                             <td className="p-2 text-center font-mono text-credit">{row.egpCredit > 0 ? formatCurrency(row.egpCredit, 'EGP') : '-'}</td>
                             {showForeignColumns && <td className={`p-2 text-center font-mono font-semibold ${isForeignDebitBalance ? 'text-debit' : 'text-credit'}`}>{formatCurrency(row.runningForeignBalance, primaryCurrency)}</td>}
                             <td className={`p-2 text-center font-mono font-semibold ${isEgpDebitBalance ? 'text-debit' : 'text-credit'}`}>{formatCurrency(row.runningEgpBalance, 'EGP')}</td>
                        </tr>
                    )})}
                </tbody>
                 <tfoot>
                    <tr className="font-bold text-lg border-t-2 border-primary-dark/30 print:border-black bg-primary-light">
                        <td className="p-4" colSpan={2}>الرصيد النهائي</td>
                        {showForeignColumns && <td colSpan={2}></td>}
                        <td colSpan={2}></td>
                        {showForeignColumns && <td className={`p-4 text-center font-mono ${((isDebitNormal && finalForeignBalance >= 0) || (!isDebitNormal && finalForeignBalance < 0)) ? 'text-debit' : 'text-credit'}`}>{formatCurrency(finalForeignBalance, primaryCurrency)}</td>}
                        <td className={`p-4 text-center font-mono ${((isDebitNormal && finalEgpBalance >= 0) || (!isDebitNormal && finalEgpBalance < 0)) ? 'text-debit' : 'text-credit'}`}>{formatCurrency(finalEgpBalance, 'EGP')}</td>
                    </tr>
                </tfoot>
            </table>
            {rows.length === 0 && <p className="text-center text-text-secondary py-8">لا توجد حركات مسجلة لهذا الحساب.</p>}
       </div>
    </div>
  );
};

export default AccountLedger;