import React from 'react';
import { X, Bot, Wand2 } from 'lucide-react';

interface StartupGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    advice: { title: string; description: string }[] | null;
}

const StartupGuideModal: React.FC<StartupGuideModalProps> = ({ isOpen, onClose, isLoading, advice }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-8 rounded-2xl shadow-neumo w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-3">
                        <Wand2 size={32} className="text-accent" />
                        <h2 className="text-2xl font-extrabold text-text-primary">مساعد الإعداد الذكي</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
                            <p className="text-text-secondary font-bold">يقوم وكيل الذكاء الاصطناعي بتحليل النظام لتقديم أفضل إرشادات للبدء...</p>
                        </div>
                    ) : (
                        <div>
                            <p className="mb-6 text-text-secondary">
                                مرحباً بك! لقد لاحظت أن هذا هو إعدادك الأول. لمساعدتك على البدء بشكل صحيح، قمت بإعداد قائمة الخطوات التالية وفقًا للمبادئ المحاسبية:
                            </p>
                            <ol className="space-y-4 list-decimal list-inside">
                                {advice?.map((step, index) => (
                                    <li key={index} className="bg-primary p-4 rounded-lg shadow-neumo-sm">
                                        <h3 className="font-extrabold text-text-primary text-lg">{step.title}</h3>
                                        <p className="text-text-secondary text-sm mt-1">{step.description}</p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-end mt-6">
                     <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-accent text-white rounded-md hover:bg-accent-dark font-bold shadow-sm disabled:bg-gray-400"
                        disabled={isLoading}
                    >
                        فهمت، لنبدأ!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StartupGuideModal;