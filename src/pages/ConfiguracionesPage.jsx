import React, { useState } from 'react';
import { SettingsModal } from '../components/settings/SettingsModal';
import { getContainerStyles } from '../config/layout';
import '../styles/ConfiguracionesPage.css';

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
              <p>Personaliza tu experiencia en Gym Manager</p>
            </div>
          </div>

          <div className="configuraciones-grid">
            <div 
              className="settings-card"
              onClick={() => setShowSettingsModal(true)}
            >
              <div className="settings-card-content">
                <div className="settings-card-icon">
                  🎨
                </div>
                <div className="settings-card-body">
                  <h3>Apariencia y Tema</h3>
                  <p>
                    Personaliza la apariencia de la aplicación, cambia entre tema claro y oscuro, y ajusta las preferencias visuales.
                  </p>
                  <div className="settings-card-badge">
                    <span>✨</span>
                    Disponible
                  </div>
                </div>
                <div className="settings-card-arrow">
                  →
                </div>
              </div>
            </div>

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
                      Recordatorios de entrenamientos y alertas personalizadas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="coming-soon-card">
                <div className="coming-soon-card-content">
                  <div className="coming-soon-card-icon">
                    💾
                  </div>
                  <div className="coming-soon-card-body">
                    <div className="coming-soon-card-header">
                      <h3>Respaldo</h3>
                      <span className="coming-soon-badge">
                        Próximamente
                      </span>
                    </div>
                    <p>
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