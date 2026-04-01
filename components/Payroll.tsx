import React, { useState, useMemo, useEffect } from 'react';
import { Employee, JournalEntry, Account, AttendanceRecord, AttendanceStatus, User, PayrollEntry, PayrollStatus, PayrollDataRow, PayrollTotals } from '../types.ts';
import { PlusCircle, Edit, Trash2, Printer, FileText, X, CheckCircle, UserCheck, CalendarDays, ClipboardList, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { canPerformAction } from '../permissions.ts';
import ExportDropdown from './ExportDropdown.tsx';

// --- Helper Functions & Types ---

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
const BLANK_EMPLOYEE: Omit<Employee, 'id'> = { 
    name: '', jobTitle: '', socialStatus: '', nationalId: '', insuranceId: '', phone: '', leaveBalance: 0, 
    baseSalary: 0, 
    bonuses: 0,
    representationAllowance: 0,
    transportAllowance: 0,
    mealAllowance: 0,
    clothingAllowance: 0,
    companyInsuranceShare: 0, 
    employeeInsuranceShare: 0, 
    incomeTax: 0 
};


// --- Employee Form Modal ---
interface EmployeeFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (employee: Employee | Omit<Employee, 'id'>) => void;
    initialData?: Employee | null;
}
const EmployeeForm: React.FC<EmployeeFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [formData, setFormData] = useState(initialData ? { ...initialData } : BLANK_EMPLOYEE);

    React.useEffect(() => {
        setFormData(initialData ? { ...initialData } : BLANK_EMPLOYEE);
    }, [initialData, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-primary p-8 rounded-2xl shadow-neumo w-full max-w-4xl max-h-full overflow-y-auto">
                 <h2 className="text-2xl font-bold mb-6 text-slate-800">{initialData ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}</h2>
                 <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Main Details */}
                    <div className="md:col-span-2"><label className="font-semibold text-text-secondary">الاسم</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm" required/></div>
                    <div><label className="font-semibold text-text-secondary">الوظيفة</label><input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>
                    <div><label className="font-semibold text-text-secondary">رقم الهاتف</label><input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>
                    <div><label className="font-semibold text-text-secondary">الرقم القومي</label><input type="text" name="nationalId" value={formData.nationalId} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>
                    <div><label className="font-semibold text-text-secondary">الرقم التأميني</label><input type="text" name="insuranceId" value={formData.insuranceId} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>
                    <div><label className="font-semibold text-text-secondary">الحالة الاجتماعية</label><input type="text" name="socialStatus" value={formData.socialStatus} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>
                    <div className="md:col-span-3"><label className="font-semibold text-text-secondary">رصيد الإجازات</label><input type="number" name="leaveBalance" value={formData.leaveBalance} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm" required/></div>

                    {/* Allowances */}
                    <h3 className="md:col-span-3 text-xl font-bold text-slate-700 mt-4 border-t pt-4">البدلات والاستحقاقات</h3>
                    <div><label className="font-semibold text-text-secondary">الراتب الأساسي</label><input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm" required/></div>
                    <div><label className="font-semibold text-text-secondary">بدل وجبات</label><input type="number" name="mealAllowance" value={formData.mealAllowance || 0} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>
                    <div><label className="font-semibold text-text-secondary">بدل انتقالات</label><input type="number" name="transportAllowance" value={formData.transportAllowance || 0} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>
                    <div><label className="font-semibold text-text-secondary">بدل ملابس</label><input type="number" name="clothingAllowance" value={formData.clothingAllowance || 0} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>
                    <div><label className="font-semibold text-text-secondary">بدل تمثيل</label><input type="number" name="representationAllowance" value={formData.representationAllowance || 0} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>
                    <div><label className="font-semibold text-text-secondary">منح</label><input type="number" name="bonuses" value={formData.bonuses || 0} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>
                    
                    {/* Deductions */}
                    <h3 className="md:col-span-3 text-xl font-bold text-slate-700 mt-4 border-t pt-4">الاقتطاعات</h3>
                    <div><label className="font-semibold text-text-secondary">تأمينات حصة الشركة</label><input type="number" name="companyInsuranceShare" value={formData.companyInsuranceShare} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm" required/></div>
                    <div><label className="font-semibold text-text-secondary">تأمينات حصة العامل</label><input type="number" name="employeeInsuranceShare" value={formData.employeeInsuranceShare} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm" required/></div>
                    <div><label className="font-semibold text-text-secondary">ضريبة الدخل</label><input type="number" name="incomeTax" value={formData.incomeTax} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm" required/></div>
                    <div><label className="font-semibold text-text-secondary">سلف وقروض</label><input type="number" name="advancesAndLoans" value={formData.advancesAndLoans || 0} onChange={handleChange} className="w-full mt-1 p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/></div>

                    <div className="md:col-span-3 mt-6 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold">إلغاء</button>
                        <button type="submit" className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Payroll Report Modal ---
interface PayrollReportProps {
    isOpen: boolean;
    onClose: () => void;
    payrollEntry: PayrollEntry | null;
    onPostJournal: (payrollToPost: PayrollEntry) => void;
    onUpdate: (entry: PayrollEntry) => void;
    canPost: boolean;
    canEdit: boolean;
    requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger'; showCancel?: boolean }) => void;
}
const PayrollReport: React.FC<PayrollReportProps> = ({ isOpen, onClose, payrollEntry, onPostJournal, onUpdate, canPost, canEdit, requestConfirmation }) => {
    const [editableEntry, setEditableEntry] = useState<PayrollEntry | null>(null);

    useEffect(() => {
        // Deep copy to prevent modifying the original state directly
        setEditableEntry(payrollEntry ? JSON.parse(JSON.stringify(payrollEntry)) : null);
    }, [payrollEntry, isOpen]);

    if (!isOpen || !editableEntry) return null;
    
    const { monthYear, status } = editableEntry;
    const isDraft = status === 'Draft';

    const handleDataChange = (employeeId: string, field: keyof PayrollDataRow, value: number) => {
        if (!editableEntry) return;

        const updatedPayrollData = editableEntry.payrollData.map(emp => {
            if (emp.id === employeeId) {
                const updatedEmp = { ...emp, [field]: value };
                
                // Recalculate row totals
                const grossSalary = updatedEmp.baseSalary + (updatedEmp.bonuses || 0) + (updatedEmp.representationAllowance || 0) + (updatedEmp.transportAllowance || 0) + (updatedEmp.mealAllowance || 0) + (updatedEmp.clothingAllowance || 0);
                const totalDeductions = (updatedEmp.employeeInsuranceShare || 0) + (updatedEmp.incomeTax || 0) + (updatedEmp.advancesAndLoans || 0) + updatedEmp.absenceDeduction;
                const netSalary = grossSalary - totalDeductions;

                return { ...updatedEmp, grossSalary, totalDeductions, netSalary };
            }
            return emp;
        });

        const newTotals: PayrollTotals = updatedPayrollData.reduce((acc, emp) => ({
            baseSalary: acc.baseSalary + emp.baseSalary, bonuses: acc.bonuses + (emp.bonuses || 0), representationAllowance: acc.representationAllowance + (emp.representationAllowance || 0), transportAllowance: acc.transportAllowance + (emp.transportAllowance || 0), mealAllowance: acc.mealAllowance + (emp.mealAllowance || 0), clothingAllowance: acc.clothingAllowance + (emp.clothingAllowance || 0), grossSalary: acc.grossSalary + emp.grossSalary, companyInsuranceShare: acc.companyInsuranceShare + emp.companyInsuranceShare, employeeInsuranceShare: acc.employeeInsuranceShare + emp.employeeInsuranceShare, incomeTax: acc.incomeTax + emp.incomeTax, advancesAndLoans: acc.advancesAndLoans + (emp.advancesAndLoans || 0), totalDeductions: acc.totalDeductions + emp.totalDeductions, netSalary: acc.netSalary + emp.netSalary, absenceDays: acc.absenceDays + emp.absenceDays, absenceDeduction: acc.absenceDeduction + emp.absenceDeduction,
        }), { baseSalary: 0, bonuses: 0, representationAllowance: 0, transportAllowance: 0, mealAllowance: 0, clothingAllowance: 0, grossSalary: 0, companyInsuranceShare: 0, employeeInsuranceShare: 0, incomeTax: 0, advancesAndLoans: 0, totalDeductions: 0, netSalary: 0, absenceDays: 0, absenceDeduction: 0 });


        setEditableEntry({
            ...editableEntry,
            payrollData: updatedPayrollData,
            totals: newTotals,
        });
    };

    const handleSaveDraft = () => {
        if (editableEntry) {
            onUpdate(editableEntry);
            // Using requestConfirmation as an alert
            requestConfirmation({
                title: 'تم الحفظ',
                message: 'تم حفظ تعديلات المسودة بنجاح.',
                onConfirm: () => {},
                showCancel: false,
                variant: 'primary'
            });
        }
    };
    
    const { payrollData, totals } = editableEntry;

    const csvHeaders = ["اسم الموظف", "الوظيفة", "اجمالي الراتب", "اجمالي الاقتطاعات", "صافي الراتب المستحق"];
    const csvData = payrollData.map(emp => [emp.name, emp.jobTitle, emp.grossSalary, emp.totalDeductions, emp.netSalary]);
    csvData.push(["الإجمالي", "", totals.grossSalary, totals.totalDeductions, totals.netSalary]);
    
    const emailBody = `ملخص رواتب شهر ${monthYear}:\n----------------------------------\nإجمالي الرواتب: ${formatCurrency(totals.grossSalary)}\nإجمالي الاقتطاعات: ${formatCurrency(totals.totalDeductions)}\nصافي الرواتب المستحقة: ${formatCurrency(totals.netSalary)}\n----------------------------------\nالرجاء مراجعة الملف المرفق لمزيد من التفاصيل.`;

    const EditableCell: React.FC<{emp: PayrollDataRow, field: keyof PayrollDataRow}> = ({ emp, field }) => {
        return (
            <td className="border border-black p-0">
                {isDraft && canEdit ? (
                    <input 
                        type="number" 
                        value={emp[field] as number || 0}
                        onChange={e => handleDataChange(emp.id, field, Number(e.target.value))}
                        className="w-full h-full p-1 bg-yellow-100 text-center font-bold border-0 focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                ) : (
                    <span className="p-1 font-bold block">{formatCurrency(emp[field] as number || 0)}</span>
                )}
            </td>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 print:p-0 print:bg-white">
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-screen-2xl max-h-[95vh] flex flex-col">
                <div className="printable-area flex-1 overflow-auto bg-white p-4 text-black">
                     <div className="text-center mb-4">
                        <h1 className="text-xl font-bold">إيجيبشن إكسبريس للشحن و التجارة</h1>
                        <h2 className="text-lg font-bold">رواتب مركز رئيسي (١) شهر {new Date(monthYear).toLocaleDateString('ar-EG', {month: 'long', year: 'numeric'})}</h2>
                    </div>
                    <table className="w-full border-collapse border border-black text-xs text-center whitespace-nowrap">
                        <thead className="bg-gray-200 font-bold">
                            <tr>
                                <th rowSpan={2} className="border border-black p-1">م</th>
                                <th rowSpan={2} className="border border-black p-1">اسم الموظف</th>
                                <th rowSpan={2} className="border border-black p-1">المهنة</th>
                                <th rowSpan={2} className="border border-black p-1">الرقم القومي</th>
                                <th rowSpan={2} className="border border-black p-1">الرقم التأميني</th>
                                <th colSpan={7} className="border border-black p-1">تفاصيل الراتب</th>
                                <th colSpan={6} className="border border-black p-1">الإقتطاعات</th>
                                <th rowSpan={2} className="border border-black p-1">صافي الراتب المستحق</th>
                            </tr>
                            <tr>
                                <th className="border border-black p-1">المرتب</th>
                                <th className="border border-black p-1">منح</th>
                                <th className="border border-black p-1">بدل ملابس</th>
                                <th className="border border-black p-1">بدل وجبات</th>
                                <th className="border border-black p-1">بدل إنتقالات</th>
                                <th className="border border-black p-1">بدل تمثيل</th>
                                <th className="border border-black p-1">اجمالي الراتب</th>
                                <th className="border border-black p-1">أيام الغياب</th>
                                <th className="border border-black p-1">خصم الغياب</th>
                                <th className="border border-black p-1">تأمينات حصة العامل</th>
                                <th className="border border-black p-1">ضريبة المرتبات</th>
                                <th className="border border-black p-1">سلف و اخرى</th>
                                <th className="border border-black p-1">مجموع الإقتطاعات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payrollData.map((emp, index) => (
                                <tr key={emp.id}>
                                    <td className="border border-black p-1 font-bold">{index + 1}</td>
                                    <td className="border border-black p-1 text-right font-bold">{emp.name}</td>
                                    <td className="border border-black p-1 text-right font-bold">{emp.jobTitle}</td>
                                    <td className="border border-black p-1 font-bold">{emp.nationalId}</td>
                                    <td className="border border-black p-1 font-bold">{emp.insuranceId}</td>
                                    <td className="border border-black p-1 font-bold">{formatCurrency(emp.baseSalary)}</td>
                                    <EditableCell emp={emp} field="bonuses" />
                                    <td className="border border-black p-1 font-bold">{formatCurrency(emp.clothingAllowance || 0)}</td>
                                    <td className="border border-black p-1 font-bold">{formatCurrency(emp.mealAllowance || 0)}</td>
                                    <td className="border border-black p-1 font-bold">{formatCurrency(emp.transportAllowance || 0)}</td>
                                    <td className="border border-black p-1 font-bold">{formatCurrency(emp.representationAllowance || 0)}</td>
                                    <td className="border border-black p-1 font-bold bg-gray-100">{formatCurrency(emp.grossSalary)}</td>
                                    <td className="border border-black p-1 font-bold">{emp.absenceDays}</td>
                                    <EditableCell emp={emp} field="absenceDeduction" />
                                    <td className="border border-black p-1 font-bold">{formatCurrency(emp.employeeInsuranceShare)}</td>
                                    <td className="border border-black p-1 font-bold">{formatCurrency(emp.incomeTax)}</td>
                                    <EditableCell emp={emp} field="advancesAndLoans" />
                                    <td className="border border-black p-1 font-bold bg-gray-100">{formatCurrency(emp.totalDeductions)}</td>
                                    <td className="border border-black p-1 font-bold bg-green-100">{formatCurrency(emp.netSalary)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-200 font-bold">
                           <tr>
                                <td colSpan={5} className="border border-black p-1">المجموع</td>
                                <td className="border border-black p-1">{formatCurrency(totals.baseSalary)}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.bonuses)}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.clothingAllowance)}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.mealAllowance)}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.transportAllowance)}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.representationAllowance)}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.grossSalary)}</td>
                                <td className="border border-black p-1">{totals.absenceDays}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.absenceDeduction)}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.employeeInsuranceShare)}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.incomeTax)}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.advancesAndLoans)}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.totalDeductions)}</td>
                                <td className="border border-black p-1">{formatCurrency(totals.netSalary)}</td>
                            </tr>
                        </tfoot>
                    </table>
                     <div className="flex justify-between mt-16 text-sm">
                        <span>........................... :المحاسب</span>
                        <span>........................... :المدير العام</span>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-4 no-print">
                    <button onClick={onClose} className="px-4 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold">إغلاق</button>
                    {isDraft && canEdit && <button onClick={handleSaveDraft} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"><Save size={18}/> حفظ المسودة</button>}
                    {canPost && (status === 'Posted' ? (
                         <span className="flex items-center gap-2 px-4 py-2 bg-green-200 text-green-800 rounded-md font-semibold"><CheckCircle size={18}/> تم ترحيل القيد</span>
                    ) : (
                         <button onClick={() => onPostJournal(editableEntry)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">ترحيل قيد اليومية</button>
                    ))}
                    <ExportDropdown 
                        title={`تقرير رواتب شهر ${monthYear}`}
                        csvHeaders={csvHeaders}
                        csvData={csvData}
                        emailBodyContent={emailBody}
                        onPrint={() => window.print()}
                    />
                </div>
            </div>
        </div>
    );
};

// --- Attendance Sheet Component ---
interface AttendanceSheetProps {
    employees: Employee[];
    attendance: AttendanceRecord;
    updateAttendance: (date: string, employeeId: string, status: AttendanceStatus) => void;
    selectedDate: string; // "YYYY-MM"
}
const AttendanceSheet: React.FC<AttendanceSheetProps> = ({ employees, attendance, updateAttendance, selectedDate }) => {
    const daysInMonth = useMemo(() => {
        const [year, month] = selectedDate.split('-').map(Number);
        const date = new Date(year, month, 0);
        return date.getDate();
    }, [selectedDate]);

    const statusOptions: { value: AttendanceStatus, label: string, color: string }[] = [
        { value: 'present', label: 'ح', color: 'bg-green-500 text-white' },
        { value: 'absent', label: 'غ', color: 'bg-red-500 text-white' },
        { value: 'leave', label: 'إ', color: 'bg-yellow-500 text-white' },
    ];
    
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-right whitespace-nowrap border-collapse">
                <thead>
                    <tr className="border-b-2 border-primary-dark/30">
                        <th className="p-2 font-semibold sticky right-0 bg-primary z-10">الموظف</th>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => <th key={day} className="p-2 font-semibold text-center">{day}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {employees.map(emp => (
                        <tr key={emp.id} className="border-b border-primary-dark/20">
                            <td className="p-2 font-bold text-slate-800 sticky right-0 bg-primary z-10">{emp.name}</td>
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const dateStr = `${selectedDate}-${day.toString().padStart(2, '0')}`;
                                const dayOfWeek = new Date(dateStr).getDay();
                                const isWeekend = dayOfWeek === 4 || dayOfWeek === 5; // Assuming Thursday/Friday
                                const currentStatus = isWeekend ? 'weekend' : attendance[dateStr]?.[emp.id] || 'present';
                                
                                if (isWeekend) {
                                  return <td key={day} className="p-2 text-center bg-primary-dark/20 text-text-secondary">ع</td>
                                }

                                return (
                                    <td key={day} className="p-1 text-center">
                                        <select
                                            value={currentStatus}
                                            onChange={(e) => updateAttendance(dateStr, emp.id, e.target.value as AttendanceStatus)}
                                            className={`w-12 h-8 text-center border-0 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-accent font-bold ${statusOptions.find(s => s.value === currentStatus)?.color || 'bg-gray-200'}`}
                                        >
                                            {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


// --- Main Payroll Component ---
interface PayrollProps extends LayoutProps {
    requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger' }) => void;
}
const Payroll: React.FC<PayrollProps> = ({ employees, addEmployee, updateEmployee, deleteEmployee, addJournalEntry, accounts, attendance, updateAttendance, currentUser, payrollEntries, addPayrollEntry, updatePayrollEntry, deletePayrollEntry, requestConfirmation }) => {
    const [activeTab, setActiveTab] = useState<'payrolls' | 'employees' | 'attendance'>('payrolls');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [viewingPayroll, setViewingPayroll] = useState<PayrollEntry | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7));
    const [filterStatus, setFilterStatus] = useState<PayrollStatus | 'all'>('all');


    const canCreate = canPerformAction(currentUser.role, 'create');
    const canEdit = canPerformAction(currentUser.role, 'edit');
    const canDelete = canPerformAction(currentUser.role, 'delete');
    const canPost = canPerformAction(currentUser.role, 'post');

    const handleAddNewEmployee = () => { if(canCreate) { setCurrentEmployee(null); setIsFormOpen(true); } };
    const handleEditEmployee = (employee: Employee) => { if(canEdit) { setCurrentEmployee(employee); setIsFormOpen(true); } };
    const handleSubmitEmployee = (data: Employee | Omit<Employee, 'id'>) => { 'id' in data ? updateEmployee(data) : addEmployee(data); };
    
    const usedLeaveDaysMap = useMemo(() => {
        const map = new Map<string, number>();
        employees.forEach(emp => map.set(emp.id, 0));
        for (const date in attendance) {
            for (const employeeId in attendance[date]) {
                if (attendance[date][employeeId] === 'leave') {
                    map.set(employeeId, (map.get(employeeId) || 0) + 1);
                }
            }
        }
        return map;
    }, [attendance, employees]);

    const handlePrevMonth = () => {
        const currentDate = new Date(selectedDate + '-01T12:00:00Z');
        currentDate.setMonth(currentDate.getMonth() - 1);
        setSelectedDate(currentDate.toISOString().slice(0, 7));
    };

    const handleNextMonth = () => {
        const currentDate = new Date(selectedDate + '-01T12:00:00Z');
        currentDate.setMonth(currentDate.getMonth() + 1);
        setSelectedDate(currentDate.toISOString().slice(0, 7));
    };


    const generatePayrollData = (date: string) => {
        const payrollData: PayrollDataRow[] = employees.map(emp => {
            // 1. Calculate leave used BEFORE this payroll month
            let priorUsedLeave = 0;
            for (const dateKey in attendance) {
                if (dateKey < `${date}-01`) { // dates are YYYY-MM-DD
                    if (attendance[dateKey][emp.id] === 'leave') {
                        priorUsedLeave++;
                    }
                }
            }
            const balanceAtStartOfMonth = emp.leaveBalance - priorUsedLeave;

            // 2. Count leave/absence days FOR this payroll month
            let leaveDaysThisMonth = 0;
            let absentDaysThisMonth = 0;
            const [year, month] = date.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${date}-${i.toString().padStart(2, '0')}`;
                const status = attendance[dateStr]?.[emp.id];
                if (status === 'leave') {
                    leaveDaysThisMonth++;
                } else if (status === 'absent') {
                    absentDaysThisMonth++;
                }
            }

            // 3. Calculate paid vs unpaid days
            const paidLeaveDays = Math.min(leaveDaysThisMonth, balanceAtStartOfMonth);
            const unpaidLeaveDays = leaveDaysThisMonth - paidLeaveDays;
            const totalUnpaidDays = absentDaysThisMonth + unpaidLeaveDays;

            // 4. Calculate deduction
            const dailyRate = emp.baseSalary > 0 && daysInMonth > 0 ? emp.baseSalary / daysInMonth : 0;
            const absenceDeduction = totalUnpaidDays * dailyRate;
            
            // 5. Calculate financials
            const grossSalary = (emp.baseSalary || 0) + (emp.bonuses || 0) + (emp.representationAllowance || 0) + (emp.transportAllowance || 0) + (emp.mealAllowance || 0) + (emp.clothingAllowance || 0);
            const totalDeductions = (emp.employeeInsuranceShare || 0) + (emp.incomeTax || 0) + (emp.advancesAndLoans || 0) + absenceDeduction;
            const netSalary = grossSalary - totalDeductions;

            return { ...emp, grossSalary, totalDeductions, netSalary, absenceDays: totalUnpaidDays, absenceDeduction };
        });

        const totals: PayrollTotals = payrollData.reduce((acc, emp) => ({
            baseSalary: acc.baseSalary + emp.baseSalary, bonuses: acc.bonuses + (emp.bonuses || 0), representationAllowance: acc.representationAllowance + (emp.representationAllowance || 0), transportAllowance: acc.transportAllowance + (emp.transportAllowance || 0), mealAllowance: acc.mealAllowance + (emp.mealAllowance || 0), clothingAllowance: acc.clothingAllowance + (emp.clothingAllowance || 0), grossSalary: acc.grossSalary + emp.grossSalary, companyInsuranceShare: acc.companyInsuranceShare + emp.companyInsuranceShare, employeeInsuranceShare: acc.employeeInsuranceShare + emp.employeeInsuranceShare, incomeTax: acc.incomeTax + emp.incomeTax, advancesAndLoans: acc.advancesAndLoans + (emp.advancesAndLoans || 0), totalDeductions: acc.totalDeductions + emp.totalDeductions, netSalary: acc.netSalary + emp.netSalary, absenceDays: acc.absenceDays + emp.absenceDays, absenceDeduction: acc.absenceDeduction + emp.absenceDeduction,
        }), { baseSalary: 0, bonuses: 0, representationAllowance: 0, transportAllowance: 0, mealAllowance: 0, clothingAllowance: 0, grossSalary: 0, companyInsuranceShare: 0, employeeInsuranceShare: 0, incomeTax: 0, advancesAndLoans: 0, totalDeductions: 0, netSalary: 0, absenceDays: 0, absenceDeduction: 0 });

        const newPayrollEntry: Omit<PayrollEntry, 'id'> = {
            monthYear: date,
            status: 'Draft',
            payrollData: payrollData,
            totals: totals,
        };

        addPayrollEntry(newPayrollEntry);
        // Using requestConfirmation as an alert
        requestConfirmation({
            title: 'تم الإنشاء',
            message: `تم إنشاء كشف رواتب مسودة لشهر ${date} بنجاح.`,
            onConfirm: () => {},
            showCancel: false,
            variant: 'primary'
        });
    };

    const handleGeneratePayroll = () => {
        if (!canCreate) return;
        
        const existingEntry = payrollEntries.find(p => p.monthYear === selectedDate);
        if (existingEntry) {
            if (existingEntry.status === 'Posted') {
                requestConfirmation({
                    title: 'لا يمكن إعادة الإنشاء',
                    message: 'لا يمكن إعادة إنشاء كشف رواتب تم ترحيله بالفعل.',
                    onConfirm: () => {},
                    showCancel: false,
                    variant: 'danger'
                });
                return;
            }
            requestConfirmation({
                title: 'تأكيد إعادة الإنشاء',
                message: `يوجد كشف رواتب مُعد بالفعل لشهر ${selectedDate}. هل تريد حذفه وإنشاء واحد جديد؟`,
                onConfirm: () => {
                    deletePayrollEntry(existingEntry.id);
                    generatePayrollData(selectedDate);
                },
                variant: 'danger'
            });
            return;
        }

        generatePayrollData(selectedDate);
    };

    const handlePostJournalEntry = async (payrollToPost: PayrollEntry) => {
        if (!canPost) {
            requestConfirmation({
                title: 'صلاحية محدودة',
                message: "ليس لديك الصلاحية لترحيل القيود.",
                onConfirm: () => {},
                showCancel: false,
                variant: 'danger'
            });
            return;
        }
        const monthYear = new Date(payrollToPost.monthYear).toLocaleDateString('ar-EG', {month: 'long', year: 'numeric'});
        
        requestConfirmation({
            title: 'ترحيل الرواتب',
            message: `هل أنت متأكد من ترحيل قيد رواتب شهر ${monthYear}؟ لا يمكن التراجع عن هذه العملية.`,
            onConfirm: async () => {
                const { totals } = payrollToPost;

                // Correct salary expense (Gross earned - what was lost due to absence)
                const salaryExpense = totals.grossSalary - totals.absenceDeduction;
                // Total expense to record in P&L for salaries is the salary expense + the company's contribution
                const totalExpense = salaryExpense + totals.companyInsuranceShare;

                const journalEntry: Omit<JournalEntry, 'id'> = {
                    date: new Date(payrollToPost.monthYear + '-28').toISOString().split('T')[0],
                    description: `قيد إثبات رواتب شهر ${monthYear}`,
                    lines: [
                         // Dr. Salary & Wages Expense (Total cost to company for salaries)
                        { accountId: '5030', debit: totalExpense, credit: 0 },
                        // Cr. Salaries Payable (Net amount to be paid to employees)
                        { accountId: '2130', debit: 0, credit: totals.netSalary },
                        // Cr. Income Tax Payable
                        { accountId: '2110', debit: 0, credit: totals.incomeTax },
                        // Cr. Social Insurance Payable (Both employee and company portions)
                        { accountId: '2120', debit: 0, credit: totals.employeeInsuranceShare + totals.companyInsuranceShare },
                    ]
                };
                
                if (totals.advancesAndLoans > 0) {
                    journalEntry.lines.push({ accountId: '1010', debit: 0, credit: totals.advancesAndLoans });
                }

                const journalId = await addJournalEntry(journalEntry);
                
                if(journalId) {
                    const updatedPayroll: PayrollEntry = { ...payrollToPost, status: 'Posted', journalEntryId: journalId };
                    updatePayrollEntry(updatedPayroll);
                    
                    requestConfirmation({
                        title: 'تم الترحيل',
                        message: 'تم ترحيل قيد اليومية بنجاح!',
                        onConfirm: () => {},
                        showCancel: false,
                        variant: 'primary'
                    });
                    setIsReportOpen(false);
                    setViewingPayroll(null);
                } else {
                    requestConfirmation({
                        title: 'فشل الترحيل',
                        message: 'فشل ترحيل قيد اليومية. يرجى المراجعة.',
                        onConfirm: () => {},
                        showCancel: false,
                        variant: 'danger'
                    });
                }
            }
        });
    };

    const filteredPayrolls = useMemo(() => {
        return payrollEntries
            .filter(p => filterStatus === 'all' || p.status === filterStatus)
            .sort((a, b) => b.monthYear.localeCompare(a.monthYear));
    }, [payrollEntries, filterStatus]);
    
    const statusMap: Record<PayrollStatus, {text: string, className: string}> = {
        'Draft': { text: 'مسودة', className: 'bg-yellow-200 text-yellow-800' },
        'Posted': { text: 'مرحَّل', className: 'bg-green-200 text-green-800' },
    };

    return (
        <div>
            <EmployeeForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleSubmitEmployee} initialData={currentEmployee} />
            <PayrollReport 
                isOpen={isReportOpen} 
                onClose={() => { setViewingPayroll(null); setIsReportOpen(false); }} 
                payrollEntry={viewingPayroll} 
                onPostJournal={handlePostJournalEntry} 
                onUpdate={updatePayrollEntry}
                canPost={canPost}
                canEdit={canEdit}
                requestConfirmation={requestConfirmation}
            />

            <div className="flex border-b-2 border-primary-dark/20 mb-6">
                <button onClick={() => setActiveTab('payrolls')} className={`flex items-center gap-2 px-4 py-2 font-semibold ${activeTab === 'payrolls' ? 'border-b-2 border-accent text-accent' : 'text-text-secondary'}`}><ClipboardList size={18}/> كشوف الرواتب</button>
                <button onClick={() => setActiveTab('employees')} className={`flex items-center gap-2 px-4 py-2 font-semibold ${activeTab === 'employees' ? 'border-b-2 border-accent text-accent' : 'text-text-secondary'}`}><UserCheck size={18}/> قائمة الموظفين</button>
                <button onClick={() => setActiveTab('attendance')} className={`flex items-center gap-2 px-4 py-2 font-semibold ${activeTab === 'attendance' ? 'border-b-2 border-accent text-accent' : 'text-text-secondary'}`}><CalendarDays size={18}/> سجل الحضور</button>
            </div>

            {activeTab === 'payrolls' && (
                <div className="space-y-8">
                    {canCreate && (
                        <div className="bg-primary p-6 rounded-2xl shadow-neumo">
                            <h2 className="text-xl font-bold text-slate-700 mb-4">إنشاء كشف رواتب جديد</h2>
                            <div className="flex items-center gap-4">
                                <input type="month" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-2 bg-primary rounded-xl shadow-neumo-inset-sm"/>
                                <button onClick={handleGeneratePayroll} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold shadow-sm"><FileText size={18}/> إنشاء مسودة</button>
                            </div>
                        </div>
                    )}
                    <div className="bg-primary p-6 rounded-2xl shadow-neumo">
                        <div className="flex items-center gap-4 mb-4">
                            <span className="font-semibold text-text-secondary">فلتر الحالة:</span>
                             <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="p-2 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none">
                                <option value="all">الكل</option>
                                <option value="Draft">مسودة</option>
                                <option value="Posted">مرحَّل</option>
                            </select>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="w-full text-right">
                                <thead>
                                    <tr className="border-b-2 border-primary-dark/30">
                                        <th className="p-3 font-semibold text-slate-800">الشهر</th>
                                        <th className="p-3 font-semibold text-slate-800">الحالة</th>
                                        <th className="p-3 font-semibold text-slate-800">إجمالي الصافي</th>
                                        <th className="p-3 font-semibold text-slate-800">عدد الموظفين</th>
                                        <th className="p-3 font-semibold text-slate-800">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayrolls.map(p => (
                                        <tr key={p.id} className="border-b border-primary-dark/20">
                                            <td className="p-3 font-bold text-slate-800">{p.monthYear}</td>
                                            <td className="p-3"><span className={`px-2 py-1 text-sm font-semibold rounded-full ${statusMap[p.status].className}`}>{statusMap[p.status].text}</span></td>
                                            <td className="p-3 font-mono font-bold text-green-700">{formatCurrency(p.totals.netSalary)}</td>
                                            <td className="p-3 text-center">{p.payrollData.length}</td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setViewingPayroll(p); setIsReportOpen(true); }} className="p-2 text-accent rounded-full hover:shadow-neumo-sm" title="عرض التقرير"><FileText size={18} /></button>
                                                    {p.status === 'Draft' && canDelete && <button onClick={() => deletePayrollEntry(p.id)} className="p-2 text-red-500 rounded-full hover:shadow-neumo-sm" title="حذف"><Trash2 size={18} /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                           </table>
                           {filteredPayrolls.length === 0 && <p className="text-center text-text-secondary p-8">لا توجد كشوف رواتب تطابق الفلتر الحالي.</p>}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'employees' && (
                <div className="bg-primary p-6 rounded-2xl shadow-neumo">
                    <div className="flex justify-end mb-4">
                        {canCreate && <button onClick={handleAddNewEmployee} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold shadow-sm"><PlusCircle size={20} /> إضافة موظف</button>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right whitespace-nowrap">
                            <thead>
                                <tr className="border-b-2 border-primary-dark/30">
                                    <th className="p-3 font-semibold text-slate-800">الاسم</th>
                                    <th className="p-3 font-semibold text-slate-800">الوظيفة</th>
                                    <th className="p-3 font-semibold text-slate-800 text-center">الإجازات الممنوحة</th>
                                    <th className="p-3 font-semibold text-slate-800 text-center">المستخدمة</th>
                                    <th className="p-3 font-semibold text-slate-800 text-center">المتبقية</th>
                                    { (canEdit || canDelete) && <th className="p-3 font-semibold text-slate-800">إجراءات</th> }
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => {
                                    const usedLeave = usedLeaveDaysMap.get(emp.id) || 0;
                                    const remainingLeave = emp.leaveBalance - usedLeave;
                                    return (
                                    <tr key={emp.id} className="border-b border-primary-dark/20">
                                        <td className="p-3 font-bold text-slate-800">{emp.name}</td>
                                        <td className="p-3 text-slate-800">{emp.jobTitle}</td>
                                        <td className="p-3 text-slate-800 text-center font-mono">{emp.leaveBalance}</td>
                                        <td className="p-3 text-slate-800 text-center font-mono">{usedLeave}</td>
                                        <td className={`p-3 text-center font-mono font-bold ${remainingLeave < 0 ? 'text-red-500' : 'text-green-600'}`}>{remainingLeave}</td>
                                        { (canEdit || canDelete) &&
                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                {canEdit && <button onClick={() => handleEditEmployee(emp)} className="p-2 text-accent rounded-full hover:shadow-neumo-sm" title="تعديل"><Edit size={18} /></button>}
                                                {canDelete && <button onClick={() => deleteEmployee(emp.id)} className="p-2 text-red-500 rounded-full hover:shadow-neumo-sm" title="حذف"><Trash2 size={18} /></button>}
                                            </div>
                                        </td>
                                        }
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'attendance' && (
                 <div className="bg-primary p-6 rounded-2xl shadow-neumo">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-700">سجل الحضور</h2>
                        <div className="flex items-center gap-4 bg-primary p-2 rounded-xl shadow-neumo-sm">
                            <button onClick={handlePrevMonth} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><ChevronRight size={20} /></button>
                            <input 
                                type="month" 
                                value={selectedDate} 
                                onChange={e => setSelectedDate(e.target.value)} 
                                className="p-2 bg-primary rounded-lg shadow-neumo-inset-sm border-none text-center font-bold text-lg focus:outline-none focus:ring-1 focus:ring-accent w-48"
                            />
                            <button onClick={handleNextMonth} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><ChevronLeft size={20} /></button>
                        </div>
                    </div>
                    <AttendanceSheet employees={employees} attendance={attendance} updateAttendance={updateAttendance} selectedDate={selectedDate} />
                 </div>
            )}
        </div>
    );
};

export default Payroll;