
import React, { useMemo } from 'react';
import { Account, JournalEntry, DashboardWidgets } from '../types';
import { Landmark, DollarSign } from 'lucide-react';

interface DashboardBalancesProps {
    accounts: Account[];
    journalEntries: JournalEntry[];
    widgets: DashboardWidgets;
    setActiveView: (view: string) => void;
}

const formatCurrency = (amount: number, currency: string = 'EGP') => {
  const locale = currency === 'EGP' ? 'ar-EG' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const BalanceCard: React.FC<{ account: Account & { multiCurrencyBalances: Record<string, number> }; onClick: () => void }> = ({ account, onClick }) => {
    const primaryCurrency = account.currency || 'EGP';
    const primaryBalance = account.multiCurrencyBalances[primaryCurrency] || 0;

    return (
        <div 
            onClick={onClick}
            className="bg-primary p-4 rounded-xl shadow-neumo-sm cursor-pointer hover:shadow-neumo-inset transition-all"
        >
            <h4 className="font-bold text-text-primary truncate mb-3">{account.name}</h4>
            
            <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-text-secondary uppercase">{primaryCurrency}</span>
                    <span className={`text-xl font-mono font-extrabold ${primaryBalance < 0 ? 'text-red-500' : 'text-text-primary'}`}>
                        {formatCurrency(primaryBalance, primaryCurrency)}
                    </span>
                </div>
                
                {primaryCurrency !== 'EGP' && (
                    <div className="flex justify-between items-baseline pt-2 border-t border-primary-dark/10">
                        <span className="text-xs font-bold text-text-secondary">EGP (مكافئ)</span>
                        <span className="text-sm font-mono font-bold text-text-secondary">
                            {formatCurrency(primaryBalance * (account.conversionRate || 1), 'EGP')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};


const BalanceSection: React.FC<{ title: string; accounts: (Account & { multiCurrencyBalances: Record<string, number> })[]; icon: React.ReactNode; onCardClick: () => void }> = ({ title, accounts, icon, onCardClick }) => {
    if (accounts.length === 0) return null;
    return (
        <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-text-primary mb-3">{icon} {title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {accounts.map(acc => <BalanceCard key={acc.id} account={acc} onClick={onCardClick} />)}
            </div>
        </div>
    );
};

const DashboardBalances: React.FC<DashboardBalancesProps> = ({ accounts, journalEntries, widgets, setActiveView }) => {

    const balancesWithCurrencies = useMemo(() => {
        return accounts
            .filter(acc => acc.isBankOrCash)
            .map(account => {
                const balances: { [currency: string]: number } = {};
                // 1. Initialize with opening balance
                if (account.openingBalance) {
                    balances[account.currency || 'EGP'] = account.openingBalance;
                }
                // 2. Aggregate movements
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
            });
    }, [accounts, journalEntries]);


    const categorized = useMemo(() => {
        return {
            localBanks: balancesWithCurrencies.filter(a => a.category === 'bank' && a.currencyType === 'local'),
            foreignBanks: balancesWithCurrencies.filter(a => a.category === 'bank' && a.currencyType === 'foreign'),
            localSafes: balancesWithCurrencies.filter(a => a.category === 'safe' && a.currencyType === 'local'),
            foreignSafes: balancesWithCurrencies.filter(a => a.category === 'safe' && a.currencyType === 'foreign'),
        };
    }, [balancesWithCurrencies]);

    const handleCardClick = () => setActiveView('bankAndCash');

    const shouldRender = (widgets.showLocalBankBalances && categorized.localBanks.length > 0) ||
                         (widgets.showForeignBankBalances && categorized.foreignBanks.length > 0) ||
                         (widgets.showLocalSafeBalances && categorized.localSafes.length > 0) ||
                         (widgets.showForeignSafeBalances && categorized.foreignSafes.length > 0);

    if (!shouldRender) return null;


    return (
        <div className="space-y-6">
            {(widgets.showLocalSafeBalances || widgets.showForeignSafeBalances) && (
                <div className="space-y-4">
                    {widgets.showLocalSafeBalances && <BalanceSection title="أرصدة الصناديق المحلية" accounts={categorized.localSafes} icon={<Landmark size={20}/>} onCardClick={handleCardClick} />}
                    {widgets.showForeignSafeBalances && <BalanceSection title="أرصدة الصناديق الأجنبية" accounts={categorized.foreignSafes} icon={<DollarSign size={20}/>} onCardClick={handleCardClick} />}
                </div>
            )}
            
            {(widgets.showLocalBankBalances || widgets.showForeignBankBalances) && (
                <div className="space-y-4 pt-4 border-t border-primary-dark/10">
                    {widgets.showLocalBankBalances && <BalanceSection title="أرصدة البنوك المحلية" accounts={categorized.localBanks} icon={<Landmark size={20}/>} onCardClick={handleCardClick} />}
                    {widgets.showForeignBankBalances && <BalanceSection title="أرصدة البنوك الأجنبية" accounts={categorized.foreignBanks} icon={<DollarSign size={20}/>} onCardClick={handleCardClick} />}
                </div>
            )}
        </div>
    );
};

export default DashboardBalances;
