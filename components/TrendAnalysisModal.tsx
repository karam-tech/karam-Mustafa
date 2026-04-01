import React from 'react';
import { FinancialTrendAnalysis, TrendAnalysisDetail, CostSavingSuggestion } from '../types';
import { X, TrendingUp, TrendingDown, DollarSign, Lightbulb, BarChart3, Scissors } from 'lucide-react';

interface TrendAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    analysisData: FinancialTrendAnalysis | null;
    isLoading: boolean;
    error: string | null;
}

const TrendIcon: React.FC<{ trend: TrendAnalysisDetail['trend'] }> = ({ trend }) => {
    switch (trend) {
        case 'increasing':
        case 'positive':
            return <TrendingUp className="text-green-500" size={24} />;
        case 'decreasing':
        case 'negative':
            return <TrendingDown className="text-red-500" size={24} />;
        case 'stable':
            return <BarChart3 className="text-blue-500" size={24} />;
        default:
            return <DollarSign className="text-gray-500" size={24} />;
    }
};

const AnalysisCard: React.FC<{ title: string; data: TrendAnalysisDetail; icon: React.ReactNode }> = ({ title, data, icon }) => (
    <div className="bg-primary p-4 rounded-lg shadow-neumo-sm">
        <div className="flex items-center gap-3 mb-2">
            {icon}
            <h3 className="font-extrabold text-lg text-slate-800">{title}</h3>
        </div>
        <p className="text-text-secondary">{data.analysis}</p>
    </div>
);


const TrendAnalysisModal: React.FC<TrendAnalysisModalProps> = ({ isOpen, onClose, analysisData, isLoading, error }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-extrabold text-slate-800">تحليل الاتجاهات المالية والتوقعات</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
                            <p className="text-text-secondary font-bold">يقوم الذكاء الاصطناعي بتحليل الاتجاهات المالية... قد يستغرق هذا بعض الوقت.</p>
                        </div>
                    )}
                    {error && <p className="text-center text-red-500 bg-red-100 p-4 rounded-md">{error}</p>}
                    {analysisData && (
                        <div className="space-y-6">
                            {/* Overall Summary */}
                            <div className="bg-accent/10 p-4 rounded-lg border-l-4 border-accent">
                                <h3 className="font-extrabold text-lg text-accent-dark mb-1">ملخص عام</h3>
                                <p className="text-text-primary">{analysisData.overallSummary}</p>
                            </div>

                            {/* Grid for trends */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <AnalysisCard title="توقع التدفق النقدي" data={analysisData.cashFlowPrediction} icon={<TrendIcon trend={analysisData.cashFlowPrediction.trend} />} />
                                <AnalysisCard title="اتجاه الإيرادات" data={analysisData.revenueTrend} icon={<TrendIcon trend={analysisData.revenueTrend.trend} />} />
                                <AnalysisCard title="اتجاه المصروفات" data={analysisData.expenseTrend} icon={<TrendIcon trend={analysisData.expenseTrend.trend} />} />
                            </div>

                            {/* Cost Saving Suggestions */}
                            <div className="bg-primary p-4 rounded-lg shadow-neumo-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <Scissors size={24} className="text-amber-600" />
                                    <h3 className="font-extrabold text-lg text-slate-800">اقتراحات لخفض التكاليف</h3>
                                </div>
                                <div className="space-y-3">
                                    {analysisData.costSavingSuggestions.map((item, index) => (
                                        <div key={index} className="bg-primary p-3 rounded-lg shadow-neumo-inset-sm">
                                            <p className="font-bold text-slate-700">{item.area}</p>
                                            <p className="text-sm text-text-secondary mt-1">{item.suggestion}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrendAnalysisModal;