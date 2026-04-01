import React, { useMemo } from 'react';
import { Operation, Account, OperationType, Document, User } from '../types.ts';
import { X } from 'lucide-react';
import DocumentManager from './DocumentManager.tsx';
import { canPerformAction } from '../permissions.ts';

// Helpers
const formatCurrency = (amount: number = 0) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

const typeMap: Record<OperationType, string> = {
    'import': 'استيراد',
    'export': 'تصدير',
    'sea-clearance': 'تخليص بحري',
    'air-clearance': 'تخليص جوي',
    'return': 'مرتجع',
    'credit-note': 'إشعار دائن',
};

const statusMap: Record<Operation['status'], {text: string, className: string}> = { 
    'in-progress': { text: 'قيد التنفيذ', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' }, 
    'completed': { text: 'مكتملة', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' }, 
    'postponed': { text: 'مؤجلة', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' }
};

interface OperationDetailViewProps {
  operation: Operation;
  client: Account;
  onClose: () => void;
  onNavigateToJournal: (view: string) => void;
  documents: Document[];
  allDocuments: Document[];
  addDocument: (file: File, linkedToId: string, linkedToType: 'account' | 'operation') => Promise<void>;
  deleteDocument: (id: string) => void;
  linkExistingDocuments: (documentsToLink: Document[], linkedToId: string, linkedToType: 'account' | 'operation') => void;
  currentUser: User;
}

const DetailItem: React.FC<{ label: string; value: string | React.ReactNode; className?: string }> = ({ label, value, className }) => (
    <div className={className}>
        <p className="text-sm font-semibold text-text-secondary">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
);

const OperationDetailView: React.FC<OperationDetailViewProps> = ({ operation, client, onClose, onNavigateToJournal, documents, allDocuments, addDocument, deleteDocument, linkExistingDocuments, currentUser }) => {
    const calculations = useMemo(() => {
        const lineItems = operation.lineItems || [];
        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

        const scheduleTaxAmount = lineItems
            .filter(item => item.taxType === 'schedule')
            .reduce((sum, item) => sum + (item.amount * 0.10), 0);
        
        const vatAmount = lineItems
            .filter(item => item.taxType === 'vat')
            .reduce((sum, item) => sum + (item.amount * 0.14), 0);
        
        const totalAmount = subtotal + scheduleTaxAmount + vatAmount;
        const profit = totalAmount - (operation.cost || 0);
        return { subtotal, scheduleTaxAmount, vatAmount, totalAmount, profit };
    }, [operation]);

    const canManageDocs = canPerformAction(currentUser.role, 'edit');

    const sortedHistory = useMemo(() => {
        return (operation.statusHistory || []).slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [operation.statusHistory]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-primary-dark/20">
                    <h2 className="text-2xl font-bold text-slate-800">تفاصيل العملية: {operation.code}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    <div className="bg-primary p-4 rounded-xl shadow-neumo-sm">
                        <h3 className="font-bold text-lg text-slate-700 mb-2">البيانات الأساسية</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <DetailItem label="العميل" value={client.name.replace('العملاء - ', '')} className="col-span-2" />
                            <DetailItem label="تاريخ الإنشاء" value={new Date(operation.creationDate).toLocaleDateString('ar-EG-u-nu-latn')} />
                            <DetailItem label="الحالة" value={<span className={`px-3 py-1 text-base font-semibold rounded-full ${statusMap[operation.status].className}`}>{statusMap[operation.status].text}</span>} />
                            <DetailItem 
                                label="القيد المحاسبي" 
                                value={
                                    operation.journalEntryId ? (
                                        <button 
                                            onClick={() => onNavigateToJournal('journal')} 
                                            className="text-accent font-bold hover:underline"
                                            title="الانتقال إلى سجل القيود اليومية"
                                        >
                                            {`مرتبط (ID: ...${operation.journalEntryId.slice(-6)})`}
                                        </button>
                                    ) : (
                                        'غير مرتبط'
                                    )
                                } 
                            />
                            <DetailItem label="الوصف" value={operation.description} className="col-span-full" />
                        </div>
                    </div>
                    <div className="bg-primary p-4 rounded-xl shadow-neumo-sm">
                        <h3 className="font-bold text-lg text-slate-700 mb-2">بيانات الشحنة</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <DetailItem label="نوع العملية" value={typeMap[operation.type]} />
                             <DetailItem label="رقم بوليصة الشحن" value={operation.billOfLading || '-'} />
                             <DetailItem label="رقم الحاوية" value={operation.containerNumber || '-'} />
                             <DetailItem label="رقم الرحلة" value={operation.voyageNumber || '-'} />
                             <DetailItem label="ميناء الشحن" value={operation.portOfLoading || '-'} />
                             <DetailItem label="ميناء الوصول" value={operation.portOfDischarge || '-'} />
                        </div>
                    </div>

                    <div className="bg-primary p-4 rounded-xl shadow-neumo-sm">
                        <h3 className="font-bold text-lg text-slate-700 mb-2">سجل حالة العملية</h3>
                        {sortedHistory.length > 0 ? (
                            <div className="relative pr-4">
                                <div className="absolute top-0 bottom-0 right-6 w-0.5 bg-primary-dark/30"></div>
                                <ul className="space-y-4">
                                    {sortedHistory.map((historyItem, index) => (
                                        <li key={index} className="relative pr-8">
                                            <div className="absolute right-[19px] top-1.5 w-5 h-5 bg-accent rounded-full border-4 border-primary"></div>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusMap[historyItem.status].className}`}>{statusMap[historyItem.status].text}</span>
                                            <p className="text-sm text-text-secondary mt-1">
                                                {new Date(historyItem.timestamp).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })} بواسطة {historyItem.username}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p className="text-text-secondary text-sm">لا يوجد سجل تاريخي للحالة.</p>
                        )}
                    </div>
                    
                    <DocumentManager 
                        linkedToId={operation.id}
                        linkedToType="operation"
                        documents={documents}
                        allDocuments={allDocuments}
                        addDocument={addDocument}
                        deleteDocument={deleteDocument}
                        linkExistingDocuments={linkExistingDocuments}
                        canManage={canManageDocs}
                    />

                    <div className="bg-primary p-4 rounded-xl shadow-neumo-sm">
                         <h3 className="font-bold text-lg text-slate-700 mb-2">البيانات المالية</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-text-secondary mb-1">بنود الإيرادات</h4>
                                <div className="space-y-1 bg-primary p-2 rounded-lg shadow-neumo-inset-sm">
                                    {(operation.lineItems || []).map(item => (
                                        <div key={item.id} className="flex justify-between items-center p-1">
                                            <span>{item.description}</span>
                                            <span className="font-mono font-semibold">{formatCurrency(item.amount)}</span>
                                        </div>
                                    ))}
                                    {(operation.lineItems || []).length === 0 && <p className="text-center text-sm text-text-secondary">لا توجد بنود</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-text-secondary mb-1">الملخص المالي</h4>
                                <div className="flex justify-between p-1"><span className="font-semibold">الإجمالي الفرعي:</span><span className="font-mono">{formatCurrency(calculations.subtotal)}</span></div>
                                <div className="flex justify-between p-1"><span className="font-semibold">ضريبة جدول:</span><span className="font-mono">{formatCurrency(calculations.scheduleTaxAmount)}</span></div>
                                <div className="flex justify-between p-1"><span className="font-semibold">ضريبة ق.م (14%):</span><span className="font-mono">{calculations.vatAmount > 0 ? formatCurrency(calculations.vatAmount) : '-'}</span></div>
                                <div className="flex justify-between p-1 border-t mt-1 font-bold text-lg"><span className="text-slate-800">إجمالي الإيرادات:</span><span className="font-mono text-text-primary">{formatCurrency(calculations.totalAmount)}</span></div>
                                <div className="flex justify-between p-1"><span className="font-semibold">التكلفة:</span><span className="font-mono text-debit">({formatCurrency(operation.cost)})</span></div>
                                <div className="flex justify-between p-1 border-t mt-1 font-bold text-lg"><span className="text-slate-800">صافي الربح:</span><span className={`font-mono ${calculations.profit >= 0 ? 'text-credit' : 'text-debit'}`}>{formatCurrency(calculations.profit)}</span></div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OperationDetailView;