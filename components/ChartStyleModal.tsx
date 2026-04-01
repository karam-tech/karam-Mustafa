import React, { useState, useEffect } from 'react';
import { useChartStyles, ChartSettings, PALETTES } from '../contexts/ChartStyleContext.tsx';
import { X } from 'lucide-react';

interface ChartStyleModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-xl font-extrabold text-slate-700 mb-3 border-b-2 border-primary-dark/20 pb-2">{title}</h3>
        {children}
    </div>
);


const ChartStyleModal: React.FC<ChartStyleModalProps> = ({ isOpen, onClose }) => {
    const { settings, updateSettings } = useChartStyles();
    const [tempSettings, setTempSettings] = useState<ChartSettings>(settings);

    useEffect(() => {
        setTempSettings(settings);
    }, [settings, isOpen]);

    const handleColorChange = (index: number, color: string) => {
        const newColors = [...tempSettings.colors];
        newColors[index] = color;
        setTempSettings(prev => ({ ...prev, colors: newColors }));
    };
    
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setTempSettings(prev => ({...prev, [name]: checked }));
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isNumber = type === 'range' || type === 'number';
        setTempSettings(prev => ({...prev, [name]: isNumber ? Number(value) : value }));
    };
    
    const handlePaletteClick = (paletteName: 'vibrant' | 'corporate' | 'pastel') => {
        setTempSettings(prev => ({ ...prev, colors: PALETTES[paletteName] }));
    };

    const handleSave = () => {
        updateSettings(tempSettings);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-800">تخصيص تنسيق الرسوم البيانية</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>

                <div className="space-y-6">
                    <Section title="لوحة الألوان">
                        <div className="flex gap-4 mb-4">
                            <button onClick={() => handlePaletteClick('vibrant')} className="px-4 py-2 bg-primary shadow-neumo-sm rounded-lg font-bold hover:shadow-neumo-inset">نابض بالحياة</button>
                            <button onClick={() => handlePaletteClick('corporate')} className="px-4 py-2 bg-primary shadow-neumo-sm rounded-lg font-bold hover:shadow-neumo-inset">رسمي</button>
                            <button onClick={() => handlePaletteClick('pastel')} className="px-4 py-2 bg-primary shadow-neumo-sm rounded-lg font-bold hover:shadow-neumo-inset">هادئ</button>
                        </div>
                        <div className="flex flex-wrap gap-3 items-center">
                            {tempSettings.colors.map((color, index) => (
                                <div key={index} className="flex items-center gap-2 p-1 bg-primary rounded-lg shadow-neumo-inset-sm">
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => handleColorChange(index, e.target.value)}
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="font-mono text-sm pr-1">{color}</span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title="الخطوط والأحجام">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="fontFamily" className="block text-text-secondary font-bold mb-1">نوع الخط</label>
                                <select id="fontFamily" name="fontFamily" value={tempSettings.fontFamily} onChange={handleChange} className="w-full p-2 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none focus:outline-none focus:ring-1 focus:ring-accent">
                                    <option value="Cairo, sans-serif">Cairo</option>
                                    <option value="Arial, sans-serif">Arial</option>
                                    <option value="Times New Roman, serif">Times New Roman</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="fontSize" className="block text-text-secondary font-bold mb-1">حجم الخط ({tempSettings.fontSize}px)</label>
                                <input type="range" id="fontSize" name="fontSize" min="10" max="18" step="1" value={tempSettings.fontSize} onChange={handleChange} className="w-full" />
                            </div>
                        </div>
                    </Section>

                    <Section title="أشكال العناصر">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="barRadius" className="block text-text-secondary font-bold mb-1">استدارة الأعمدة ({tempSettings.barRadius}px)</label>
                                <input type="range" id="barRadius" name="barRadius" min="0" max="20" value={tempSettings.barRadius} onChange={handleChange} className="w-full" />
                            </div>
                            <div>
                                <label htmlFor="pieInnerRadius" className="block text-text-secondary font-bold mb-1">نصف القطر الداخلي (دونات) ({tempSettings.pieInnerRadius}px)</label>
                                <input type="range" id="pieInnerRadius" name="pieInnerRadius" min="0" max="60" value={tempSettings.pieInnerRadius} onChange={handleChange} className="w-full" />
                            </div>
                            <div>
                                <label htmlFor="pieCornerRadius" className="block text-text-secondary font-bold mb-1">استدارة الزوايا ({tempSettings.pieCornerRadius}px)</label>
                                <input type="range" id="pieCornerRadius" name="pieCornerRadius" min="0" max="10" value={tempSettings.pieCornerRadius} onChange={handleChange} className="w-full" />
                            </div>
                        </div>
                    </Section>
                    
                    <Section title="التخطيط">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="legendPosition" className="block text-text-secondary font-bold mb-1">موضع التسميات (Legend)</label>
                                <select id="legendPosition" name="legendPosition" value={tempSettings.legendPosition} onChange={handleChange} className="w-full p-2 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none focus:outline-none focus:ring-1 focus:ring-accent">
                                    <option value="top">أعلى</option>
                                    <option value="bottom">أسفل</option>
                                    <option value="left">يسار</option>
                                    <option value="right">يمين</option>
                                </select>
                            </div>
                            <div className="flex items-center pt-6">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-text-secondary">
                                    <input type="checkbox" name="showGrid" checked={tempSettings.showGrid} onChange={handleCheckboxChange} className="w-5 h-5 accent-accent"/>
                                    <span>إظهار خطوط الشبكة</span>
                                </label>
                            </div>
                        </div>
                    </Section>
                </div>
                
                {/* --- Action Buttons --- */}
                <div className="mt-8 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-bold">إلغاء</button>
                    <button onClick={handleSave} className="px-8 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-bold">حفظ التغييرات</button>
                </div>
            </div>
        </div>
    );
};

export default ChartStyleModal;