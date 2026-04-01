import React, { useState, useEffect, useRef } from 'react';
import { Operation, JournalEntry, Account } from '../types.ts';
import { Search, Briefcase, Book, ListChecks } from 'lucide-react';

interface GlobalSearchProps {
    operations: Operation[];
    journalEntries: JournalEntry[];
    accounts: Account[];
    onNavigate: (viewId: string) => void;
    onNavigateToAccount: (account: Account) => void;
    onNavigateToOperation: (operation: Operation) => void;
}

interface SearchResults {
    operations: Operation[];
    journalEntries: JournalEntry[];
    accounts: Account[];
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ operations, journalEntries, accounts, onNavigate, onNavigateToAccount, onNavigateToOperation }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ operations: [], journalEntries: [], accounts: [] });
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
        };
    }, []);

    useEffect(() => {
        if (query.length < 2) {
            setResults({ operations: [], journalEntries: [], accounts: [] });
            setIsOpen(false);
            return;
        }

        const lowerCaseQuery = query.toLowerCase();

        const filteredOps = operations.filter(op => 
            op.code.toLowerCase().includes(lowerCaseQuery) ||
            op.description.toLowerCase().includes(lowerCaseQuery) ||
            accounts.find(a => a.id === op.clientId)?.name.toLowerCase().includes(lowerCaseQuery)
        ).slice(0, 5);

        const filteredJournal = journalEntries.filter(je =>
            je.description.toLowerCase().includes(lowerCaseQuery) ||
            je.referenceNumber?.toLowerCase().includes(lowerCaseQuery)
        ).slice(0, 5);

        const filteredAccounts = accounts.filter(acc =>
            acc.name.toLowerCase().includes(lowerCaseQuery) ||
            acc.id.toLowerCase().includes(lowerCaseQuery)
        ).slice(0, 5);
        
        const hasResults = filteredOps.length > 0 || filteredJournal.length > 0 || filteredAccounts.length > 0;
        setResults({ operations: filteredOps, journalEntries: filteredJournal, accounts: filteredAccounts });
        setIsOpen(hasResults);

    }, [query, operations, journalEntries, accounts]);

    const handleSelect = (action: () => void) => {
        setIsOpen(false);
        setQuery('');
        action();
    };
    
    const ResultItem: React.FC<{
        onClick: () => void;
        icon: React.ReactNode;
        title: string;
        subtitle: string;
    }> = ({ onClick, icon, title, subtitle }) => (
        <li 
            onClick={onClick}
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-primary-dark/20 rounded-lg transition-colors"
        >
            <div className="text-accent">{icon}</div>
            <div>
                <p className="font-semibold text-slate-800">{title}</p>
                <p className="text-xs text-text-secondary">{subtitle}</p>
            </div>
        </li>
    );

    return (
        <div className="relative w-full" ref={searchRef}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    placeholder="بحث شامل..."
                    className="w-full p-2 pl-10 bg-primary rounded-xl text-sm shadow-neumo-inset-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            </div>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-primary rounded-2xl shadow-neumo z-50 p-2 max-h-96 overflow-y-auto">
                    <ul className="space-y-1">
                        {results.operations.length > 0 && (
                            <>
                                <li className="px-3 py-1 font-bold text-xs text-text-secondary uppercase">العمليات</li>
                                {results.operations.map(op => (
                                    <ResultItem 
                                        key={op.id}
                                        onClick={() => handleSelect(() => onNavigateToOperation(op))}
                                        icon={<Briefcase size={18}/>}
                                        title={op.code}
                                        subtitle={`${accounts.find(a => a.id === op.clientId)?.name.replace('العملاء - ','')} - ${op.description}`}
                                    />
                                ))}
                            </>
                        )}
                        {results.journalEntries.length > 0 && (
                             <>
                                <li className="px-3 py-1 mt-2 font-bold text-xs text-text-secondary uppercase">قيود اليومية</li>
                                {results.journalEntries.map(je => (
                                    <ResultItem 
                                        key={je.id}
                                        onClick={() => handleSelect(() => onNavigate('journal'))}
                                        icon={<Book size={18}/>}
                                        title={je.description}
                                        subtitle={new Date(je.date).toLocaleDateString('ar-EG-u-nu-latn')}
                                    />
                                ))}
                            </>
                        )}
                        {results.accounts.length > 0 && (
                            <>
                                <li className="px-3 py-1 mt-2 font-bold text-xs text-text-secondary uppercase">الحسابات</li>
                                {results.accounts.map(acc => (
                                    <ResultItem 
                                        key={acc.id}
                                        onClick={() => handleSelect(() => onNavigateToAccount(acc))}
                                        icon={<ListChecks size={18}/>}
                                        title={acc.name}
                                        subtitle={`#${acc.id}`}
                                    />
                                ))}
                            </>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;