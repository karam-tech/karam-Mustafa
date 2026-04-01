import React from 'react';
import { LowBalanceRecord } from '../types';
import { Trash2, Calendar, ShieldAlert } from 'lucide-react';

interface LowBalanceLogProps {
    log: LowBalanceRecord[];
    onClear: () => void;
}

const formatCurrency = (amount: number, currency: string = 'EGP') => {
    const locale = currency === 'EGP' ? 'ar-EG' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const LowBalanceLog: React.FC<LowBalanceLogProps> = ({ log, onClear }) => {
    return (
        <div className="bg-primary p-6 rounded-2xl shadow-neumo">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-extrabold text-slate-700 flex items-center gap-2">
                    <ShieldAlert size={24} className="text-amber-500" />
                    سجل تنبيهات الرصيد المنخفض
                </h2>
                {log.length > 0 && (
                    <button
                        onClick={onClear}
                        className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-semibold text-sm"
                    >
                        <Trash2 size={16} /> مسح السجل
                    </button>
                )}
            </div>
            {log.length === 0 ? (
                <p className="text-center text-text-secondary py-8">لا توجد تنبيهات مسجلة.</p>
            ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {log.map(record => (
                        <div key={record.id} className="bg-primary p-4 rounded-lg shadow-neumo-sm">
                            <div className="flex justify-between items-center text-sm text-text-secondary mb-2 border-b border-primary-dark/20 pb-2">
                                <div className="flex items-center gap-2 font-bold">
                                    <Calendar size={16} />
                                    <span>{new Date(record.date).toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })}</span>
                                </div>
                                <span>الحد الأدنى: {formatCurrency(record.threshold)}</span>
                            </div>
                            <ul className="space-y-1 text-sm">
                                {record.accounts.map((acc, index) => (
                                    <li key={index} className="flex justify-between items-center">
                                        <span className="font-bold text-text-primary">{acc.name}</span>
                                        <span className="font-mono font-bold text-debit">{formatCurrency(acc.balance, acc.currency)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LowBalanceLog;