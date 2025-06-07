import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';

export interface AppConfig {
  theme: Theme;
  showWeekends: boolean;
  language: 'es' | 'en';
  autoSave: boolean;
}

interface ConfigContextType {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
  toggleTheme: () => void;
  resetConfig: () => void;
}

const defaultConfig: AppConfig = {
  theme: 'dark', // Default to dark theme
  showWeekends: false,
  language: 'es',
  autoSave: true,
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('gym-app-config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig({ ...defaultConfig, ...parsedConfig });
      } catch (error) {
        console.error('Error parsing saved config:', error);
        setConfig(defaultConfig);
      }
    }
  }, []);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('gym-app-config', JSON.stringify(config));
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', config.theme);
    
    // Update CSS custom properties for theme
    const root = document.documentElement;
    if (config.theme === 'dark') {
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--bg-secondary', '#2d2d2d');
      root.style.setProperty('--bg-tertiary', '#3a3a3a');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#b3b3b3');
      root.style.setProperty('--text-muted', '#666666');
      root.style.setProperty('--border-color', '#404040');
      root.style.setProperty('--border-light', '#333333');
      root.style.setProperty('--accent-primary', '#3b82f6');
      root.style.setProperty('--accent-secondary', '#1d4ed8');
      root.style.setProperty('--success-color', '#10b981');
      root.style.setProperty('--error-color', '#ef4444');
      root.style.setProperty('--warning-color', '#f59e0b');
      root.style.setProperty('--info-color', '#06b6d4');
      root.style.setProperty('--shadow-light', 'rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--shadow-medium', 'rgba(0, 0, 0, 0.5)');
      root.style.setProperty('--hover-bg', '#404040');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8fafc');
      root.style.setProperty('--bg-tertiary', '#f1f5f9');
      root.style.setProperty('--text-primary', '#1f2937');
      root.style.setProperty('--text-secondary', '#4b5563');
      root.style.setProperty('--text-muted', '#9ca3af');
      root.style.setProperty('--border-color', '#d1d5db');
      root.style.setProperty('--border-light', '#e5e7eb');
      root.style.setProperty('--accent-primary', '#3b82f6');
      root.style.setProperty('--accent-secondary', '#1d4ed8');
      root.style.setProperty('--success-color', '#10b981');
      root.style.setProperty('--error-color', '#ef4444');
      root.style.setProperty('--warning-color', '#f59e0b');
      root.style.setProperty('--info-color', '#06b6d4');
      root.style.setProperty('--shadow-light', 'rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--shadow-medium', 'rgba(0, 0, 0, 0.2)');
      root.style.setProperty('--hover-bg', '#f3f4f6');
    }
  }, [config]);

  const updateConfig = (updates: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleTheme = () => {
    setConfig(prev => ({ 
      ...prev, 
      theme: prev.theme === 'light' ? 'dark' : 'light' 
    }));
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
  };

  return (
    <ConfigContext.Provider value={{
      config,
      updateConfig,
      toggleTheme,
      resetConfig,
    }}>
      {children}
    </ConfigContext.Provider>
  );
}; 