
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Operation, OperationType, OperationStatus, Account, OperationLineItem, User, TaxType, JournalEntry, PriceList, Document } from '../types.ts';
import { PlusCircle, Edit, Trash2, FileText, Printer, MinusCircle, User as UserIcon, Calendar, X, Book, Link, Paperclip, Search, ArrowUp, ArrowDown, Ship, Plane, ArrowRightLeft, Building2, Filter } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // Simple uuid generator
import { canPerformAction } from '../permissions.ts';
import OperationDetailView from './OperationDetailView.tsx';
import ExportDropdown from './ExportDropdown.tsx';
import LinkJournalEntryModal from './LinkJournalEntryModal.tsx';


// Helpers
const getOperationTypeCode = (type: OperationType): string => {
    switch (type) {
        case 'import': return '01';
        case 'export': return '02';
        case 'sea-clearance': return '03';
        case 'return': return '04';
        case 'air-clearance': return '05';
        case 'credit-note': return '06';
        default: return '00';
    }
};

const generateOperationCode = (type: OperationType, existingOps: Operation[]): string => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const typeCode = getOperationTypeCode(type);
    const relevantOpsCount = existingOps.filter(op => op.code.startsWith(`${year}${month}-`) && op.code.endsWith(`-${typeCode}`)).length;
    const nextId = (relevantOpsCount + 1).toString().padStart(3, '0');

    return `${year}${month}-${nextId}-${typeCode}`;
};

const formatCurrency = (amount: number = 0) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const typeMap: Record<OperationType, string> = {
    'import': 'استيراد',
    'export': 'تصدير',
    'sea-clearance': 'تخليص بحري',
    'air-clearance': 'تخليص جوي',
    'return': 'مرتجع',
    'credit-note': 'إشعار دائن',
};

const statusMap: Record<OperationStatus, {text: string, className: string}> = { 
    'in-progress': { text: 'قيد التنفيذ', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200' }, 
    'completed': { text: 'مكتملة', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200' }, 
    'postponed': { text: 'مؤجلة', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200' }
};

const getOperationTypeIcon = (type: OperationType) => {
    switch (type) {
        case 'sea-clearance': return <Ship size={16} className="text-blue-600" />;
        case 'air-clearance': return <Plane size={16} className="text-sky-500" />;
        case 'import': return <ArrowDown size={16} className="text-purple-600" />;
        case 'export': return <ArrowUp size={16} className="text-orange-600" />;
        case 'return': return <ArrowRightLeft size={16} className="text-red-500" />;
        default: return <FileText size={16} className="text-gray-500" />;
    }
};

// --- Invoice Component ---
interface InvoiceProps {
  operation: Operation;
  client: Account;
  onClose: () => void;
}

const Invoice: React.FC<InvoiceProps> = ({ operation, client, onClose }) => {
  
  const handlePrint = () => { window.print(); };

  const invoiceDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(invoiceDate.getDate() + 15); // Add 15 days for due date

  const calculations = useMemo(() => {
      const allItems = operation.lineItems || [];

      const taxableItems = allItems.filter(item => item.taxType === 'schedule' || item.taxType === 'vat');
      const nonTaxableItems = allItems.filter(item => !item.taxType || item.taxType === 'none');
      
      const totalTaxableValue = taxableItems.reduce((sum, item) => sum + item.amount, 0);
      const totalNonTaxableValue = nonTaxableItems.reduce((sum, item) => sum + item.amount, 0);
      const totalServiceValue = totalTaxableValue + totalNonTaxableValue;

      const scheduleTaxBase = allItems
          .filter(item => item.taxType === 'schedule')
          .reduce((sum, item) => sum + item.amount, 0);
      const scheduleTaxAmount = scheduleTaxBase * 0.10;

      const vatBase = allItems
          .filter(item => item.taxType === 'vat')
          .reduce((sum, item) => sum + item.amount, 0);
      const vatAmount = vatBase * 0.14;

      const totalAmount = totalServiceValue + scheduleTaxAmount + vatAmount;
      
      return { 
          taxableItems, 
          nonTaxableItems, 
          totalTaxableValue,
          totalNonTaxableValue,
          totalServiceValue, 
          scheduleTaxAmount, 
          vatAmount, 
          totalAmount 
      };
  }, [operation.lineItems]);
  
  const minInvoiceRows = 5;
  const minAnnexRows = 5;
  const emptyInvoiceRows = Math.max(0, minInvoiceRows - (calculations.taxableItems.length));
  const emptyAnnexRows = Math.max(0, minAnnexRows - (calculations.nonTaxableItems.length));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 print:p-0 print:bg-white font-sans">
      <div className="relative w-full max-w-4xl">
        <div className="bg-white p-8 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto text-gray-800 printable-area leading-normal">
            
            {/* Header */}
            <header className="flex justify-between items-center pb-4 mb-4 border-b-2 border-black">
                <div className="w-1/2 text-right">
                    <h2 className="text-lg font-bold">EGYPTIAN EXPRESS</h2>
                    <p className="text-sm">SHIPPING & TRADING Co.</p>
                    <p className="text-xs mt-2">5, Basem El Katebi St., Dokki. Giza</p>
                    <p className="text-xs">Tel.: 37486217-37482487 | Fax: 37494014</p>
                </div>
                <div className="w-1/2 text-center">
                    <h1 className="text-4xl font-bold">فاتورة</h1>
                    <h2 className="text-3xl font-bold">INVOICE</h2>
                </div>
            </header>

            {/* Client and Invoice Info */}
            <section className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="border border-black p-2 rounded-md">
                    <h3 className="font-bold bg-gray-100 -m-2 mb-2 p-2 text-center">فاتورة إلى / Billed To</h3>
                    <p className="font-bold">{client.name.replace('العملاء - ', '')}</p>
                    <p>{client.address || 'غير مسجل'}</p>
                    <p>الرقم الضريبي: {client.taxNumber || 'غير مسجل'}</p>
                </div>
                <div className="border border-black p-2 rounded-md">
                    <h3 className="font-bold bg-gray-100 -m-2 mb-2 p-2 text-center">بيانات الفاتورة / Invoice Details</h3>
                    <div className="grid grid-cols-2">
                        <p className="font-bold">رقم الفاتورة:</p><p className="text-left">{operation.code}</p>
                        <p className="font-bold">تاريخ الفاتورة:</p><p className="text-left">{invoiceDate.toLocaleDateString('ar-EG-u-nu-latn')}</p>
                        <p className="font-bold">تاريخ الاستحقاق:</p><p className="text-left">{dueDate.toLocaleDateString('ar-EG-u-nu-latn')}</p>
                    </div>
                </div>
            </section>

             {/* Shipment Details Section */}
             <section className="border border-black p-2 rounded-md mb-6 text-sm">
                <h3 className="font-bold bg-gray-100 -m-2 mb-2 p-2 text-center">بيانات الشحنة / Shipment Details</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <p><strong>وصف الشحنة:</strong> {operation.description}</p>
                    <p><strong>نوع العملية:</strong> {typeMap[operation.type]}</p>
                    <p><strong>بوليصة الشحن:</strong> {operation.billOfLading || 'N/A'}</p>
                    <p><strong>رقم الحاوية:</strong> {operation.containerNumber || 'N/A'}</p>
                    <p><strong>رقم الرحلة:</strong> {operation.voyageNumber || 'N/A'}</p>
                    <p><strong>ميناء الشحن:</strong> {operation.portOfLoading || 'N/A'}</p>
                    <p><strong>ميناء الوصول:</strong> {operation.portOfDischarge || 'N/A'}</p>
                    <p><strong>الشهادة الجمركية:</strong> N/A</p>
                </div>
            </section>

            {/* Taxable Line Items */}
            <section className="mb-4">
                 <h3 className="text-lg font-bold text-center mb-1 bg-gray-100 p-1 border border-black">البنود الخاضعة للضريبة / Taxable Items</h3>
                <table className="w-full border-collapse border border-black text-sm">
                    <thead>
                        <tr>
                            <th className="border border-black p-2 w-16">م / No.</th>
                            <th className="border border-black p-2 text-right">البيان / Description</th>
                            <th className="border border-black p-2 w-40 text-right">المبلغ / Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {calculations.taxableItems.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-300">
                                <td className="border border-black p-2 text-center">{index + 1}</td>
                                <td className="border border-black p-2 text-right">{item.description}</td>
                                <td className="border border-black p-2 text-right font-mono">{formatCurrency(item.amount)}</td>
                            </tr>
                        ))}
                        {Array.from({ length: emptyInvoiceRows }).map((_, i) => (
                             <tr key={`empty-tax-${i}`} className="border-b border-gray-300 h-8"><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Non-Taxable Line Items Annex */}
             <section className="mb-4">
                 <h3 className="text-lg font-bold text-center mb-1 bg-gray-100 p-1 border border-black">ملحق الفاتورة رقم {operation.code}-A / Annex No. {operation.code}-A</h3>
                <table className="w-full border-collapse border border-black text-sm">
                    <thead>
                        <tr>
                            <th className="border border-black p-2 w-16">م / No.</th>
                            <th className="border border-black p-2 text-right">البيان / Description</th>
                            <th className="border border-black p-2 w-40 text-right">المبلغ / Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {calculations.nonTaxableItems.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-300">
                                <td className="border border-black p-2 text-center">{index + 1}</td>
                                <td className="border border-black p-2 text-right">{item.description}</td>
                                <td className="border border-black p-2 text-right font-mono">{formatCurrency(item.amount)}</td>
                            </tr>
                        ))}
                        {Array.from({ length: emptyAnnexRows }).map((_, i) => (
                             <tr key={`empty-nontax-${i}`} className="border-b border-gray-300 h-8"><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>
                        ))}
                    </tbody>
                </table>
            </section>


            {/* Totals */}
            <section className="flex justify-end mb-6 text-sm">
                <div className="w-full max-w-sm">
                    <table className="w-full">
                        <tbody>
                            {/* Conditionally show breakdown if both types of items exist */}
                            {calculations.totalTaxableValue > 0 && calculations.totalNonTaxableValue > 0 && (
                                <>
                                    <tr>
                                        <td className="font-semibold p-2 pr-4">إجمالي الخدمات الخاضعة للضريبة</td>
                                        <td className="p-2 text-right font-mono">{formatCurrency(calculations.totalTaxableValue)}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold p-2 pr-4">إجمالي الخدمات غير الخاضعة (الملحق)</td>
                                        <td className="p-2 text-right font-mono">{formatCurrency(calculations.totalNonTaxableValue)}</td>
                                    </tr>
                                </>
                            )}
                            <tr className="border-t border-gray-400">
                                <td className="font-bold p-2">إجمالي الخدمات (قبل الضريبة)</td>
                                <td className="p-2 text-right font-mono">{formatCurrency(calculations.totalServiceValue)}</td>
                            </tr>
                            
                            {calculations.scheduleTaxAmount > 0 && (
                                <tr>
                                    <td className="font-bold p-2">ضريبة جدول (10%)</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculations.scheduleTaxAmount)}</td>
                                </tr>
                            )}
                            {calculations.vatAmount > 0 && (
                                <tr>
                                    <td className="font-bold p-2">ضريبة القيمة المضافة (14%)</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(calculations.vatAmount)}</td>
                                </tr>
                            )}
                            <tr className="border-t-2 border-black bg-gray-100">
                                <td className="font-bold p-2 text-base">الإجمالي العام المستحق</td>
                                <td className="p-2 text-right font-mono font-bold text-base">{formatCurrency(calculations.totalAmount)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t-2 border-black pt-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-bold mb-1">البيانات البنكية / Bank Details</h4>
                        <p><strong>اسم البنك:</strong> CIB Bank</p>
                        <p><strong>رقم الحساب:</strong> 1000 XXXXXX XXXX</p>
                        <p><strong>سويفت كود:</strong> CIBEEGCX005</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold">شكراً لتعاملكم معنا!</p>
                        <p>Thank you for your business!</p>
                    </div>
                </div>
            </footer>

        </div>
        <div className="no-print absolute top-0 left-0 m-4 flex flex-col gap-2">
            <button onClick={handlePrint} className="px-4 py-2 bg-accent text-white rounded-lg shadow-lg hover:bg-accent-dark font-semibold">طباعة</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg shadow-lg hover:bg-gray-300 font-semibold">إغلاق</button>
        </div>
      </div>
    </div>
  );
};


// --- Account Statement Component ---
interface AccountStatementProps {
    client: Account;
    operations: Operation[];
    onClose: () => void;
}

const AccountStatement: React.FC<AccountStatementProps> = ({ client, operations, onClose }) => {
    const [fromDate, setFromDate] = useState<string>(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const clientOperations = useMemo(() => {
        return operations
            .filter(op => op.clientId === client.id && op.creationDate >= fromDate && op.creationDate <= toDate)
            .sort((a, b) => new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime());
    }, [client.id, operations, fromDate, toDate]);

    const totalRevenue = clientOperations.reduce((sum, op) => sum + (op.lineItems?.reduce((s, i) => s + i.amount, 0) || 0), 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 print:p-0 print:bg-white">
            <div className="relative w-full max-w-4xl">
                <div className="bg-white p-8 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto text-gray-800 printable-area">
                    <header className="text-center mb-6 border-b-2 pb-4">
                         <h1 className="font-bold text-2xl">شركة إيجيبشن اكسبريس للشحن والتجارة</h1>
                         <h2 className="font-bold text-xl mt-2">كشف حساب عميل</h2>
                    </header>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <p><span className="font-bold">العميل:</span> {client.name.replace('العملاء - ', '')}</p>
                            <p><span className="font-bold">العنوان:</span> {client.address || 'غير مسجل'}</p>
                        </div>
                        <div className="text-left">
                            <p><span className="font-bold">من تاريخ:</span> {new Date(fromDate).toLocaleDateString('ar-EG-u-nu-latn')}</p>
                            <p><span className="font-bold">إلى تاريخ:</span> {new Date(toDate).toLocaleDateString('ar-EG-u-nu-latn')}</p>
                        </div>
                    </div>
                    
                    <table className="w-full text-right">
                        <thead className="bg-gray-100"><tr className="border-b-2 border-gray-300"><th className="p-2 font-semibold">التاريخ</th><th className="p-2 font-semibold">كود العملية</th><th className="p-2 font-semibold">البيان</th><th className="p-2 font-semibold text-center">المبلغ (مدين)</th></tr></thead>
                        <tbody>
                            {clientOperations.map(op => {
                                const revenue = op.lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                                return (
                                    <tr key={op.id} className="border-b border-gray-200"><td className="p-2">{new Date(op.creationDate).toLocaleDateString('ar-EG-u-nu-latn')}</td><td className="p-2 font-mono">{op.code}</td><td className="p-2">{op.description}</td><td className="p-2 text-center font-mono">{formatCurrency(revenue)}</td></tr>
                                );
                            })}
                        </tbody>
                        <tfoot><tr className="border-t-2 border-gray-300 bg-gray-100 font-bold"><td colSpan={3} className="p-2 text-left">الإجمالي (رصيد مدين)</td><td className="p-2 text-center font-mono">{formatCurrency(totalRevenue)}</td></tr></tfoot>
                    </table>
                </div>
                <div className="no-print absolute top-0 left-0 m-4 flex flex-col gap-2">
                    <button onClick={() => window.print()} className="px-4 py-2 bg-accent text-white rounded-lg shadow-lg hover:bg-accent-dark font-semibold">طباعة</button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg shadow-lg hover:bg-gray-300 font-semibold">إغلاق</button>
                    <div className="bg-white p-2 rounded-lg shadow-lg">
                        <label className="text-sm font-semibold">من:</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full border p-1 rounded"/>
                        <label className="text-sm font-semibold mt-1">إلى:</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full border p-1 rounded"/>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Operation Form Modal ---
interface OperationFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (operation: Operation | Omit<Operation, 'id'>) => void;
    initialData?: Operation | null;
    accounts: Account[];
    operations: Operation[];
    priceLists: PriceList[];
    setIsFormDirty: (isDirty: boolean) => void;
    requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger' }) => void;
}

const BLANK_OPERATION_FORM: Omit<Operation, 'id' | 'code' | 'creationDate'> = {
    clientId: '', type: 'import', status: 'in-progress', description: '',
    billOfLading: '', containerNumber: '', voyageNumber: '', portOfLoading: '', portOfDischarge: '', lineItems: [], cost: 0
};

type OperationFormErrors = Partial<Record<keyof Operation, string>>;

const OperationForm: React.FC<OperationFormProps> = ({ isOpen, onClose, onSubmit, initialData, accounts, operations, priceLists, setIsFormDirty, requestConfirmation }) => {
    const [formData, setFormData] = useState<Omit<Operation, 'id'>>({ ...BLANK_OPERATION_FORM, code: '', creationDate: '' });
    const [hasChanged, setHasChanged] = useState(false);
    const [errors, setErrors] = useState<OperationFormErrors>({});

    const customerAccounts = useMemo(() => {
        return accounts
            .filter(acc => acc.accountCategory === 'Customer' || (acc.type === 'Asset' && acc.name.startsWith('العملاء')))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [accounts]);

    // Cleanup on unmount
    useEffect(() => {
        return () => setIsFormDirty(false);
    }, [setIsFormDirty]);

    useEffect(() => {
        setIsFormDirty(hasChanged);
    }, [hasChanged, setIsFormDirty]);

    useEffect(() => {
        if (isOpen) {
            setHasChanged(false);
            setErrors({});
            if (initialData) {
                const { id, ...dataToEdit } = initialData;
                setFormData({ 
                    ...dataToEdit, 
                    containerNumber: dataToEdit.containerNumber || '',
                    lineItems: dataToEdit.lineItems?.map(item => ({...item, taxType: item.taxType || 'none'})) || [],
                });
            } else {
                setFormData({
                    ...BLANK_OPERATION_FORM,
                    code: generateOperationCode('import', operations),
                    creationDate: new Date().toISOString().split('T')[0],
                    lineItems: [{ id: uuidv4(), description: '', amount: 0, taxType: 'none' }],
                });
            }
        } else {
            setHasChanged(false);
        }
    }, [initialData, isOpen, operations]);

    useEffect(() => {
        // Don't auto-apply on edit, only on new operations.
        // Also, don't run if there's no client selected.
        if (initialData || !formData.clientId || !isOpen) {
            // When editing, ensure line items have a default taxType if undefined
            if(initialData && formData.lineItems) {
                const needsUpdate = formData.lineItems.some(item => item.taxType === undefined);
                if(needsUpdate){
                    setFormData(prev => ({
                        ...prev,
                        lineItems: (prev.lineItems || []).map(item => ({...item, taxType: item.taxType || 'none'}))
                    }));
                }
            }
            return;
        };
    
        const customer = accounts.find(acc => acc.id === formData.clientId);
    
        // If a customer with a price list is selected
        if (customer && customer.priceListId) {
            const priceList = priceLists.find(pl => pl.id === customer.priceListId);
            if (priceList && priceList.items.length > 0) {
                // Check if the current line items are just the default empty one.
                const isPristine = (formData.lineItems?.length === 1 && !formData.lineItems[0].description && formData.lineItems[0].amount === 0);
                
                if (isPristine) {
                    requestConfirmation({
                        title: 'تطبيق قائمة الأسعار',
                        message: `هذا العميل لديه قائمة أسعار افتراضية "${priceList.name}". هل تريد تطبيقها على هذه العملية؟`,
                        onConfirm: () => {
                            const newLineItems = priceList.items.map(item => ({
                                id: uuidv4(),
                                description: item.description,
                                amount: item.price,
                                taxType: item.taxType,
                                priceListItemId: item.id,
                                isPriceOverridden: false,
                            }));
                            setFormData(prev => ({ ...prev, lineItems: newLineItems }));
                            setHasChanged(true);
                        }
                    });
                }
            }
        }
    }, [formData.clientId, accounts, priceLists, initialData, isOpen]);

    const validate = (): boolean => {
        const newErrors: OperationFormErrors = {};
        if (!formData.code?.trim()) newErrors.code = "كود العملية مطلوب";
        if (!formData.creationDate) newErrors.creationDate = "تاريخ العملية مطلوب";
        if (!formData.clientId) newErrors.clientId = "يجب اختيار العميل";
        if (!formData.description?.trim()) newErrors.description = "وصف العملية مطلوب";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setHasChanged(true);
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'cost' ? parseFloat(value) || 0 : value }));
        
        // Clear error when user types
        if (errors[name as keyof Operation]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleLineChange = (id: string, field: keyof OperationLineItem, value: any) => {
        setHasChanged(true);
        setFormData(prev => ({
            ...prev,
            lineItems: (prev.lineItems || []).map(item => {
                if (item.id === id) {
                    const updatedItem = { ...item, [field]: value };
                    // If amount is changed and it came from a price list, mark as overridden
                    if (field === 'amount' && item.priceListItemId) {
                        updatedItem.isPriceOverridden = true;
                    }
                    return updatedItem;
                }
                return item;
            }),
        }));
    };

    const addLine = () => {
        setHasChanged(true);
        setFormData(prev => ({ ...prev, lineItems: [...(prev.lineItems || []), { id: uuidv4(), description: '', amount: 0, taxType: 'none' }] }));
    };

    const removeLine = (id: string) => {
        setHasChanged(true);
        setFormData(prev => ({ ...prev, lineItems: (prev.lineItems || []).filter(item => item.id !== id) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (validate()) {
            if (initialData) { onSubmit({ ...initialData, ...formData }); } else { onSubmit(formData); }
            onClose();
        }
    };
    
    const handleCloseAttempt = () => {
        if (hasChanged) {
            requestConfirmation({
                title: 'تغييرات غير محفوظة',
                message: 'لديك تغييرات غير محفوظة. هل أنت متأكد من رغبتك في الإغلاق؟',
                onConfirm: onClose,
                variant: 'danger'
            });
        } else {
            onClose();
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={handleCloseAttempt}>
            <div className="bg-primary p-8 rounded-2xl shadow-neumo w-full max-w-4xl max-h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6 text-text-primary">{initialData ? 'تعديل عملية' : 'إضافة عملية جديدة'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                        <div className="md:col-span-3">
                            <label className="block text-text-secondary font-semibold mb-2">الوصف <span className="text-red-500">*</span></label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                rows={2} 
                                className={`w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-2 focus:ring-accent text-text-primary ${errors.description ? 'border border-red-500 ring-1 ring-red-500' : ''}`} 
                            />
                            {errors.description && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">{errors.description}</p>}
                        </div>
                        <div>
                            <label className="block text-text-secondary font-semibold mb-2">كود العملية <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                name="code" 
                                value={formData.code} 
                                onChange={handleChange} 
                                className={`w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary ${errors.code ? 'border border-red-500 ring-1 ring-red-500' : ''}`}
                            />
                            {errors.code && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">{errors.code}</p>}
                        </div>
                        <div>
                            <label className="block text-text-secondary font-semibold mb-2">تاريخ الإنشاء <span className="text-red-500">*</span></label>
                            <input 
                                type="date" 
                                name="creationDate" 
                                value={formData.creationDate} 
                                onChange={handleChange} 
                                className={`w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary ${errors.creationDate ? 'border border-red-500 ring-1 ring-red-500' : ''}`}
                            />
                            {errors.creationDate && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">{errors.creationDate}</p>}
                        </div>
                        <div>
                            <label className="block text-text-secondary font-semibold mb-2">العميل <span className="text-red-500">*</span></label>
                            <select 
                                name="clientId" 
                                value={formData.clientId} 
                                onChange={handleChange} 
                                className={`w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none text-text-primary ${errors.clientId ? 'border border-red-500 ring-1 ring-red-500' : ''}`}
                            >
                                <option value="">-- اختر عميل --</option>
                                {customerAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name.replace('العملاء - ', '')}
                                    </option>
                                ))}
                            </select>
                            {errors.clientId && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">{errors.clientId}</p>}
                        </div>
                        <div>
                            <label className="block text-text-secondary font-semibold mb-2">نوع العملية</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none text-text-primary">
                                <option value="import">استيراد</option>
                                <option value="export">تصدير</option>
                                <option value="sea-clearance">تخليص بحري</option>
                                <option value="air-clearance">تخليص جوي</option>
                                <option value="return">مرتجع</option>
                                <option value="credit-note">إشعار دائن</option>
                            </select>
                        </div>
                        <div><label className="block text-text-secondary font-semibold mb-2">الحالة</label><select name="status" value={formData.status} onChange={handleChange} className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none text-text-primary"><option value="in-progress">قيد التنفيذ</option><option value="completed">مكتملة</option><option value="postponed">مؤجلة</option></select></div>
                        <div><label className="block text-text-secondary font-semibold mb-2">رقم بوليصة الشحن</label><input type="text" name="billOfLading" value={formData.billOfLading} onChange={handleChange} className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary" /></div>
                        <div><label className="block text-text-secondary font-semibold mb-2">رقم الحاوية</label><input type="text" name="containerNumber" value={formData.containerNumber} onChange={handleChange} className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary" /></div>
                        <div><label className="block text-text-secondary font-semibold mb-2">رقم الرحلة</label><input type="text" name="voyageNumber" value={formData.voyageNumber} onChange={handleChange} className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary" /></div>
                        <div><label className="block text-text-secondary font-semibold mb-2">ميناء الشحن</label><input type="text" name="portOfLoading" value={formData.portOfLoading || ''} onChange={handleChange} className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary" /></div>
                        <div><label className="block text-text-secondary font-semibold mb-2">ميناء الوصول</label><input type="text" name="portOfDischarge" value={formData.portOfDischarge || ''} onChange={handleChange} className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm text-text-primary" /></div>
                    </div>

                    <div className="md:col-span-3 mt-6">
                        <h3 className="text-lg font-bold text-text-primary mb-2 border-t pt-4 border-primary-dark/20">بنود الفاتورة</h3>
                        <div className="space-y-2">
                        {(formData.lineItems || []).map((item, index) => (
                            <div key={item.id} className="grid grid-cols-[1fr_150px_180px_auto] gap-2 items-center">
                                <input type="text" value={item.description} onChange={e => handleLineChange(item.id, 'description', e.target.value)} placeholder="وصف البند" className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm text-text-primary" />
                                <div className="relative">
                                    <input type="number" value={item.amount} onChange={e => handleLineChange(item.id, 'amount', parseFloat(e.target.value) || 0)} placeholder="المبلغ" className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm text-text-primary" />
                                    {item.isPriceOverridden && <span title="تم تعديل السعر الأصلي" className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-lg">*</span>}
                                </div>
                                <select 
                                    value={item.taxType || 'none'} 
                                    onChange={e => handleLineChange(item.id, 'taxType', e.target.value as TaxType)}
                                    className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none focus:outline-none focus:ring-1 focus:ring-accent text-text-primary"
                                >
                                    <option value="none">بدون ضريبة</option>
                                    <option value="schedule">ضريبة جدول (10%)</option>
                                    <option value="vat">ضريبة قيمة مضافة (14%)</option>
                                </select>
                                <button type="button" onClick={() => removeLine(item.id)} className="text-red-500"><MinusCircle size={18} /></button>
                            </div>
                        ))}
                        </div>
                        <button type="button" onClick={addLine} className="mt-2 flex items-center gap-2 text-accent font-semibold"><PlusCircle size={18} /> إضافة بند</button>
                    </div>

                    <div className="mt-8 flex justify-end gap-4"><button type="button" onClick={handleCloseAttempt} className="px-6 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold">إلغاء</button><button type="submit" className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};

// --- Main Operations Component ---
interface OperationsProps {
    operations: Operation[];
    accounts: Account[];
    journalEntries: JournalEntry[];
    documents: Document[];
    addOperation: (operation: Omit<Operation, 'id'>) => void;
    updateOperation: (operation: Operation) => void;
    deleteOperation: (id: string) => void;
    linkOperationToJournalEntry: (operationId: string, journalEntryId: string) => void;
    currentUser: User;
    setIsFormDirty: (isDirty: boolean) => void;
    onNavigateToJournal: (view: string) => void;
    priceLists: PriceList[];
    addDocument: (file: File, linkedToId: string, linkedToType: 'account' | 'operation') => Promise<void>;
    deleteDocument: (id: string) => void;
    linkExistingDocuments: (documentsToLink: Document[], linkedToId: string, linkedToType: 'account' | 'operation') => void;
    initialOperationId?: string | null;
    onClearInitialOperation?: () => void;
    requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger' }) => void;
}

const Operations: React.FC<OperationsProps> = ({ operations, accounts, journalEntries, documents, addOperation, updateOperation, deleteOperation, linkOperationToJournalEntry, currentUser, setIsFormDirty, onNavigateToJournal, priceLists, addDocument, deleteDocument, linkExistingDocuments, initialOperationId, onClearInitialOperation, requestConfirmation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentOperation, setCurrentOperation] = useState<Operation | null>(null);
    const [viewingDocument, setViewingDocument] = useState<{ type: 'invoice' | 'statement', operation?: Operation, client?: Account } | null>(null);
    const [viewingOperation, setViewingOperation] = useState<Operation | null>(null); // State for read-only view
    
    // Virtualization / Infinite Scroll State
    const [visibleCount, setVisibleCount] = useState(20);
    const observer = useRef<IntersectionObserver | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<OperationType | 'all'>(() => (localStorage.getItem('operationsFilterType') as any) || 'all');
    const [filterStatus, setFilterStatus] = useState<OperationStatus | 'all'>(() => (localStorage.getItem('operationsFilterStatus') as any) || 'all');
    const [filterClient, setFilterClient] = useState<string>(() => (localStorage.getItem('operationsFilterClient') as string) || 'all');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [operationToLink, setOperationToLink] = useState<Operation | null>(null);


    const canCreate = canPerformAction(currentUser.role, 'create');
    const canEdit = canPerformAction(currentUser.role, 'edit');
    const canDelete = canPerformAction(currentUser.role, 'delete');

    useEffect(() => { localStorage.setItem('operationsFilterType', filterType); }, [filterType]);
    useEffect(() => { localStorage.setItem('operationsFilterStatus', filterStatus); }, [filterStatus]);
    useEffect(() => { localStorage.setItem('operationsFilterClient', filterClient); }, [filterClient]);

    // Effect to handle deep linking to a specific operation
    useEffect(() => {
        if (initialOperationId) {
            const op = operations.find(o => o.id === initialOperationId);
            if (op) {
                setViewingOperation(op);
                // Clear the initial ID to prevent reopening on subsequent renders
                if (onClearInitialOperation) onClearInitialOperation();
            }
        }
    }, [initialOperationId, operations, onClearInitialOperation]);

    const handleDelete = (id: string) => {
        requestConfirmation({
            title: 'حذف العملية',
            message: 'هل أنت متأكد من رغبتك في حذف هذه العملية؟ لا يمكن التراجع عن هذا الإجراء.',
            onConfirm: () => deleteOperation(id),
            variant: 'danger'
        });
    };

    const handleAddNew = () => { if(canCreate) { setCurrentOperation(null); setIsModalOpen(true); } };
    const handleEdit = (operation: Operation) => { if(canEdit) { setCurrentOperation(operation); setIsModalOpen(true); } };
    const handleSubmit = (operationData: Operation | Omit<Operation, 'id'>) => { 'id' in operationData ? updateOperation(operationData) : addOperation(operationData); };
    
    const handleOpenInvoice = (operation: Operation) => {
        const client = accounts.find(acc => acc.id === operation.clientId);
        if(client) setViewingDocument({ type: 'invoice', operation, client });
    };

    const handleOpenStatement = () => {
        // Instead of prompt, we'll use a more integrated way. 
        // For now, let's just use the first customer if none is selected, 
        // or better, we can add a small UI for this later.
        // To fix the immediate issue of 'prompt' being annoying:
        if (filterClient !== 'all') {
            const client = accounts.find(acc => acc.id === filterClient);
            if (client) {
                setViewingDocument({ type: 'statement', client });
                return;
            }
        }
        
        // If no client filter is active, ask the user to select one from the filter first
        requestConfirmation({
            title: 'عرض كشف الحساب',
            message: 'يرجى اختيار عميل من قائمة التصفية أولاً لعرض كشف حسابه.',
            onConfirm: () => {},
            showCancel: false,
            variant: 'primary'
        });
    };
    
    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getClientName = (id: string) => accounts.find(a => a.id === id)?.name.replace('العملاء - ', '') || 'غير معروف';

    const customerAccounts = useMemo(() => {
        return accounts
            .filter(acc => acc.accountCategory === 'Customer' || (acc.type === 'Asset' && acc.name.startsWith('العملاء')))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [accounts]);

    const filteredOperations = useMemo(() => {
        let result = operations
            .filter(op => filterType === 'all' || op.type === filterType)
            .filter(op => filterStatus === 'all' || op.status === filterStatus)
            .filter(op => filterClient === 'all' || op.clientId === filterClient);

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(op => 
                op.code.toLowerCase().includes(query) ||
                op.description.toLowerCase().includes(query) ||
                (op.billOfLading && op.billOfLading.toLowerCase().includes(query)) ||
                (op.containerNumber && op.containerNumber.toLowerCase().includes(query))
            );
        }

        return result.sort((a, b) => {
            let comparison = 0;
            switch (sortConfig.key) {
                case 'code':
                    comparison = a.code.localeCompare(b.code);
                    break;
                case 'client':
                    comparison = getClientName(a.clientId).localeCompare(getClientName(b.clientId));
                    break;
                case 'revenue':
                    const revA = a.lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                    const revB = b.lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                    comparison = revA - revB;
                    break;
                case 'cost':
                    comparison = (a.cost || 0) - (b.cost || 0);
                    break;
                case 'profit':
                    const profitA = (a.lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0) - (a.cost || 0);
                    const profitB = (b.lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0) - (b.cost || 0);
                    comparison = profitA - profitB;
                    break;
                case 'date':
                default:
                    comparison = new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime();
                    break;
            }
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [operations, filterType, filterStatus, filterClient, searchQuery, sortConfig, accounts]);
    
    // Reset visible count when filters change to start from top
    useEffect(() => {
        setVisibleCount(20);
    }, [filteredOperations]);

    const lastOperationElementRef = useCallback((node: HTMLTableRowElement) => {
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && visibleCount < filteredOperations.length) {
                setVisibleCount(prev => prev + 20);
            }
        });
        if (node) observer.current.observe(node);
    }, [visibleCount, filteredOperations.length]);

    const totals = useMemo(() => {
        return filteredOperations.reduce((acc, op) => {
            const totalRevenue = op.lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
            const cost = op.cost || 0;
            const profit = totalRevenue - cost;
            
            acc.totalRevenue += totalRevenue;
            acc.totalCost += cost;
            acc.totalProfit += profit;
            return acc;
        }, { totalRevenue: 0, totalCost: 0, totalProfit: 0 });
    }, [filteredOperations]);


    const csvDataForExport = useMemo(() => {
        const headers = ["الكود", "التاريخ", "العميل", "النوع", "الحالة", "الإيراد", "التكلفة", "الربح", "الوصف"];
        const data = filteredOperations.map(op => {
            const client = accounts.find(acc => acc.id === op.clientId);
            const totalRevenue = op.lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
            const profit = totalRevenue - (op.cost || 0);
            return [
                op.code,
                op.creationDate,
                client?.name.replace('العملاء - ', '') || 'غير معروف',
                typeMap[op.type],
                statusMap[op.status].text,
                totalRevenue,
                op.cost || 0,
                profit,
                op.description
            ];
        });
        return { headers, data };
    }, [filteredOperations, accounts]);
    
    const emailBody = `ملخص العمليات\n\nيحتوي هذا التقرير على ${filteredOperations.length} عملية حسب الفلتر المطبق.`;
    
    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="inline ml-1" /> : <ArrowDown size={14} className="inline ml-1" />;
    };

    const displayedOperations = filteredOperations.slice(0, visibleCount);

    return (
        <div className="space-y-6 h-full flex flex-col">
            <OperationForm 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSubmit={handleSubmit} 
                initialData={currentOperation} 
                accounts={accounts} 
                operations={operations} 
                setIsFormDirty={setIsFormDirty} 
                priceLists={priceLists} 
                requestConfirmation={requestConfirmation}
            />
            
            <LinkJournalEntryModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                operationToLink={operationToLink}
                journalEntries={journalEntries}
                operations={operations}
                onLink={(opId, jeId) => {
                    linkOperationToJournalEntry(opId, jeId);
                    setIsLinkModalOpen(false);
                }}
            />

            {viewingOperation && (
                <OperationDetailView 
                    operation={viewingOperation}
                    client={accounts.find(acc => acc.id === viewingOperation.clientId)!}
                    onClose={() => setViewingOperation(null)}
                    onNavigateToJournal={onNavigateToJournal}
                    documents={documents.filter(d => d.linkedToId === viewingOperation.id && d.linkedToType === 'operation')}
                    allDocuments={documents}
                    addDocument={addDocument}
                    deleteDocument={deleteDocument}
                    linkExistingDocuments={linkExistingDocuments}
                    currentUser={currentUser}
                />
            )}

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* Sidebar Filters */}
                <aside className="w-full lg:w-72 flex-shrink-0 space-y-4 no-print lg:sticky lg:top-0">
                    <div className="bg-primary p-5 rounded-2xl shadow-neumo">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-extrabold text-lg text-slate-700 flex items-center gap-2">
                                <Filter size={20} className="text-accent" />
                                الفلاتر
                            </h3>
                            {(filterType !== 'all' || filterStatus !== 'all' || filterClient !== 'all' || searchQuery) && (
                                <button 
                                    onClick={() => { setFilterType('all'); setFilterStatus('all'); setFilterClient('all'); setSearchQuery(''); }} 
                                    className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                                >
                                    <X size={14} /> مسح الكل
                                </button>
                            )}
                        </div>

                        {/* Status Filter */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-text-secondary mb-2">حالة العملية</label>
                            <div className="space-y-2">
                                <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${filterStatus === 'all' ? 'bg-accent/10 text-accent font-bold' : 'hover:bg-primary-dark/5'}`}>
                                    <input type="radio" checked={filterStatus === 'all'} onChange={() => setFilterStatus('all')} className="accent-accent w-4 h-4" />
                                    <span>الكل</span>
                                </label>
                                {Object.entries(statusMap).map(([key, value]) => (
                                    <label key={key} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${filterStatus === key ? 'bg-accent/10 text-accent font-bold' : 'hover:bg-primary-dark/5'}`}>
                                        <input type="radio" checked={filterStatus === key} onChange={() => setFilterStatus(key as any)} className="accent-accent w-4 h-4" />
                                        <span>{value.text}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <hr className="border-primary-dark/10 mb-6" />

                        {/* Client Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-text-secondary mb-2">العميل</label>
                            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none focus:outline-none focus:ring-2 focus:ring-accent text-sm font-semibold text-text-primary">
                                <option value="all">كل العملاء</option>
                                {customerAccounts.map(client => <option key={client.id} value={client.id}>{client.name.replace('العملاء - ', '')}</option>)}
                            </select>
                        </div>

                        {/* Type Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-text-secondary mb-2">نوع العملية</label>
                            <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none focus:outline-none focus:ring-2 focus:ring-accent text-sm font-semibold text-text-primary">
                                <option value="all">كل الأنواع</option>
                                {Object.entries(typeMap).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                            </select>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 w-full bg-primary p-6 rounded-2xl shadow-neumo printable-area flex flex-col min-w-0">
                     <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 no-print">
                        <div className="relative w-full sm:w-auto flex-1 max-w-md">
                            <input 
                                type="text" 
                                placeholder="بحث بالكود، الوصف، البوليصة..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-3 pr-10 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                            />
                            <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                             <ExportDropdown
                                title={`تقرير_العمليات`}
                                csvHeaders={csvDataForExport.headers}
                                csvData={csvDataForExport.data}
                                emailBodyContent={emailBody}
                                onPrint={() => window.print()}
                            />
                            <button onClick={handleOpenStatement} className="flex items-center gap-2 px-4 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold text-sm whitespace-nowrap"><UserIcon size={18}/> كشف حساب</button>
                            {canCreate && <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold shadow-sm text-sm whitespace-nowrap"><PlusCircle size={20} /> إضافة عملية</button>}
                        </div>
                    </div>
                    
                    <div className="text-sm text-text-secondary mb-2 no-print">
                        {`عرض ${displayedOperations.length} من إجمالي ${filteredOperations.length} عملية.`}
                    </div>

                    <div className="overflow-x-auto max-h-[calc(100vh-250px)]">
                        <table className="w-full text-right border-separate border-spacing-0">
                            <thead className="bg-primary-light uppercase text-sm text-text-secondary font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('code')}>كود العملية / الوصف <SortIcon column="code"/></th>
                                    <th className="p-4 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('date')}>التاريخ <SortIcon column="date"/></th>
                                    <th className="p-4 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('client')}>العميل <SortIcon column="client"/></th>
                                    <th className="p-4">النوع</th>
                                    <th className="p-4 text-center">الحالة</th>
                                    <th className="p-4 text-center cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('revenue')}>الإيراد <SortIcon column="revenue"/></th>
                                    <th className="p-4 text-center cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('cost')}>التكلفة <SortIcon column="cost"/></th>
                                    <th className="p-4 text-center cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('profit')}>الربح <SortIcon column="profit"/></th>
                                    <th className="p-4 no-print text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedOperations.map((op, index) => {
                                    const client = accounts.find(acc => acc.id === op.clientId);
                                    const totalRevenue = op.lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
                                    const profit = totalRevenue - (op.cost || 0);
                                    const hasAttachment = documents.some(doc => doc.linkedToId === op.id);
                                    const isLast = index === displayedOperations.length - 1;

                                    return (
                                    <tr 
                                        key={op.id} 
                                        ref={isLast ? lastOperationElementRef : null}
                                        className="border-b border-primary-dark/10 hover:bg-primary-dark/5 cursor-pointer transition-colors even:bg-primary-dark/5" 
                                        onClick={() => setViewingOperation(op)}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-extrabold text-lg text-text-primary whitespace-nowrap">{op.code}</span>
                                                {hasAttachment && <Paperclip size={14} className="text-text-secondary" />}
                                            </div>
                                            <div className="text-xs text-text-secondary truncate max-w-[200px]" title={op.description}>{op.description}</div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                {new Date(op.creationDate).toLocaleDateString('ar-EG-u-nu-latn')}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 font-semibold text-text-primary">
                                                <Building2 size={16} className="text-text-secondary" />
                                                {client?.name.replace('العملاء - ', '') || 'غير معروف'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                                {getOperationTypeIcon(op.type)}
                                                <span>{typeMap[op.type]}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${statusMap[op.status].className}`}>
                                                    {statusMap[op.status].text}
                                                </span>
                                                {op.journalEntryId && <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold"><Book size={10}/> مرتبط</div>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-mono text-text-primary font-medium whitespace-nowrap">{formatCurrency(totalRevenue)}</td>
                                        <td className="p-4 text-center font-mono text-red-600 font-medium whitespace-nowrap">({formatCurrency(op.cost)})</td>
                                        <td className={`p-4 text-center font-mono font-bold whitespace-nowrap ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profit)}</td>
                                        <td className="p-4 no-print">
                                            <div className="flex justify-center gap-2" onClick={e => e.stopPropagation()}>
                                                {!op.journalEntryId && canEdit && (
                                                    <button onClick={(e) => { e.stopPropagation(); setOperationToLink(op); setIsLinkModalOpen(true); }} className="p-2 text-blue-500 bg-blue-50 rounded-full hover:bg-blue-100" title="ربط بقيد يومية">
                                                        <Link size={16} />
                                                    </button>
                                                )}
                                                {canEdit && <button onClick={() => handleEdit(op)} className="p-2 text-accent bg-blue-50 rounded-full hover:bg-blue-100" title="تعديل"><Edit size={16} /></button>}
                                                <button onClick={() => handleOpenInvoice(op)} className="p-2 text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200" title="إصدار فاتورة"><FileText size={16} /></button>
                                                {canDelete && <button onClick={() => handleDelete(op.id)} className="p-2 text-red-500 bg-red-50 rounded-full hover:bg-red-100" title="حذف"><Trash2 size={16} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                            <tfoot className="sticky bottom-0 z-10 bg-primary-light shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                                <tr className="font-extrabold border-t-2 border-primary-dark/30">
                                    <td className="p-4" colSpan={5}>الإجمالي</td>
                                    <td className="p-4 text-center font-mono text-text-primary">{formatCurrency(totals.totalRevenue)}</td>
                                    <td className="p-4 text-center font-mono text-red-600">({formatCurrency(totals.totalCost)})</td>
                                    <td className={`p-4 text-center font-mono ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totals.totalProfit)}</td>
                                    <td className="p-4 no-print"></td>
                                </tr>
                            </tfoot>
                        </table>
                        {filteredOperations.length === 0 && <p className="text-center text-text-secondary p-8">لا توجد عمليات تطابق الفلتر الحالي.</p>}
                    </div>
                </div>
            </div>
            
            {viewingDocument?.type === 'invoice' && viewingDocument.operation && viewingDocument.client && (
              <Invoice operation={viewingDocument.operation} client={viewingDocument.client} onClose={() => setViewingDocument(null)} />
            )}
            {viewingDocument?.type === 'statement' && viewingDocument.client && (
                <AccountStatement client={viewingDocument.client} operations={operations} onClose={() => setViewingDocument(null)} />
            )}
        </div>
    );
};

export default Operations;
