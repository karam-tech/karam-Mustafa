
import React, { useState, useMemo } from 'react';
import { Account, JournalEntry, User, Document } from '../types.ts';
import { PlusCircle, Edit, Trash2, Landmark, DollarSign, Link, Book, Paperclip, Wallet, Building2 } from 'lucide-react';
import BankSafeFormModal from './BankSafeFormModal.tsx';
import { canPerformAction } from '../permissions.ts';

interface AccountsManagementProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  documents: Document[];
  onAccountSelect: (account: Account, parentView: string) => void;
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  currentUser: User;
  onNewJournalEntry: (account: Account) => void;
  requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger' }) => void;
}

const formatCurrency = (amount: number, currency: string = 'EGP') => {
  const locale = currency === 'EGP' ? 'ar-EG' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

const AccountCard: React.FC<{
  account: Account & { multiCurrencyBalances: Record<string, number>, hasAttachment: boolean };
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLink: () => void;
  onNewJournalEntry: () => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}> = ({ account, onSelect, onEdit, onDelete, onLink, onNewJournalEntry, canCreate, canEdit, canDelete }) => {
    
    const primaryCurrency = account.currency || 'EGP';
    const primaryBalance = account.multiCurrencyBalances[primaryCurrency] || 0;
    const otherBalances = Object.entries(account.multiCurrencyBalances).filter(([currency, balance]) => currency !== primaryCurrency && Math.abs(balance as number) > 0.01);

    return (
        <div className="bg-white dark:bg-primary-dark/10 p-4 rounded-xl shadow-sm border border-primary-dark/10 group transition-all hover:shadow-md flex flex-col justify-between relative">
            <div>
                <div className="flex justify-between items-start">
                    <div className="cursor-pointer flex-1" onClick={onSelect}>
                        <div className="flex items-center gap-2">
                            {account.hasAttachment && <span title="يوجد مرفقات"><Paperclip size={14} className="text-text-secondary" /></span>}
                            <h3 className="font-bold text-lg text-text-primary line-clamp-1" title={account.name}>{account.name}</h3>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">{account.category === 'bank' ? (account.bankName || 'حساب بنكي') : 'خزينة نقدية'}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute left-2 top-2 bg-white/80 dark:bg-gray-800/80 rounded-lg p-1 shadow-sm backdrop-blur-sm">
                        {canCreate && <button onClick={onNewJournalEntry} className="p-1.5 text-green-600 rounded-md hover:bg-green-50" title="قيد جديد"><Book size={14} /></button>}
                        {canEdit && <button onClick={onEdit} className="p-1.5 text-accent rounded-md hover:bg-blue-50" title="تعديل"><Edit size={14} /></button>}
                        {canDelete && <button onClick={onDelete} className="p-1.5 text-red-500 rounded-md hover:bg-red-50" title="حذف"><Trash2 size={14} /></button>}
                    </div>
                </div>
            </div>
            <div className="mt-3 text-left cursor-pointer" onClick={onSelect}>
                <p className={`text-xl font-mono font-bold ${primaryBalance < 0 ? 'text-red-500' : 'text-text-primary'}`}>
                    {formatCurrency(primaryBalance, primaryCurrency)}
                </p>
                {/* EGP Equivalent for foreign primary currency */}
                {primaryCurrency !== 'EGP' && (
                    <div className="flex items-center gap-2 mt-0.5">
                        <p 
                            className="text-xs font-mono text-text-secondary border-b border-dotted border-text-secondary/50 cursor-help w-fit"
                            title={`سعر التحويل المستخدم:\n1 ${primaryCurrency} = ${account.conversionRate || 1} EGP`}
                        >
                            ≈ {formatCurrency(primaryBalance * (account.conversionRate || 1), 'EGP')}
                        </p>
                    </div>
                )}
                {/* List other balances */}
                {otherBalances.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-primary-dark/10 text-xs space-y-1">
                        {otherBalances.map(([currency, balance]) => (
                            <div key={currency} className="flex justify-between items-center text-text-secondary">
                                <span className="font-semibold">{currency}:</span>
                                <span className="font-mono font-bold">{formatCurrency(balance as number, currency)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
             <button onClick={onLink} className="absolute -bottom-2 -left-2 p-1.5 bg-primary rounded-full shadow-neumo-sm hover:shadow-neumo-inset text-accent opacity-0 group-hover:opacity-100 transition-opacity z-10" title="ربط بحسابات المصروفات">
                <Link size={14}/>
            </button>
        </div>
    );
};

// Extracted components to avoid re-definition and type issues
const AccountGroup: React.FC<React.PropsWithChildren<{ title: string, icon: React.ReactNode }>> = ({ title, icon, children }) => (
    <div className="bg-primary p-6 rounded-2xl shadow-neumo mb-8">
        <div className="flex items-center gap-3 mb-6 border-b border-primary-dark/10 pb-4">
            <div className="p-3 bg-primary-light rounded-xl shadow-neumo-sm text-accent">
                {icon}
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary">{title}</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {children}
        </div>
    </div>
);

interface SubSectionProps {
    title: string;
    accounts: (Account & {multiCurrencyBalances: Record<string, number>, hasAttachment: boolean})[];
    badge: string;
    defaults: { category: 'bank' | 'safe', currencyType: 'local' | 'foreign' };
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    onOpenModal: (account: Account | null, defaults?: { category: 'bank' | 'safe', currencyType: 'local' | 'foreign' }) => void;
    onAccountSelect: (account: Account, parentView: string) => void;
    onDeleteAccount: (id: string) => void;
    onLink: (account: Account) => void;
    onNewJournalEntry: (account: Account) => void;
}

const SubSection: React.FC<SubSectionProps> = ({ 
    title, accounts, badge, defaults, canCreate, canEdit, canDelete, 
    onOpenModal, onAccountSelect, onDeleteAccount, onLink, onNewJournalEntry 
}) => (
    <div className="bg-primary-light/50 p-4 rounded-xl border border-primary-dark/5 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-primary-dark/10">
            <div className="flex items-center gap-3">
                <span className="font-bold text-lg text-slate-700">{title}</span>
                <span className="text-xs font-bold px-2 py-1 rounded-md bg-white dark:bg-gray-700 shadow-sm text-text-secondary">{badge}</span>
            </div>
            {canCreate && (
                <button 
                    onClick={() => onOpenModal(null, defaults)} 
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-accent font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
                    title="إضافة حساب جديد"
                >
                    <PlusCircle size={16}/> إضافة
                </button>
            )}
        </div>
        {accounts.length > 0 ? (
             <div className="grid grid-cols-1 gap-3 flex-1 content-start">
                {accounts.map(acc => (
                    <AccountCard 
                        key={acc.id}
                        account={acc} 
                        onSelect={() => onAccountSelect(acc, 'bankAndCash')} 
                        onEdit={() => onOpenModal(acc)}
                        onDelete={() => onDeleteAccount(acc.id)}
                        onLink={() => onLink(acc)}
                        onNewJournalEntry={() => onNewJournalEntry(acc)}
                        canCreate={canCreate}
                        canEdit={canEdit}
                        canDelete={canDelete}
                    />
                ))}
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-text-secondary text-sm italic p-8 bg-white/50 dark:bg-gray-800/20 rounded-xl border-2 border-dashed border-primary-dark/10">
                <p>لا يوجد حسابات</p>
            </div>
        )}
    </div>
);


const AccountsManagement: React.FC<AccountsManagementProps> = ({ accounts, journalEntries, documents, onAccountSelect, addAccount, updateAccount, deleteAccount, currentUser, onNewJournalEntry, requestConfirmation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [modalDefaults, setModalDefaults] = useState<{ category: 'bank' | 'safe', currencyType: 'local' | 'foreign' }>({ category: 'bank', currencyType: 'local' });
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [accountToLink, setAccountToLink] = useState<Account | null>(null);
    const [selectedLinkedAccounts, setSelectedLinkedAccounts] = useState<string[]>([]);

    const canCreate = canPerformAction(currentUser.role, 'create');
    const canEdit = canPerformAction(currentUser.role, 'edit');
    const canDelete = canPerformAction(currentUser.role, 'delete');

    const bankAndCashAccountsWithBalances = useMemo(() => {
        return accounts
            .filter(acc => acc.isBankOrCash)
            .map(account => {
                const balances: { [currency: string]: number } = {};

                // 1. Initialize with opening balance
                if (account.openingBalance) {
                    balances[account.currency || 'EGP'] = account.openingBalance;
                }

                // 2. Aggregate movements from journal entries
                journalEntries.forEach(entry => {
                    entry.lines.forEach(line => {
                        if (line.accountId === account.id) {
                            if (line.currency && line.currency !== 'EGP') {
                                // Foreign currency line
                                const change = line.debit > 0 ? (line.amountForeign || 0) : -(line.amountForeign || 0);
                                balances[line.currency] = (balances[line.currency] || 0) + change;
                            } else {
                                // EGP line
                                const change = line.debit - line.credit;
                                balances['EGP'] = (balances['EGP'] || 0) + change;
                            }
                        }
                    });
                });
                const hasAttachment = documents.some(doc => doc.linkedToId === account.id);
                return { ...account, multiCurrencyBalances: balances, hasAttachment };
            });
    }, [accounts, journalEntries, documents]);

    const categorizedAccounts = useMemo(() => {
        const localBanks = bankAndCashAccountsWithBalances.filter(a => a.category === 'bank' && a.currencyType === 'local');
        const foreignBanks = bankAndCashAccountsWithBalances.filter(a => a.category === 'bank' && a.currencyType === 'foreign');
        const localSafes = bankAndCashAccountsWithBalances.filter(a => a.category === 'safe' && a.currencyType === 'local');
        const foreignSafes = bankAndCashAccountsWithBalances.filter(a => a.category === 'safe' && a.currencyType === 'foreign');
        return { localBanks, foreignBanks, localSafes, foreignSafes };
    }, [bankAndCashAccountsWithBalances]);
    
    const expenseAccounts = useMemo(() => accounts.filter(a => a.type === 'Expense'), [accounts]);
    
    const handleOpenLinkModal = (account: Account) => {
        setAccountToLink(account);
        const linked = expenseAccounts.filter(e => e.linkedAccountId === account.id).map(e => e.id);
        setSelectedLinkedAccounts(linked);
        setLinkModalOpen(true);
    };

    const handleLinkToggle = (expenseAccountId: string) => {
        setSelectedLinkedAccounts(prev => 
            prev.includes(expenseAccountId) 
                ? prev.filter(id => id !== expenseAccountId)
                : [...prev, expenseAccountId]
        );
    };

    const handleSaveLinks = () => {
        if (!accountToLink) return;
        
        expenseAccounts.forEach(exp => {
            const isSelected = selectedLinkedAccounts.includes(exp.id);
            const wasLinkedToThisAccount = exp.linkedAccountId === accountToLink.id;

            if (isSelected && !wasLinkedToThisAccount) {
                // Link it
                updateAccount({ ...exp, linkedAccountId: accountToLink.id });
            } else if (!isSelected && wasLinkedToThisAccount) {
                // Unlink it
                updateAccount({ ...exp, linkedAccountId: undefined });
            }
        });

        setLinkModalOpen(false);
        setAccountToLink(null);
    };


    const handleOpenModal = (account: Account | null, defaults?: typeof modalDefaults) => {
        setEditingAccount(account);
        if (defaults) setModalDefaults(defaults);
        setIsModalOpen(true);
    };

    const handleSubmit = (data: Account | Omit<Account, 'id'>) => {
        if ('id' in data) {
            updateAccount(data);
        } else {
            addAccount(data as Omit<Account, 'id'>);
        }
    };

    return (
        <div>
            <BankSafeFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingAccount}
                defaults={modalDefaults}
                accounts={accounts}
                requestConfirmation={requestConfirmation}
            />
            
             {linkModalOpen && accountToLink && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={() => setLinkModalOpen(false)}>
                    <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-text-primary mb-4">ربط حساب "{accountToLink.name}"</h2>
                        <p className="text-text-secondary mb-4">اختر حسابات المصروفات التي سيتم الدفع منها تلقائياً بواسطة هذا الحساب.</p>
                        <div className="max-h-64 overflow-y-auto space-y-2 bg-primary p-2 rounded-lg shadow-neumo-inset-sm">
                            {expenseAccounts.map(exp => (
                                <label key={exp.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-primary-light cursor-pointer">
                                    <input type="checkbox" checked={selectedLinkedAccounts.includes(exp.id)} onChange={() => handleLinkToggle(exp.id)} className="w-4 h-4 accent-accent"/>
                                    <span>{exp.name}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => setLinkModalOpen(false)} className="px-4 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold">إلغاء</button>
                            <button onClick={handleSaveLinks} className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold">حفظ</button>
                        </div>
                    </div>
                </div>
            )}

            <AccountGroup title="الخزائن النقدية (الصناديق)" icon={<Wallet size={28}/>}>
                <SubSection 
                    title="العملة المحلية" 
                    badge="EGP Only" 
                    accounts={categorizedAccounts.localSafes} 
                    defaults={{ category: 'safe', currencyType: 'local' }}
                    canCreate={canCreate}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onOpenModal={handleOpenModal}
                    onAccountSelect={onAccountSelect}
                    onDeleteAccount={deleteAccount}
                    onLink={handleOpenLinkModal}
                    onNewJournalEntry={onNewJournalEntry}
                />
                <SubSection 
                    title="العملات الأجنبية" 
                    badge="Multi-Currency" 
                    accounts={categorizedAccounts.foreignSafes} 
                    defaults={{ category: 'safe', currencyType: 'foreign' }}
                    canCreate={canCreate}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onOpenModal={handleOpenModal}
                    onAccountSelect={onAccountSelect}
                    onDeleteAccount={deleteAccount}
                    onLink={handleOpenLinkModal}
                    onNewJournalEntry={onNewJournalEntry}
                />
            </AccountGroup>

            <AccountGroup title="الحسابات البنكية" icon={<Building2 size={28}/>}>
                <SubSection 
                    title="العملة المحلية" 
                    badge="EGP Only" 
                    accounts={categorizedAccounts.localBanks} 
                    defaults={{ category: 'bank', currencyType: 'local' }}
                    canCreate={canCreate}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onOpenModal={handleOpenModal}
                    onAccountSelect={onAccountSelect}
                    onDeleteAccount={deleteAccount}
                    onLink={handleOpenLinkModal}
                    onNewJournalEntry={onNewJournalEntry}
                />
                <SubSection 
                    title="العملات الأجنبية" 
                    badge="Multi-Currency" 
                    accounts={categorizedAccounts.foreignBanks} 
                    defaults={{ category: 'bank', currencyType: 'foreign' }}
                    canCreate={canCreate}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onOpenModal={handleOpenModal}
                    onAccountSelect={onAccountSelect}
                    onDeleteAccount={deleteAccount}
                    onLink={handleOpenLinkModal}
                    onNewJournalEntry={onNewJournalEntry}
                />
            </AccountGroup>
        </div>
    );
};

export default AccountsManagement;
