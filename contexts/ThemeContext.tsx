import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const savedTheme = localStorage.getItem('theme') as Theme | null;
            // Also check for user's system preference
            const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            return savedTheme || (userPrefersDark ? 'dark' : 'light');
        } catch {
            return 'light';
        }
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        root.classList.remove('light', 'dark');
        root.classList.add(theme);

        try {
            localStorage.setItem('theme', theme);
        } catch (error) {
            console.error("Failed to save theme to localStorage", error);
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
