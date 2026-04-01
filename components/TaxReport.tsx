import React, { useState, useMemo } from 'react';
import { Operation, Account, OperationStatus, OperationType } from '../types.ts';
import { Printer, XCircle } from 'lucide-react';

interface TaxReportProps {
    operations: Operation[];
    accounts: Account[];
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

// A reusable section component for consistency
const ReportSection: React.FC<{ title: string; children: React.ReactNode; total: number }> = ({ title, children, total }) => (
    <div className="bg-primary p-4 rounded-xl shadow-neumo-sm mb-6">
        <h3 className="text-xl font-bold text-slate-800 mb-3 border-b border-primary-dark/20 pb-2">{title}</h3>
        <div className="overflow-x-auto">
            {children}
        </div>
        <div className="text-left font-bold text-lg mt-2 p-2 bg-primary-light rounded-md">
            <span>الإجمالي: </span>
            <span className="font-mono text-accent-dark">{formatCurrency(total)}</span>
        </div>
    </div>
);

const TaxReport: React.FC<TaxReportProps> = ({ operations, accounts }) => {
    // State to hold the selected month in "YYYY-MM" format
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [filterStatus, setFilterStatus] = useState<OperationStatus | 'all'>('all');
    const [filterClient, setFilterClient] = useState<string>('all');
    const [filterType, setFilterType] = useState<OperationType | 'all'>('all');

    // Mappings for UI labels
    const typeMap: Record<OperationType, string> = {
        'import': 'استيراد',
        'export': 'تصدير',
        'sea-clearance': 'تخليص بحري',
        'air-clearance': 'تخليص جوي',
        'return': 'مرتجع',
        'credit-note': 'إشعار دائن',
    };
    const statusMap: Record<OperationStatus, string> = { 
        'in-progress': 'قيد التنفيذ', 
        'completed': 'مكتملة', 
        'postponed': 'مؤجلة'
    };

    const customerAccounts = useMemo(() => accounts.filter(acc => acc.type === 'Asset' && acc.name.startsWith('العملاء')), [accounts]);

    const reportData = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);

        // Filter operations for the selected month and year, plus new filters
        const filteredOps = operations.filter(op => {
            const opDate = new Date(op.creationDate);
            const dateMatch = opDate.getFullYear() === year && opDate.getMonth() + 1 === month;
            const statusMatch = filterStatus === 'all' || op.status === filterStatus;
            const clientMatch = filterClient === 'all' || op.clientId === filterClient;
            const typeMatch = filterType === 'all' || op.type === filterType;
            return dateMatch && statusMatch && clientMatch && typeMatch;
        });

        // VAT (14%) Calculation
        const vatDetails = filteredOps
            .map(op => {
                const taxAmount = op.lineItems
                    ?.filter(item => item.taxType === 'vat')
                    .reduce((sum, item) => sum + (item.amount * 0.14), 0) || 0;
                
                if (taxAmount > 0) {
                    const client = accounts.find(a => a.id === op.clientId);
                    return {
                        id: op.id,
                        code: op.code,
                        date: op.creationDate,
                        clientName: client ? client.name.replace('العملاء - ', '') : 'N/A',
                        taxAmount,
                    };
                }
                return null;
            }).filter((item): item is NonNullable<typeof item> => item !== null);
        const totalVat = vatDetails.reduce((sum, op) => sum + op.taxAmount, 0);

        // Schedule Tax (10%) Calculation
        const scheduleTaxDetails = filteredOps
            .map(op => {
                const taxAmount = op.lineItems
                    ?.filter(item => item.taxType === 'schedule')
                    .reduce((sum, item) => sum + (item.amount * 0.10), 0) || 0;
                
                if (taxAmount > 0) {
                    const client = accounts.find(a => a.id === op.clientId);
                    return {
                        id: op.id,
                        code: op.code,
                        date: op.creationDate,
                        clientName: client ? client.name.replace('العملاء - ', '') : 'N/A',
                        taxAmount,
                    };
                }
                return null;
            }).filter((item): item is NonNullable<typeof item> => item !== null);
        const totalScheduleTax = scheduleTaxDetails.reduce((sum, op) => sum + op.taxAmount, 0);

        return {
            vatDetails,
            totalVat,
            scheduleTaxDetails,
            totalScheduleTax,
            grandTotal: totalVat + totalScheduleTax
        };
    }, [selectedMonth, operations, accounts, filterStatus, filterClient, filterType]);
    
    const resetFilters = () => {
        setSelectedMonth(new Date().toISOString().slice(0, 7));
        setFilterStatus('all');
        setFilterClient('all');
        setFilterType('all');
    };

    const hasActiveFilters = filterStatus !== 'all' || filterClient !== 'all' || filterType !== 'all';
    const monthName = new Date(selectedMonth).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

    return (
        <div>
            {/* Header with controls - hidden on print */}
            <div className="bg-primary p-4 rounded-xl shadow-neumo-sm mb-6 no-print">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="text-sm font-semibold text-text-secondary">الشهر</label>
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full mt-1 p-2 bg-primary rounded-lg shadow-neumo-inset-sm"/>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-text-secondary">العميل</label>
                        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="w-full mt-1 p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none">
                            <option value="all">كل العملاء</option>
                            {customerAccounts.map(c => <option key={c.id} value={c.id}>{c.name.replace('العملاء - ', '')}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-text-secondary">نوع العملية</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="w-full mt-1 p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none">
                            <option value="all">كل الأنواع</option>
                            {Object.entries(typeMap).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-text-secondary">الحالة</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="w-full mt-1 p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none">
                            <option value="all">كل الحالات</option>
                             {Object.entries(statusMap).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        {hasActiveFilters && (
                             <button onClick={resetFilters} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-accent rounded-md hover:shadow-neumo-inset shadow-neumo-sm font-semibold">
                                <XCircle size={16}/> مسح
                            </button>
                        )}
                         <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold">
                            <Printer size={18} /> طباعة
                        </button>
                    </div>
                </div>
            </div>

            {/* Main report area */}
            <div className="bg-primary p-6 rounded-2xl shadow-neumo printable-area">
                {/* Header for printing */}
                <div className="print:block hidden text-center mb-4">
                    <h2 className="text-2xl font-bold">تقرير الضرائب - {monthName}</h2>
                </div>
                
                {reportData.vatDetails.length === 0 && reportData.scheduleTaxDetails.length === 0 ? (
                    <p className="text-center text-text-secondary py-16">لا توجد بيانات ضرائب مسجلة تطابق معايير البحث.</p>
                ) : (
                    <>
                        {/* VAT Section */}
                        {reportData.vatDetails.length > 0 && (
                            <ReportSection title="ضريبة القيمة المضافة (14%)" total={reportData.totalVat}>
                                <table className="w-full text-right text-slate-800">
                                    <thead>
                                        <tr className="border-b border-primary-dark/20">
                                            <th className="p-2 font-semibold">كود العملية</th>
                                            <th className="p-2 font-semibold">التاريخ</th>
                                            <th className="p-2 font-semibold">العميل</th>
                                            <th className="p-2 text-left font-semibold">مبلغ الضريبة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.vatDetails.map(item => (
                                            <tr key={item.id} className="border-b border-primary-dark/10">
                                                <td className="p-2 font-mono">{item.code}</td>
                                                <td className="p-2">{item.date}</td>
                                                <td className="p-2">{item.clientName}</td>
                                                <td className="p-2 text-left font-mono">{formatCurrency(item.taxAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ReportSection>
                        )}

                        {/* Schedule Tax Section */}
                         {reportData.scheduleTaxDetails.length > 0 && (
                            <ReportSection title="ضريبة جدول (10%)" total={reportData.totalScheduleTax}>
                                <table className="w-full text-right text-slate-800">
                                    <thead>
                                        <tr className="border-b border-primary-dark/20">
                                            <th className="p-2 font-semibold">كود العملية</th>
                                            <th className="p-2 font-semibold">التاريخ</th>
                                            <th className="p-2 font-semibold">العميل</th>
                                            <th className="p-2 text-left font-semibold">مبلغ الضريبة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.scheduleTaxDetails.map(item => (
                                            <tr key={item.id} className="border-b border-primary-dark/10">
                                                <td className="p-2 font-mono">{item.code}</td>
                                                <td className="p-2">{item.date}</td>
                                                <td className="p-2">{item.clientName}</td>
                                                <td className="p-2 text-left font-mono">{formatCurrency(item.taxAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ReportSection>
                        )}

                        {/* Grand Total */}
                        <div className="mt-8 p-4 bg-accent text-white rounded-xl shadow-md text-center">
                            <span className="text-xl font-bold">إجمالي الضرائب المستحقة للشهر: </span>
                            <span className="text-2xl font-bold font-mono">{formatCurrency(reportData.grandTotal)}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TaxReport;