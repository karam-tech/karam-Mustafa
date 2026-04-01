
import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Briefcase, Book, Users, Banknote, ListChecks,
    PieChart, BarChart2, Bot, User, Settings, LogOut, Menu, X, ArrowRight, FileText, Ship, HardDrive, Globe, Save
} from 'lucide-react';

import { 
    Account, JournalEntry, Operation, Task, Employee, AttendanceRecord, 
    User as CurrentUserType, PayrollEntry, DashboardWidgets, LowBalanceRecord, JournalEntryLine, PriceList, Document, AuditLogEntry
} from '../types.ts';
import { hasPermission, canPerformAction } from '../permissions.ts';
import { getStartupAdvice } from '../services/geminiService.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';

// Import all view components
import Dashboard from './Dashboard.tsx';
import Operations from './Operations.tsx';
import Journal from './Journal.tsx';
import Payroll from './Payroll.tsx';
import AccountListView from './AccountListView.tsx';
import { AccountDetailView } from './AccountDetailView.tsx';
import CustomerManagement from './CustomerManagement.tsx';
import AccountsManagement from './AccountsManagement.tsx';
import TrialBalance from './TrialBalance.tsx';
import ProfitAndLoss from './ProfitAndLoss.tsx';
import FinalReports from './FinalReports.tsx';
import AccountAnalysis from './AccountAnalysis.tsx';
import TaskCalendar from './TaskCalendar.tsx';
import AiReports from './AiReports.tsx';
import UserManagement from './UserManagement.tsx';
import DataManagement from './DataManagement.tsx';
import TaxReport from './TaxReport.tsx';
import ExpenseTable from './ExpenseTable.tsx';
import OperationalCostReport from './OperationalCostReport.tsx';
import TodoList from './TodoList.tsx';
import ProfileModal from './ProfileModal.tsx';
import ChartStyleModal from './ChartStyleModal.tsx';
import StartupGuideModal from './StartupGuideModal.tsx';


// Props interface for Layout component
export interface LayoutProps {
    currentUser: CurrentUserType;
    accounts: Account[];
    journalEntries: JournalEntry[];
    operations: Operation[];
    priceLists: PriceList[];
    documents: Document[];
    tasks: Task[];
    employees: Employee[];
    attendance: AttendanceRecord;
    payrollEntries: PayrollEntry[];
    users: CurrentUserType[];
    lowBalanceThreshold: number;
    dashboardWidgets: DashboardWidgets;
    lowBalanceLog: LowBalanceRecord[];
    auditLog: AuditLogEntry[];
    onLogout: () => void;
    addJournalEntry: (entry: Omit<JournalEntry, 'id'>, options?: { suppressSuggestion?: boolean }) => Promise<string>;
    addAccount: (account: Omit<Account, 'id'>) => void;
    addGeneralAccount: (account: Omit<Account, 'id'>) => void;
    addCustomer: (customer: Omit<Account, 'id' | 'type'>) => void;
    updateAccount: (account: Account) => void;
    deleteAccount: (id: string) => void;
    addOperation: (operation: Omit<Operation, 'id'>) => void;
    updateOperation: (operation: Operation) => void;
    deleteOperation: (id: string) => void;
    linkOperationToJournalEntry: (operationId: string, journalEntryId: string) => void;
    addPriceList: (priceList: Omit<PriceList, 'id'>) => void;
    updatePriceList: (priceList: PriceList) => void;
    deletePriceList: (id: string) => void;
    addDocument: (file: File, linkedToId: string, linkedToType: 'account' | 'operation') => Promise<void>;
    deleteDocument: (id: string) => void;
    linkExistingDocuments: (documentsToLink: Document[], linkedToId: string, linkedToType: 'account' | 'operation') => void;
    addTask: (text: string, date: string) => void;
    toggleTask: (id: string) => void;
    removeTask: (id: string) => void;
    addEmployee: (employee: Omit<Employee, 'id'>) => void;
    updateEmployee: (employee: Employee) => void;
    deleteEmployee: (id: string) => void;
    updateAttendance: (date: string, employeeId: string, status: 'present' | 'absent' | 'leave' | 'weekend') => void;
    addPayrollEntry: (entry: Omit<PayrollEntry, 'id'>) => void;
    updatePayrollEntry: (entry: PayrollEntry) => void;
    deletePayrollEntry: (id: string) => void;
    addUser: (user: Omit<CurrentUserType, 'id'>) => void;
    updateUser: (user: CurrentUserType) => void;
    deleteUser: (id: string) => void;
    updateLowBalanceThreshold: (newThreshold: number) => void;
    updateDashboardWidgets: (widgets: DashboardWidgets) => void;
    addLowBalanceRecord: (record: Omit<LowBalanceRecord, 'id' | 'date'>) => void;
    clearLowBalanceLog: () => void;
    handleDataReset: () => void;
    handleExportData: () => void;
    handleImportCsv: (csvString: string, dataType: 'accounts') => void;
    isFormDirty: boolean;
    setIsFormDirty: (isDirty: boolean) => void;
    requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger' }) => void;
    fileName: string;
    storageStatus?: 'browser' | 'disk' | 'unsaved';
    lastSavedTime?: Date | null;
    handleNewDocument: () => void;
    handleOpenFile: () => void;
    handleSaveFile: (saveAs?: boolean) => void;
    handleConnectLocalFile: () => void;
    handleCreateLocalFile: () => void;
}

// --- Navigation Structure Definition ---
const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard size={20} /> },
    { id: 'taskCalendar', label: 'تقويم المهام', icon: <Banknote size={20} /> },
    { id: 'operations', label: 'العمليات', icon: <Ship size={20} /> },
    { id: 'journal', label: 'قيود اليومية', icon: <Book size={20} /> },
    { id: 'payroll', label: 'الرواتب', icon: <Users size={20} /> },
    { id: 'accounts', label: 'دليل الحسابات', icon: <ListChecks size={20} /> },
    { id: 'customerManagement', label: 'إدارة العملاء', icon: <User size={20} /> },
    { id: 'bankAndCash', label: 'النقدية والبنوك', icon: <Banknote size={20} /> },
    { id: 'trialBalance', label: 'ميزان المراجعة', icon: <PieChart size={20} /> },
    { id: 'profitAndLoss', label: 'قائمة الدخل', icon: <BarChart2 size={20} /> },
    { id: 'finalReports', label: 'القوائم المالية', icon: <FileText size={20} /> },
    { id: 'accountAnalysis', label: 'تحليل الحسابات', icon: <PieChart size={20} /> },
    { id: 'expenseReport', label: 'تقرير المصروفات', icon: <BarChart2 size={20} /> },
    { id: 'operationalCostReport', label: 'تكاليف العمليات', icon: <Briefcase size={20} /> },
    { id: 'taxReport', label: 'تقرير الضرائب', icon: <Banknote size={20} /> },
    { id: 'aiReports', label: 'تقارير AI', icon: <Bot size={20} /> },
    { id: 'userManagement', label: 'إدارة المستخدمين', icon: <Settings size={20} /> },
    { id: 'dataManagement', label: 'إدارة البيانات', icon: <Settings size={20} /> },
];

const Layout: React.FC<LayoutProps> = (props) => {
    const { isFormDirty, setIsFormDirty } = props;
    const [activeView, setActiveView] = useState('dashboard');
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [previousView, setPreviousView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    // Modal states
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [startupAdvice, setStartupAdvice] = useState<{title: string; description: string}[] | null>(null);
    const [isGuideLoading, setIsGuideLoading] = useState(false);
    const [guideShownInSession, setGuideShownInSession] = useState(false);
    
    // State for pre-filling journal entries
    const [prefilledJournalLine, setPrefilledJournalLine] = useState<Partial<JournalEntryLine> | null>(null);

    // State for navigating to a specific operation
    const [targetOperationId, setTargetOperationId] = useState<string | null>(null);

    const handleNavigation = (viewId: string) => {
        if (props.isFormDirty) {
            props.requestConfirmation({
                title: 'تغييرات غير محفوظة',
                message: 'لديك تغييرات غير محفوظة. هل تريد تجاهلها والمتابعة؟',
                onConfirm: () => {
                    props.setIsFormDirty(false);
                    setActiveView(viewId);
                    setIsSidebarOpen(false);
                },
                variant: 'danger'
            });
            return;
        }
        setActiveView(viewId);
        setIsSidebarOpen(false); // Close sidebar on mobile on navigation
    };

    const handleNavigateToJournalWithPrefill = (account: Account) => {
        if (isFormDirty) {
            props.requestConfirmation({
                title: 'تغييرات غير محفوظة',
                message: 'لديك تغييرات غير محفوظة سيتم فقدانها. هل تريد إنشاء قيد جديد على أي حال؟',
                onConfirm: () => {
                    setIsFormDirty(false);
                    const prefill: Partial<JournalEntryLine> = { accountId: account.id };
                    setPrefilledJournalLine(prefill);
                    setActiveView('journal');
                },
                variant: 'danger'
            });
            return;
        }
        
        const prefill: Partial<JournalEntryLine> = { accountId: account.id };
        setPrefilledJournalLine(prefill);
        setActiveView('journal'); 
    };

    const handleNavigateToOperation = (operation: Operation) => {
        if (isFormDirty) {
            props.requestConfirmation({
                title: 'تغييرات غير محفوظة',
                message: 'لديك تغييرات غير محفوظة. هل تريد تجاهلها والمتابعة؟',
                onConfirm: () => {
                    setIsFormDirty(false);
                    setTargetOperationId(operation.id);
                    setActiveView('operations');
                },
                variant: 'danger'
            });
            return;
        }
        setTargetOperationId(operation.id);
        setActiveView('operations');
    }

    const handleAccountSelect = (account: Account, parentView: string) => {
        setSelectedAccount(account);
        setPreviousView(parentView);
        setActiveView('accountDetail');
    };

    const handleBack = () => {
        setSelectedAccount(null);
        setActiveView(previousView);
    };

    // AI Startup Guide logic
    useEffect(() => {
        const isFreshStart = props.journalEntries.length === 0 && props.operations.length === 1 && props.operations[0].code === '2311-002-03';
        if (isFreshStart && !guideShownInSession) {
            const fetchAdvice = async () => {
                setIsGuideOpen(true);
                setIsGuideLoading(true);
                try {
                    const advice = await getStartupAdvice(props.accounts);
                    setStartupAdvice(advice);
                } catch (error) {
                    console.error("Failed to get startup advice:", error);
                    setStartupAdvice([{ title: "خطأ في الاتصال", description: "لم نتمكن من تحميل إرشادات البدء من مساعد الذكاء الاصطناعي. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى." }]);
                } finally {
                    setIsGuideLoading(false);
                    setGuideShownInSession(true); // Mark as shown for this session
                }
            };
            fetchAdvice();
        }
    }, [props.journalEntries, props.operations, props.accounts, guideShownInSession]);


    const renderActiveView = () => {
        // Handle detail view first
        if (activeView === 'accountDetail' && selectedAccount) {
            return <AccountDetailView account={selectedAccount} journalEntries={props.journalEntries} accounts={props.accounts} />;
        }

        switch (activeView) {
            case 'dashboard': return <Dashboard journalEntries={props.journalEntries} accounts={props.accounts} operations={props.operations} tasks={props.tasks} setActiveView={setActiveView} lowBalanceThreshold={props.lowBalanceThreshold} updateLowBalanceThreshold={props.updateLowBalanceThreshold} currentUser={props.currentUser} dashboardWidgets={props.dashboardWidgets} updateDashboardWidgets={props.updateDashboardWidgets} lowBalanceLog={props.lowBalanceLog} addLowBalanceRecord={props.addLowBalanceRecord} clearLowBalanceLog={props.clearLowBalanceLog} storageStatus={props.storageStatus} />;
            case 'operations': return <Operations operations={props.operations} accounts={props.accounts} addOperation={props.addOperation} updateOperation={props.updateOperation} deleteOperation={props.deleteOperation} currentUser={props.currentUser} setIsFormDirty={setIsFormDirty} journalEntries={props.journalEntries} linkOperationToJournalEntry={props.linkOperationToJournalEntry} onNavigateToJournal={setActiveView} priceLists={props.priceLists} documents={props.documents} addDocument={props.addDocument} deleteDocument={props.deleteDocument} linkExistingDocuments={props.linkExistingDocuments} initialOperationId={targetOperationId} onClearInitialOperation={() => setTargetOperationId(null)} requestConfirmation={props.requestConfirmation} />;
            case 'journal': return <Journal journalEntries={props.journalEntries} addJournalEntry={props.addJournalEntry} accounts={props.accounts} currentUser={props.currentUser} setIsFormDirty={setIsFormDirty} prefilledJournalLine={prefilledJournalLine} clearPrefill={() => setPrefilledJournalLine(null)} onAccountClick={(acc) => handleAccountSelect(acc, 'journal')} operations={props.operations} onNavigateToOperation={handleNavigateToOperation} requestConfirmation={props.requestConfirmation} />;
            case 'payroll': return <Payroll {...props} requestConfirmation={props.requestConfirmation} />;
            case 'accounts': return <AccountListView accounts={props.accounts} journalEntries={props.journalEntries} onAccountSelect={handleAccountSelect} addGeneralAccount={props.addGeneralAccount} updateAccount={props.updateAccount} deleteAccount={props.deleteAccount} currentUser={props.currentUser} onNewJournalEntry={handleNavigateToJournalWithPrefill} documents={props.documents} requestConfirmation={props.requestConfirmation} />;
            case 'customerManagement': return <CustomerManagement accounts={props.accounts} operations={props.operations} journalEntries={props.journalEntries} onAccountSelect={handleAccountSelect} addCustomer={props.addCustomer} updateAccount={props.updateAccount} deleteAccount={props.deleteAccount} currentUser={props.currentUser} priceLists={props.priceLists} addPriceList={props.addPriceList} updatePriceList={props.updatePriceList} deletePriceList={props.deletePriceList} documents={props.documents} requestConfirmation={props.requestConfirmation} />;
            case 'bankAndCash': return <AccountsManagement accounts={props.accounts} journalEntries={props.journalEntries} onAccountSelect={handleAccountSelect} addAccount={props.addAccount} updateAccount={props.updateAccount} deleteAccount={props.deleteAccount} currentUser={props.currentUser} onNewJournalEntry={handleNavigateToJournalWithPrefill} documents={props.documents} requestConfirmation={props.requestConfirmation} />;
            case 'taskCalendar': return <TaskCalendar tasks={props.tasks} addTask={props.addTask} toggleTask={props.toggleTask} removeTask={props.removeTask} />;
            case 'trialBalance': return <TrialBalance journalEntries={props.journalEntries} accounts={props.accounts} />;
            case 'profitAndLoss': return <ProfitAndLoss journalEntries={props.journalEntries} accounts={props.accounts} />;
            case 'finalReports': return <FinalReports journalEntries={props.journalEntries} accounts={props.accounts} />;
            case 'accountAnalysis': return <AccountAnalysis journalEntries={props.journalEntries} accounts={props.accounts} />;
            case 'expenseReport': return <ExpenseTable journalEntries={props.journalEntries} accounts={props.accounts} />;
            case 'operationalCostReport': return <OperationalCostReport operations={props.operations} accounts={props.accounts} />;
            case 'taxReport': return <TaxReport operations={props.operations} accounts={props.accounts} />;
            case 'aiReports': return <AiReports journalEntries={props.journalEntries} accounts={props.accounts} operations={props.operations} />;
            case 'userManagement': return <UserManagement users={props.users} addUser={props.addUser} updateUser={props.updateUser} deleteUser={props.deleteUser} />;
            case 'dataManagement': return <DataManagement {...props} />;
            default: return <div>View not found</div>;
        }
    };
    
    const pageTitle = navItems.find(item => item.id === activeView)?.label || (activeView === 'accountDetail' ? `تفاصيل حساب: ${selectedAccount?.name}` : 'المساعد المحاسبي');
    const dirtyIndicator = props.isFormDirty ? '*' : '';
    const fullTitle = `${props.fileName}${dirtyIndicator} - ${pageTitle}`;

    useEffect(() => {
        document.title = fullTitle;
    }, [fullTitle]);

    const filteredNavItems = navItems.filter(item => hasPermission(props.currentUser.role, item.id));

    // Storage Status Indicator Component
    const StorageIndicator = () => {
        const status = props.storageStatus || 'browser';
        let icon, text, colorClass;

        if (status === 'disk') {
            icon = <HardDrive size={16} />;
            text = 'حفظ محلي (القرص الصلب)';
            colorClass = 'text-green-600 bg-green-100';
        } else if (status === 'unsaved') {
            icon = <Save size={16} className="animate-pulse"/>;
            text = 'جاري الحفظ...';
            colorClass = 'text-amber-600 bg-amber-100';
        } else {
            icon = <Globe size={16} />;
            text = 'حفظ المتصفح (مؤقت)';
            colorClass = 'text-blue-600 bg-blue-100';
        }

        return (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${colorClass} transition-colors`} title={props.lastSavedTime ? `آخر حفظ: ${props.lastSavedTime.toLocaleTimeString()}` : ''}>
                {icon}
                <span className="hidden sm:inline">{text}</span>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-primary text-text-primary font-sans" dir="rtl">
            <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentUser={props.currentUser} updateUser={props.updateUser} requestConfirmation={props.requestConfirmation} />
            <ChartStyleModal isOpen={isChartModalOpen} onClose={() => setIsChartModalOpen(false)} />
            <StartupGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} isLoading={isGuideLoading} advice={startupAdvice} />
             {/* Overlay for mobile sidebar */}
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30 lg:hidden" />}
            
            {/* Sidebar */}
            <aside className={`bg-primary w-72 flex flex-col fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b border-primary-dark/20">
                    <div>
                        <h1 className="text-xl font-extrabold text-text-primary">إيجيبشن إكسبريس</h1>
                        <p className="text-xs font-bold text-text-secondary">المساعد المحاسبي الذكي</p>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 rounded-full hover:shadow-neumo-sm">
                        <X size={20} />
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4">
                    <ul className="space-y-3">
                        {filteredNavItems.map(item => (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleNavigation(item.id)}
                                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
                                        activeView === item.id 
                                            ? 'bg-primary shadow-neumo-inset text-accent font-bold' 
                                            : 'hover:shadow-neumo-sm font-semibold'
                                    }`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                 <div className="p-4 border-t border-primary-dark/20">
                     <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-4 w-full p-3 rounded-xl transition-all duration-200 hover:shadow-neumo-sm font-bold">
                        <User size={20} />
                        <span>تعديل الملف الشخصي</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex-shrink-0 bg-primary flex items-center justify-between p-4 border-b border-primary-dark/20">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-full hover:shadow-neumo-sm">
                            <Menu size={24} />
                        </button>
                        {activeView === 'accountDetail' && (
                            <button onClick={handleBack} className="flex items-center gap-2 px-3 py-1 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-bold transition-all">
                                <ArrowRight size={18} /><span>رجوع</span>
                            </button>
                        )}
                         <div className="flex flex-col overflow-hidden">
                             <h1 className="text-xl md:text-2xl font-extrabold text-text-primary truncate">{pageTitle}</h1>
                             <div className="flex items-center gap-2 text-xs text-text-secondary truncate">
                                 <span className="font-mono">{props.fileName}</span>
                                 <span className={props.isFormDirty ? 'text-amber-500 font-bold' : 'text-green-500 font-bold'}>{props.isFormDirty ? '(تغييرات غير محفوظة)' : '(محفوظ)'}</span>
                             </div>
                         </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-4">
                         <StorageIndicator />
                         
                         <div className="hidden xl:block w-64">
                            <TodoList journalEntries={props.journalEntries} tasks={props.tasks} addTask={props.addTask} toggleTask={props.toggleTask} removeTask={props.removeTask} />
                         </div>
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="text-right">
                                <p className="font-extrabold text-text-primary">{props.currentUser.username}</p>
                                <p className="text-xs text-text-secondary">{props.currentUser.role}</p>
                            </div>
                            <User size={32} className="p-1 rounded-full bg-primary shadow-neumo-sm text-text-secondary"/>
                        </div>
                        <button onClick={toggleTheme} title={theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'} className="p-3 rounded-full hover:shadow-neumo-sm">
                            {theme === 'light' ? <Bot size={20} /> : <Bot size={20} className="text-yellow-400" />} 
                        </button>
                        <button onClick={() => setIsChartModalOpen(true)} title="إعدادات الرسوم البيانية" className="p-3 rounded-full hover:shadow-neumo-sm"><Settings size={20} /></button>
                        <button onClick={props.onLogout} title="تسجيل الخروج" className="p-3 rounded-full hover:shadow-neumo-sm text-red-500"><LogOut size={20} /></button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-primary-light">
                    {renderActiveView()}
                </main>
                <footer className="text-center p-2 text-sm text-text-secondary bg-primary border-t border-primary-dark/20 no-print">
                    تم بحمد الله بواسطة كرم سيد مصطفى
                </footer>
            </div>
        </div>
    );
};

export default Layout;
