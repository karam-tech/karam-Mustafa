
import React, { useState, useEffect, useMemo } from 'react';
import { Account, User, AccountType, Document, JournalEntry, AccountCategory } from '../types.ts';
import { PlusCircle, Edit, Trash2, X, Link, Book, Paperclip, Search, Filter, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Eye, Activity, Calendar } from 'lucide-react';
import { canPerformAction } from '../permissions.ts';

// ---- NEW MODAL COMPONENT (In-file) ----
interface GeneralAccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Account | Omit<Account, 'id'>) => void;
  initialData?: Account | null;
}

const BLANK_FORM_DATA: Omit<Account, 'id'> = {
    name: '',
    type: 'Expense',
    openingBalance: 0,
    notes: '',
    currency: 'EGP',
};

type FormErrors = Partial<Record<keyof typeof BLANK_FORM_DATA, string>>;

const GeneralAccountFormModal: React.FC<GeneralAccountFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [formData, setFormData] = useState<Omit<Account, 'id'>>(BLANK_FORM_DATA);
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setFormData(initialData ? initialData : BLANK_FORM_DATA);
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.name.trim()) newErrors.name = "اسم الحساب مطلوب.";
        setErrors(newErrors);
        return Object.keys(newErrors).filter(k => newErrors[k as keyof FormErrors]).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formData);
            onClose();
        }
    };

    if (!isOpen) return null;

    const title = initialData ? 'تعديل حساب' : 'إضافة حساب عام جديد';
    const accountTypeOptions: { value: AccountType, label: string }[] = [
        { value: 'Asset', label: 'أصل' },
        { value: 'Liability', label: 'التزام' },
        { value: 'Equity', label: 'حقوق ملكية' },
        { value: 'Revenue', label: 'إيراد' },
        { value: 'Expense', label: 'مصروف' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-8 rounded-2xl shadow-neumo w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="font-semibold text-text-secondary">اسم الحساب</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm ${errors.name ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-accent'}`}/>
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                     <div>
                        <label className="font-semibold text-text-secondary">نوع الحساب</label>
                        <select name="type" value={formData.type} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none focus:ring-2 focus:ring-accent">
                            {accountTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="font-semibold text-text-secondary">رصيد أول المدة</label>
                            <input type="number" step="0.01" name="openingBalance" value={formData.openingBalance || 0} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                        <div>
                            <label className="font-semibold text-text-secondary">العملة الافتراضية</label>
                            <input type="text" name="currency" value={formData.currency || 'EGP'} onChange={handleChange} placeholder="EGP" className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                    </div>
                     <div>
                        <label className="font-semibold text-text-secondary">ملاحظات (اختياري)</label>
                        <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                    </div>
                    <div className="pt-6 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold">إلغاء</button>
                        <button type="submit" className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ---- UPDATED LIST VIEW COMPONENT ----
interface AccountListViewProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  documents: Document[];
  onAccountSelect: (account: Account, parentView: string) => void;
  addGeneralAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  currentUser: User;
  onNewJournalEntry: (account: Account) => void;
}

const formatCurrency = (amount: number, currency: string = 'EGP') => {
    const locale = currency === 'EGP' ? 'ar-EG' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const categoryTranslations: Record<string, string> = {
    'Cash': 'نقدية',
    'Bank': 'بنوك',
    'Customer': 'عملاء',
    'Inventory': 'مخزون',
    'Fixed Asset': 'أصول ثابتة',
    'Supplier': 'موردين',
    'Loan': 'قروض',
    'Payable': 'دائنون',
    'Taxes Payable': 'ضرائب مستحقة',
    'Capital': 'رأس المال',
    'Retained Earnings': 'أرباح محتجزة',
    'Service Revenue': 'إيرادات خدمات',
    'Operating Expense': 'مصروفات تشغيل',
    'Administrative Expense': 'مصروفات إدارية',
    'Payroll': 'رواتب',
    'Other': 'أخرى'
};

type ProcessedAccount = Account & { currentBalance: number };

const AccountListView: React.FC<AccountListViewProps> = ({ accounts, journalEntries, documents, onAccountSelect, addGeneralAccount, updateAccount, deleteAccount, currentUser, onNewJournalEntry }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  // Filtering and Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AccountType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<AccountCategory | 'all'>('all');
  const [filterCurrencyType, setFilterCurrencyType] = useState<'all' | 'local' | 'foreign'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: 'id' | 'name' | 'type' | 'balance'; direction: 'asc' | 'desc' } | null>(null);

  // Grouping State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Quick Preview State
  const [previewAccountId, setPreviewAccountId] = useState<string | null>(null);

  const canCreate = canPerformAction(currentUser.role, 'create');
  const canEdit = canPerformAction(currentUser.role, 'edit');
  const canDelete = canPerformAction(currentUser.role, 'delete');

  const accountTypes: Record<string, string> = {
    Asset: 'أصل',
    Liability: 'التزام',
    Equity: 'حقوق الملكية',
    Revenue: 'إيراد',
    Expense: 'مصروف',
  };
  
  const handleOpenModal = (account: Account | null) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleSubmit = (data: Account | Omit<Account, 'id'>) => {
      if ('id' in data) {
          updateAccount(data);
      } else {
          addGeneralAccount(data);
      }
  };

  const handleSort = (key: 'id' | 'name' | 'type' | 'balance') => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const togglePreview = (e: React.MouseEvent, accountId: string) => {
      e.stopPropagation();
      setPreviewAccountId(prev => prev === accountId ? null : accountId);
  };

  // OPTIMIZATION: Pre-calculate balances in O(N + M) instead of O(N * M)
  const balanceMap = useMemo(() => {
      const map = new Map<string, number>();
      
      // 1. Initialize with opening balances
      accounts.forEach(acc => {
          let balance = acc.openingBalance || 0;
          if (acc.currency !== 'EGP' && acc.conversionRate) {
              balance *= acc.conversionRate;
          }
          map.set(acc.id, balance);
      });

      // 2. Single pass through journal entries to update all balances
      journalEntries.forEach(entry => {
          entry.lines.forEach(line => {
              const current = map.get(line.accountId) || 0;
              // Standard ledger logic: Debit increases, Credit decreases (relative to EGP)
              // Display logic handles sign based on account type later
              map.set(line.accountId, current + (line.debit - line.credit));
          });
      });
      
      return map;
  }, [accounts, journalEntries]);

  const processedAccounts = useMemo((): ProcessedAccount[] => {
      let result = accounts.map(acc => ({
          ...acc,
          currentBalance: balanceMap.get(acc.id) || 0
      }));

      // Filtering
      if (searchQuery) {
          const query = searchQuery.toLowerCase();
          result = result.filter(acc => 
              acc.name.toLowerCase().includes(query) || 
              acc.id.includes(query)
          );
      }

      if (filterType !== 'all') {
          result = result.filter(acc => acc.type === filterType);
      }

      if (filterCategory !== 'all') {
          result = result.filter(acc => acc.accountCategory === filterCategory);
      }

      if (filterCurrencyType !== 'all') {
          result = result.filter(acc => acc.currencyType === filterCurrencyType);
      }

      // Sorting
      if (sortConfig) {
          result.sort((a, b) => {
              if (sortConfig.key === 'balance') {
                  return sortConfig.direction === 'asc' 
                      ? a.currentBalance - b.currentBalance
                      : b.currentBalance - a.currentBalance;
              }
              
              const aValue = String(a[sortConfig.key] || '');
              const bValue = String(b[sortConfig.key] || '');
              
              return sortConfig.direction === 'asc'
                  ? aValue.localeCompare(bValue)
                  : bValue.localeCompare(aValue);
          });
      } else {
          result.sort((a, b) => a.id.localeCompare(b.id));
      }

      return result;
  }, [accounts, balanceMap, searchQuery, filterType, filterCategory, filterCurrencyType, sortConfig]);

  // Group Accounts Logic
  const groupedAccounts = useMemo(() => {
      const groups: Record<string, ProcessedAccount[]> = {};
      processedAccounts.forEach(acc => {
          const cat = acc.accountCategory || 'Other';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(acc);
      });
      // Sort keys alphabetically for stability
      return Object.keys(groups).sort().reduce((obj, key) => {
          obj[key] = groups[key];
          return obj;
      }, {} as Record<string, ProcessedAccount[]>);
  }, [processedAccounts]);

  // Expand first category by default if nothing is expanded
  useEffect(() => {
      const categories = Object.keys(groupedAccounts);
      if (categories.length > 0) {
          setExpandedGroups(prev => {
              if (prev.size === 0) {
                  return new Set([categories[0]]);
              }
              return prev;
          });
      }
  }, [groupedAccounts]);

  const toggleGroup = (category: string) => {
      const newSet = new Set(expandedGroups);
      if (newSet.has(category)) {
          newSet.delete(category);
      } else {
          newSet.add(category);
      }
      setExpandedGroups(newSet);
  };

  const getLastEntries = (accountId: string) => {
      return journalEntries
          .filter(je => je.lines.some(l => l.accountId === accountId))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3)
          .map(je => {
              const line = je.lines.find(l => l.accountId === accountId);
              return { ...je, line };
          });
  };

  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <Filter size={14} className="text-gray-400 opacity-50" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-accent" /> : <ArrowDown size={14} className="text-accent" />;
  };

  const availableCategories = useMemo(() => {
      const categories = new Set<string>();
      accounts.forEach(acc => {
          if (acc.accountCategory) categories.add(acc.accountCategory);
      });
      return Array.from(categories).sort();
  }, [accounts]);

  return (
    <div className="bg-primary p-8 rounded-2xl shadow-neumo">
        <GeneralAccountFormModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            initialData={editingAccount}
        />

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-text-primary">دليل الحسابات</h2>
        {canCreate && (
            <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold shadow-sm">
                <PlusCircle size={20} /> إضافة حساب جديد
            </button>
        )}
      </div>

      <div className="bg-primary p-4 rounded-xl shadow-neumo-sm mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
              <input 
                  type="text" 
                  placeholder="بحث بالاسم أو الرقم..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 pr-10 bg-primary rounded-lg shadow-neumo-inset-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"/>
          </div>
          
          <div>
              <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value as AccountType | 'all')}
                  className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none focus:outline-none focus:ring-1 focus:ring-accent"
              >
                  <option value="all">كل الأنواع الرئيسية</option>
                  {Object.entries(accountTypes).map(([key, val]) => (
                      <option key={key} value={key}>{val}</option>
                  ))}
              </select>
          </div>

          <div>
              <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value as AccountCategory | 'all')}
                  className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none focus:outline-none focus:ring-1 focus:ring-accent"
              >
                  <option value="all">كل التصنيفات الفرعية</option>
                  {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{categoryTranslations[cat] || cat}</option>
                  ))}
              </select>
          </div>

          <div>
              <select 
                  value={filterCurrencyType} 
                  onChange={(e) => setFilterCurrencyType(e.target.value as 'all' | 'local' | 'foreign')}
                  className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none focus:outline-none focus:ring-1 focus:ring-accent"
              >
                  <option value="all">كل العملات</option>
                  <option value="local">عملة محلية</option>
                  <option value="foreign">عملة أجنبية</option>
              </select>
          </div>
          
          {(searchQuery || filterType !== 'all' || filterCategory !== 'all' || filterCurrencyType !== 'all') && (
              <button 
                  onClick={() => { setSearchQuery(''); setFilterType('all'); setFilterCategory('all'); setFilterCurrencyType('all'); }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-red-500 rounded-lg hover:shadow-neumo-inset shadow-neumo-sm font-semibold"
              >
                  <X size={16} /> مسح الفلاتر
              </button>
          )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b-2 border-primary-dark/30">
              <th className="p-3 cursor-pointer group hover:bg-primary-dark/10 rounded-lg transition-colors" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-2 text-lg font-bold text-text-primary">
                      رقم الحساب <SortIcon column="id" />
                  </div>
              </th>
              <th className="p-3 cursor-pointer group hover:bg-primary-dark/10 rounded-lg transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2 text-lg font-bold text-text-primary">
                      اسم الحساب <SortIcon column="name" />
                  </div>
              </th>
              <th className="p-3 cursor-pointer group hover:bg-primary-dark/10 rounded-lg transition-colors text-center" onClick={() => handleSort('type')}>
                  <div className="flex items-center justify-center gap-2 text-lg font-bold text-text-primary">
                      النوع <SortIcon column="type" />
                  </div>
              </th>
              <th className="p-3 cursor-pointer group hover:bg-primary-dark/10 rounded-lg transition-colors text-center" onClick={() => handleSort('balance')}>
                  <div className="flex items-center justify-center gap-2 text-lg font-bold text-text-primary">
                      الرصيد الحالي (EGP) <SortIcon column="balance" />
                  </div>
              </th>
              <th className="p-3 font-bold text-lg text-text-primary text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedAccounts).map(([category, accountsInGroup]) => {
                const accounts = accountsInGroup as ProcessedAccount[];
                const isExpanded = expandedGroups.has(category);
                return (
                    <React.Fragment key={category}>
                        <tr 
                            className="bg-primary-dark/10 border-b border-primary-dark/20 cursor-pointer hover:bg-primary-dark/20 transition-colors"
                            onClick={() => toggleGroup(category)}
                        >
                            <td colSpan={5} className="p-3 font-bold text-text-primary">
                                <div className="flex items-center gap-2">
                                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    <span>{categoryTranslations[category] || category}</span>
                                    <span className="text-sm font-normal text-text-secondary bg-primary px-2 py-0.5 rounded-full shadow-sm">
                                        {accounts.length}
                                    </span>
                                </div>
                            </td>
                        </tr>
                        {isExpanded && accounts.map((acc) => {
                            const isGeneralAccount = !acc.isBankOrCash && !acc.name.startsWith('العملاء');
                            const linkedAccount = acc.linkedAccountId ? accounts.find(a => a.id === acc.linkedAccountId) : null;
                            const hasAttachment = documents.some(doc => doc.linkedToId === acc.id);
                            
                            const balanceValue = acc.currentBalance;
                            const isNegative = balanceValue < 0; 
                            
                            const recentEntries = previewAccountId === acc.id ? getLastEntries(acc.id) : [];

                            return (
                            <React.Fragment key={acc.id}>
                                <tr 
                                    className="border-b border-primary-dark/20 group hover:shadow-neumo-inset-sm transition-all"
                                >
                                    <td className="p-3 font-mono text-text-primary cursor-pointer" onClick={() => onAccountSelect(acc, 'accounts')}>{acc.id}</td>
                                    <td className="p-3 font-semibold text-text-primary cursor-pointer" onClick={() => onAccountSelect(acc, 'accounts')}>
                                        <div className="flex items-center gap-3">
                                            {hasAttachment && <span title="يوجد مرفقات"><Paperclip size={14} className="text-text-secondary" /></span>}
                                            <span>{acc.name}</span>
                                            {linkedAccount && (
                                                <span title={`مربوط بـ: ${linkedAccount.name}`} className="flex items-center gap-1.5 text-xs px-3 py-1 bg-primary rounded-lg shadow-neumo-sm text-accent font-bold">
                                                    <Link size={12} />
                                                    {linkedAccount.name}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center text-text-primary cursor-pointer" onClick={() => onAccountSelect(acc, 'accounts')}>{accountTypes[acc.type] || acc.type}</td>
                                    <td className={`p-3 text-center font-mono font-bold cursor-pointer ${isNegative ? 'text-red-500' : 'text-text-primary'}`} onClick={() => onAccountSelect(acc, 'accounts')}>
                                        {formatCurrency(balanceValue)}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={(e) => togglePreview(e, acc.id)} className={`p-2 rounded-full hover:shadow-neumo-sm transition-colors ${previewAccountId === acc.id ? 'text-accent bg-accent/10' : 'text-text-secondary'}`} title="معاينة آخر حركات"><Eye size={18} /></button>
                                            {canCreate && <button onClick={() => onNewJournalEntry(acc)} className="p-2 text-green-600 rounded-full hover:shadow-neumo-sm opacity-0 group-hover:opacity-100 transition-opacity" title="قيد جديد"><Book size={18} /></button>}
                                            {isGeneralAccount && canEdit && <button onClick={() => handleOpenModal(acc)} className="p-2 text-accent rounded-full hover:shadow-neumo-sm opacity-0 group-hover:opacity-100 transition-opacity" title="تعديل"><Edit size={18} /></button>}
                                            {isGeneralAccount && canDelete && <button onClick={() => deleteAccount(acc.id)} className="p-2 text-red-500 rounded-full hover:shadow-neumo-sm opacity-0 group-hover:opacity-100 transition-opacity" title="حذف"><Trash2 size={18} /></button>}
                                        </div>
                                    </td>
                                </tr>
                                {previewAccountId === acc.id && (
                                    <tr>
                                        <td colSpan={5} className="p-0 bg-primary-light border-b border-primary-dark/20 shadow-inner">
                                            <div className="p-4 pr-12">
                                                <div className="flex items-center gap-2 mb-3 text-sm font-bold text-text-secondary">
                                                    <Activity size={16} />
                                                    <span>آخر 3 حركات</span>
                                                </div>
                                                {recentEntries.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {recentEntries.map(entry => {
                                                            const line = entry.line!;
                                                            const isDebit = line.debit > 0;
                                                            const amount = isDebit ? line.debit : line.credit;
                                                            return (
                                                                <div key={entry.id} className="flex items-center justify-between p-2 bg-primary rounded-lg shadow-sm text-sm">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="flex items-center gap-2 text-text-secondary min-w-[100px]">
                                                                            <Calendar size={14} />
                                                                            <span className="font-mono">{new Date(entry.date).toLocaleDateString('ar-EG')}</span>
                                                                        </div>
                                                                        <span className="text-text-primary font-medium">{entry.description}</span>
                                                                    </div>
                                                                    <div className={`font-mono font-bold ${isDebit ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {isDebit ? '+' : '-'}{formatCurrency(amount)}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="flex justify-end mt-2">
                                                            <button onClick={() => onAccountSelect(acc, 'accounts')} className="text-xs font-bold text-accent hover:underline">عرض كل التفاصيل</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-text-secondary text-sm italic py-2">لا توجد حركات حديثة.</p>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                            );
                        })}
                    </React.Fragment>
                );
            })}
            {processedAccounts.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center p-8 text-text-secondary">لا توجد حسابات تطابق الفلتر.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountListView;
