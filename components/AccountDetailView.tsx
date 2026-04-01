
import React, { useMemo } from 'react';
import { Account, JournalEntry } from '../types.ts';
import AccountLedger from './AccountLedger.tsx';

interface AccountDetailViewProps {
    account: Account;
    journalEntries: JournalEntry[];
    accounts: Account[]; // Needed for multi-currency balance calculation
}

const formatCurrency = (amount: number, currency: string = 'EGP') => {
    const locale = currency === 'EGP' ? 'ar-EG' : 'en-US';
    // Accounting format for negative numbers (parentheses)
    const formatted = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

const DetailItem: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
    <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="font-bold text-text-primary">{value || '-'}</p>
    </div>
);

export const AccountDetailView: React.FC<AccountDetailViewProps> = ({ account, journalEntries, accounts }) => {
    
    const ledgerData = useMemo(() => {
        if (!account) return null;

        const isDebitNormal = ['Asset', 'Expense'].includes(account.type);
        const openingBalance = account.openingBalance || 0;
        const primaryCurrency = account.currency || 'EGP';

        let runningEgpBalance = 0;
        let runningForeignBalance = 0;

        // Initialize balances based on account type and currency
        if (primaryCurrency !== 'EGP') {
            runningForeignBalance = openingBalance;
            runningEgpBalance = openingBalance * (account.conversionRate || 1);
        } else {
            runningEgpBalance = openingBalance;
        }
        
        const openingEgp = runningEgpBalance;
        const openingForeign = runningForeignBalance;

        const relevantEntries = journalEntries
            .map(entry => ({ ...entry, line: entry.lines.find(line => line.accountId === account.id) }))
            .filter((entry): entry is (JournalEntry & { line: NonNullable<typeof entry['line']>}) => !!entry.line)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const rows = relevantEntries.map(entry => {
            const line = entry.line;
            const egpChange = line.debit - line.credit;
            
            let foreignChange = 0;
            const isLineInPrimaryForeign = line.currency && line.currency === primaryCurrency;
            
            if (isLineInPrimaryForeign) {
                const foreignAmount = line.amountForeign || 0;
                foreignChange = line.debit > 0 ? foreignAmount : -foreignAmount;
            }

            runningEgpBalance += egpChange;
            runningForeignBalance += foreignChange;

            return {
                id: entry.id,
                date: entry.date,
                description: entry.description,
                foreignDebit: isLineInPrimaryForeign && line.debit > 0 ? (line.amountForeign || 0) : 0,
                foreignCredit: isLineInPrimaryForeign && line.credit > 0 ? (line.amountForeign || 0) : 0,
                egpDebit: line.debit,
                egpCredit: line.credit,
                runningEgpBalance,
                runningForeignBalance,
            };
        });

        return {
            rows,
            openingEgp,
            openingForeign,
            finalEgpBalance: runningEgpBalance,
            finalForeignBalance: runningForeignBalance,
            primaryCurrency
        };
    }, [account, journalEntries]);

    const isCustomer = account.name.startsWith('العملاء');
    const isBankOrCash = account.isBankOrCash;

    return (
        <div className="space-y-6">
            <div className="bg-primary p-6 rounded-2xl shadow-neumo">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-extrabold text-text-primary">{account.name}</h1>
                        <p className="text-text-secondary mt-1">حساب رقم: {account.id}</p>
                    </div>
                    <div className="text-left">
                        <p className="text-sm text-text-secondary">الرصيد الحالي</p>
                        <p className={`text-2xl font-mono font-bold ${ledgerData?.finalEgpBalance && ledgerData.finalEgpBalance < 0 ? 'text-red-500' : 'text-accent'}`}>
                            {formatCurrency(ledgerData?.finalEgpBalance || 0)}
                        </p>
                        {ledgerData?.primaryCurrency !== 'EGP' && (
                             <p className="text-lg font-mono text-text-secondary">
                                {formatCurrency(ledgerData?.finalForeignBalance || 0, ledgerData?.primaryCurrency)}
                            </p>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-primary-dark/20 pt-4">
                    <DetailItem label="نوع الحساب" value={account.type} />
                    <DetailItem label="الرصيد الافتتاحي" value={account.openingBalance ? formatCurrency(account.openingBalance, account.currency || 'EGP') : '-'} />
                    {isCustomer && <DetailItem label="الرقم الضريبي" value={account.taxNumber} />}
                    {isCustomer && <DetailItem label="الهاتف" value={account.phone} />}
                    {isCustomer && <DetailItem label="مسؤول التواصل" value={account.contactPerson} />}
                    {isCustomer && <DetailItem label="حد الائتمان" value={account.creditLimit ? formatCurrency(account.creditLimit, account.currency || 'EGP') : '-'} />}
                    {isBankOrCash && <DetailItem label="نوع العملة" value={account.currencyType === 'local' ? 'محلية' : 'أجنبية'} />}
                    {isBankOrCash && account.currencyType === 'foreign' && <DetailItem label="رمز العملة" value={account.currency} />}
                </div>
            </div>

            <AccountLedger account={account} ledgerData={ledgerData} />
        </div>
    );
};