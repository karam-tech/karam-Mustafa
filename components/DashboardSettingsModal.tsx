import React, { useState, useEffect } from 'react';
import { DashboardWidgets } from '../types';
import { X, Save } from 'lucide-react';

interface DashboardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: DashboardWidgets;
    onSave: (settings: DashboardWidgets) => void;
}

const WIDGET_LABELS: Record<keyof DashboardWidgets, string> = {
    showStatCards: 'عرض بطاقات الإحصائيات السريعة',
    showRevenueSummary: 'عرض ملخص إيرادات العملاء',
    showExpenseSummary: 'عرض ملخص المصروفات',
    showLocalBankBalances: 'عرض أرصدة البنوك المحلية',
    showForeignBankBalances: 'عرض أرصدة البنوك الأجنبية',
    showLocalSafeBalances: 'عرض أرصدة الصناديق المحلية',
    showForeignSafeBalances: 'عرض أرصدة الصناديق الأجنبية',
};

const DashboardSettingsModal: React.FC<DashboardSettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave }) => {
    const [settings, setSettings] = useState(currentSettings);

    useEffect(() => {
        if (isOpen) {
            setSettings(currentSettings);
        }
    }, [isOpen, currentSettings]);

    const handleToggle = (key: keyof DashboardWidgets) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        onSave(settings);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-800">تخصيص لوحة التحكم</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>
                
                <div className="space-y-3">
                    {Object.keys(WIDGET_LABELS).map(key => (
                        <label key={key} className="flex items-center gap-3 p-3 bg-primary rounded-lg shadow-neumo-sm cursor-pointer hover:shadow-neumo-inset transition-all">
                             <input
                                type="checkbox"
                                checked={settings[key as keyof DashboardWidgets]}
                                onChange={() => handleToggle(key as keyof DashboardWidgets)}
                                className="w-5 h-5 accent-accent sr-only"
                            />
                             {settings[key as keyof DashboardWidgets] ? 
                                <div className="w-5 h-5 rounded bg-accent shadow-inner text-white flex items-center justify-center flex-shrink-0">✓</div> 
                                : <div className="w-5 h-5 rounded bg-primary shadow-neumo-inset-sm flex-shrink-0"></div>}
                            <span className="font-bold text-slate-700">{WIDGET_LABELS[key as keyof DashboardWidgets]}</span>
                        </label>
                    ))}
                </div>

                <div className="mt-8 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-bold">إلغاء</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-bold">
                        <Save size={18} /> حفظ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardSettingsModal;