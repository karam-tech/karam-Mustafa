
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Operation, Account, OperationType } from '../types';
import ExportDropdown from './ExportDropdown';
import { Filter, XCircle, ChevronDown, CheckSquare, Square } from 'lucide-react';

interface OperationalCostReportProps {
    operations: Operation[];
    accounts: Account[];
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

const typeMap: Record<OperationType, string> = {
    'import': 'استيراد',
    'export': 'تصدير',
    'sea-clearance': 'تخليص بحري',
    'air-clearance': 'تخليص جوي',
    'return': 'مرتجع',
    'credit-note': 'إشعار دائن',
};

const allOpTypes: OperationType[] = ['import', 'export', 'sea-clearance', 'air-clearance', 'return', 'credit-note'];

const OperationalCostReport: React.FC<OperationalCostReportProps> = ({ operations, accounts }) => {
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        clientId: 'all',
    });

    // Multi-select state
    const [selectedOpTypes, setSelectedOpTypes] = useState<OperationType[]>(allOpTypes);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const clientAccounts = useMemo(() => accounts.filter(a => a.name.startsWith("العملاء - ")), [accounts]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const toggleOpType = (type: OperationType) => {
        setSelectedOpTypes(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const toggleAllTypes = () => {
        if (selectedOpTypes.length === allOpTypes.length) {
            setSelectedOpTypes([]);
        } else {
            setSelectedOpTypes(allOpTypes);
        }
    };
    
    const resetFilters = () => {
        setFilters({ startDate: '', endDate: '', clientId: 'all' });
        setSelectedOpTypes(allOpTypes);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsTypeDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const { filteredData, totalCost } = useMemo(() => {
        const data = operations
            .filter(op => op.cost && op.cost > 0)
            .filter(op => {
                const dateMatch = (!filters.startDate || op.creationDate >= filters.startDate) && (!filters.endDate || op.creationDate <= filters.endDate);
                const clientMatch = filters.clientId === 'all' || op.clientId === filters.clientId;
                const typeMatch = selectedOpTypes.includes(op.type);
                return dateMatch && clientMatch && typeMatch;
            })
            .sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
        
        const totalCost = data.reduce((sum, op) => sum + (op.cost || 0), 0);
        
        return { filteredData: data, totalCost };
    }, [operations, filters, selectedOpTypes]);
    
    const { csvHeaders, csvData } = useMemo(() => {
        const headers = ["كود العملية", "التاريخ", "العميل", "النوع", "الوصف", "التكلفة"];
        const data = filteredData.map(op => {
            const clientName = accounts.find(a => a.id === op.clientId)?.name.replace('العملاء - ', '') || 'N/A';
            return [op.code, op.creationDate, clientName, typeMap[op.type], op.description, op.cost || 0];
        });
        return { csvHeaders: headers, csvData: data };
    }, [filteredData, accounts]);

    const emailBody = `تقرير تكاليف العمليات\n\nإجمالي التكاليف حسب الفلتر المطبق: ${formatCurrency(totalCost)}`;

    return (
        <div className="space-y-6">
            <div className="bg-primary p-4 rounded-xl shadow-neumo-sm no-print">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-sm font-semibold text-text-secondary">من تاريخ</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full mt-1 p-2 bg-primary rounded-lg shadow-neumo-inset-sm"/>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-text-secondary">إلى تاريخ</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full mt-1 p-2 bg-primary rounded-lg shadow-neumo-inset-sm"/>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-text-secondary">العميل</label>
                        <select name="clientId" value={filters.clientId} onChange={handleFilterChange} className="w-full mt-1 p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none">
                            <option value="all">كل العملاء</option>
                            {clientAccounts.map(c => <option key={c.id} value={c.id}>{c.name.replace('العملاء - ', '')}</option>)}
                        </select>
                    </div>
                    
                    {/* Multi-select Dropdown for Operation Type */}
                    <div className="relative" ref={dropdownRef}>
                        <label className="text-sm font-semibold text-text-secondary">نوع العملية</label>
                        <button 
                            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                            className="w-full mt-1 p-2 bg-primary rounded-lg shadow-neumo-inset-sm flex justify-between items-center text-sm"
                        >
                            <span className="truncate">
                                {selectedOpTypes.length === allOpTypes.length 
                                    ? 'كل الأنواع' 
                                    : selectedOpTypes.length === 0 
                                        ? 'اختر الأنواع...' 
                                        : `${selectedOpTypes.length} محدد`}
                            </span>
                            <ChevronDown size={16} />
                        </button>

                        {isTypeDropdownOpen && (
                            <div className="absolute top-full right-0 mt-1 w-full bg-primary border border-primary-dark/20 rounded-lg shadow-neumo z-20 max-h-60 overflow-y-auto p-2">
                                <div 
                                    className="flex items-center gap-2 p-2 hover:bg-primary-dark/10 rounded cursor-pointer border-b border-primary-dark/10 mb-1"
                                    onClick={toggleAllTypes}
                                >
                                    {selectedOpTypes.length === allOpTypes.length ? <CheckSquare size={16} className="text-accent"/> : <Square size={16} className="text-text-secondary"/>}
                                    <span className="font-bold text-sm">تحديد الكل</span>
                                </div>
                                {allOpTypes.map(type => (
                                    <div 
                                        key={type} 
                                        className="flex items-center gap-2 p-2 hover:bg-primary-dark/10 rounded cursor-pointer"
                                        onClick={() => toggleOpType(type)}
                                    >
                                        {selectedOpTypes.includes(type) ? <CheckSquare size={16} className="text-accent"/> : <Square size={16} className="text-text-secondary"/>}
                                        <span className="text-sm">{typeMap[type]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={resetFilters} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-accent rounded-md hover:shadow-neumo-inset shadow-neumo-sm font-semibold">
                            <XCircle size={16}/> مسح
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-primary p-6 rounded-2xl shadow-neumo printable-area">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-text-primary print:hidden">نتائج التقرير</h2>
                     <div className="print:block hidden text-center mb-4">
                        <h1 className="text-2xl font-bold">تقرير تكاليف العمليات</h1>
                        <p>عن الفترة من {filters.startDate || 'البداية'} إلى {filters.endDate || 'النهاية'}</p>
                    </div>
                    <div className="no-print">
                        <ExportDropdown
                            title="تقرير_تكاليف_العمليات"
                            csvHeaders={csvHeaders}
                            csvData={csvData}
                            emailBodyContent={emailBody}
                            onPrint={() => window.print()}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b-2 border-primary-dark/30">
                                <th className="p-3 font-bold text-lg text-text-primary">كود العملية</th>
                                <th className="p-3 font-bold text-lg text-text-primary">التاريخ</th>
                                <th className="p-3 font-bold text-lg text-text-primary">العميل</th>
                                <th className="p-3 font-bold text-lg text-text-primary">النوع</th>
                                <th className="p-3 font-bold text-lg text-text-primary">الوصف</th>
                                <th className="p-3 font-bold text-lg text-debit text-center">التكلفة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(op => {
                                const clientName = accounts.find(a => a.id === op.clientId)?.name.replace('العملاء - ', '') || 'N/A';
                                return (
                                    <tr key={op.id} className="border-b border-primary-dark/20">
                                        <td className="p-3 font-mono">{op.code}</td>
                                        <td className="p-3">{op.creationDate}</td>
                                        <td className="p-3 font-semibold">{clientName}</td>
                                        <td className="p-3">{typeMap[op.type]}</td>
                                        <td className="p-3">{op.description}</td>
                                        <td className="p-3 text-center font-mono font-bold text-debit">{formatCurrency(op.cost || 0)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="font-extrabold text-lg border-t-2 border-primary-dark/30 bg-primary-light">
                                <td className="p-4" colSpan={5}>الإجمالي</td>
                                <td className="p-4 text-center font-mono text-debit">{formatCurrency(totalCost)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    {filteredData.length === 0 && <p className="text-center text-text-secondary p-8">لا توجد عمليات تطابق معايير البحث.</p>}
                </div>
            </div>
        </div>
    );
};

export default OperationalCostReport;
