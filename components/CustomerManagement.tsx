
import React, { useState, useMemo, useEffect } from 'react';
import { Account, JournalEntry, Operation, User, PriceList, PriceListItem, TaxType, Document } from '../types.ts';
import { PlusCircle, Edit, Trash2, Bot, X, FileText, MinusCircle, Paperclip } from 'lucide-react';
import CustomerFormModal from './CustomerFormModal.tsx';
import { canPerformAction } from '../permissions.ts';
import { getCustomerInsights } from '../services/geminiService.ts';
import { v4 as uuidv4 } from 'uuid';

interface CustomerManagementProps {
  accounts: Account[];
  operations: Operation[];
  journalEntries: JournalEntry[];
  priceLists: PriceList[];
  documents: Document[];
  onAccountSelect: (account: Account, parentView: string) => void;
  addCustomer: (customer: Omit<Account, 'id' | 'type'>) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  addPriceList: (priceList: Omit<PriceList, 'id'>) => void;
  updatePriceList: (priceList: PriceList) => void;
  deletePriceList: (id: string) => void;
  currentUser: User;
  requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger' }) => void;
}

interface AIFinancialInsight {
    topDebtors: { name: string; amount: string; }[];
    creditBalanceAccounts: { name: string; amount: string; }[];
    recommendations: string[];
}

// --- AI Analysis Modal ---
const AIAnalysisModal: React.FC<{ isOpen: boolean; onClose: () => void; insights: AIFinancialInsight | null; isLoading: boolean; }> = ({ isOpen, onClose, insights, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-text-primary">تحليل حسابات العملاء بالـ AI</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
                            <p className="text-text-secondary font-semibold">يقوم الذكاء الاصطناعي بتحليل الحسابات...</p>
                        </div>
                    )}
                    {insights && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-lg text-text-primary mb-2">أكبر 3 عملاء مدينون</h3>
                                <ul className="list-decimal list-inside bg-primary p-3 rounded-lg shadow-neumo-inset-sm space-y-1">
                                    {insights.topDebtors.map((c, i) => <li key={i}><strong>{c.name}:</strong> <span className="font-mono">{c.amount}</span></li>)}
                                </ul>
                            </div>
                             <div>
                                <h3 className="font-bold text-lg text-red-600 mb-2">تنبيه: حسابات ذات رصيد دائن</h3>
                                <ul className="list-disc list-inside bg-red-100 p-3 rounded-lg space-y-1 text-red-800">
                                     {insights.creditBalanceAccounts.length > 0 ? insights.creditBalanceAccounts.map((c, i) => (
                                        <li key={i}><strong>{c.name}:</strong> <span className="font-mono">{c.amount}</span> (قد يشير إلى دفعة مقدمة أو خطأ)</li>
                                    )) : (
                                        <li>لا توجد حسابات ذات أرصدة دائنة.</li>
                                    )}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-text-primary mb-2">توصيات</h3>
                                <ul className="list-disc list-inside bg-primary p-3 rounded-lg shadow-neumo-inset-sm space-y-1">
                                    {insights.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Price List Form Modal ---
interface PriceListFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Account;
    priceList: PriceList | null;
    addPriceList: (priceList: Omit<PriceList, 'id'>) => void;
    updatePriceList: (priceList: PriceList) => void;
}
const PriceListFormModal: React.FC<PriceListFormModalProps> = ({ isOpen, onClose, customer, priceList, addPriceList, updatePriceList }) => {
    const [name, setName] = useState('');
    const [items, setItems] = useState<PriceListItem[]>([]);

    useEffect(() => {
        if(isOpen) {
            setName(priceList?.name || `قائمة أسعار ${customer.name.replace('العملاء - ', '')}`);
            setItems(priceList?.items ? JSON.parse(JSON.stringify(priceList.items)) : []);
        }
    }, [isOpen, priceList, customer]);

    const handleItemChange = (id: string, field: keyof PriceListItem, value: string | number) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };
    
    const addItem = () => setItems(prev => [...prev, { id: uuidv4(), description: '', price: 0, taxType: 'none' }]);
    const removeItem = (id: string) => setItems(prev => prev.filter(item => item.id !== id));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(priceList) {
            updatePriceList({ ...priceList, name, items });
        } else {
            addPriceList({ customerId: customer.id, name, items });
        }
        onClose();
    };
    
    if(!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-slate-800">قائمة أسعار: {customer.name.replace('العملاء - ', '')}</h2><button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm"><X size={24} /></button></div>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div><label className="font-semibold">اسم القائمة</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>
                    <h3 className="font-semibold mt-4 mb-2">البنود</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {items.map(item => (
                            <div key={item.id} className="grid grid-cols-[1fr_120px_180px_auto] gap-2 items-center">
                                <input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="وصف البند" className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm" />
                                <input type="number" value={item.price} onChange={e => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)} placeholder="السعر" className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm" />
                                <select value={item.taxType} onChange={e => handleItemChange(item.id, 'taxType', e.target.value as TaxType)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none"><option value="none">بدون ضريبة</option><option value="schedule">ضريبة جدول (10%)</option><option value="vat">ضريبة قيمة مضافة (14%)</option></select>
                                <button type="button" onClick={() => removeItem(item.id)} className="text-red-500"><MinusCircle size={18} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-between items-center"><button type="button" onClick={addItem} className="flex items-center gap-2 text-accent font-semibold"><PlusCircle size={18} /> إضافة بند</button><button type="submit" className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold">حفظ القائمة</button></div>
                </form>
            </div>
        </div>
    )
}


const CustomerManagement: React.FC<CustomerManagementProps> = ({ accounts, operations, journalEntries, onAccountSelect, addCustomer, updateAccount, deleteAccount, currentUser, priceLists, addPriceList, updatePriceList, deletePriceList, documents, requestConfirmation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Account | null>(null);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiInsights, setAiInsights] = useState<AIFinancialInsight | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);
    const [selectedCustomerForPriceList, setSelectedCustomerForPriceList] = useState<Account | null>(null);


    const canCreate = canPerformAction(currentUser.role, 'create');
    const canEdit = canPerformAction(currentUser.role, 'edit');
    const canDelete = canPerformAction(currentUser.role, 'delete');

    const formatCurrency = (amount: number, currency: string = 'EGP') => {
        const locale = currency === 'EGP' ? 'ar-EG' : 'en-US';
        return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };
    
    const { customerData, totalEgpBalance } = useMemo(() => {
        const customerAccounts = accounts.filter(acc => acc.type === 'Asset' && acc.name.startsWith('العملاء'));
        let finalTotalEgp = 0;

        const data = customerAccounts.map(acc => {
            const balances: { [currency: string]: number } = {};
            let totalEgpBalance = 0;

            if (acc.openingBalance) {
                const openingCurrency = acc.currency || 'EGP';
                balances[openingCurrency] = (balances[openingCurrency] || 0) + acc.openingBalance;
            }

            journalEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (line.accountId === acc.id) {
                        totalEgpBalance += line.debit - line.credit;
                        
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

            // Recalculate totalEgpBalance from multi-currency balances for accuracy
            let accurateEgpBalance = 0;
            for (const currency in balances) {
                if (currency === 'EGP') {
                    accurateEgpBalance += balances[currency];
                } else {
                    // Find an account with this currency to get a conversion rate, or default
                    const rateProvider = accounts.find(a => a.currency === currency && a.conversionRate);
                    accurateEgpBalance += balances[currency] * (rateProvider?.conversionRate || 1);
                }
            }
            
            finalTotalEgp += accurateEgpBalance;

            return {
                ...acc,
                totalEgpBalance: accurateEgpBalance,
                multiCurrencyBalances: balances,
                operationCount: operations.filter(op => op.clientId === acc.id).length
            };
        });

        return { customerData: data, totalEgpBalance: finalTotalEgp };

    }, [accounts, journalEntries, operations]);


    const handleAddNew = () => { if (canCreate) { setEditingCustomer(null); setIsModalOpen(true); } };
    const handleEdit = (customer: Account) => { if (canEdit) { setEditingCustomer(customer); setIsModalOpen(true); } };
    const handleSubmit = (data: Account | Omit<Account, 'id' | 'type'>) => { 'id' in data ? updateAccount(data as Account) : addCustomer(data); };

    const handleAIAnalysis = async () => {
        setIsAiLoading(true);
        setIsAiModalOpen(true);
        try {
            const customerBalances = customerData.map(c => ({
                name: c.name.replace('العملاء - ', ''),
                balances: c.multiCurrencyBalances,
                // Also provide EGP equivalent for AI ranking
                totalEgpBalance: c.totalEgpBalance
            }));
            
            const insights = await getCustomerInsights(customerBalances as any); // Cast as any to match new signature
            setAiInsights(insights);
        } catch (error) {
            console.error(error);
            requestConfirmation({
                title: 'خطأ في التحليل',
                message: "فشل في الحصول على تحليل الذكاء الاصطناعي.",
                onConfirm: () => {},
                showCancel: false,
                variant: 'danger'
            });
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleManagePriceList = (customer: Account) => {
        setSelectedCustomerForPriceList(customer);
        setIsPriceListModalOpen(true);
    };

    return (
        <div className="space-y-8">
            <CustomerFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSubmit={handleSubmit} 
                initialData={editingCustomer} 
                priceLists={priceLists} 
                requestConfirmation={requestConfirmation}
            />
            <AIAnalysisModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} insights={aiInsights} isLoading={isAiLoading} />
            {selectedCustomerForPriceList && (
                <PriceListFormModal
                    isOpen={isPriceListModalOpen}
                    onClose={() => setIsPriceListModalOpen(false)}
                    customer={selectedCustomerForPriceList}
                    priceList={priceLists.find(pl => pl.customerId === selectedCustomerForPriceList.id) || null}
                    addPriceList={addPriceList}
                    updatePriceList={updatePriceList}
                />
            )}


            <div className="bg-primary p-6 rounded-2xl shadow-neumo">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h2 className="text-3xl font-bold text-text-primary">إدارة العملاء</h2>
                    <div className="flex items-center gap-2">
                         <button onClick={handleAIAnalysis} className="flex items-center gap-2 px-4 py-2 bg-primary text-accent rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold">
                            <Bot size={20} /> تحليل AI
                        </button>
                        {canCreate && (
                            <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold shadow-sm">
                                <PlusCircle size={20} /> إضافة عميل
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b-2 border-primary-dark/30">
                                <th className="p-3 font-bold text-lg text-text-primary">اسم العميل</th>
                                <th className="p-3 font-bold text-lg text-text-primary">قائمة الأسعار المرتبطة</th>
                                <th className="p-3 font-bold text-lg text-text-primary text-center">الرصيد</th>
                                <th className="p-3 font-bold text-lg text-text-primary text-center">عدد العمليات</th>
                                {(canEdit || canDelete) && <th className="p-3 font-bold text-lg text-text-primary text-center">إجراءات</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {customerData.map(cust => {
                                const hasNonZeroBalance = Object.values(cust.multiCurrencyBalances).some(b => Math.abs(b as number) > 0.01);
                                const linkedPriceList = priceLists.find(pl => pl.id === cust.priceListId);
                                const hasAttachment = documents.some(doc => doc.linkedToId === cust.id);

                                return (
                                <tr key={cust.id} className="border-b border-primary-dark/20 group hover:shadow-neumo-inset-sm transition-all">
                                    <td className="p-3">
                                        <button onClick={() => onAccountSelect(cust, 'customerManagement')} className="font-bold text-accent hover:underline text-right w-full flex items-center gap-2">
                                            {hasAttachment && <span title="يوجد مرفقات"><Paperclip size={14} className="text-text-secondary" /></span>}
                                            <span>{cust.name.replace('العملاء - ', '')}</span>
                                        </button>
                                    </td>
                                    <td className="p-3">
                                        {linkedPriceList ? (
                                            <span className="px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                            {linkedPriceList.name}
                                            </span>
                                        ) : (
                                            <span className="text-text-secondary text-sm">لم يتم التعيين</span>
                                        )}
                                    </td>
                                    <td className={`p-3 text-center font-mono font-bold ${cust.totalEgpBalance < 0 ? 'text-red-500' : 'text-text-primary'}`}>
                                        {hasNonZeroBalance ? (
                                            Object.entries(cust.multiCurrencyBalances)
                                                .filter(([_, balance]) => Math.abs(balance as number) > 0.01)
                                                .map(([currency, balance]) => (
                                                    <div key={currency}>{formatCurrency(balance as number, currency)}</div>
                                                ))
                                        ) : (
                                            <div>{formatCurrency(0, cust.currency || 'EGP')}</div>
                                        )}
                                    </td>
                                    <td className="p-3 text-center text-text-primary font-mono">{cust.operationCount}</td>
                                    {(canEdit || canDelete) && (
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                {canEdit && <button onClick={() => handleEdit(cust)} className="p-2 text-accent rounded-full hover:shadow-neumo-sm" title="تعديل"><Edit size={18} /></button>}
                                                {canDelete && <button onClick={() => deleteAccount(cust.id)} className="p-2 text-red-500 rounded-full hover:shadow-neumo-sm" title="حذف"><Trash2 size={18} /></button>}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )})}
                        </tbody>
                        <tfoot>
                            <tr className="font-extrabold text-lg border-t-2 border-primary-dark/30 bg-primary-light">
                                <td className="p-3" colSpan={2}>الإجمالي</td>
                                <td className={`p-3 text-center font-mono ${totalEgpBalance < 0 ? 'text-red-500' : 'text-text-primary'}`}>{formatCurrency(totalEgpBalance)}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CustomerManagement;
