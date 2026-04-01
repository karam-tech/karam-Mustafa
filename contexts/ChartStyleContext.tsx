import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// --- Types and Defaults ---

export interface ChartSettings {
    colors: string[];
    fontFamily: string;
    fontSize: number; // in pixels
    barRadius: number;
    pieInnerRadius: number; // 0 for pie, >0 for donut
    pieCornerRadius: number;
    showGrid: boolean;
    legendPosition: 'top' | 'bottom' | 'right' | 'left';
}

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
    colors: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#DD8042'],
    fontFamily: 'Cairo, sans-serif',
    fontSize: 12,
    barRadius: 8,
    pieInnerRadius: 0,
    pieCornerRadius: 0,
    showGrid: true,
    legendPosition: 'bottom',
};

interface ChartStyleContextType {
    settings: ChartSettings;
    updateSettings: (newSettings: Partial<ChartSettings>) => void;
    setPalette: (palette: 'vibrant' | 'corporate' | 'pastel') => void;
}

// --- Context Definition ---

const ChartStyleContext = createContext<ChartStyleContextType | undefined>(undefined);

// --- Provider Component ---

interface ChartStyleProviderProps {
    children: ReactNode;
}

export const PALETTES = {
    vibrant: ['#4B72D4', '#66D6C0', '#F2C94C', '#EB5757', '#9B51E0', '#2F80ED'],
    corporate: ['#2F4B66', '#597893', '#8C9BAB', '#BCC4CC', '#E6E8EA', '#3C6485'],
    pastel: ['#A0DDE6', '#F3D4D4', '#F6E6C2', '#C3E8BD', '#D4C4E1', '#F1B8B8'],
};

export const ChartStyleProvider: React.FC<ChartStyleProviderProps> = ({ children }) => {
    const [settings, setSettings] = useState<ChartSettings>(() => {
        try {
            const savedSettings = localStorage.getItem('chartSettings');
            return savedSettings ? JSON.parse(savedSettings) : DEFAULT_CHART_SETTINGS;
        } catch (error) {
            console.error("Failed to load chart settings from localStorage", error);
            return DEFAULT_CHART_SETTINGS;
        }
    });

    useEffect(() => {
        localStorage.setItem('chartSettings', JSON.stringify(settings));
    }, [settings]);

    const updateSettings = (newSettings: Partial<ChartSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };
    
    const setPalette = (palette: 'vibrant' | 'corporate' | 'pastel') => {
        updateSettings({ colors: PALETTES[palette] });
    };

    return (
        <ChartStyleContext.Provider value={{ settings, updateSettings, setPalette }}>
            {children}
        </ChartStyleContext.Provider>
    );
};

// --- Custom Hook ---

export const useChartStyles = (): ChartStyleContextType => {
    const context = useContext(ChartStyleContext);
    if (context === undefined) {
        throw new Error('useChartStyles must be used within a ChartStyleProvider');
    }
    return context;
};