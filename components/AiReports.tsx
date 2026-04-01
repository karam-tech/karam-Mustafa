import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { JournalEntry, Account, Operation, OperationType, AuditFinding, FinancialTrendAnalysis, DecisionOption } from '../types.ts';
import { generateChartData, getBusinessAdvice, getAIAccountingAudit, getFinancialTrends, getDecisionSupport } from '../services/geminiService.ts';
import { Send, Filter, ShieldCheck, Info, AlertTriangle, XCircle, X, TrendingUp, BarChart2, Star, LineChart as LineChartIcon, Lightbulb, Printer, FileDown, BrainCircuit, Check, Minus } from 'lucide-react';
import { useChartStyles } from '../contexts/ChartStyleContext.tsx';
import TrendAnalysisModal from './TrendAnalysisModal.tsx';


interface AiReportsProps {
  journalEntries: JournalEntry[];
  accounts: Account[];
  operations: Operation[];
}

type TableData = {
    headers: string[];
    rows: (string | number)[][];
    summary?: { label: string; value: string; };
};

type Message = {
    sender: 'user' | 'ai';
    text?: string;
    chartData?: any;
    chartType?: 'bar' | 'pie' | 'line' | 'horizontal-bar';
    tableData?: TableData;
    isLoading?: boolean;
}

const getLegendProps = (position: 'top' | 'bottom' | 'right' | 'left') => {
    switch (position) {
        case 'top': return { verticalAlign: 'top' as const, align: 'center' as const, layout: 'horizontal' as const };
        case 'bottom': return { verticalAlign: 'bottom' as const, align: 'center' as const, layout: 'horizontal' as const };
        case 'left': return { verticalAlign: 'middle' as const, align: 'left' as const, layout: 'vertical' as const };
        case 'right': return { verticalAlign: 'middle' as const, align: 'right' as const, layout: 'vertical' as const };
        default: return { verticalAlign: 'bottom' as const, align: 'center' as const, layout: 'horizontal' as const };
    }
};

// --- Markdown Renderer Component ---
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 pr-4">{listItems}</ul>);
            listItems = [];
        }
    };

    text.split('\n').forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('### ')) {
            flushList();
            elements.push(<h3 key={index} className="text-lg font-extrabold text-text-primary my-3">{trimmedLine.substring(4)}</h3>);
        } else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
            listItems.push(<li key={index}>{trimmedLine.substring(2)}</li>);
        } else {
            flushList();
            if (trimmedLine) {
                elements.push(<p key={index} className="mb-2">{trimmedLine}</p>);
            }
        }
    });

    flushList(); // Add any remaining list items at the end

    return <>{elements}</>;
};


// --- Audit Modal Component ---
const AuditReportModal: React.FC<{ isOpen: boolean; onClose: () => void; results: AuditFinding[] | null; isLoading: boolean; error: string | null; }> = ({ isOpen, onClose, results, isLoading, error }) => {
    if (!isOpen) return null;

    const severityIcons: Record<AuditFinding['severity'], React.ReactNode> = {
        'error': <XCircle className="text-red-500" size={24} />,
        'warning': <AlertTriangle className="text-amber-500" size={24} />,
        'info': <Info className="text-blue-500" size={24} />,
    };
    const severityClasses: Record<AuditFinding['severity'], string> = {
        'error': 'border-red-500 bg-red-50',
        'warning': 'border-amber-500 bg-amber-50',
        'info': 'border-blue-500 bg-blue-50',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">تقرير تدقيق الحسابات بالـ AI</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
                            <p className="text-text-secondary font-semibold">يقوم الذكاء الاصطناعي بمراجعة حساباتك... قد يستغرق هذا بعض الوقت.</p>
                        </div>
                    )}
                    {error && <p className="text-center text-red-500 bg-red-100 p-4 rounded-md">{error}</p>}
                    {results && (
                        <div className="space-y-4">
                            {results.length === 0 ? (
                                <p className="text-center text-green-700 bg-green-100 p-4 rounded-md font-semibold">ممتاز! لم يتم العثور على أي مشاكل جوهرية في حساباتك.</p>
                            ) : (
                                results.map((item, index) => (
                                    <div key={index} className={`p-4 rounded-lg border-l-4 shadow-sm ${severityClasses[item.severity]}`}>
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 pt-1">{severityIcons[item.severity]}</div>
                                            <div>
                                                <p className="font-bold text-slate-800">{item.finding}</p>
                                                <p className="text-sm text-text-secondary mt-1"><strong className="text-slate-600">التوصية:</strong> {item.recommendation}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DecisionSupportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    financialSummary: any;
}> = ({ isOpen, onClose, financialSummary }) => {
    const [problem, setProblem] = useState('');
    const [suggestions, setSuggestions] = useState<DecisionOption[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetSuggestions = async () => {
        if (!problem.trim()) {
            setError('الرجاء وصف المشكلة أو القرار الذي تحتاج إلى مساعدة بشأنه.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuggestions(null);
        try {
            const result = await getDecisionSupport(problem, financialSummary);
            setSuggestions(result);
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء جلب الاقتراحات.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setProblem('');
        setSuggestions(null);
        setError(null);
        setIsLoading(false);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4" onClick={handleClose}>
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-extrabold text-text-primary flex items-center gap-2"><BrainCircuit size={28} className="text-accent" /> مساعد اتخاذ القرار</h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:shadow-neumo-sm"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    {!suggestions && !isLoading && !error && (
                         <div>
                            <p className="text-text-secondary mb-4">صف المشكلة أو القرار الذي تواجهه. سيقوم الذكاء الاصطناعي بتحليل الوضع وتقديم ثلاثة حلول مقترحة، مع توضيح مميزات وعيوب كل منها لمساعدتك على اتخاذ القرار الأفضل.</p>
                            <textarea
                                value={problem}
                                onChange={e => setProblem(e.target.value)}
                                rows={6}
                                placeholder="مثال: أرباحي من عمليات التخليص البحري منخفضة مقارنة بالشحن الجوي، كيف يمكنني تحسينها؟"
                                className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                        </div>
                    )}
                    {isLoading && (
                         <div className="flex flex-col items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
                            <p className="text-text-secondary font-bold">جاري تحليل المشكلة واقتراح الحلول...</p>
                        </div>
                    )}
                     {error && <div className="text-center text-red-500 bg-red-100 p-4 rounded-md">{error}</div>}
                     {suggestions && (
                        <div>
                             <h3 className="text-xl font-bold mb-4 text-text-primary">بناءً على تحليل المشكلة، إليك 3 حلول مقترحة:</h3>
                             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {suggestions.map((option, index) => (
                                    <div key={index} className="bg-primary p-4 rounded-lg shadow-neumo-sm flex flex-col">
                                        <h4 className="font-extrabold text-lg text-accent mb-2 border-b border-primary-dark/20 pb-2">{option.title}</h4>
                                        <p className="text-sm text-text-secondary mb-3 flex-grow">{option.description}</p>
                                        <div>
                                            <h5 className="font-bold text-green-600">مميزات:</h5>
                                            <ul className="list-none space-y-1 text-sm pr-2">
                                                {option.pros.map((pro, i) => <li key={i} className="flex items-start gap-2"><Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" /><span>{pro}</span></li>)}
                                            </ul>
                                        </div>
                                         <div className="mt-3">
                                            <h5 className="font-bold text-red-600">سلبيات:</h5>
                                            <ul className="list-none space-y-1 text-sm pr-2">
                                                {option.cons.map((con, i) => <li key={i} className="flex items-start gap-2"><Minus size={16} className="text-red-600 mt-0.5 flex-shrink-0" /><span>{con}</span></li>)}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                     )}
                </div>

                 <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleClose} className="px-6 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-bold">إغلاق</button>
                     {!suggestions && (
                        <button onClick={handleGetSuggestions} disabled={isLoading} className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-bold disabled:bg-gray-400">
                           {isLoading ? '...جاري التحليل' : 'احصل على الاقتراحات'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


const AiReports: React.FC<AiReportsProps> = ({ journalEntries, accounts, operations }) => {
    const { settings: chartSettings } = useChartStyles();
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: 'مرحباً! أنا مساعدك المالي الذكي. كيف يمكنني مساعدتك اليوم؟ يمكنك أن تطلب مني "عرض تقرير عن الإيرادات حسب العميل" أو "نصائح لزيادة الأرباح".' }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [fromDate, setFromDate] = useState<string>(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    // State for operational cost report filters
    const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
    const opTypes: OperationType[] = ['import', 'export', 'sea-clearance', 'air-clearance', 'return', 'credit-note'];
    const [selectedOpTypes, setSelectedOpTypes] = useState<OperationType[]>(opTypes.filter(t => ['import', 'export', 'sea-clearance', 'air-clearance'].includes(t)));

    // State for AI Audit
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditResults, setAuditResults] = useState<AuditFinding[] | null>(null);
    const [auditError, setAuditError] = useState<string | null>(null);

    // State for AI Trend Analysis
    const [isTrendModalOpen, setIsTrendModalOpen] = useState(false);
    const [isTrendLoading, setIsTrendLoading] = useState(false);
    const [trendAnalysisData, setTrendAnalysisData] = useState<FinancialTrendAnalysis | null>(null);
    const [trendError, setTrendError] = useState<string | null>(null);

    // State for Decision Support
    const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);


    const chatEndRef = useRef<HTMLDivElement>(null);

    const filteredEntries = useMemo(() => {
        if (!fromDate || !toDate) return journalEntries;
        return journalEntries.filter(entry => {
            const entryDate = entry.date;
            return entryDate >= fromDate && entryDate <= toDate;
        });
    }, [journalEntries, fromDate, toDate]);
    
    const financialSummaryForAI = useMemo(() => {
        const revenueAccounts = new Set(accounts.filter(a => a.type === 'Revenue').map(a => a.id));
        const expenseAccounts = new Set(accounts.filter(a => a.type === 'Expense').map(a => a.id));
        let totalRevenue = 0;
        let totalExpenses = 0;
        const topExpenses = new Map<string, number>();

        filteredEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (revenueAccounts.has(line.accountId)) totalRevenue += line.credit - line.debit;
                else if (expenseAccounts.has(line.accountId)) {
                    const amount = line.debit - line.credit;
                    totalExpenses += amount;
                    const accName = accounts.find(a => a.id === line.accountId)?.name || 'Unknown';
                    topExpenses.set(accName, (topExpenses.get(accName) || 0) + amount);
                }
            });
        });
        return {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            topExpenses: Array.from(topExpenses.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
        };
    }, [filteredEntries, accounts]);


    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isAiThinking) return;

        setIsAiThinking(true);
        const userMessage: Message = { sender: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage, { sender: 'ai', isLoading: true }]);
        setUserInput('');
        
        try {
            if (userInput.includes('تقرير') || userInput.includes('رسم بياني') || userInput.includes('عرض')) {
                const simplifiedEntries = filteredEntries.map(je => ({
                    date: je.date,
                    description: je.description,
                    lines: je.lines.map(l => ({
                        account: accounts.find(a => a.id === l.accountId)?.name || 'Unknown',
                        debit: l.debit,
                        credit: l.credit,
                    }))
                }));

                const response = await generateChartData(userInput, simplifiedEntries, accounts);
                const aiMessage: Message = { sender: 'ai' };
                if (response.chartData && response.chartData.length > 0) {
                    aiMessage.text = response.summary || 'تفضل بالرسم البياني المطلوب.';
                    aiMessage.chartData = response.chartData;
                    aiMessage.chartType = response.chartType as 'bar' | 'pie';
                } else {
                    aiMessage.text = response.summary || 'لم أتمكن من إنشاء رسم بياني. هل يمكنك توضيح طلبك؟';
                }
                 setMessages(prev => [...prev.slice(0, -1), aiMessage]);

            } else {
                const advice = await getBusinessAdvice(userInput, filteredEntries, accounts);
                const aiMessage: Message = { sender: 'ai', text: advice };
                setMessages(prev => [...prev.slice(0, -1), aiMessage]);
            }
        } catch (error: any) {
            const errorMessage: Message = { sender: 'ai', text: `عذراً، حدث خطأ: ${error.message}` };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        } finally {
            setIsAiThinking(false);
        }
    };
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
    };

    const handleGenerateCustomerReport = () => {
        if (isAiThinking) return;
        setIsAiThinking(true);
        setMessages(prev => [...prev, { sender: 'ai', isLoading: true }]);

        setTimeout(() => {
            const customerAccountIds = new Set(
                accounts.filter(acc => acc.type === 'Asset' && acc.name.startsWith('العملاء')).map(acc => acc.id)
            );
            const customerRevenue = new Map<string, number>();
            filteredEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (customerAccountIds.has(line.accountId) && line.debit > 0) {
                        const accountName = accounts.find(a => a.id === line.accountId)!.name;
                        const cleanName = accountName.replace('العملاء - ', '');
                        customerRevenue.set(cleanName, (customerRevenue.get(cleanName) || 0) + line.debit);
                    }
                });
            });

            const chartData = Array.from(customerRevenue.entries()).map(([name, value]) => ({ name, value }));
            
            const aiMessage: Message = { sender: 'ai' };
            if (chartData.length > 0) {
                aiMessage.text = `هذا هو ملخص الإيرادات لكل عميل للفترة المحددة.`;
                aiMessage.chartData = chartData;
                aiMessage.chartType = 'bar';
            } else {
                aiMessage.text = `لا توجد بيانات إيرادات للعملاء في الفترة المحددة.`;
            }
            setMessages(prev => [...prev.slice(0, -1), aiMessage]);
            setIsAiThinking(false);
        }, 500); // Delay to allow UI update
    };

    const handleGenerateRevenueByAccountReport = () => {
        if (isAiThinking) return;
        setIsAiThinking(true);
        setMessages(prev => [...prev, { sender: 'ai', isLoading: true }]);

        setTimeout(() => {
            const revenueAccountIds = new Set(
                accounts.filter(acc => acc.type === 'Revenue').map(acc => acc.id)
            );
            const revenueByAccount = new Map<string, number>();

            filteredEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (revenueAccountIds.has(line.accountId)) {
                        const accountName = accounts.find(a => a.id === line.accountId)!.name;
                        const revenueAmount = line.credit - line.debit;
                        revenueByAccount.set(accountName, (revenueByAccount.get(accountName) || 0) + revenueAmount);
                    }
                });
            });

            const chartData = Array.from(revenueByAccount.entries())
                .map(([name, value]) => ({ name, value }))
                .filter(item => item.value > 0);

            const aiMessage: Message = { sender: 'ai' };
            if (chartData.length > 0) {
                aiMessage.text = `هذا هو ملخص الإيرادات مقسمًا حسب الحساب للفترة المحددة.`;
                aiMessage.chartData = chartData;
                aiMessage.chartType = 'bar';
            } else {
                aiMessage.text = `لا توجد بيانات إيرادات في الفترة المحددة.`;
            }
            setMessages(prev => [...prev.slice(0, -1), aiMessage]);
            setIsAiThinking(false);
        }, 500);
    };

    const typeMap: Record<OperationType, string> = {
        'import': 'استيراد',
        'export': 'تصدير',
        'sea-clearance': 'تخليص بحري',
        'air-clearance': 'تخليص جوي',
        'return': 'مرتجع',
        'credit-note': 'إشعار دائن',
    };
    
    const handleOpTypeToggle = (type: OperationType) => {
        setSelectedOpTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const handleGenerateOpsCostReport = () => {
        if (isAiThinking) return;
        setIsAiThinking(true);
        setMessages(prev => [...prev, { sender: 'ai', isLoading: true }]);

        setTimeout(() => {
            const dateFilteredOps = operations.filter(op => {
                const opDate = op.creationDate;
                return opDate >= fromDate && opDate <= toDate;
            });
            const typeFilteredOps = dateFilteredOps.filter(op =>
                selectedOpTypes.length === opTypes.length || selectedOpTypes.includes(op.type)
            );
            
            let aiMessage: Message;
            if (typeFilteredOps.length === 0) {
                aiMessage = { sender: 'ai', text: 'لا توجد عمليات تطابق معايير البحث المحددة.' };
            } else {
                const headers = ['كود العملية', 'التاريخ', 'العميل', 'النوع', 'الوصف', 'التكلفة'];
                const rows = typeFilteredOps.map(op => {
                    const clientName = accounts.find(a => a.id === op.clientId)?.name.replace('العملاء - ', '') || 'N/A';
                    const typeName = typeMap[op.type];
                    return [op.code, op.creationDate, clientName, typeName, op.description, op.cost || 0];
                });

                const totalCost = typeFilteredOps.reduce((sum, op) => sum + (op.cost || 0), 0);
                const tableData: TableData = {
                    headers,
                    rows: rows.map(row => [...row.slice(0, 5), formatCurrency(row[5] as number)]),
                    summary: { label: 'إجمالي التكاليف', value: formatCurrency(totalCost) }
                };
                aiMessage = {
                    sender: 'ai',
                    text: `تقرير تكاليف العمليات للفترة من ${fromDate} إلى ${toDate}.`,
                    tableData: tableData
                };
            }
            setMessages(prev => [...prev.slice(0, -1), aiMessage]);
            setIsAiThinking(false);
        }, 500); // Delay to allow UI update
    };

    const handleGenerateMonthlyRevenueReport = () => {
        if (isAiThinking) return;
        setIsAiThinking(true);
        setMessages(prev => [...prev, { sender: 'ai', isLoading: true }]);

        setTimeout(() => {
            const revenueAccountIds = new Set(
                accounts.filter(acc => acc.type === 'Revenue').map(acc => acc.id)
            );

            // 1. Initialize last 12 months
            const monthlyRevenue = new Map<string, number>();
            const today = new Date();
            for (let i = 11; i >= 0; i--) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                monthlyRevenue.set(monthKey, 0);
            }

            // 2. Filter entries for the last 12 months
            const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
            const relevantEntries = journalEntries.filter(entry => new Date(entry.date) >= oneYearAgo);
            
            // 3. Aggregate revenue
            relevantEntries.forEach(entry => {
                const monthKey = entry.date.substring(0, 7); // 'YYYY-MM'
                if (monthlyRevenue.has(monthKey)) {
                    let monthlyTotal = 0;
                    entry.lines.forEach(line => {
                        if (revenueAccountIds.has(line.accountId)) {
                            monthlyTotal += line.credit - line.debit;
                        }
                    });
                    if (monthlyTotal > 0) {
                         monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + monthlyTotal);
                    }
                }
            });

            // 4. Format for chart
            const chartData = Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({ month, revenue }));

            const aiMessage: Message = {
                sender: 'ai',
                text: 'تحليل الإيرادات الشهرية لآخر 12 شهرًا. يوضح الرسم البياني اتجاهات النمو أو الانخفاض.',
                chartData: chartData,
                chartType: 'line',
            };

            setMessages(prev => [...prev.slice(0, -1), aiMessage]);
            setIsAiThinking(false);
        }, 500);
    };

    const handleGenerateTopCustomersLast30Days = () => {
        if (isAiThinking) return;
        setIsAiThinking(true);
        setMessages(prev => [...prev, { sender: 'ai', isLoading: true }]);
    
        setTimeout(() => {
            const to = new Date();
            const from = new Date();
            from.setDate(to.getDate() - 30);
            const fromDateStr = from.toISOString().split('T')[0];
            const toDateStr = to.toISOString().split('T')[0];
            
            const last30DaysEntries = journalEntries.filter(entry => {
                const entryDate = entry.date;
                return entryDate >= fromDateStr && entryDate <= toDateStr;
            });
    
            const customerAccountIds = new Set(
                accounts.filter(acc => acc.type === 'Asset' && acc.name.startsWith('العملاء')).map(acc => acc.id)
            );
            const customerRevenue = new Map<string, number>();
            last30DaysEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (customerAccountIds.has(line.accountId) && line.debit > 0) {
                        const accountName = accounts.find(a => a.id === line.accountId)!.name;
                        const cleanName = accountName.replace('العملاء - ', '');
                        customerRevenue.set(cleanName, (customerRevenue.get(cleanName) || 0) + line.debit);
                    }
                });
            });
            
            const chartData = Array.from(customerRevenue.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
    
            const aiMessage: Message = { sender: 'ai' };
            if (chartData.length > 0) {
                aiMessage.text = `هذا هو ملخص إيرادات أفضل 5 عملاء خلال آخر 30 يومًا.`;
                aiMessage.chartData = chartData;
                aiMessage.chartType = 'horizontal-bar';
            } else {
                aiMessage.text = `لا توجد بيانات إيرادات للعملاء في آخر 30 يومًا.`;
            }
            setMessages(prev => [...prev.slice(0, -1), aiMessage]);
            setIsAiThinking(false);
        }, 500);
    };

    const handleRunAudit = async () => {
        setIsAuditing(true);
        setAuditResults(null);
        setAuditError(null);
        setIsAuditModalOpen(true);
        try {
            const results = await getAIAccountingAudit(journalEntries, accounts, operations);
            setAuditResults(results);
        } catch (err: any) {
            setAuditError(err.message || "حدث خطأ أثناء إجراء التدقيق. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsAuditing(false);
        }
    };
    
    const handleRunTrendAnalysis = async () => {
        setIsTrendLoading(true);
        setTrendAnalysisData(null);
        setTrendError(null);
        setIsTrendModalOpen(true);
        try {
            const results = await getFinancialTrends(journalEntries, operations, accounts);
            setTrendAnalysisData(results);
        } catch (err: any) {
            setTrendError(err.message || "حدث خطأ أثناء تحليل الاتجاهات المالية. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsTrendLoading(false);
        }
    };

    const handleGetProfitAdvice = async () => {
        if (isAiThinking) return;

        const prompt = "كيف يمكنني زيادة الأرباح بناءً على بياناتي المالية؟ قدم نصائح عملية ومخصصة لشركة شحن وتخليص جمركي.";
        setIsAiThinking(true);
        const userMessage: Message = { sender: 'user', text: "طلب نصائح لزيادة الأرباح..." };
        setMessages(prev => [...prev, userMessage, { sender: 'ai', isLoading: true }]);

        try {
            const advice = await getBusinessAdvice(prompt, filteredEntries, accounts);
            const aiMessage: Message = { sender: 'ai', text: advice };
            setMessages(prev => [...prev.slice(0, -1), aiMessage]);
        } catch (error: any) {
            const errorMessage: Message = { sender: 'ai', text: `عذراً، حدث خطأ أثناء جلب النصيحة: ${error.message}` };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        } finally {
            setIsAiThinking(false);
        }
    };

    const handleExportChat = () => {
        const chatContent = messages.map(msg => {
            const sender = msg.sender === 'user' ? 'أنت' : 'المساعد الذكي';
            const timestamp = new Date().toLocaleString('ar-EG');
            let content = `[${sender}] - ${timestamp}\n`;
            content += msg.text || '[رسم بياني أو جدول بيانات]';
            return content;
        }).join('\n\n==================================\n\n');
    
        const blob = new Blob([`\uFEFF${chatContent}`], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `ai_chat_history_${new Date().toISOString().split('T')[0]}.txt`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    return (
        <div className="printable-area">
            <div className="flex flex-col h-full bg-primary rounded-2xl shadow-neumo">
                <AuditReportModal 
                    isOpen={isAuditModalOpen}
                    onClose={() => setIsAuditModalOpen(false)}
                    isLoading={isAuditing}
                    results={auditResults}
                    error={auditError}
                />
                <TrendAnalysisModal
                    isOpen={isTrendModalOpen}
                    onClose={() => setIsTrendModalOpen(false)}
                    isLoading={isTrendLoading}
                    analysisData={trendAnalysisData}
                    error={trendError}
                />
                <DecisionSupportModal
                    isOpen={isDecisionModalOpen}
                    onClose={() => setIsDecisionModalOpen(false)}
                    financialSummary={financialSummaryForAI}
                />
                <div className="no-print flex justify-between items-center p-4 border-b border-primary-dark/20 text-slate-800">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-semibold text-text-secondary">من:</label>
                        <input 
                            type="date" 
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="p-2 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-1 focus:ring-accent w-36 text-sm"
                        />
                        <label className="text-sm font-semibold text-text-secondary">إلى:</label>
                        <input 
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="p-2 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-1 focus:ring-accent w-36 text-sm"
                        />
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={handleExportChat} className="flex items-center gap-2 px-3 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold">
                            <FileDown size={18} />
                            <span className="hidden sm:inline">تصدير</span>
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold">
                            <Printer size={18} />
                            <span className="hidden sm:inline">طباعة</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`rounded-xl p-3 max-w-2xl ${msg.sender === 'user' ? 'bg-accent text-white shadow-md' : 'bg-primary text-text-primary shadow-neumo-sm'}`}>
                            {msg.isLoading ? (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm">يفكر الذكاء الاصطناعي...</span>
                                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse"></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse delay-75"></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse delay-150"></div>
                                    </div>
                            ) : (
                                <>
                                    {msg.text && <MarkdownRenderer text={msg.text} />}
                                    {msg.chartData && (
                                        <div className="mt-2 bg-primary p-2 rounded-lg" style={{ width: '450px', height: '300px' }}>
                                            {msg.chartType === 'bar' ? (
                                                <ResponsiveContainer>
                                                    <BarChart 
                                                        data={msg.chartData} 
                                                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                                                        style={{ fontFamily: chartSettings.fontFamily, fontSize: `${chartSettings.fontSize}px` }}
                                                    >
                                                        {chartSettings.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                                                        <XAxis dataKey="name" />
                                                        <YAxis />
                                                        <Tooltip 
                                                            formatter={(value: number) => new Intl.NumberFormat('ar-EG').format(value)}
                                                            contentStyle={{ fontFamily: chartSettings.fontFamily, backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '1rem' }}
                                                        />
                                                        <Legend wrapperStyle={{ fontFamily: chartSettings.fontFamily }} {...getLegendProps(chartSettings.legendPosition)} />
                                                        <Bar dataKey="value" name="القيمة" radius={[chartSettings.barRadius, chartSettings.barRadius, 0, 0]}>
                                                            {msg.chartData.map((entry: any, index: number) => (
                                                                <Cell key={`cell-${index}`} fill={chartSettings.colors[index % chartSettings.colors.length]} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : msg.chartType === 'pie' ? (
                                                <ResponsiveContainer>
                                                    <PieChart style={{ fontFamily: chartSettings.fontFamily }}>
                                                        <Pie 
                                                            data={msg.chartData} 
                                                            dataKey="value" 
                                                            nameKey="name" 
                                                            cx="50%" 
                                                            cy="50%" 
                                                            innerRadius={chartSettings.pieInnerRadius}
                                                            cornerRadius={chartSettings.pieCornerRadius}
                                                            outerRadius={80} 
                                                            labelLine={false}
                                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                                const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                                                                const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                                                                return percent > 0.05 ? (<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12px" fontWeight="bold"> {`${(percent * 100).toFixed(0)}%`} </text>) : null;
                                                            }}
                                                        >
                                                            {msg.chartData.map((entry: any, index: number) => (
                                                                <Cell key={`cell-pie-${index}`} fill={chartSettings.colors[index % chartSettings.colors.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip 
                                                            formatter={(value: number) => formatCurrency(value)}
                                                            contentStyle={{ fontFamily: chartSettings.fontFamily, backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '1rem' }}
                                                        />
                                                        <Legend wrapperStyle={{ fontFamily: chartSettings.fontFamily }} {...getLegendProps(chartSettings.legendPosition)} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : msg.chartType === 'line' ? (
                                                <ResponsiveContainer>
                                                    <LineChart 
                                                        data={msg.chartData}
                                                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                                                        style={{ fontFamily: chartSettings.fontFamily, fontSize: `${chartSettings.fontSize}px` }}
                                                    >
                                                        {chartSettings.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                                                        <XAxis dataKey="month" />
                                                        <YAxis />
                                                        <Tooltip 
                                                            formatter={(value: number) => formatCurrency(value)}
                                                            contentStyle={{ fontFamily: chartSettings.fontFamily, backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '1rem' }}
                                                        />
                                                        <Legend wrapperStyle={{ fontFamily: chartSettings.fontFamily }} {...getLegendProps(chartSettings.legendPosition)} />
                                                        <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke={chartSettings.colors[0]} strokeWidth={2} />
                                                        {msg.chartData[0]?.expenses !== undefined && <Line type="monotone" dataKey="expenses" name="المصروفات" stroke={chartSettings.colors[3]} strokeWidth={2} />}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : msg.chartType === 'horizontal-bar' ? (
                                                <ResponsiveContainer>
                                                    <BarChart 
                                                        data={msg.chartData} 
                                                        layout="vertical"
                                                        margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
                                                        style={{ fontFamily: chartSettings.fontFamily, fontSize: `${chartSettings.fontSize}px` }}
                                                    >
                                                        {chartSettings.showGrid && <CartesianGrid strokeDasharray="3 3" horizontal={false} />}
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} />
                                                        <Tooltip 
                                                            formatter={(value: number) => formatCurrency(value)}
                                                            contentStyle={{ fontFamily: chartSettings.fontFamily, backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '1rem' }}
                                                        />
                                                        <Bar dataKey="value" name="القيمة" radius={[0, chartSettings.barRadius, chartSettings.barRadius, 0]}>
                                                            {msg.chartData.map((entry: any, index: number) => (
                                                                <Cell key={`cell-hbar-${index}`} fill={chartSettings.colors[index % chartSettings.colors.length]} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : null}
                                        </div>
                                    )}
                                    {msg.tableData && (
                                        <div className="mt-2 bg-primary p-2 rounded-lg overflow-x-auto">
                                            <table className="w-full text-sm text-right">
                                                <thead>
                                                    <tr className="border-b-2 border-primary-dark/20">
                                                        {msg.tableData.headers.map((h, i) => <th key={i} className="p-2 font-bold text-slate-700">{h}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {msg.tableData.rows.map((row, i) => (
                                                        <tr key={i} className="border-b border-primary-dark/10">
                                                            {row.map((cell, j) => <td key={j} className="p-2">{cell}</td>)}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                {msg.tableData.summary && (
                                                    <tfoot>
                                                        <tr className="font-bold bg-primary-light">
                                                            <td colSpan={msg.tableData.headers.length - 1} className="p-2 text-left">{msg.tableData.summary.label}</td>
                                                            <td className="p-2">{msg.tableData.summary.value}</td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                
                <div className="p-4 border-t border-primary-dark/20 no-print">
                    <div className="flex flex-wrap gap-2 mb-2">
                        <button onClick={handleGenerateCustomerReport} className="text-xs px-3 py-1 bg-primary shadow-neumo-sm rounded-full hover:shadow-neumo-inset">إيرادات العملاء</button>
                        <button onClick={handleGenerateRevenueByAccountReport} className="text-xs px-3 py-1 bg-primary shadow-neumo-sm rounded-full hover:shadow-neumo-inset">إيرادات حسب الحساب</button>
                        <div className="relative inline-block">
                            <button onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)} className="text-xs px-3 py-1 bg-primary shadow-neumo-sm rounded-full hover:shadow-neumo-inset">تكاليف العمليات <Filter size={12} className="inline"/></button>
                            {isTypeFilterOpen && (
                                <div className="absolute bottom-full mb-2 right-0 bg-primary p-2 rounded-lg shadow-neumo w-56 z-10">
                                    <p className="text-xs font-bold mb-1">فلتر أنواع العمليات:</p>
                                    {opTypes.map(type => (
                                        <label key={type} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-primary-dark/20">
                                            <input type="checkbox" checked={selectedOpTypes.includes(type)} onChange={() => handleOpTypeToggle(type)} />
                                            {typeMap[type]}
                                        </label>
                                    ))}
                                    <button onClick={handleGenerateOpsCostReport} className="w-full mt-2 text-xs px-3 py-1 bg-accent text-white rounded-md hover:bg-accent-dark">تطبيق</button>
                                </div>
                            )}
                        </div>
                        <button onClick={handleGenerateMonthlyRevenueReport} className="text-xs px-3 py-1 bg-primary shadow-neumo-sm rounded-full hover:shadow-neumo-inset flex items-center gap-1"><LineChartIcon size={14}/> إيرادات آخر 12 شهر</button>
                        <button onClick={handleGenerateTopCustomersLast30Days} className="text-xs px-3 py-1 bg-primary shadow-neumo-sm rounded-full hover:shadow-neumo-inset flex items-center gap-1"><Star size={14}/> أفضل عملاء (30 يوم)</button>
                        <button onClick={handleRunAudit} disabled={isAuditing} className="text-xs px-3 py-1 bg-primary shadow-neumo-sm rounded-full hover:shadow-neumo-inset text-accent font-bold flex items-center gap-1">
                            <ShieldCheck size={14}/> {isAuditing ? 'جاري التدقيق...' : 'تدقيق الحسابات بالـ AI'}
                        </button>
                        <button onClick={handleGetProfitAdvice} className="text-xs px-3 py-1 bg-primary shadow-neumo-sm rounded-full hover:shadow-neumo-inset text-accent font-bold flex items-center gap-1">
                            <Lightbulb size={14}/> نصائح لزيادة الأرباح
                        </button>
                        <button onClick={handleRunTrendAnalysis} disabled={isTrendLoading} className="text-xs px-3 py-1 bg-primary shadow-neumo-sm rounded-full hover:shadow-neumo-inset text-accent font-bold flex items-center gap-1">
                            <TrendingUp size={14}/> {isTrendLoading ? 'جاري التحليل...' : 'تحليل الاتجاهات المالية'}
                        </button>
                         <button onClick={() => setIsDecisionModalOpen(true)} className="text-xs px-3 py-1 bg-primary shadow-neumo-sm rounded-full hover:shadow-neumo-inset text-accent font-bold flex items-center gap-1">
                            <BrainCircuit size={14}/> ساعدني في اتخاذ قرار
                        </button>
                    </div>
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="اسأل عن أي تقرير..."
                            className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            disabled={isAiThinking}
                        />
                        <button type="submit" disabled={isAiThinking} className="p-3 bg-accent text-white rounded-full shadow-md hover:shadow-lg disabled:bg-gray-400">
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AiReports;