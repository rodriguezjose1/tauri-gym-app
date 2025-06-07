import React from 'react';
import { useConfig } from '../../contexts/ConfigContext';

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
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleOverlayClick}
    >
      <div 
        className="modal-content"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 10px 25px var(--shadow-medium)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '16px',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--text-primary)',
          }}>
            ⚙️ Configuraciones
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Settings Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Theme Section */}
          <div className="card" style={{
            padding: '16px',
            borderRadius: '8px',
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              🎨 Apariencia
            </h3>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tema</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => updateConfig({ theme: 'light' })}
                  className={config.theme === 'light' ? 'btn-primary' : ''}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: config.theme === 'light' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: config.theme === 'light' ? 'white' : 'var(--text-primary)',
                  }}
                >
                  ☀️ Claro
                </button>
                <button
                  onClick={() => updateConfig({ theme: 'dark' })}
                  className={config.theme === 'dark' ? 'btn-primary' : ''}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: config.theme === 'dark' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: config.theme === 'dark' ? 'white' : 'var(--text-primary)',
                  }}
                >
                  🌙 Oscuro
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="card" style={{
            padding: '16px',
            borderRadius: '8px',
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              📅 Calendario
            </h3>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Mostrar fines de semana</span>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '44px',
                height: '24px',
              }}>
                <input
                  type="checkbox"
                  checked={config.showWeekends}
                  onChange={(e) => updateConfig({ showWeekends: e.target.checked })}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0,
                  }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: config.showWeekends ? 'var(--accent-primary)' : 'var(--border-color)',
                  transition: '0.3s',
                  borderRadius: '24px',
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '',
                    height: '18px',
                    width: '18px',
                    left: config.showWeekends ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    transition: '0.3s',
                    borderRadius: '50%',
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* General Section */}
          <div className="card" style={{
            padding: '16px',
            borderRadius: '8px',
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              🔧 General
            </h3>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Guardado automático</span>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '44px',
                height: '24px',
              }}>
                <input
                  type="checkbox"
                  checked={config.autoSave}
                  onChange={(e) => updateConfig({ autoSave: e.target.checked })}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0,
                  }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: config.autoSave ? 'var(--accent-primary)' : 'var(--border-color)',
                  transition: '0.3s',
                  borderRadius: '24px',
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '',
                    height: '18px',
                    width: '18px',
                    left: config.autoSave ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    transition: '0.3s',
                    borderRadius: '50%',
                  }} />
                </span>
              </label>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Idioma</span>
              <select
                value={config.language}
                onChange={(e) => updateConfig({ language: e.target.value as 'es' | 'en' })}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              >
                <option value="es">🇪🇸 Español</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-light)',
        }}>
          <button
            onClick={resetConfig}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--error-color)',
              backgroundColor: 'transparent',
              color: 'var(--error-color)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            🔄 Restablecer
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={onClose}
              className="btn-primary"
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--accent-primary)',
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 