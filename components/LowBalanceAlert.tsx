
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Account } from '../types';

interface LowBalanceAlertProps {
    accounts: (Account & { balance: number })[];
    onDismiss: () => void;
    globalThreshold: number;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

const LowBalanceAlert: React.FC<LowBalanceAlertProps> = ({ accounts, onDismiss, globalThreshold }) => {
    return (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-lg shadow-md mb-8" role="alert">
            <div className="flex">
                <div className="py-1">
                    <AlertTriangle className="h-6 w-6 text-amber-500 mr-4" />
                </div>
                <div className="flex-grow">
                    <p className="font-extrabold">تحذير: رصيد منخفض</p>
                    <p className="text-sm">
                        الأرصدة التالية أقل من الحد المسموح:
                    </p>
                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                        {accounts.map(account => {
                            const threshold = (account.minBalance !== undefined && account.minBalance > 0) ? account.minBalance : globalThreshold;
                            return (
                                <li key={account.id}>
                                    <strong className="font-extrabold">{account.name}:</strong> <span className="font-mono font-bold">{formatCurrency(account.balance)}</span>
                                    <span className="text-xs text-red-600 mr-2">(الحد الأدنى: {formatCurrency(threshold)})</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <div className="ml-2 flex-shrink-0">
                    <button onClick={onDismiss} className="p-1 rounded-full hover:bg-amber-200 transition-colors" aria-label="إغلاق التنبيه">
                        <X className="h-5 w-5 text-amber-700" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LowBalanceAlert;