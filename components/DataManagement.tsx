
import React, { useState, useMemo } from 'react';
import { Database, AlertTriangle, File, FileDown, Filter, Upload, HardDrive, Save } from 'lucide-react';
import { Account, JournalEntry, Operation, Employee, AttendanceRecord, User, PayrollEntry, OperationType, OperationStatus, AccountType } from '../types';
import { LayoutProps } from './Layout.tsx';
import ExportDropdown from './ExportDropdown.tsx';

// Use the exported LayoutProps to get all props passed down from App
interface DataManagementProps extends Omit<LayoutProps, 'children'> {}

const DataManagement: React.FC<DataManagementProps> = (props) => {
    const [exportType, setExportType] = useState<'none' | 'journal' | 'operations' | 'accounts'>('none');
    
    const [journalFilters, setJournalFilters] = useState({ startDate: '', endDate: '', description: '', accountId: 'all' });
    const [operationFilters, setOperationFilters] = useState({ startDate: '', endDate: '', clientId: 'all', status: 'all' as OperationStatus | 'all', type: 'all' as OperationType | 'all' });
    const [accountFilters, setAccountFilters] = useState({ name: '', type: 'all' as AccountType | 'all' });
    
    const [importType, setImportType] = useState<'accounts'>('accounts');

    const customerAccounts = useMemo(() => props.accounts.filter(acc => acc.type === 'Asset' && acc.name.startsWith('العملاء')), [props.accounts]);
    const opTypes: OperationType[] = ['import', 'export', 'sea-clearance', 'air-clearance', 'return', 'credit-note'];
    const opStatuses: OperationStatus[] = ['in-progress', 'completed', 'postponed'];
    const accountTypes: AccountType[] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];


    const handleFilterChange = (type: 'journal' | 'operations' | 'accounts', field: string, value: string) => {
        if (type === 'journal') setJournalFilters(prev => ({ ...prev, [field]: value }));
        else if (type === 'operations') setOperationFilters(prev => ({ ...prev, [field]: value }));
        else if (type === 'accounts') setAccountFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleCsvFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content) {
                props.handleImportCsv(content, importType);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const { filteredData, exportHeaders, exportRows, exportTitle } = useMemo(() => {
        let dataToExport: any[] = [];
        let headers: string[] = [];
        let rows: (string|number)[][] = [];
        let title = '';

        if (exportType === 'journal') {
            title = 'Journal_Entries';
            headers = ['ID', 'Date', 'Description', 'Line Account ID', 'Line Account Name', 'Debit', 'Credit'];
            dataToExport = props.journalEntries.filter(entry => {
                const dateMatch = (!journalFilters.startDate || entry.date >= journalFilters.startDate) && (!journalFilters.endDate || entry.date <= journalFilters.endDate);
                const descMatch = !journalFilters.description || entry.description.toLowerCase().includes(journalFilters.description.toLowerCase());
                const accountMatch = journalFilters.accountId === 'all' || entry.lines.some(l => l.accountId === journalFilters.accountId);
                return dateMatch && descMatch && accountMatch;
            });
            dataToExport.forEach(entry => {
                entry.lines.forEach(line => {
                    const account = props.accounts.find(a => a.id === line.accountId);
                    rows.push([entry.id, entry.date, entry.description, line.accountId, account?.name || '', line.debit, line.credit]);
                });
            });
        } else if (exportType === 'operations') {
            title = 'Operations';
            headers = ['ID', 'Code', 'Creation Date', 'Client Name', 'Type', 'Status', 'Description', 'Cost'];
            dataToExport = props.operations.filter(op => {
                 const dateMatch = (!operationFilters.startDate || op.creationDate >= operationFilters.startDate) && (!operationFilters.endDate || op.creationDate <= operationFilters.endDate);
                const clientMatch = operationFilters.clientId === 'all' || op.clientId === operationFilters.clientId;
                const statusMatch = operationFilters.status === 'all' || op.status === operationFilters.status;
                const typeMatch = operationFilters.type === 'all' || op.type === operationFilters.type;
                return dateMatch && clientMatch && statusMatch && typeMatch;
            });
            rows = dataToExport.map(op => {
                const client = props.accounts.find(a => a.id === op.clientId);
                return [op.id, op.code, op.creationDate, client?.name || '', op.type, op.status, op.description, op.cost || 0];
            });
        } else if (exportType === 'accounts') {
            title = 'Accounts';
            headers = ['ID', 'Name', 'Type', 'Opening Balance', 'Currency'];
            dataToExport = props.accounts.filter(acc => {
                const nameMatch = !accountFilters.name || acc.name.toLowerCase().includes(accountFilters.name.toLowerCase());
                const typeMatch = accountFilters.type === 'all' || acc.type === accountFilters.type;
                return nameMatch && typeMatch;
            });
            rows = dataToExport.map(acc => [acc.id, acc.name, acc.type, acc.openingBalance || 0, acc.currency || 'EGP']);
        }
        
        return { filteredData: dataToExport, exportHeaders: headers, exportRows: rows, exportTitle: title };
    }, [exportType, journalFilters, operationFilters, accountFilters, props.journalEntries, props.operations, props.accounts]);

    const handleSelectiveJsonExport = () => {
        if (filteredData.length === 0) {
            props.requestConfirmation({
                title: 'تنبيه',
                message: 'لا توجد بيانات تطابق معايير البحث للتصدير.',
                onConfirm: () => {},
                variant: 'primary'
            });
            return;
        }
        try {
            const dataStr = JSON.stringify({ [`exported_${exportTitle.toLowerCase()}`]: filteredData }, null, 2);
            const blob = new Blob([dataStr], { type: "application/json;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.download = `selective_export_${exportTitle.toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            props.requestConfirmation({
                title: 'خطأ',
                message: 'حدث خطأ أثناء تصدير البيانات.',
                onConfirm: () => {},
                variant: 'danger'
            });
        }
    };

    return (
        <div className="bg-primary p-8 rounded-2xl shadow-neumo space-y-8 max-w-4xl mx-auto">
            
            {/* --- Hard Drive Storage Section --- */}
            <div className="bg-primary p-4 rounded-xl shadow-neumo-sm border-2 border-accent/20">
                <div className="flex items-start gap-4">
                    <HardDrive size={32} className="text-accent flex-shrink-0 mt-1" />
                    <div className="flex-1">
                        <h2 className="text-xl font-extrabold text-slate-700">التخزين المحلي على القرص الصلب</h2>
                        <p className="text-text-secondary mt-1">
                            يمكنك ربط التطبيق بملف على جهازك ليقوم بالحفظ التلقائي عليه مباشرة بدلاً من استخدام ذاكرة المتصفح المؤقتة. هذا الخيار هو الأفضل للأداء العالي وحماية البيانات.
                        </p>
                        
                        <div className="mt-4 p-3 bg-primary-light rounded-lg flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-text-secondary">الحالة الحالية:</span>
                                {props.storageStatus === 'disk' ? (
                                    <span className="text-green-600 font-bold bg-green-100 px-2 py-1 rounded-md flex items-center gap-1"><HardDrive size={14}/> متصل بـ {props.fileName}</span>
                                ) : (
                                    <span className="text-amber-600 font-bold bg-amber-100 px-2 py-1 rounded-md">غير متصل (تخزين مؤقت)</span>
                                )}
                            </div>
                            {props.lastSavedTime && (
                                <span className="text-xs text-text-secondary">آخر حفظ: {props.lastSavedTime.toLocaleTimeString()}</span>
                            )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                            <button 
                                onClick={props.handleCreateLocalFile} 
                                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-bold shadow-sm"
                            >
                                <Save size={18} /> إنشاء ملف جديد وحفظه
                            </button>
                            <button 
                                onClick={props.handleConnectLocalFile} 
                                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-accent text-accent rounded-md hover:bg-accent hover:text-white font-bold transition-colors"
                            >
                                <HardDrive size={18} /> فتح ملف موجود والعمل عليه
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-primary p-4 rounded-xl shadow-neumo-sm">
                <div className="flex items-start gap-4">
                    <FileDown size={24} className="text-green-500 flex-shrink-0 mt-1" />
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-700">نسخ احتياطي يدوي (تنزيل)</h2>
                        <p className="text-text-secondary mt-1">
                            تنزيل نسخة من البيانات الحالية كملف JSON (للنقل أو الأرشفة). هذا لا يربط التطبيق بالملف.
                        </p>
                        <button onClick={() => props.handleSaveFile(true)} className="mt-4 flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-bold shadow-sm">
                            <FileDown size={20} /> تنزيل نسخة (JSON)
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-primary p-4 rounded-xl shadow-neumo-sm">
                 <div className="flex items-start gap-4">
                    <Upload size={24} className="text-blue-500 flex-shrink-0 mt-1" />
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-700">استيراد بيانات من CSV</h2>
                        <p className="text-text-secondary mt-1">استيراد دفعات من البيانات الجديدة من ملف CSV. النظام سيتجاهل أي سجلات مكررة.</p>
                        <div className="mt-4 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md text-sm">
                            <p className="font-bold">ملاحظة هامة: لاستيراد الحسابات، يجب أن يحتوي ملف CSV على الأعمدة التالية باللغة الإنجليزية: <strong>id, name, type, openingbalance</strong>. الأعمدة الأخرى اختيارية.</p>
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                             <select value={importType} onChange={e => setImportType(e.target.value as 'accounts')} className="p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none">
                                <option value="accounts">الحسابات</option>
                            </select>
                            <label className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold shadow-sm cursor-pointer">
                                <Upload size={20} /> اختر ملف CSV
                                <input type="file" accept=".csv" onChange={handleCsvFileImport} className="hidden"/>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-primary p-4 rounded-xl shadow-neumo-sm">
                 <div className="flex items-start gap-4">
                    <Filter size={24} className="text-purple-500 flex-shrink-0 mt-1" />
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-700">تصدير مخصص</h2>
                        <p className="text-text-secondary mt-1">اختر نوع البيانات، قم بتطبيق الفلاتر، ثم قم بالتصدير بالصيغة التي تريدها.</p>
                        <div className="mt-4"><label className="font-bold text-text-secondary">1. اختر نوع البيانات:</label><select value={exportType} onChange={(e) => setExportType(e.target.value as any)} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none"><option value="none">-- اختر --</option><option value="journal">قيود اليومية</option><option value="operations">العمليات</option><option value="accounts">الحسابات</option></select></div>

                        {exportType !== 'none' && (
                            <div className="mt-4 space-y-4">
                                <h3 className="font-bold text-text-secondary">2. قم بتطبيق الفلاتر:</h3>
                                {exportType === 'journal' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 bg-primary rounded-lg shadow-neumo-inset-sm"><input type="date" value={journalFilters.startDate} onChange={e => handleFilterChange('journal', 'startDate', e.target.value)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm" title="From Date"/><input type="date" value={journalFilters.endDate} onChange={e => handleFilterChange('journal', 'endDate', e.target.value)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm" title="To Date"/><input type="text" placeholder="بحث بالوصف..." value={journalFilters.description} onChange={e => handleFilterChange('journal', 'description', e.target.value)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm col-span-2"/><select value={journalFilters.accountId} onChange={e => handleFilterChange('journal', 'accountId', e.target.value)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm col-span-2 appearance-none"><option value="all">كل الحسابات</option>{props.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>}
                                {exportType === 'operations' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 bg-primary rounded-lg shadow-neumo-inset-sm"><input type="date" value={operationFilters.startDate} onChange={e => handleFilterChange('operations', 'startDate', e.target.value)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm" title="From Date"/><input type="date" value={operationFilters.endDate} onChange={e => handleFilterChange('operations', 'endDate', e.target.value)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm" title="To Date"/><select value={operationFilters.clientId} onChange={e => handleFilterChange('operations', 'clientId', e.target.value)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none"><option value="all">كل العملاء</option>{customerAccounts.map(c => <option key={c.id} value={c.id}>{c.name.replace('العملاء - ', '')}</option>)}</select><select value={operationFilters.status} onChange={e => handleFilterChange('operations', 'status', e.target.value)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none"><option value="all">كل الحالات</option>{opStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select><select value={operationFilters.type} onChange={e => handleFilterChange('operations', 'type', e.target.value)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm col-span-2 appearance-none"><option value="all">كل الأنواع</option>{opTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>}
                                {exportType === 'accounts' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 bg-primary rounded-lg shadow-neumo-inset-sm"><input type="text" placeholder="بحث بالاسم..." value={accountFilters.name} onChange={e => handleFilterChange('accounts', 'name', e.target.value)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm"/><select value={accountFilters.type} onChange={e => handleFilterChange('accounts', 'type', e.target.value)} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none"><option value="all">كل الأنواع</option>{accountTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>}
                                
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold text-text-secondary">3. تصدير:</h3>
                                    <ExportDropdown title={exportTitle} csvHeaders={exportHeaders} csvData={exportRows} emailBodyContent={`Report for ${exportTitle}`} onPrint={() => window.print()} />
                                    <button onClick={handleSelectiveJsonExport} className="flex items-center gap-2 px-4 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold">JSON</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-xl shadow-md">
                <h2 className="text-xl font-extrabold">إعادة ضبط المصنع</h2>
                <p className="mt-2"><strong className="font-extrabold">تحذير خطير:</strong> سيؤدي هذا الإجراء إلى حذف جميع البيانات التي أدخلتها بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.</p>
                <button 
                    onClick={() => {
                        props.requestConfirmation({
                            title: 'تأكيد إعادة ضبط المصنع',
                            message: 'هل أنت متأكد من رغبتك في حذف جميع البيانات بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.',
                            onConfirm: props.handleDataReset,
                            variant: 'danger'
                        });
                    }} 
                    className="mt-4 flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-800 font-bold shadow-sm"
                >
                    <AlertTriangle size={20} /> إعادة ضبط جميع البيانات
                </button>
            </div>
        </div>
    );
};

export default DataManagement;
