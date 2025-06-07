import React, { useState } from 'react';
import { SettingsModal } from '../components/settings/SettingsModal';
import { getContainerStyles } from '../config/layout';

const ConfiguracionesPage = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      backgroundColor: 'var(--bg-secondary)',
      padding: '24px 0'
    }}>
      <div style={{
        ...getContainerStyles(),
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px var(--shadow-light)',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
            paddingBottom: '24px',
            borderBottom: '1px solid var(--border-light)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'var(--accent-primary)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              ⚙️
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>
                Configuraciones
              </h1>
              <p style={{
                margin: 0,
                fontSize: '16px',
                color: 'var(--text-secondary)'
              }}>
                Personaliza tu experiencia en Gym Manager
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gap: '20px'
          }}>
            <div style={{
              padding: '24px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: '1px solid var(--border-light)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={() => setShowSettingsModal(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'var(--accent-primary)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0
                }}>
                  🎨
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '8px'
                  }}>
                    Apariencia y Tema
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '15px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    marginBottom: '12px'
                  }}>
                    Personaliza la apariencia de la aplicación, cambia entre tema claro y oscuro, y ajusta las preferencias visuales.
                  </p>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    <span>✨</span>
                    Disponible
                  </div>
                </div>
                <div style={{
                  fontSize: '20px',
                  color: 'var(--text-muted)',
                  transform: 'rotate(-45deg)',
                  transition: 'transform 0.3s ease'
                }}>
                  →
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                padding: '24px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                opacity: 0.7,
                position: 'relative'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: 'var(--text-muted)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0
                  }}>
                    🔔
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        Notificaciones
                      </h3>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-tertiary)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontWeight: '500'
                      }}>
                        Próximamente
                      </span>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5'
                    }}>
                      Recordatorios de entrenamientos y alertas personalizadas.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{
                padding: '24px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                opacity: 0.7,
                position: 'relative'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: 'var(--text-muted)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0
                  }}>
                    💾
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        Respaldo
                      </h3>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-tertiary)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontWeight: '500'
                      }}>
                        Próximamente
                      </span>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5'
                    }}>
                      Copias de seguridad y sincronización en la nube.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      </div>
    </div>
  );
};

export default ConfiguracionesPage; 