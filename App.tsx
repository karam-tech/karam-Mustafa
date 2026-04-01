
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import ConfirmationDialog from './components/ConfirmationDialog';
import { ChartStyleProvider } from './contexts/ChartStyleContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Account, JournalEntry, Operation, Task, Employee, AttendanceRecord, AttendanceStatus, User, PayrollEntry, DashboardWidgets, AccountType, LowBalanceRecord, PriceList, Document, AuditLogEntry, AuditLogChangeDetail, OperationStatusHistory } from './types';
import { MOCK_ACCOUNTS, MOCK_JOURNAL_ENTRIES, MOCK_OPERATIONS, MOCK_TASKS, INITIAL_EMPLOYEES, MOCK_USERS, MOCK_PRICE_LISTS } from './constants';
import { v4 as uuidv4 } from 'uuid';

// Helper function to get data from localStorage
const getFromStorage = <T,>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return fallback;
    }
};

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmVariant?: 'primary' | 'danger';
  showCancel?: boolean;
}

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-primary font-sans p-4 text-center">
    <div className="w-16 h-16 border-4 border-primary-dark/20 border-t-accent rounded-full animate-spin mb-6"></div>
    <h1 className="text-3xl font-extrabold text-text-primary leading-tight">
        شركة إيجيبشن إكسبريس للشحن والتجارة
    </h1>
    <p className="text-lg text-text-secondary mt-2">
        جاري تحميل البيانات...
    </p>
  </div>
);


function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(() => getFromStorage('currentUser', null));
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState<number>(() => getFromStorage('lowBalanceThreshold', 5000));
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isAppDataDirty, setIsAppDataDirty] = useState(false);
  
  // --- Storage & File System State ---
  const [fileName, setFileName] = useState<string>('ملف محلي (LocalStorage)');
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [storageStatus, setStorageStatus] = useState<'browser' | 'disk' | 'unsaved'>('browser');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmVariant: 'danger',
  });


  // State management for all app data, now initialized from localStorage
  const [users, setUsers] = useState<User[]>(() => getFromStorage('users', MOCK_USERS));
  const [accounts, setAccounts] = useState<Account[]>(() => getFromStorage('accounts', MOCK_ACCOUNTS));
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => getFromStorage('journalEntries', MOCK_JOURNAL_ENTRIES));
  const [operations, setOperations] = useState<Operation[]>(() => getFromStorage('operations', MOCK_OPERATIONS));
  const [priceLists, setPriceLists] = useState<PriceList[]>(() => getFromStorage('priceLists', MOCK_PRICE_LISTS));
  const [documents, setDocuments] = useState<Document[]>(() => getFromStorage('documents', []));
  const [tasks, setTasks] = useState<Task[]>(() => getFromStorage('tasks', MOCK_TASKS));
  const [employees, setEmployees] = useState<Employee[]>(() => getFromStorage('employees', INITIAL_EMPLOYEES));
  const [attendance, setAttendance] = useState<AttendanceRecord>(() => getFromStorage('attendance', {}));
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>(() => getFromStorage('payrollEntries', []));
  const [lowBalanceLog, setLowBalanceLog] = useState<LowBalanceRecord[]>(() => getFromStorage('lowBalanceLog', []));
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => getFromStorage('auditLog', []));
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidgets>(() => getFromStorage('dashboardWidgets', {
    showStatCards: true,
    showRevenueSummary: true,
    showExpenseSummary: true,
    showLocalBankBalances: true,
    showForeignBankBalances: true,
    showLocalSafeBalances: true,
    showForeignSafeBalances: true,
  }));
  
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); 

    return () => clearTimeout(loadingTimer);
  }, []);


  // --- Confirmation Dialog Logic ---
  const requestConfirmation = ({ title, message, onConfirm, variant = 'danger', showCancel = true }: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger'; showCancel?: boolean }) => {
    setConfirmation({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        handleCancelConfirmation();
      },
      confirmVariant: variant,
      showCancel
    });
  };

  const handleCancelConfirmation = () => {
    setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };


  // --- Centralized Data Saving Logic ---
  const saveData = useCallback(async () => {
      const allData = {
          accounts, journalEntries, operations, tasks, employees, attendance, payrollEntries, users, priceLists, documents, auditLog,
          lowBalanceThreshold, dashboardWidgets, lowBalanceLog
      };
      
      const jsonString = JSON.stringify(allData, null, 2);

      if (fileHandle) {
          try {
              setStorageStatus('unsaved'); // Saving...
              const writable = await fileHandle.createWritable();
              await writable.write(jsonString);
              await writable.close();
              setStorageStatus('disk');
              setLastSavedTime(new Date());
              setIsAppDataDirty(false);
          } catch (err) {
              console.error("Failed to save to disk:", err);
            requestConfirmation({
                title: 'خطأ في الحفظ',
                message: 'فشل الحفظ على القرص الصلب. يرجى التأكد من صلاحيات الملف.',
                onConfirm: () => {},
                showCancel: false,
                variant: 'danger'
            });
          }
      } else {
          // Fallback to LocalStorage
          try {
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('accounts', JSON.stringify(accounts));
            localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
            localStorage.setItem('operations', JSON.stringify(operations));
            localStorage.setItem('priceLists', JSON.stringify(priceLists));
            localStorage.setItem('documents', JSON.stringify(documents));
            localStorage.setItem('tasks', JSON.stringify(tasks));
            localStorage.setItem('employees', JSON.stringify(employees));
            localStorage.setItem('attendance', JSON.stringify(attendance));
            localStorage.setItem('payrollEntries', JSON.stringify(payrollEntries));
            localStorage.setItem('lowBalanceLog', JSON.stringify(lowBalanceLog));
            localStorage.setItem('auditLog', JSON.stringify(auditLog));
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('lowBalanceThreshold', JSON.stringify(lowBalanceThreshold));
            localStorage.setItem('dashboardWidgets', JSON.stringify(dashboardWidgets));
            setStorageStatus('browser');
            setLastSavedTime(new Date());
            setIsAppDataDirty(false);
          } catch (e) {
              console.error("LocalStorage full or error", e);
            requestConfirmation({
                title: 'تنبيه سعة التخزين',
                message: 'تنبيه: ذاكرة المتصفح ممتلئة. يرجى استخدام خيار \'الحفظ على القرص الصلب\' من إدارة البيانات لضمان عدم ضياع البيانات.',
                onConfirm: () => {},
                showCancel: false,
                variant: 'danger'
            });
          }
      }
  }, [fileHandle, accounts, journalEntries, operations, tasks, employees, attendance, payrollEntries, users, priceLists, documents, auditLog, lowBalanceThreshold, dashboardWidgets, lowBalanceLog, currentUser]);

  // Debounced Auto-Save Effect
  useEffect(() => {
      if (!isLoading && isAppDataDirty) {
          const timer = setTimeout(() => {
              saveData();
          }, 2000); 
          return () => clearTimeout(timer);
      }
  }, [saveData, isLoading, isAppDataDirty]);


  // Add conditional confirmation before leaving the page if a form is dirty or data is unsaved
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isFormDirty || isAppDataDirty || (fileHandle && storageStatus === 'unsaved')) {
        event.preventDefault();
        event.returnValue = 'لديك تغييرات غير محفوظة. هل أنت متأكد من رغبتك في المغادرة؟';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isFormDirty, fileHandle, storageStatus]);


  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };
  
  const handleLogout = () => {
    if (isFormDirty) {
        requestConfirmation({
            title: 'تغييرات غير محفوظة',
            message: 'لديك تغييرات غير محفوظة سيتم فقدانها. هل تريد تسجيل الخروج على أي حال؟',
            onConfirm: () => setCurrentUser(null)
        });
    } else {
        setCurrentUser(null);
    }
  };

    // --- Audit Log ---
    const addAuditLogEntry = (logData: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userId' | 'username'>) => {
        if (!currentUser) return;
        const newLogEntry: AuditLogEntry = {
            ...logData,
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            username: currentUser.username,
        };
        setAuditLog(prev => [newLogEntry, ...prev]);
    };

    const getChanges = <T extends {}>(oldObj: T, newObj: T): AuditLogChangeDetail[] => {
        const changes: AuditLogChangeDetail[] = [];
        const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

        allKeys.forEach(key => {
            const oldValue = (oldObj as any)[key];
            const newValue = (newObj as any)[key];
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({
                    field: key,
                    oldValue: String(oldValue ?? ''),
                    newValue: String(newValue ?? ''),
                });
            }
        });
        return changes;
    };


  const updateLowBalanceThreshold = (newThreshold: number) => {
    setLowBalanceThreshold(newThreshold);
    setIsAppDataDirty(true);
  };
  
  const updateDashboardWidgets = (widgets: DashboardWidgets) => {
    setDashboardWidgets(widgets);
    setIsAppDataDirty(true);
  };
  
    const addLowBalanceRecord = (record: Omit<LowBalanceRecord, 'id' | 'date'>) => {
        const newRecord: LowBalanceRecord = {
            ...record,
            id: uuidv4(),
            date: new Date().toISOString(),
        };
        const lastLog = lowBalanceLog[0];
        if (lastLog) {
            const isDuplicate = lastLog.accounts.length === newRecord.accounts.length &&
                                lastLog.accounts.every((acc, i) => acc.name === newRecord.accounts[i].name);
            if (isDuplicate) return;
        }

        setLowBalanceLog(prev => [newRecord, ...prev]);
    };

    const clearLowBalanceLog = () => {
        requestConfirmation({
            title: 'مسح سجل التنبيهات',
            message: 'هل أنت متأكد من رغبتك في مسح جميع تنبيهات الرصيد المنخفض السابقة؟ لا يمكن التراجع عن هذا الإجراء.',
            onConfirm: () => setLowBalanceLog([]),
        });
    };


  // --- Data CRUD functions ---
    const addAccount = (account: Omit<Account, 'id'>) => {
        const assetAccounts = accounts.filter(a => a.id.startsWith('1'));
        const maxId = Math.max(0, ...assetAccounts.map(a => parseInt(a.id, 10)));
        const newId = (Math.floor(maxId / 10) * 10 + 10).toString();

        const newAccount: Account = {
            ...account,
            id: newId,
            type: 'Asset',
            isBankOrCash: true,
        };
        
        setAccounts(prev => [...prev, newAccount]);
        setIsAppDataDirty(true);
        addAuditLogEntry({ action: 'create', entityType: 'Account', entityId: newAccount.id, entityDescription: newAccount.name });
    };

    const addGeneralAccount = (accountData: Omit<Account, 'id'>) => {
        const getPrefix = (type: AccountType): string => {
            switch (type) {
                case 'Asset': return '1';
                case 'Liability': return '2';
                case 'Equity': return '3';
                case 'Revenue': return '4';
                case 'Expense': return '5';
                default: return '9'; 
            }
        };

        const prefix = getPrefix(accountData.type);
        const siblingAccounts = accounts.filter(a => a.id.startsWith(prefix));
        const maxId = Math.max(0, ...siblingAccounts.map(a => parseInt(a.id, 10)));
        
        let newIdNumber = (Math.floor(maxId / 10) * 10) + 10;
        if (newIdNumber <= maxId) {
             newIdNumber = maxId + (10 - (maxId % 10)); 
             if(newIdNumber <= maxId) newIdNumber += 10;
        }
        
        while (accounts.some(a => a.id === newIdNumber.toString())) {
            newIdNumber += 10;
        }
        
        const newId = newIdNumber.toString();
        const newAccount: Account = { ...accountData, id: newId };
        setAccounts(prev => [...prev, newAccount].sort((a, b) => a.id.localeCompare(b.id)));
        setIsAppDataDirty(true);
        addAuditLogEntry({ action: 'create', entityType: 'Account', entityId: newAccount.id, entityDescription: newAccount.name });
    };

    const addCustomer = (customerData: Omit<Account, 'id' | 'type'>) => {
        const customerAccounts = accounts.filter(a => a.id.startsWith('12'));
        const maxId = Math.max(0, ...customerAccounts.map(a => parseInt(a.id, 10)));
        const newId = (maxId > 0 ? maxId + 10 : 1210).toString();

        const newCustomer: Account = {
            ...customerData,
            id: newId,
            type: 'Asset',
            name: `العملاء - ${customerData.name}`,
        };
        
        setAccounts(prev => [...prev, newCustomer]);
        setIsAppDataDirty(true);
        addAuditLogEntry({ action: 'create', entityType: 'Account', entityId: newCustomer.id, entityDescription: newCustomer.name });
    };

  const updateAccount = (updatedAccount: Account) => {
    const oldAccount = accounts.find(acc => acc.id === updatedAccount.id);
    setAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
    setIsAppDataDirty(true);

    if (oldAccount) {
        const changes = getChanges(oldAccount, updatedAccount);
        if (changes.length > 0) {
            addAuditLogEntry({
                action: 'update',
                entityType: 'Account',
                entityId: updatedAccount.id,
                entityDescription: updatedAccount.name,
                changes,
            });
        }
    }
  };

  const deleteAccount = (id: string) => {
      const reasons: string[] = [];
      const isUsedInJournal = journalEntries.some(je => je.lines.some(l => l.accountId === id));
      if (isUsedInJournal) reasons.push('حركات محاسبية (قيود يومية)');
      const isUsedInOperations = operations.some(op => op.clientId === id);
      if (isUsedInOperations) reasons.push('عمليات (شحن/تخليص)');
      const isUsedInPriceList = priceLists.some(pl => pl.customerId === id);
      if (isUsedInPriceList) reasons.push('قوائم أسعار');
      const isUsedInDocuments = documents.some(doc => doc.linkedToId === id);
      if (isUsedInDocuments) reasons.push('مستندات مرفقة');

      if (reasons.length > 0) {
        requestConfirmation({
            title: 'لا يمكن الحذف',
            message: `لا يمكن حذف هذا الحساب لوجود بيانات مرتبطة به: ${reasons.join(' و ')}.`,
            onConfirm: () => {},
            showCancel: false,
            variant: 'danger'
        });
        return;
      }
      
      const accountToDelete = accounts.find(acc => acc.id === id);
      if (!accountToDelete) return;

      requestConfirmation({
        title: 'تأكيد الحذف',
        message: `هل أنت متأكد من حذف الحساب "${accountToDelete?.name}"؟ سيتم حذفه بشكل نهائي.`,
        onConfirm: () => {
            setAccounts(prev => prev.filter(acc => acc.id !== id));
            setIsAppDataDirty(true);
            addAuditLogEntry({ action: 'delete', entityType: 'Account', entityId: accountToDelete.id, entityDescription: accountToDelete.name });
        }
      });
    };
  
  const addJournalEntry = (entry: Omit<JournalEntry, 'id'>, options?: { suppressSuggestion?: boolean }): Promise<string> => {
    return new Promise((resolve) => {
        const newTotalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
        const potentialDuplicate = journalEntries.find(je => {
            const existingTotalDebit = je.lines.reduce((sum, line) => sum + line.debit, 0);
            const isDateMatch = je.date === entry.date;
            const isAmountMatch = Math.abs(existingTotalDebit - newTotalDebit) < 0.01;
            const isDescriptionMatch = je.description.trim().toLowerCase() === entry.description.trim().toLowerCase();
            const isReferenceMatch = (entry.referenceNumber && je.referenceNumber)
                ? je.referenceNumber.trim().toLowerCase() === entry.referenceNumber.trim().toLowerCase()
                : false;

            return isDateMatch && isAmountMatch && (isDescriptionMatch || isReferenceMatch);
        });

        const postEntry = () => {
            const newId = uuidv4();
            const newEntry = { ...entry, id: newId };
            setJournalEntries(prev => [...prev, newEntry]);
            setIsAppDataDirty(true);
            
            if (!options?.suppressSuggestion) {
                const textToSearch = `${newEntry.description} ${newEntry.referenceNumber || ''}`.toLowerCase();
                const potentialOp = operations.find(op => 
                    !op.journalEntryId && 
                    (
                        (op.code && textToSearch.includes(op.code.toLowerCase())) ||
                        (op.billOfLading && op.billOfLading.length > 4 && textToSearch.includes(op.billOfLading.toLowerCase())) ||
                        (op.containerNumber && op.containerNumber.length > 4 && textToSearch.includes(op.containerNumber.toLowerCase()))
                    )
                );

                if (potentialOp) {
                    setTimeout(() => {
                        requestConfirmation({
                            title: 'اقتراح ربط تلقائي',
                            message: `يبدو أن هذا القيد يتعلق بالعملية رقم "${potentialOp.code}". هل تريد ربطهما معاً؟`,
                            onConfirm: () => linkOperationToJournalEntry(potentialOp.id, newEntry.id),
                            variant: 'primary'
                        });
                    }, 100);
                }
            }
            resolve(newEntry.id);
        };

        if (potentialDuplicate && !options?.suppressSuggestion) {
            requestConfirmation({
                title: 'تنبيه: قيد مشابه موجود',
                message: `تم العثور على قيد يومية مشابه بتاريخ ${potentialDuplicate.date} وبنفس المبلغ. (الوصف: ${potentialDuplicate.description}). هل تريد تكرار إضافة القيد؟`,
                onConfirm: postEntry,
                variant: 'primary',
            });
        } else {
            postEntry();
        }
    });
  };

  const addOperation = (operation: Omit<Operation, 'id'>) => {
     const potentialDuplicate = operations.find(op => 
        op.creationDate === operation.creationDate &&
        op.clientId === operation.clientId &&
        op.description.trim().toLowerCase() === operation.description.trim().toLowerCase()
    );

    const createOperation = () => {
        const newOperation: Operation = {
            ...operation,
            id: uuidv4(),
            statusHistory: [{
                status: operation.status,
                timestamp: new Date().toISOString(),
                userId: currentUser!.id,
                username: currentUser!.username,
            }]
        };
        setOperations(prev => [...prev, newOperation]);
        setIsAppDataDirty(true);
    };

    if (potentialDuplicate) {
        requestConfirmation({
            title: 'تنبيه: عملية مشابهة موجودة',
            message: 'تم العثور على عملية مشابهة لنفس العميل في نفس اليوم وبنفس الوصف. هل أنت متأكد من أنك تريد إنشاء هذه العملية الجديدة؟',
            onConfirm: createOperation,
            variant: 'primary'
        });
    } else {
        createOperation();
    }
  };

  const updateOperation = (updatedOperation: Operation) => {
    const originalOperation = operations.find(op => op.id === updatedOperation.id);
    if (!originalOperation) return;

    let operationToSave = { ...updatedOperation };
    if (originalOperation.status !== operationToSave.status && currentUser) {
        const newHistoryEntry: OperationStatusHistory = {
            status: operationToSave.status,
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            username: currentUser.username,
        };
        operationToSave.statusHistory = [...(operationToSave.statusHistory || []), newHistoryEntry];
    }
    
    setOperations(prev => prev.map(op => op.id === operationToSave.id ? operationToSave : op));
    setIsAppDataDirty(true);

    if (originalOperation.status !== 'completed' && operationToSave.status === 'completed' && !operationToSave.journalEntryId) {
        setTimeout(() => {
            const linkedJournalIds = new Set(operations.map(op => op.journalEntryId).filter(Boolean));
            const searchTerms = [operationToSave.code, operationToSave.billOfLading, operationToSave.containerNumber].filter(t => t && t.length > 4).map(t => t!.toLowerCase());
            const potentialJournalEntry = journalEntries.find(je => {
                if (linkedJournalIds.has(je.id)) return false;
                const text = `${je.description} ${je.referenceNumber || ''}`.toLowerCase();
                return searchTerms.some(term => text.includes(term));
            });
            
            if (potentialJournalEntry) {
                requestConfirmation({
                    title: 'اقتراح ربط قيد يومية',
                    message: `تم إكمال العملية ${operationToSave.code}. وجدنا قيد يومية قد يكون مرتبطاً بها (الوصف: "${potentialJournalEntry.description}"). هل تريد ربطهما معاً؟`,
                    variant: 'primary',
                    onConfirm: () => linkOperationToJournalEntry(operationToSave.id, potentialJournalEntry.id)
                });
            } else {
                const client = accounts.find(a => a.id === operationToSave.clientId);
                const lineItems = operationToSave.lineItems || [];
                if (client && lineItems.length > 0) {
                    const revenueAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
                    let vatAmount = 0;
                    let scheduleTaxAmount = 0;
                    lineItems.forEach(item => {
                        if (item.taxType === 'vat') vatAmount += item.amount * 0.14;
                        if (item.taxType === 'schedule') scheduleTaxAmount += item.amount * 0.10;
                    });
                    const totalReceivable = revenueAmount + vatAmount + scheduleTaxAmount;
                    if (totalReceivable > 0) {
                        let revenueAccountId = '4010'; 
                        if (operationToSave.type === 'import' || operationToSave.type === 'export') revenueAccountId = '4020';
                        requestConfirmation({
                            title: 'إنشاء قيد إيراد (مسودة)',
                            message: `لم يتم العثور على قيد مرتبط. هل تريد إنشاء قيد إيراد مسودة بقيمة ${totalReceivable.toLocaleString()}؟`,
                            variant: 'primary',
                            onConfirm: async () => {
                                const lines = [
                                    { accountId: client.id, debit: totalReceivable, credit: 0 },
                                    { accountId: revenueAccountId, debit: 0, credit: revenueAmount } 
                                ];
                                if (vatAmount > 0) lines.push({ accountId: '2140', debit: 0, credit: vatAmount });
                                if (scheduleTaxAmount > 0) lines.push({ accountId: '2150', debit: 0, credit: scheduleTaxAmount });
                                
                                const newId = await addJournalEntry({
                                    date: new Date().toISOString().split('T')[0],
                                    description: `استحقاق إيراد عملية ${operationToSave.code} [مسودة]`,
                                    referenceNumber: operationToSave.code,
                                    transactionType: 'invoice',
                                    lines: lines
                                }, { suppressSuggestion: true });
                                linkOperationToJournalEntry(operationToSave.id, newId);
                            }
                        });
                    }
                }
            }
        }, 100);
    }
  };

  const deleteOperation = (id: string) => {
    const operationToDelete = operations.find(op => op.id === id);
    requestConfirmation({
        title: 'تأكيد الحذف',
        message: `هل أنت متأكد من حذف العملية رقم "${operationToDelete?.code}"؟ سيتم حذف أي مستندات مرفقة بها أيضاً.`,
        onConfirm: () => {
            setOperations(prev => prev.filter(op => op.id !== id));
            setDocuments(prev => prev.filter(doc => doc.linkedToId !== id)); 
            setIsAppDataDirty(true);
        }
    });
  };

  const linkOperationToJournalEntry = (operationId: string, journalEntryId: string) => {
    const operation = operations.find(op => op.id === operationId);
    const journalEntry = journalEntries.find(je => je.id === journalEntryId);
    if (!operation || !journalEntry) return;

    const updatedOperation = { ...operation, journalEntryId };
    setOperations(prev => prev.map(op => op.id === operationId ? updatedOperation : op));
    if (!journalEntry.referenceNumber) {
        const updatedJournalEntry = { ...journalEntry, referenceNumber: operation.code };
        setJournalEntries(prev => prev.map(je => je.id === journalEntryId ? updatedJournalEntry : je));
    }
    setIsAppDataDirty(true);
  };

  const MAX_FILE_SIZE = 2 * 1024 * 1024;
  const addDocument = (file: File, linkedToId: string, linkedToType: 'account' | 'operation'): Promise<void> => {
      return new Promise((resolve, reject) => {
          if (file.size > MAX_FILE_SIZE) {
              const errorMsg = `حجم الملف يتجاوز الحد المسموح به (2 ميجابايت).`;
            requestConfirmation({
                title: 'خطأ',
                message: errorMsg,
                onConfirm: () => {},
                showCancel: false,
                variant: 'danger'
            });
              reject(new Error(errorMsg));
              return;
          }
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
              const newDocument: Document = {
                  id: uuidv4(), name: file.name, type: file.type, size: file.size, data: reader.result as string, linkedToId: linkedToId, linkedToType: linkedToType, uploadDate: new Date().toISOString(),
              };
              setDocuments(prev => [...prev, newDocument]);
              setIsAppDataDirty(true);
              resolve();
          };
          reader.onerror = (error) => reject(error);
      });
  };

  const deleteDocument = (id: string) => {
      requestConfirmation({
          title: 'تأكيد حذف المستند',
          message: 'هل أنت متأكد من حذف هذا المستند؟',
          onConfirm: () => {
              setDocuments(prev => prev.filter(doc => doc.id !== doc.id));
              setIsAppDataDirty(true);
          }
      });
  };

  const linkExistingDocuments = (documentsToLink: Document[], linkedToId: string, linkedToType: 'account' | 'operation') => {
    const newDocuments: Document[] = documentsToLink.map(doc => ({
        id: uuidv4(), name: doc.name, type: doc.type, size: doc.size, data: doc.data, uploadDate: new Date().toISOString(), linkedToId: linkedToId, linkedToType: linkedToType,
    }));
    setDocuments(prev => [...prev, ...newDocuments]);
    setIsAppDataDirty(true);
  };

  const addTask = (text: string, date: string) => {
    setTasks(prev => [...prev, { id: uuidv4(), text, date, completed: false }]);
    setIsAppDataDirty(true);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
    setIsAppDataDirty(true);
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
    setIsAppDataDirty(true);
  };
  
  const addEmployee = (employee: Omit<Employee, 'id'>) => {
    setEmployees(prev => [...prev, { ...employee, id: uuidv4() }]);
    setIsAppDataDirty(true);
  };

  const updateEmployee = (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
    setIsAppDataDirty(true);
  };

  const deleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
    setIsAppDataDirty(true);
  };

  const updateAttendance = (date: string, employeeId: string, status: AttendanceStatus) => {
    setAttendance(prev => {
        const newAttendance = { ...prev };
        if (!newAttendance[date]) newAttendance[date] = {};
        newAttendance[date][employeeId] = status;
        return newAttendance;
    });
    setIsAppDataDirty(true);
  };

    const addPayrollEntry = (entry: Omit<PayrollEntry, 'id'>) => {
        setPayrollEntries(prev => [...prev, { ...entry, id: uuidv4() }]);
        setIsAppDataDirty(true);
      };
    
      const updatePayrollEntry = (updatedEntry: PayrollEntry) => {
        setPayrollEntries(prev => prev.map(p => p.id === updatedEntry.id ? updatedEntry : p));
        setIsAppDataDirty(true);
      };
    
      const deletePayrollEntry = (id: string) => {
        setPayrollEntries(prev => prev.filter(p => p.id !== id));
        setIsAppDataDirty(true);
      };
    
    const addPriceList = (priceList: Omit<PriceList, 'id'>) => {
        setPriceLists(prev => [...prev, { ...priceList, id: uuidv4() }]);
        setIsAppDataDirty(true);
    };
    
    const updatePriceList = (updatedPriceList: PriceList) => {
        setPriceLists(prev => prev.map(pl => pl.id === updatedPriceList.id ? updatedPriceList : pl));
        setIsAppDataDirty(true);
    };

    const deletePriceList = (id: string) => {
        setPriceLists(prev => prev.filter(pl => pl.id !== id));
        setIsAppDataDirty(true);
    };

  const addUser = (user: Omit<User, 'id'>) => {
    const newUser = { ...user, id: uuidv4() };
    setUsers(prev => [...prev, newUser]);
    setIsAppDataDirty(true);
    addAuditLogEntry({ action: 'create', entityType: 'User', entityId: newUser.id, entityDescription: newUser.username });
  };

  const updateUser = (updatedUser: User) => {
    const oldUser = users.find(u => u.id === updatedUser.id);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);
    setIsAppDataDirty(true);

    if (oldUser) {
        const changes = getChanges(oldUser, updatedUser);
        const filteredChanges = changes.filter(c => c.field !== 'password');
        if (filteredChanges.length > 0) {
            addAuditLogEntry({
                action: 'update',
                entityType: 'User',
                entityId: updatedUser.id,
                entityDescription: updatedUser.username,
                changes: filteredChanges,
            });
        }
    }
  };

  const deleteUser = (id: string) => {
    if (currentUser?.id === id) return;
    const userToDelete = users.find(u => u.id === id);
    if (!userToDelete) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    setIsAppDataDirty(true);
    addAuditLogEntry({ action: 'delete', entityType: 'User', entityId: userToDelete.id, entityDescription: userToDelete.username });
  };
  
  const handleRestoreData = (data: any, selections: Record<string, boolean>) => {
    const setters: Record<string, (d: any) => void> = {
        accounts: setAccounts, journalEntries: setJournalEntries, operations: setOperations, priceLists: setPriceLists, documents: setDocuments, tasks: setTasks, employees: setEmployees, attendance: setAttendance, payrollEntries: setPayrollEntries, users: setUsers, lowBalanceLog: setLowBalanceLog, auditLog: setAuditLog,
    };
    for (const key in selections) {
        if (selections[key] && data[key] && setters[key]) setters[key](data[key]);
    }
    if (data.lowBalanceThreshold) setLowBalanceThreshold(data.lowBalanceThreshold);
    if (data.dashboardWidgets) setDashboardWidgets(data.dashboardWidgets);
    setIsAppDataDirty(true);
    return true;
  };

 const handleDataReset = () => {
    setAccounts(MOCK_ACCOUNTS); setUsers(MOCK_USERS); setEmployees(INITIAL_EMPLOYEES); setPriceLists(MOCK_PRICE_LISTS);
    setJournalEntries([]); setOperations([]); setTasks([]); setAttendance({}); setPayrollEntries([]); setDocuments([]);
    setLowBalanceThreshold(5000); setLowBalanceLog([]); setAuditLog([]); 
    setFileName('ملف محلي (LocalStorage)'); setFileHandle(null); setStorageStatus('browser'); setIsFormDirty(false); setIsAppDataDirty(false); setCurrentUser(null);
  };

  const handleNewDocument = () => {
    setJournalEntries([]); setOperations([]); setTasks([]); setAttendance({}); setPayrollEntries([]); setLowBalanceLog([]); setDocuments([]); setAuditLog([]);
    setFileName('ملف جديد'); setFileHandle(null); setStorageStatus('browser'); setIsFormDirty(false); setIsAppDataDirty(false);
  };

  const handleConnectLocalFile = async () => {
      try {
          if (!('showOpenFilePicker' in window)) return;
          const [handle] = await (window as any).showOpenFilePicker({ types: [{ description: 'ملفات بيانات JSON', accept: { 'application/json': ['.json'] } }], multiple: false });
          const file = await handle.getFile();
          const data = JSON.parse(await file.text());
          const allSelections = Object.keys(data).reduce((acc, key) => ({ ...acc, [key]: true }), {});
          if (handleRestoreData(data, allSelections)) {
              setFileHandle(handle); setFileName(file.name); setStorageStatus('disk'); setLastSavedTime(new Date()); setIsFormDirty(false); setIsAppDataDirty(false);
          }
      } catch (err: any) {}
  };

  const handleCreateLocalFile = async () => {
        try {
            if (!('showSaveFilePicker' in window)) return;
            const handle = await (window as any).showSaveFilePicker({ suggestedName: `Accounting_Data_${new Date().toISOString().split('T')[0]}.json`, types: [{ description: 'ملف بيانات JSON', accept: { 'application/json': ['.json'] } }] });
            setFileHandle(handle); setFileName(handle.name); setStorageStatus('disk');
            const allData = { accounts, journalEntries, operations, tasks, employees, attendance, payrollEntries, users, priceLists, documents, auditLog, lowBalanceThreshold, dashboardWidgets, lowBalanceLog };
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(allData, null, 2));
            await writable.close();
            setLastSavedTime(new Date()); setIsFormDirty(false); setIsAppDataDirty(false);
        } catch (err: any) {}
  };

  const handleOpenFile = () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json,application/json'; input.style.display = 'none';
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = JSON.parse(e.target?.result as string);
                const allSelections = Object.keys(data).reduce((acc, key) => ({ ...acc, [key]: true }), {});
                if (handleRestoreData(data, allSelections)) {
                    setFileName(file.name); setFileHandle(null); setStorageStatus('browser'); setIsFormDirty(false); setIsAppDataDirty(true);
                }
            };
            reader.readAsText(file);
        };
        document.body.appendChild(input); input.click(); document.body.removeChild(input);
  };
  
  const handleSaveFile = (saveAs = false) => {
    const allData = { accounts, journalEntries, operations, tasks, employees, attendance, payrollEntries, users, priceLists, documents, auditLog };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName === 'ملف محلي (LocalStorage)' ? `محاسبة-${new Date().toISOString().split('T')[0]}.json` : fileName;
    link.href = url; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    if (storageStatus === 'browser') setIsAppDataDirty(false);
  };

  const handleExportData = () => {
    const allData = { accounts, journalEntries, operations, tasks, employees, attendance, payrollEntries, users, priceLists, documents, auditLog, lowBalanceThreshold, dashboardWidgets, lowBalanceLog };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `accounting_export_${new Date().toISOString().split('T')[0]}.json`;
    link.href = url; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const handleImportCsv = (csvString: string, dataType: 'accounts') => {
    const lines = csvString.trim().split(/\r?\n/);
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const newAccounts: Account[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const rowData: any = {};
        headers.forEach((header, index) => rowData[header] = values[index]?.trim().replace(/"/g, '') || '');
        if (!rowData.id || !rowData.name || !rowData.type || accounts.some(acc => acc.id === rowData.id)) continue;
        newAccounts.push({
            id: rowData.id, name: rowData.name, type: rowData.type as AccountType, openingBalance: parseFloat(rowData.openingbalance) || 0, notes: rowData.notes || '', currency: rowData.currency || 'EGP', isBankOrCash: rowData.isbankorcash === 'true', category: rowData.category as 'safe' | 'bank' || undefined, currencyType: rowData.currencytype as 'local' | 'foreign' || undefined, conversionRate: parseFloat(rowData.conversionrate) || undefined, country: rowData.country || '', accountNumber: rowData.accountnumber || '', email: rowData.email || '', phone: rowData.phone || '', address: rowData.address || '', taxNumber: rowData.taxnumber || '', bankName: rowData.bankname || '', bankAccountNumber: rowData.bankaccountnumber || '', bankCurrency: rowData.bankcurrency || '',
        });
    }
    if (newAccounts.length > 0) {
        setAccounts(prev => [...prev, ...newAccounts].sort((a,b) => a.id.localeCompare(b.id)));
        setIsAppDataDirty(true);
    }
  };

  if (isLoading) return <ThemeProvider><LoadingScreen /></ThemeProvider>;
  if (!currentUser) return <ThemeProvider><Login onLogin={handleLogin} users={users} /></ThemeProvider>;

  return (
    <ThemeProvider>
        <ChartStyleProvider>
        <ConfirmationDialog 
          isOpen={confirmation.isOpen} 
          title={confirmation.title} 
          message={confirmation.message} 
          onConfirm={confirmation.onConfirm} 
          onCancel={handleCancelConfirmation} 
          confirmVariant={confirmation.confirmVariant}
          showCancel={confirmation.showCancel}
        />
        <Layout currentUser={currentUser} accounts={accounts} journalEntries={journalEntries} operations={operations} priceLists={priceLists} documents={documents} tasks={tasks} employees={employees} attendance={attendance} payrollEntries={payrollEntries} users={users} lowBalanceThreshold={lowBalanceThreshold} dashboardWidgets={dashboardWidgets} lowBalanceLog={lowBalanceLog} auditLog={auditLog} onLogout={handleLogout} addJournalEntry={addJournalEntry} addAccount={addAccount} addGeneralAccount={addGeneralAccount} addCustomer={addCustomer} updateAccount={updateAccount} deleteAccount={deleteAccount} addOperation={addOperation} updateOperation={updateOperation} deleteOperation={deleteOperation} linkOperationToJournalEntry={linkOperationToJournalEntry} addPriceList={addPriceList} updatePriceList={updatePriceList} deletePriceList={deletePriceList} addDocument={addDocument} deleteDocument={deleteDocument} linkExistingDocuments={linkExistingDocuments} addTask={addTask} toggleTask={toggleTask} removeTask={removeTask} addEmployee={addEmployee} updateEmployee={updateEmployee} deleteEmployee={deleteEmployee} updateAttendance={updateAttendance} addPayrollEntry={addPayrollEntry} updatePayrollEntry={updatePayrollEntry} deletePayrollEntry={deletePayrollEntry} addUser={addUser} updateUser={updateUser} deleteUser={deleteUser} updateLowBalanceThreshold={updateLowBalanceThreshold} updateDashboardWidgets={updateDashboardWidgets} addLowBalanceRecord={addLowBalanceRecord} clearLowBalanceLog={clearLowBalanceLog} handleDataReset={handleDataReset} handleExportData={handleExportData} handleImportCsv={handleImportCsv} isFormDirty={isFormDirty} setIsFormDirty={setIsFormDirty} requestConfirmation={requestConfirmation} fileName={fileName} storageStatus={storageStatus} lastSavedTime={lastSavedTime} handleNewDocument={handleNewDocument} handleOpenFile={handleOpenFile} handleSaveFile={handleSaveFile} handleConnectLocalFile={handleConnectLocalFile} handleCreateLocalFile={handleCreateLocalFile} />
        </ChartStyleProvider>
    </ThemeProvider>
  );
}

export default App;
