import React, { useState, useMemo } from 'react';
import { AuditLogEntry, User } from '../types.ts';
import { ChevronDown, ChevronUp, History, User as UserIcon, Calendar, Filter, XCircle } from 'lucide-react';

interface AuditLogViewProps {
    auditLog: AuditLogEntry[];
    users: User[];
}

const actionMap: Record<AuditLogEntry['action'], { text: string; color: string }> = {
    create: { text: 'إنشاء', color: 'bg-green-100 text-green-800' },
    update: { text: 'تعديل', color: 'bg-blue-100 text-blue-800' },
    delete: { text: 'حذف', color: 'bg-red-100 text-red-800' },
};

const entityTypeMap: Record<AuditLogEntry['entityType'], string> = {
    Account: 'حساب',
    Operation: 'عملية',
    JournalEntry: 'قيد يومية',
    PriceList: 'قائمة أسعار',
    Employee: 'موظف',
    User: 'مستخدم',
    PayrollEntry: 'كشف رواتب',
    Document: 'مستند',
};

const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLog, users }) => {
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        userId: 'all',
        entityType: 'all',
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const resetFilters = () => {
        setFilters({ startDate: '', endDate: '', userId: 'all', entityType: 'all' });
    };

    const filteredLog = useMemo(() => {
        return auditLog.filter(log => {
            const logDate = log.timestamp.split('T')[0];
            const dateMatch = (!filters.startDate || logDate >= filters.startDate) && (!filters.endDate || logDate <= filters.endDate);
            const userMatch = filters.userId === 'all' || log.userId === filters.userId;
            const entityMatch = filters.entityType === 'all' || log.entityType === filters.entityType;
            return dateMatch && userMatch && entityMatch;
        });
    }, [auditLog, filters]);

    return (
        <div className="bg-primary p-6 rounded-2xl shadow-neumo">
            <h2 className="text-3xl font-bold text-text-primary mb-6 flex items-center gap-3">
                <History size={32} />
                سجل التدقيق
            </h2>
            
            <div className="bg-primary p-4 rounded-xl shadow-neumo-sm mb-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="text-sm font-semibold text-text-secondary flex items-center gap-1 mb-1"><Calendar size={14}/>من تاريخ</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm"/>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-text-secondary flex items-center gap-1 mb-1"><Calendar size={14}/>إلى تاريخ</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm"/>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-text-secondary flex items-center gap-1 mb-1"><UserIcon size={14}/>المستخدم</label>
                        <select name="userId" value={filters.userId} onChange={handleFilterChange} className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none">
                            <option value="all">الكل</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-text-secondary flex items-center gap-1 mb-1"><Filter size={14}/>نوع الكيان</label>
                        <select name="entityType" value={filters.entityType} onChange={handleFilterChange} className="w-full p-2 bg-primary rounded-lg shadow-neumo-inset-sm appearance-none">
                            <option value="all">الكل</option>
                            {Object.entries(entityTypeMap).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                        </select>
                    </div>
                     <button onClick={resetFilters} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-accent rounded-md hover:shadow-neumo-inset shadow-neumo-sm font-semibold">
                        <XCircle size={16}/> إعادة تعيين
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead>
                        <tr className="border-b-2 border-primary-dark/30">
                            <th className="p-3 font-bold text-lg text-text-primary">الوقت</th>
                            <th className="p-3 font-bold text-lg text-text-primary">المستخدم</th>
                            <th className="p-3 font-bold text-lg text-text-primary">الإجراء</th>
                            <th className="p-3 font-bold text-lg text-text-primary">النوع</th>
                            <th className="p-3 font-bold text-lg text-text-primary">الوصف</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLog.map(log => (
                            <React.Fragment key={log.id}>
                                <tr 
                                    className={`border-b border-primary-dark/20 ${log.action === 'update' ? 'cursor-pointer hover:shadow-neumo-inset-sm' : ''}`}
                                    onClick={() => log.action === 'update' && setExpandedRowId(prev => prev === log.id ? null : log.id)}
                                >
                                    <td className="p-3 text-sm text-text-secondary whitespace-nowrap">{new Date(log.timestamp).toLocaleString('ar-EG')}</td>
                                    <td className="p-3 font-semibold">{log.username}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-sm font-bold rounded-full ${actionMap[log.action].color}`}>
                                            {actionMap[log.action].text}
                                        </span>
                                    </td>
                                    <td className="p-3">{entityTypeMap[log.entityType]}</td>
                                    <td className="p-3 font-semibold text-text-primary">
                                        <div className="flex items-center gap-2">
                                            <span>{log.entityDescription}</span>
                                            {log.action === 'update' && (
                                                expandedRowId === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedRowId === log.id && log.changes && (
                                    <tr className="bg-primary-light/50">
                                        <td colSpan={5} className="p-4">
                                            <div className="p-3 bg-primary rounded-lg shadow-neumo-inset-sm">
                                                <h4 className="font-bold mb-2">التغييرات:</h4>
                                                <table className="w-full text-sm">
                                                    <thead><tr className="border-b border-primary-dark/30"><th className="p-1 font-semibold">الحقل</th><th className="p-1 font-semibold">القيمة القديمة</th><th className="p-1 font-semibold">القيمة الجديدة</th></tr></thead>
                                                    <tbody>
                                                        {log.changes.map((change, index) => (
                                                            <tr key={index} className="border-b border-primary-dark/10">
                                                                <td className="p-1 font-mono">{change.field}</td>
                                                                <td className="p-1 text-red-600 max-w-xs truncate" title={change.oldValue}>{change.oldValue}</td>
                                                                <td className="p-1 text-green-600 max-w-xs truncate" title={change.newValue}>{change.newValue}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {filteredLog.length === 0 && (
                            <tr><td colSpan={5} className="text-center p-8 text-text-secondary">لا توجد سجلات تطابق معايير البحث.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogView;