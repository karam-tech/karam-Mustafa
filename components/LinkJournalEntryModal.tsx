import React, { useState, useMemo } from 'react';
import { JournalEntry, Operation } from '../types';
import { X, Search } from 'lucide-react';

interface LinkJournalEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    operationToLink: Operation | null;
    journalEntries: JournalEntry[];
    operations: Operation[];
    onLink: (operationId: string, journalEntryId: string) => void;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

const LinkJournalEntryModal: React.FC<LinkJournalEntryModalProps> = ({ isOpen, onClose, operationToLink, journalEntries, operations, onLink }) => {
    const [filters, setFilters] = useState({ startDate: '', endDate: '', description: '' });

    const unlinkedJournalEntries = useMemo(() => {
        const linkedIds = new Set(operations.map(op => op.journalEntryId).filter(Boolean));
        return journalEntries.filter(je => !linkedIds.has(je.id));
    }, [journalEntries, operations]);

    const filteredEntries = useMemo(() => {
        return unlinkedJournalEntries.filter(entry => {
            const dateMatch = (!filters.startDate || entry.date >= filters.startDate) && (!filters.endDate || entry.date <= filters.endDate);
            const descMatch = !filters.description || entry.description.toLowerCase().includes(filters.description.toLowerCase());
            return dateMatch && descMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [unlinkedJournalEntries, filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    if (!isOpen || !operationToLink) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">ربط قيد يومية بالعملية: {operationToLink.code}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm"><X size={24} /></button>
                </div>
                
                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-primary rounded-lg shadow-neumo-sm">
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm" title="From Date"/>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm" title="To Date"/>
                    <div className="relative">
                        <input type="text" name="description" placeholder="بحث بالوصف..." value={filters.description} onChange={handleFilterChange} className="w-full p-2 pl-8 bg-primary rounded-lg shadow-neumo-inset-sm"/>
                        <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary"/>
                    </div>
                </div>

                {/* Journal Entry List */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b-2 border-primary-dark/30">
                                <th className="p-2 font-semibold text-slate-700">التاريخ</th>
                                <th className="p-2 font-semibold text-slate-700">الوصف</th>
                                <th className="p-2 font-semibold text-slate-700 text-center">المبلغ</th>
                                <th className="p-2 font-semibold text-slate-700 text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntries.map(entry => {
                                const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
                                return (
                                    <tr key={entry.id} className="border-b border-primary-dark/20">
                                        <td className="p-2">{entry.date}</td>
                                        <td className="p-2 truncate" title={entry.description}>{entry.description}</td>
                                        <td className="p-2 text-center font-mono">{formatCurrency(totalDebit)}</td>
                                        <td className="p-2 text-center">
                                            <button 
                                                onClick={() => onLink(operationToLink.id, entry.id)}
                                                className="px-3 py-1 bg-accent text-white text-sm rounded-md hover:bg-accent-dark font-semibold"
                                            >
                                                ربط
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredEntries.length === 0 && (
                                <tr><td colSpan={4} className="text-center p-8 text-text-secondary">لا توجد قيود يومية غير مرتبطة تطابق البحث.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LinkJournalEntryModal;