import React from 'react';
import { useConfig } from '../../../shared/contexts';
import '../../../styles/SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { config, updateConfig, toggleTheme, resetConfig } = useConfig();

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="settings-modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="settings-modal-content">
        {/* Header */}
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">
            ⚙️ Configuraciones
          </h2>
          <button
            onClick={onClose}
            className="settings-modal-close"
          >
            ×
          </button>
        </div>

        {/* Settings Content */}
        <div className="settings-modal-content-wrapper">
          
          {/* Theme Section */}
          <div className="card settings-section-card">
            <h3 className="settings-section-title">
              🎨 Apariencia
            </h3>
            
            <div className="settings-section-row">
              <span className="settings-section-label">Tema</span>
              <div className="settings-theme-buttons">
                <button
                  onClick={() => updateConfig({ theme: 'light' })}
                  className={`settings-theme-button ${config.theme === 'light' ? 'active' : ''}`}
                >
                  ☀️ Claro
                </button>
                <button
                  onClick={() => updateConfig({ theme: 'dark' })}
                  className={`settings-theme-button ${config.theme === 'dark' ? 'active' : ''}`}
                >
                  🌙 Oscuro
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="card settings-section-card">
            <h3 className="settings-section-title">
              📅 Calendario
            </h3>
            
            <div className="settings-section-row">
              <span className="settings-section-label">Mostrar fines de semana</span>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={config.showWeekends}
                  onChange={(e) => updateConfig({ showWeekends: e.target.checked })}
                  className="settings-toggle-input"
                />
                <span className={`settings-toggle-slider ${config.showWeekends ? 'active' : ''}`}>
                  <span className={`settings-toggle-knob ${config.showWeekends ? 'active' : ''}`} />
                </span>
              </label>
            </div>
          </div>

          {/* General Section */}
          <div className="card settings-section-card">
            <h3 className="settings-section-title">
              🔧 General
            </h3>
            
            <div className="settings-section-row">
              <span className="settings-section-label">Guardado automático</span>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={config.autoSave}
                  onChange={(e) => updateConfig({ autoSave: e.target.checked })}
                  className="settings-toggle-input"
                />
                <span className={`settings-toggle-slider ${config.autoSave ? 'active' : ''}`}>
                  <span className={`settings-toggle-knob ${config.autoSave ? 'active' : ''}`} />
                </span>
              </label>
            </div>

            <div className="settings-section-row">
              <span className="settings-section-label">Idioma</span>
              <select
                value={config.language}
                onChange={(e) => updateConfig({ language: e.target.value as 'es' | 'en' })}
                className="settings-select"
              >
                <option value="es">🇪🇸 Español</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="settings-modal-footer">
          <button
            onClick={resetConfig}
            className="settings-reset-button"
          >
            🔄 Restablecer
          </button>
          
          <div className="settings-footer-actions">
            <button
              onClick={onClose}
              className="settings-cancel-button"
            >
              Cancelar
            </button>
            <button
              onClick={onClose}
              className="settings-save-button"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 