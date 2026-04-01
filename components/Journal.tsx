
import React, { useState, useMemo, useEffect } from 'react';
import { JournalEntry, JournalEntryLine, Account, TransactionType, User, Document, PriceList, Operation } from '../types.ts';
import { Plus, X, Printer, AlertTriangle, ArrowRight, Receipt, Filter, XCircle, Globe, ChevronDown, CreditCard, Search, Ship } from 'lucide-react';
import { canPerformAction } from '../permissions.ts';
import AccountLedger from './AccountLedger.tsx';
import Voucher from './Voucher.tsx';
import { AccountDetailView } from './AccountDetailView.tsx';


interface JournalProps {
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id'>, options?: { suppressSuggestion?: boolean }) => Promise<string>;
  accounts: Account[];
  currentUser: User;
  setIsFormDirty: (isDirty: boolean) => void;
  prefilledJournalLine: Partial<JournalEntryLine> | null;
  clearPrefill: () => void;
  onAccountClick: (account: Account) => void; // New prop for navigation
  operations: Operation[];
  onNavigateToOperation: (operation: Operation) => void;
  requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger' }) => void;
}

const NewEntryForm: React.FC<{ addJournalEntry: (entry: Omit<JournalEntry, 'id'>, options?: { suppressSuggestion?: boolean }) => Promise<string>; accounts: Account[]; journalEntries: JournalEntry[]; setIsFormDirty: (isDirty: boolean) => void; prefilledJournalLine: Partial<JournalEntryLine> | null; clearPrefill: () => void; requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger' }) => void; }> = ({ addJournalEntry, accounts, journalEntries, setIsFormDirty, prefilledJournalLine, clearPrefill, requestConfirmation }) => {
    // Common fields
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [transactionType, setTransactionType] = useState<TransactionType>('general');
    const [error, setError] = useState('');
    const [hasChanged, setHasChanged] = useState(false);

    // State for General Entry
    const [lines, setLines] = useState<Partial<JournalEntryLine>[]>([
        { accountId: '', debit: 0, credit: 0, amountForeign: 0, currency: 'EGP', conversionRate: 1 },
        { accountId: '', debit: 0, credit: 0, amountForeign: 0, currency: 'EGP', conversionRate: 1 },
    ]);
    
    // State for Simplified Entries
    const [amount, setAmount] = useState<number>(0);
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [isForeignCurrency, setIsForeignCurrency] = useState(false);
    const [foreignCurrency, setForeignCurrency] = useState('USD');
    const [conversionRate, setConversionRate] = useState(1);
    
    // State for Check Details
    const [showCheckDetails, setShowCheckDetails] = useState(false);
    const [checkNumber, setCheckNumber] = useState('');
    const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);


    useEffect(() => {
        setIsFormDirty(hasChanged);
        // Cleanup: Reset dirty state when component unmounts or navigation happens
        return () => setIsFormDirty(false);
    }, [hasChanged, setIsFormDirty]);

     useEffect(() => {
        if (prefilledJournalLine) {
            setTransactionType('general'); // Force general entry for flexibility
            setLines(prevLines => {
                const newLines = [...prevLines];
                newLines[0] = { ...newLines[0], ...prefilledJournalLine }; 
                return newLines;
            });
            // Do not set hasChanged(true) here. 
            // Prefilling is an initialization step, not a user modification of an existing form state.
            // The form will become dirty once the user starts typing or changing values.
            clearPrefill(); 
        }
    }, [prefilledJournalLine, clearPrefill]);

    // Filtered account lists for simplified forms
    const customerAccounts = accounts.filter(acc => acc.type === 'Asset' && acc.name.startsWith('العملاء'));
    const cashAndBankAccounts = accounts.filter(acc => acc.isBankOrCash);
    const payableToAccounts = accounts.filter(acc => ['Asset', 'Liability', 'Expense'].includes(acc.type) && !acc.isBankOrCash);
    
    // Auto-detect if a simplified transaction should be foreign currency
    useEffect(() => {
        const fromAccount = accounts.find(a => a.id === fromAccountId);
        const toAccount = accounts.find(a => a.id === toAccountId);
        const foreignAccount = transactionType === 'receipt' ? toAccount : fromAccount; // The cash/bank account determines currency
        
        if (foreignAccount?.currencyType === 'foreign' && foreignAccount.currency) {
            setIsForeignCurrency(true);
            setForeignCurrency(foreignAccount.currency);
            setConversionRate(foreignAccount.conversionRate || 1);
        } else {
            setIsForeignCurrency(false);
            setForeignCurrency('USD');
            setConversionRate(1);
        }
    }, [fromAccountId, toAccountId, transactionType, accounts]);

    // Show/Hide check details based on transaction type and account selection
    useEffect(() => {
        const fromAccount = accounts.find(a => a.id === fromAccountId);
        const toAccount = accounts.find(a => a.id === toAccountId);
        const isBankTransaction = fromAccount?.category === 'bank' || toAccount?.category === 'bank';
        const isPaymentOrReceipt = transactionType === 'payment' || transactionType === 'receipt';
        
        setShowCheckDetails(isBankTransaction && isPaymentOrReceipt);
    }, [fromAccountId, toAccountId, transactionType, accounts]);

    // Check sequence suggestion logic
    useEffect(() => {
        // Only suggest for 'payment' from a bank account
        if (transactionType === 'payment' && fromAccountId) {
            const fromAccount = accounts.find(a => a.id === fromAccountId);
            if (fromAccount?.category === 'bank') {
                const latestCheckEntry = journalEntries
                    .filter(je => 
                        je.transactionType === 'payment' &&
                        je.lines.some(l => l.accountId === fromAccountId && l.credit > 0) &&
                        je.checkDetails?.checkNumber
                    )
                    .sort((a, b) => {
                        if (a.date > b.date) return -1;
                        if (a.date < b.date) return 1;
                        const numA = parseInt(a.checkDetails!.checkNumber!, 10);
                        const numB = parseInt(b.checkDetails!.checkNumber!, 10);
                        if (!isNaN(numA) && !isNaN(numB)) {
                            return numB - numA;
                        }
                        return 0;
                    })[0];

                if (latestCheckEntry && latestCheckEntry.checkDetails?.checkNumber) {
                    const lastCheckNum = parseInt(latestCheckEntry.checkDetails.checkNumber, 10);
                    if (!isNaN(lastCheckNum)) {
                        const nextCheckNumStr = (lastCheckNum + 1).toString();
                        const originalLength = latestCheckEntry.checkDetails.checkNumber.length;
                        if (originalLength > nextCheckNumStr.length) {
                             setCheckNumber(nextCheckNumStr.padStart(originalLength, '0'));
                        } else {
                            setCheckNumber(nextCheckNumStr);
                        }
                    }
                } else {
                    setCheckNumber('');
                }
            } else {
                setCheckNumber('');
            }
        } else {
            setCheckNumber('');
        }
    }, [fromAccountId, transactionType, accounts, journalEntries]);


    // EFFECT TO AUTO-SELECT 'FROM' ACCOUNT BASED ON LINK
    useEffect(() => {
        if (transactionType === 'payment' && toAccountId) {
            const targetAccount = accounts.find(acc => acc.id === toAccountId);
            if (targetAccount?.linkedAccountId) {
                // Check if the linked account is a valid "from" account
                if (cashAndBankAccounts.some(c => c.id === targetAccount.linkedAccountId)) {
                    setFromAccountId(targetAccount.linkedAccountId);
                    // No need to setHasChanged(true) here as it's triggered by the user selecting toAccountId
                }
            }
        }
    }, [toAccountId, transactionType, accounts, cashAndBankAccounts]);


    const resetAllForms = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setReferenceNumber('');
        setError('');
        // Reset general
        setLines([
            { accountId: '', debit: 0, credit: 0, amountForeign: 0, currency: 'EGP', conversionRate: 1 },
            { accountId: '', debit: 0, credit: 0, amountForeign: 0, currency: 'EGP', conversionRate: 1 },
        ]);
        // Reset simplified
        setAmount(0);
        setFromAccountId('');
        setToAccountId('');
        setIsForeignCurrency(false);
        setForeignCurrency('USD');
        setConversionRate(1);
        // Reset check details
        setCheckNumber('');
        setCheckDate(new Date().toISOString().split('T')[0]);
        setShowCheckDetails(false);
        setHasChanged(false);
    };

    const handleTransactionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        resetAllForms(); // Reset forms when type changes
        setTransactionType(e.target.value as TransactionType);
        // Do not set dirty immediately on type change to prevent navigation lock if user changes mind immediately
        // setHasChanged(true); 
    };


    const handleLineChange = (index: number, field: keyof JournalEntryLine | 'debitForeign' | 'creditForeign', value: string | number) => {
        setHasChanged(true);
        const newLines = [...lines];
        let line = { ...newLines[index] };

        // Auto-set currency when account is selected
        if (field === 'accountId') {
            line.accountId = value as string;
            const account = accounts.find(a => a.id === value);
            if (account?.currency && account.currency !== 'EGP') {
                line.currency = account.currency;
                line.conversionRate = account.conversionRate || 1;
            } else {
                line.currency = 'EGP';
                line.conversionRate = 1;
                 // When EGP is selected, the foreign amount should match the egyptian amount
                if (line.debit! > 0) line.amountForeign = line.debit;
                else if (line.credit! > 0) line.amountForeign = line.credit;
            }
        }

        const numValue = Number(value) || 0;
        const isForeign = line.currency !== 'EGP';
        const rate = Number(line.conversionRate) || 1;
        
        if (field === 'debitForeign') {
            line.amountForeign = numValue;
            line.debit = isForeign ? numValue * rate : numValue;
            line.credit = 0;
        } else if (field === 'creditForeign') {
            line.amountForeign = numValue;
            line.credit = isForeign ? numValue * rate : numValue;
            line.debit = 0;
        } else if (field === 'conversionRate') {
            line.conversionRate = numValue;
             if (line.debit! > 0) {
                 line.debit = (line.amountForeign || 0) * numValue;
             }
             else if (line.credit! > 0) {
                 line.credit = (line.amountForeign || 0) * numValue;
             }
        } else if (field === 'currency') {
             line.currency = value as string;
             if (value === 'EGP') {
                line.conversionRate = 1;
                 if (line.amountForeign) {
                    if (line.debit! > 0) line.debit = line.amountForeign;
                    if (line.credit! > 0) line.credit = line.amountForeign;
                 }
                line.amountForeign = undefined;
             }
        } else {
            line = { ...line, [field as keyof JournalEntryLine]: value };
        }

        newLines[index] = line;
        setLines(newLines);
    };

    const addLine = () => {
        setHasChanged(true);
        setLines([...lines, { accountId: '', debit: 0, credit: 0, amountForeign: 0, currency: 'EGP', conversionRate: 1 }]);
    };
    
    const removeLine = (index: number) => {
        if (lines.length > 2) {
            setHasChanged(true);
            const newLines = lines.filter((_, i) => i !== index);
            setLines(newLines);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!description.trim()) {
            setError('الرجاء إدخال وصف للحركة.');
            return;
        }
        
        let finalLines: JournalEntryLine[] = [];

        if (transactionType === 'receipt' || transactionType === 'payment') {
            if (!amount || amount <= 0) { setError('الرجاء إدخال مبلغ صحيح وأكبر من صفر.'); return; }
            if (!fromAccountId || !toAccountId) { setError('الرجاء تحديد الحسابات.'); return; }
            if (isForeignCurrency && (!conversionRate || conversionRate <= 0)) { setError('الرجاء إدخال سعر صرف صحيح.'); return; }

            const egpAmount = isForeignCurrency ? amount * conversionRate : amount;

            const baseProps = isForeignCurrency ? { amountForeign: amount, currency: foreignCurrency, conversionRate } : {};

            if (transactionType === 'receipt') {
                finalLines = [
                    { accountId: toAccountId, debit: egpAmount, credit: 0, ...baseProps },
                    { accountId: fromAccountId, debit: 0, credit: egpAmount, ...baseProps },
                ];
            } else { // payment
                finalLines = [
                    { accountId: toAccountId, debit: egpAmount, credit: 0, ...baseProps },
                    { accountId: fromAccountId, debit: 0, credit: egpAmount, ...baseProps },
                ];
            }
        } else { // 'general'
            const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
            const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

            if (Math.abs(totalDebit - totalCredit) > 0.01) { 
                setError(`القيد غير متوازن. إجمالي المدين (${totalDebit.toFixed(2)}) لا يساوي إجمالي الدائن (${totalCredit.toFixed(2)}). الفرق: ${(totalDebit - totalCredit).toFixed(2)}`); 
                return; 
            }
            if (totalDebit === 0) { setError('لا يمكن أن يكون إجمالي القيد صفراً.'); return; }
            
            finalLines = lines.filter(line => line.accountId && (line.debit || line.credit))
                .map(line => {
                    const isForeign = line.currency !== 'EGP';
                    const amountInLineCurrency = line.debit! > 0 ? line.amountForeign : (line.credit! > 0 ? line.amountForeign : undefined);

                    return {
                        accountId: line.accountId!,
                        debit: line.debit!,
                        credit: line.credit!,
                        amountForeign: isForeign ? amountInLineCurrency : undefined,
                        currency: isForeign ? line.currency : undefined,
                        conversionRate: isForeign ? line.conversionRate : undefined,
                    };
                });

            if (finalLines.length < 2) { setError('يجب أن يحتوي القيد على حسابين على الأقل.'); return; }
        }
        
        const newEntryData: Omit<JournalEntry, 'id'> = { date, description, lines: finalLines, referenceNumber: referenceNumber.trim() || undefined, transactionType };
        if (showCheckDetails && checkNumber) {
            newEntryData.checkDetails = {
                checkNumber: checkNumber,
                checkDate: checkDate,
            };
        }

        await addJournalEntry(newEntryData);
        resetAllForms();
        setTransactionType(transactionType);
    };
    
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    const isPristine = totalDebit === 0 && totalCredit === 0;

    return (
        <div className="bg-primary p-6 rounded-2xl shadow-neumo">
            <h2 className="text-2xl font-bold mb-6 text-text-primary">إضافة حركة محاسبية</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <input type="date" value={date} onChange={e => { setDate(e.target.value); setHasChanged(true); }} required className="p-3 bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary"/>
                    <input type="text" value={description} onChange={e => { setDescription(e.target.value); setHasChanged(true); }} placeholder="وصف الحركة" required className="p-3 bg-primary rounded-xl shadow-neumo-inset-sm lg:col-span-2 text-text-primary placeholder:text-text-secondary/80"/>
                    <input type="text" value={referenceNumber} onChange={e => { setReferenceNumber(e.target.value); setHasChanged(true); }} placeholder="رقم مرجعي (اختياري)" className="p-3 bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary placeholder:text-text-secondary/80"/>
                    <select value={transactionType} onChange={handleTransactionTypeChange} className="p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none font-bold text-text-primary">
                        <option value="general">قيد يومية عام</option>
                        <option value="receipt">سند قبض</option>
                        <option value="payment">سند صرف</option>
                    </select>
                </div>
                
                <hr className="border-primary-dark/20 my-4" />

                {transactionType === 'general' ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead><tr>
                                    <th className="p-2 text-right text-sm font-semibold">الحساب</th>
                                    <th className="p-2 text-center text-sm font-semibold">العملة</th>
                                    <th className="p-2 text-center text-sm font-semibold">سعر الصرف</th>
                                    <th className="p-2 text-center text-sm font-semibold">مدين (عملة السطر)</th>
                                    <th className="p-2 text-center text-sm font-semibold">دائن (عملة السطر)</th>
                                    <th className="p-2 text-center text-sm font-semibold">مدين (مُعادل مصري)</th>
                                    <th className="p-2 text-center text-sm font-semibold">دائن (مُعادل مصري)</th>
                                    <th></th>
                                </tr></thead>
                                <tbody>{lines.map((line, index) => {
                                    const debitInLineCurrency = (line.debit! > 0) ? (line.currency === 'EGP' ? line.debit : line.amountForeign) : '';
                                    const creditInLineCurrency = (line.credit! > 0) ? (line.currency === 'EGP' ? line.credit : line.amountForeign) : '';

                                    return (
                                        <tr key={index} className="space-y-2">
                                            <td><select value={line.accountId} onChange={e => handleLineChange(index, 'accountId', e.target.value)} required className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none text-text-primary"><option value="">اختر حساب</option>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.id} - {acc.name}</option>)}</select></td>
                                            <td><input type="text" value={line.currency || ''} onChange={e => handleLineChange(index, 'currency', e.target.value)} className="w-20 p-2 text-center bg-primary rounded-lg shadow-neumo-inset-sm text-text-primary"/></td>
                                            <td><input type="number" step="0.01" value={line.conversionRate || ''} onChange={e => handleLineChange(index, 'conversionRate', e.target.value)} disabled={line.currency === 'EGP'} className="w-24 p-2 text-center bg-primary rounded-lg shadow-neumo-inset-sm disabled:bg-primary-dark/20 text-text-primary"/></td>
                                            <td><input type="number" step="0.01" value={debitInLineCurrency || ''} onChange={e => handleLineChange(index, 'debitForeign', e.target.value)} disabled={line.credit! > 0} className="w-32 p-2 text-center bg-primary rounded-lg shadow-neumo-inset-sm text-text-primary"/></td>
                                            <td><input type="number" step="0.01" value={creditInLineCurrency || ''} onChange={e => handleLineChange(index, 'creditForeign', e.target.value)} disabled={line.debit! > 0} className="w-32 p-2 text-center bg-primary rounded-lg shadow-neumo-inset-sm text-text-primary"/></td>
                                            <td><input type="number" step="0.01" value={line.debit || ''} readOnly className="w-32 p-2 text-center bg-primary-dark/20 rounded-lg shadow-neumo-inset-sm font-bold text-text-primary"/></td>
                                            <td><input type="number" step="0.01" value={line.credit || ''} readOnly className="w-32 p-2 text-center bg-primary-dark/20 rounded-lg shadow-neumo-inset-sm font-bold text-text-primary"/></td>
                                            <td><button type="button" onClick={() => removeLine(index)} disabled={lines.length <= 2} className="text-red-500 disabled:text-gray-400 p-2"><X size={20} /></button></td>
                                        </tr>
                                    )
                                })}</tbody>
                            </table>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <button type="button" onClick={addLine} className="flex items-center gap-2 px-4 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold"><Plus size={18} /><span>إضافة سطر</span></button>
                            <div className={`flex items-center gap-4 font-bold text-lg p-2 rounded-lg ${!isBalanced && !isPristine ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' : 'text-text-primary'}`}>
                                {!isBalanced && !isPristine && <AlertTriangle size={20}/>}
                                <span className="text-debit">مدين: {totalDebit.toLocaleString()}</span><span>|</span><span className="text-credit">دائن: {totalCredit.toLocaleString()}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {showCheckDetails && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-md">
                                <div><label className="font-semibold text-blue-800 dark:text-blue-300 block mb-1">رقم الشيك</label><input type="text" value={checkNumber} onChange={e => {setCheckNumber(e.target.value); setHasChanged(true);}} placeholder="رقم الشيك..." className="w-full p-2 text-lg font-bold text-center bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary"/></div>
                                <div><label className="font-semibold text-blue-800 dark:text-blue-300 block mb-1">تاريخ الشيك</label><input type="date" value={checkDate} onChange={e => {setCheckDate(e.target.value); setHasChanged(true);}} className="w-full p-2 text-lg font-bold text-center bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary"/></div>
                            </div>
                        )}
                        {isForeignCurrency && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-md">
                                <div className="md:col-span-1"><label className="font-semibold text-blue-800 dark:text-blue-300 block mb-1">العملة الأجنبية</label><input type="text" value={foreignCurrency} onChange={e => setForeignCurrency(e.target.value)} className="w-full p-2 text-lg font-bold text-center bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary"/></div>
                                <div className="md:col-span-1"><label className="font-semibold text-blue-800 dark:text-blue-300 block mb-1">سعر الصرف</label><input type="number" step="0.01" value={conversionRate} onChange={e => setConversionRate(Number(e.target.value))} required className="w-full p-2 text-lg font-bold text-center bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary"/></div>
                                <div className="md:col-span-1"><label className="font-semibold text-blue-800 dark:text-blue-300 block mb-1">المبلغ بالجنيه</label><input type="text" value={(amount * conversionRate).toLocaleString()} readOnly className="w-full p-2 text-lg font-bold text-center bg-primary-dark/20 rounded-xl shadow-neumo-inset-sm text-text-primary"/></div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="md:col-span-1"><label className="font-semibold text-text-secondary block mb-2">{isForeignCurrency ? `المبلغ (${foreignCurrency})` : 'المبلغ'}</label><input type="number" step="0.01" value={amount || ''} onChange={e => { setAmount(Number(e.target.value)); setHasChanged(true); }} required placeholder="0.00" className="w-full p-3 text-lg font-bold text-center bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary placeholder:text-text-secondary/80"/></div>
                            {transactionType === 'receipt' && <>
                                <div className="md:col-span-1"><label className="font-semibold text-text-secondary block mb-2">من حساب (العميل)</label><select value={fromAccountId} onChange={e => { setFromAccountId(e.target.value); setHasChanged(true); }} required className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none text-text-primary"><option value="">-- اختر العميل --</option>{customerAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name.replace('العملاء - ', '')}</option>)}</select></div>
                                <div className="md:col-span-1"><label className="font-semibold text-text-secondary block mb-2">إلى حساب (الخزينة/البنك)</label><select value={toAccountId} onChange={e => { setToAccountId(e.target.value); setHasChanged(true); }} required className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none text-text-primary"><option value="">-- اختر خزينة أو بنك --</option>{cashAndBankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                            </>}
                            {transactionType === 'payment' && <>
                                <div className="md:col-span-1"><label className="font-semibold text-text-secondary block mb-2">من حساب (الخزينة/البنك)</label><select value={fromAccountId} onChange={e => { setFromAccountId(e.target.value); setHasChanged(true); }} required className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none text-text-primary"><option value="">-- اختر خزينة أو بنك --</option>{cashAndBankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                                <div className="md:col-span-1"><label className="font-semibold text-text-secondary block mb-2">إلى حساب (المستفيد)</label><select value={toAccountId} onChange={e => { setToAccountId(e.target.value); setHasChanged(true); }} required className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none text-text-primary"><option value="">-- اختر حساب الدفع --</option>{payableToAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                            </>}
                        </div>
                    </>
                )}


                {error && <p className="text-red-500 bg-red-100 p-3 rounded-md text-center">{error}</p>}
                
                <button type="submit" className="w-full px-6 py-4 bg-accent text-white rounded-xl hover:bg-accent-dark font-bold text-lg shadow-md hover:shadow-lg transition-all">
                    حفظ الحركة
                </button>
            </form>
        </div>
    );
};


const Journal: React.FC<JournalProps> = ({ journalEntries, addJournalEntry, accounts, currentUser, setIsFormDirty, prefilledJournalLine, clearPrefill, onAccountClick, operations, onNavigateToOperation, requestConfirmation }) => {
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
    const [viewingVoucher, setViewingVoucher] = useState<JournalEntry | null>(null);
    const canCreate = canPerformAction(currentUser.role, 'create');

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStartDate, setFilterStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [filterEndDate, setFilterEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
    const [filterAccount, setFilterAccount] = useState<string>('all');

    const transactionTypeMap: Record<TransactionType, string> = {
        general: 'قيد عام', payment: 'سند صرف', receipt: 'سند قبض',
        invoice: 'فاتورة', adjustment: 'تسوية',
    };

    const filteredEntries = useMemo(() => {
        return journalEntries
            .filter(entry => {
                const entryDate = entry.date;
                if (filterStartDate && entryDate < filterStartDate) return false;
                if (filterEndDate && entryDate > filterEndDate) return false;
                return true;
            })
            .filter(entry => {
                return filterType === 'all' || entry.transactionType === filterType;
            })
            .filter(entry => {
                return filterAccount === 'all' || entry.lines.some(line => line.accountId === filterAccount);
            })
            .filter(entry => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return entry.description.toLowerCase().includes(query) ||
                       (entry.referenceNumber && entry.referenceNumber.toLowerCase().includes(query));
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [journalEntries, filterStartDate, filterEndDate, filterType, filterAccount, searchQuery]);

    const groupedEntries = useMemo(() => {
        return filteredEntries.reduce((groups, entry) => {
            const date = entry.date;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(entry);
            return groups;
        }, {} as Record<string, JournalEntry[]>);
    }, [filteredEntries]);

    const resetFilters = () => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        setFilterStartDate(d.toISOString().split('T')[0]);
        setFilterEndDate(new Date().toISOString().split('T')[0]);
        setFilterType('all');
        setFilterAccount('all');
        setSearchQuery('');
    };

    const formatCurrency = (amount: number, currency?: string) => {
        const options = { style: 'currency', currency: currency || 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 };
        return new Intl.NumberFormat(currency === 'EGP' || !currency ? 'ar-EG' : 'en-US', options).format(amount);
    };

    return (
    <div className="space-y-8">
        {viewingVoucher && (
            <Voucher
                entry={viewingVoucher}
                accounts={accounts}
                type={viewingVoucher.transactionType as 'receipt' | 'payment'}
                onClose={() => setViewingVoucher(null)}
            />
        )}
        <div className="no-print">
            {canCreate && <NewEntryForm addJournalEntry={addJournalEntry} accounts={accounts} journalEntries={journalEntries} setIsFormDirty={setIsFormDirty} prefilledJournalLine={prefilledJournalLine} clearPrefill={clearPrefill} />}
        </div>

        <div className="bg-primary p-6 rounded-2xl shadow-neumo printable-area">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-text-primary">سجل القيود</h2>
            </div>
            
            {/* Filter Section */}
            <div className="no-print bg-primary p-4 rounded-xl shadow-neumo-sm mb-6">
                 <div className="flex flex-wrap gap-4 items-end">
                    <div className="relative w-full md:w-auto flex-grow md:flex-grow-0">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="بحث بالوصف أو الرقم المرجعي..."
                            className="w-full p-2 pl-8 bg-primary rounded-lg shadow-neumo-inset-sm focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                        />
                        <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-text-secondary block mb-1">من تاريخ</label>
                        <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm text-sm"/>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-text-secondary block mb-1">إلى تاريخ</label>
                        <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm text-sm"/>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-text-secondary block mb-1">نوع الحركة</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none text-sm">
                            <option value="all">الكل</option>
                            {Object.entries(transactionTypeMap).map(([key, value]) => (
                                <option key={key} value={key}>{value}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-text-secondary block mb-1">حسب الحساب</label>
                        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none text-sm max-w-xs">
                            <option value="all">كل الحسابات</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                     <button onClick={resetFilters} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-accent rounded-md hover:shadow-neumo-inset shadow-neumo-sm font-semibold text-sm h-10">
                        <XCircle size={16}/> إعادة تعيين
                    </button>
                </div>
            </div>

            <div className="text-sm text-text-secondary mb-2 no-print">
                {`عرض ${filteredEntries.length} من إجمالي ${journalEntries.length} قيد.`}
            </div>

            <div className="space-y-6">
                {(Object.entries(groupedEntries) as [string, JournalEntry[]][]).map(([date, entries]) => (
                    <div key={date}>
                        <div className="sticky top-[-2rem] md:top-[-3rem] bg-primary-light z-10 py-2 -mx-8 px-8 print:static print:p-0 print:bg-transparent">
                             <div className="bg-primary px-4 py-1 rounded-full shadow-neumo-sm inline-block print:shadow-none print:bg-transparent print:border-b-2 print:border-black print:rounded-none print:inline">
                                <h3 className="text-lg font-bold text-text-secondary print:text-black">
                                   {new Date(date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h3>
                            </div>
                        </div>
                        <div className="space-y-3 mt-2">
                            {entries.map(entry => {
                                const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
                                const type = entry.transactionType || 'general';
                                const typeName = transactionTypeMap[type] || 'قيد';
                                const linkedOp = operations.find(op => op.journalEntryId === entry.id);
                                
                                const typeBadgeClass = {
                                    payment: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
                                    receipt: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
                                    invoice: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
                                    general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                                    adjustment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
                                }[type];

                                return (
                                    <div key={entry.id} className="bg-primary rounded-xl shadow-neumo-sm overflow-hidden transition-shadow duration-300 hover:shadow-neumo">
                                        <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}>
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <button className={`text-text-secondary transition-transform duration-300 ${expandedEntry === entry.id ? 'rotate-180' : ''}`}><ChevronDown size={20}/></button>
                                                <div className="flex-1 truncate">
                                                    <p className="font-semibold text-text-primary truncate" title={entry.description}>{entry.description}</p>
                                                    <div className="flex items-center gap-2 text-xs text-text-secondary mt-1">
                                                        <span className={`px-2 py-0.5 rounded-full font-bold ${typeBadgeClass}`}>{typeName}</span>
                                                        {entry.referenceNumber && <span>- #{entry.referenceNumber}</span>}
                                                        
                                                        {linkedOp && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onNavigateToOperation(linkedOp); }}
                                                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors text-xs font-bold border border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800"
                                                                title="الانتقال إلى تفاصيل العملية"
                                                            >
                                                                <Ship size={12} />
                                                                {linkedOp.code}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                                <div className="text-left">
                                                    <p className="font-mono font-bold text-lg text-debit">{formatCurrency(totalDebit, 'EGP')}</p>
                                                </div>
                                                {(entry.transactionType === 'receipt' || entry.transactionType === 'payment') && (
                                                    <button onClick={(e) => { e.stopPropagation(); setViewingVoucher(entry); }} className="p-2 text-accent rounded-full hover:shadow-neumo-sm no-print" title="طباعة إيصال"><Receipt size={18} /></button>
                                                )}
                                            </div>
                                        </div>
                                         <div className={`transition-all duration-300 ease-in-out ${expandedEntry === entry.id ? 'max-h-[500px]' : 'max-h-0'}`}>
                                            <div className="bg-primary-light/30">
                                                <div className="p-4 border-t border-primary-dark/20">
                                                    {entry.checkDetails?.checkNumber && (
                                                        <div className="text-sm text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-2 mb-2 p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                                                            <CreditCard size={16}/>
                                                            <span>شيك رقم: {entry.checkDetails.checkNumber}</span>
                                                            {entry.checkDetails.checkDate && <span>بتاريخ: {new Date(entry.checkDetails.checkDate).toLocaleDateString('ar-EG-u-nu-latn')}</span>}
                                                        </div>
                                                    )}
                                                    <table className="w-full text-right text-sm">
                                                        <thead className="border-b border-primary-dark/20">
                                                            <tr>
                                                                <th className="p-3 font-semibold">الحساب</th>
                                                                <th className="p-3 font-semibold text-center">مدين</th>
                                                                <th className="p-3 font-semibold text-center">دائن</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>{(entry.lines || []).map((line, index) => {
                                                            const account = accounts.find(acc => acc.id === line.accountId);
                                                            const isForeign = line.currency && line.currency !== 'EGP';
                                                            return (
                                                                <tr key={index} className={index % 2 !== 0 ? 'bg-primary/50 dark:bg-primary-dark/30' : ''}>
                                                                    <td className="p-3">
                                                                        <button onClick={() => onAccountClick(account!)} className="text-left w-full text-accent hover:underline font-semibold no-print">{account?.name}</button>
                                                                        <span className="print:inline hidden">{account?.name || 'غير معروف'}</span>
                                                                        {isForeign && <div className="text-xs text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1"><Globe size={12}/>{formatCurrency(line.amountForeign!, line.currency)} @ {line.conversionRate}</div>}
                                                                    </td>
                                                                    <td className={`p-3 text-center font-mono ${line.debit > 0 ? 'text-debit' : ''}`}>{line.debit > 0 ? formatCurrency(line.debit, 'EGP') : '-'}</td>
                                                                    <td className={`p-3 text-center font-mono ${line.credit > 0 ? 'text-credit' : ''}`}>{line.credit > 0 ? formatCurrency(line.credit, 'EGP') : '-'}</td>
                                                                </tr>
                                                            )})}
                                                        </tbody>
                                                        <tfoot className="border-t-2 border-primary-dark/20 font-bold bg-primary-light/50">
                                                            <tr>
                                                                <td className="p-3">الإجمالي</td>
                                                                <td className="p-3 text-center font-mono text-debit">{formatCurrency(totalDebit, 'EGP')}</td>
                                                                <td className="p-3 text-center font-mono text-credit">{formatCurrency(entry.lines.reduce((s, l) => s + l.credit, 0), 'EGP')}</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                 {Object.keys(groupedEntries).length === 0 && (
                    <div className="text-center p-8 text-text-secondary"><p>لا توجد قيود يومية تطابق معايير البحث.</p></div>
                )}
            </div>
        </div>
    </div>
    );
};

export default Journal;
