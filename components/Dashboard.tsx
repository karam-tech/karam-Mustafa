
import React, { useMemo, useState, useEffect } from 'react';
import { JournalEntry, Account, Operation, Task, User, DashboardWidgets, LowBalanceRecord } from '../types.ts';
import { DollarSign, TrendingUp, TrendingDown, ClipboardList, Briefcase, Users, Settings, Save, AlertTriangle, HardDrive } from 'lucide-react';
import LowBalanceAlert from './LowBalanceAlert.tsx';
import RevenueSummary from './RevenueSummary.tsx';
import ExpenseSummary from './ExpenseSummary.tsx';
import DashboardSettingsModal from './DashboardSettingsModal.tsx';
import DashboardBalances from './DashboardBalances.tsx';
import LowBalanceLog from './LowBalanceLog.tsx';


interface DashboardProps {
  journalEntries: JournalEntry[];
  accounts: Account[];
  operations: Operation[];
  tasks: Task[];
  setActiveView: (view: string) => void;
  lowBalanceThreshold: number;
  updateLowBalanceThreshold: (newThreshold: number) => void;
  currentUser: User;
  dashboardWidgets: DashboardWidgets;
  updateDashboardWidgets: (widgets: DashboardWidgets) => void;
  addLowBalanceRecord: (record: Omit<LowBalanceRecord, 'id' | 'date'>) => void;
  clearLowBalanceLog: () => void;
  lowBalanceLog: LowBalanceRecord[];
  storageStatus?: 'browser' | 'disk' | 'unsaved';
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

// --- Enhanced StatCard with Hover Details ---
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  change?: number;
  previousValue?: string;
  trendDirection?: 'up' | 'down'; // 'up' is good
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onClick, change, previousValue, trendDirection = 'up' }) => {
    const hasComparison = change !== undefined && previousValue !== undefined;
    const isFiniteChange = hasComparison && isFinite(change!);

    let changeDisplay: React.ReactNode = null;

    if (hasComparison) {
        if (!isFinite(change!)) {
            if (change! > 0) changeDisplay = <span className="font-bold text-lg text-green-500">زيادة جديدة</span>;
            else if (change! < 0) changeDisplay = <span className="font-bold text-lg text-red-500">انخفاض جديد</span>;
        } else {
            const isPositive = (trendDirection === 'up' && change! > 0) || (trendDirection === 'down' && change! < 0);
            const isNegative = (trendDirection === 'up' && change! < 0) || (trendDirection === 'down' && change! > 0);
            changeDisplay = (
                 <span className={`font-bold text-lg flex items-center gap-1 ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-text-secondary'}`}>
                   {change !== 0 && (isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />)}
                   {change!.toFixed(1)}%
                </span>
            );
        }
    }

    return (
        <div 
          className={`bg-primary p-6 rounded-2xl shadow-neumo flex flex-col gap-2 transition-all duration-300 group relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
          onClick={onClick}
        >
            <div className={`flex items-center gap-6 transition-transform duration-300 ${hasComparison ? 'group-hover:-translate-y-5' : ''}`}>
                <div className="p-4 rounded-full shadow-neumo-sm" style={{ color }}>
                    {icon}
                </div>
                <div>
                    <h3 className="text-text-secondary font-bold">{title}</h3>
                    <p className="text-2xl font-extrabold text-text-primary">{value}</p>
                </div>
            </div>
            {hasComparison && (
                <div className="absolute bottom-0 left-0 right-0 py-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex items-center justify-center gap-3">
                         {changeDisplay}
                        <span className="text-sm text-text-secondary">
                            من {previousValue}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ journalEntries, accounts, operations, tasks, setActiveView, lowBalanceThreshold, updateLowBalanceThreshold, currentUser, dashboardWidgets, updateDashboardWidgets, addLowBalanceRecord, clearLowBalanceLog, lowBalanceLog, storageStatus }) => {
    const [isAlertDismissed, setIsAlertDismissed] = useState(false);
    const [thresholdInput, setThresholdInput] = useState<string>(lowBalanceThreshold.toString());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showLog, setShowLog] = useState(false);

    useEffect(() => {
        setThresholdInput(lowBalanceThreshold.toString());
    }, [lowBalanceThreshold]);

    const handleThresholdSave = (e: React.FormEvent) => {
        e.preventDefault();
        const newThreshold = parseInt(thresholdInput, 10);
        if (!isNaN(newThreshold) && newThreshold >= 0) {
            updateLowBalanceThreshold(newThreshold);
        }
    };
    
    const handleDismissAlert = () => {
        addLowBalanceRecord({
            accounts: lowBalanceAccounts.map(a => ({
                name: a.name,
                balance: a.balance,
                currency: a.currency || 'EGP'
            })),
            threshold: lowBalanceThreshold
        });
        setIsAlertDismissed(true);
    };

    const financials = useMemo(() => {
        // --- Setup ---
        const revenueAccounts = new Set(accounts.filter(a => a.type === 'Revenue').map(a => a.id));
        const expenseAccounts = new Set(accounts.filter(a => a.type === 'Expense').map(a => a.id));
        
        const today = new Date();
        const d30 = new Date();
        d30.setDate(today.getDate() - 30);
        const d60 = new Date();
        d60.setDate(today.getDate() - 60);

        // --- Data Filtering ---
        const currentEntries = journalEntries.filter(e => new Date(e.date) > d30 && new Date(e.date) <= today);
        const previousEntries = journalEntries.filter(e => new Date(e.date) > d60 && new Date(e.date) <= d30);

        // --- Metric Calculation Function ---
        const calculateMetricsForPeriod = (entries: JournalEntry[]) => {
            let totalRevenue = 0;
            let totalExpenses = 0;
            entries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (revenueAccounts.has(line.accountId)) {
                        totalRevenue += line.credit - line.debit;
                    } else if (expenseAccounts.has(line.accountId)) {
                        totalExpenses += line.debit - line.credit;
                    }
                });
            });
            const netIncome = totalRevenue - totalExpenses;
            return { totalRevenue, totalExpenses, netIncome };
        };

        // --- Calculations for both periods ---
        const currentPeriod = calculateMetricsForPeriod(currentEntries);
        const previousPeriod = calculateMetricsForPeriod(previousEntries);
        
        // --- Change Calculation Function ---
        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) {
                if (current > 0) return Infinity;
                if (current < 0) return -Infinity;
                return 0;
            }
            return ((current - previous) / Math.abs(previous)) * 100;
        };

        return {
            current: {
                totalRevenue: currentPeriod.totalRevenue,
                totalExpenses: currentPeriod.totalExpenses,
                netIncome: currentPeriod.netIncome,
            },
            previous: {
                totalRevenue: previousPeriod.totalRevenue,
                totalExpenses: previousPeriod.totalExpenses,
                netIncome: previousPeriod.netIncome,
            },
            changes: {
                revenue: calculateChange(currentPeriod.totalRevenue, previousPeriod.totalRevenue),
                expenses: calculateChange(currentPeriod.totalExpenses, previousPeriod.totalExpenses),
                netIncome: calculateChange(currentPeriod.netIncome, previousPeriod.netIncome),
            }
        };
    }, [journalEntries, accounts]);

    const bankAndCashBalances = useMemo(() => {
        const cashAndBankAccounts = accounts.filter(acc => acc.isBankOrCash);
        const balances = cashAndBankAccounts.map(account => {
            let balance = account.openingBalance || 0;
            journalEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (line.accountId === account.id) {
                        balance += line.debit - line.credit;
                    }
                });
            });
            return { ...account, balance };
        });
        return balances;
    }, [accounts, journalEntries]);

    const lowBalanceAccounts = useMemo(() => {
        return accounts.filter(acc => {
            const threshold = (acc.minBalance !== undefined && acc.minBalance > 0) ? acc.minBalance : lowBalanceThreshold;
            // Recalculate balance here just in case, or reuse calculated balances
            let balance = acc.openingBalance || 0;
            journalEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (line.accountId === acc.id) {
                        balance += line.debit - line.credit;
                    }
                });
            });
            return acc.isBankOrCash && balance < threshold;
        }).map(acc => {
             let balance = acc.openingBalance || 0;
            journalEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    if (line.accountId === acc.id) {
                        balance += line.debit - line.credit;
                    }
                });
            });
            return {...acc, balance};
        });
    }, [accounts, journalEntries, lowBalanceThreshold]);
    
    const todaysTasks = tasks.filter(t => t.date === new Date().toISOString().split('T')[0]);

    const canEditSettings = currentUser.role === 'admin' || currentUser.role === 'accountant';

    return (
        <div className="space-y-8">
            <DashboardSettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                currentSettings={dashboardWidgets} 
                onSave={updateDashboardWidgets} 
            />

            {/* --- DATA SAFETY WARNING --- */}
            {storageStatus === 'browser' && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse-slow no-print">
                    <div className="flex items-start gap-3">
                        <HardDrive className="text-blue-600 mt-1" size={24} />
                        <div>
                            <h3 className="font-bold text-blue-800 text-lg">تنبيه: أنت تستخدم التخزين المؤقت (المتصفح)</h3>
                            <p className="text-blue-700 text-sm mt-1 max-w-2xl">
                                لضمان <strong>عدم ضياع البيانات</strong> والعمل بشكل احترافي، يُنصح بشدة بربط التطبيق بملف محلي على جهازك. 
                                سيتم حفظ أي تغييرات تلقائياً على الملف في جهاز الكمبيوتر الخاص بك.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setActiveView('dataManagement')} 
                        className="flex-shrink-0 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <HardDrive size={18} />
                        إعداد الحفظ الآمن الآن
                    </button>
                </div>
            )}

            <div className="bg-primary p-4 rounded-2xl shadow-neumo flex justify-between items-center flex-wrap gap-4">
                {canEditSettings && (
                     <form onSubmit={handleThresholdSave} className="flex items-center gap-4">
                        <Settings size={24} className="text-text-secondary"/>
                        <label htmlFor="threshold" className="font-bold text-text-secondary">حد تحذير الرصيد العام:</label>
                        <input
                            id="threshold"
                            type="number"
                            value={thresholdInput}
                            onChange={(e) => setThresholdInput(e.target.value)}
                            className="w-32 p-2 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                        />
                        <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-bold shadow-sm">
                            <Save size={18} />
                            حفظ
                        </button>
                    </form>
                )}
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowLog(s => !s)} className="flex items-center gap-2 px-4 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-bold">
                        <AlertTriangle size={18} />
                        {showLog ? 'إخفاء سجل التنبيهات' : `عرض سجل التنبيهات (${lowBalanceLog.length})`}
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-bold">
                        <Settings size={18} />
                        تخصيص العرض
                    </button>
                </div>
            </div>

            {showLog && <LowBalanceLog log={lowBalanceLog} onClear={clearLowBalanceLog} />}

            {!isAlertDismissed && lowBalanceAccounts.length > 0 && (
                <LowBalanceAlert accounts={lowBalanceAccounts} globalThreshold={lowBalanceThreshold} onDismiss={handleDismissAlert} />
            )}

            {dashboardWidgets.showStatCards && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard 
                        title="إيرادات آخر 30 يوم" 
                        value={formatCurrency(financials.current.totalRevenue)} 
                        icon={<TrendingUp size={32} />} 
                        color="#00C49F" 
                        change={financials.changes.revenue}
                        previousValue={formatCurrency(financials.previous.totalRevenue)}
                        trendDirection="up"
                    />
                    <StatCard 
                        title="مصروفات آخر 30 يوم" 
                        value={formatCurrency(financials.current.totalExpenses)} 
                        icon={<TrendingDown size={32} />} 
                        color="#FF8042" 
                        change={financials.changes.expenses}
                        previousValue={formatCurrency(financials.previous.totalExpenses)}
                        trendDirection="down"
                    />
                    <StatCard 
                        title="صافي ربح آخر 30 يوم" 
                        value={formatCurrency(financials.current.netIncome)} 
                        icon={<DollarSign size={32} />} 
                        color="#0088FE" 
                        change={financials.changes.netIncome}
                        previousValue={formatCurrency(financials.previous.netIncome)}
                        trendDirection="up"
                    />
                    <StatCard title="العمليات النشطة" value={operations.filter(op => op.status === 'in-progress').length.toString()} icon={<Briefcase size={32} />} color="#FFBB28" onClick={() => setActiveView('operations')} />
                    <StatCard title="العملاء" value={accounts.filter(acc => acc.type === 'Asset' && acc.name.startsWith('العملاء')).length.toString()} icon={<Users size={32} />} color="#8884d8" onClick={() => setActiveView('customerManagement')} />
                    <StatCard title="مهام اليوم" value={`${todaysTasks.filter(t => t.completed).length} / ${todaysTasks.length}`} icon={<ClipboardList size={32} />} color="#4B72D4" onClick={() => setActiveView('taskCalendar')} />
                </div>
            )}
            
            <DashboardBalances 
                accounts={accounts} 
                journalEntries={journalEntries} 
                widgets={dashboardWidgets} 
                setActiveView={setActiveView} 
            />

            {(dashboardWidgets.showRevenueSummary || dashboardWidgets.showExpenseSummary) && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {dashboardWidgets.showRevenueSummary && <RevenueSummary accounts={accounts} journalEntries={journalEntries} />}
                    {dashboardWidgets.showExpenseSummary && <ExpenseSummary accounts={accounts} journalEntries={journalEntries} />}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
