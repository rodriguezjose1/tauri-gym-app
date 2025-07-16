import React, { useState } from 'react';
import { SettingsModal } from '../components';
import { getContainerStyles } from '../../../config/layout';
import '../../../styles/ConfiguracionesPage.css';

const ConfiguracionesPage = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <div className="configuraciones-container">
      <div className="configuraciones-wrapper" style={getContainerStyles()}>
        <div className="configuraciones-card">
          <div className="configuraciones-header">
            <div className="configuraciones-header-icon">
              ⚙️
            </div>
            <div className="configuraciones-header-content">
              <h1>Configuraciones</h1>
              <p>Personaliza tu experiencia en Quality GYM</p>
            </div>
          </div>

          <div className="configuraciones-content">
            <div className="configuraciones-section">
              <h2>🎨 Configuración General</h2>
              <div className="configuraciones-action-card">
                <div className="configuraciones-action-content">
                  <div className="configuraciones-action-icon">
                    ⚙️
                  </div>
                  <div className="configuraciones-action-body">
                    <div className="configuraciones-action-header">
                      <h3>Preferencias de la Aplicación</h3>
                      <button 
                        className="configuraciones-action-button"
                        onClick={() => setShowSettingsModal(true)}
                      >
                        Configurar
                      </button>
                    </div>
                    <p>
                      Ajusta el tema, idioma y otras configuraciones de Quality GYM.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="configuraciones-section">
              <h2>🔮 Próximamente</h2>
              <div className="coming-soon-grid">
                <div className="coming-soon-card">
                  <div className="coming-soon-card-content">
                    <div className="coming-soon-card-icon">
                      🔔
                    </div>
                    <div className="coming-soon-card-body">
                      <div className="coming-soon-card-header">
                        <h3>Notificaciones</h3>
                        <span className="coming-soon-badge">
                          Próximamente
                        </span>
                      </div>
                      <p>
                        Recordatorios de entrenamientos y alertas personalizadas de Quality GYM.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="coming-soon-card">
                  <div className="coming-soon-card-content">
                    <div className="coming-soon-card-icon">
                      📦
                    </div>
                    <div className="coming-soon-card-body">
                      <div className="coming-soon-card-header">
                        <h3>Configuración de Backup</h3>
                        <span className="coming-soon-badge">
                          Próximamente
                        </span>
                      </div>
                      <p>
                        Configuración completa de servicios de email, frecuencia y opciones de backup.
                      </p>
                    </div>
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