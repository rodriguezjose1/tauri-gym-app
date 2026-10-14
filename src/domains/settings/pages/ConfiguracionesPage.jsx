import React, { Suspense, useState } from 'react';
import { Card, Title } from '../../../shared/components/base';
import { PlansManager } from '../../billing/components/PlansManager';
import { SettingsModal } from '../components';
import '../../../styles/ConfiguracionesPage.css';

const BillingDevTools = import.meta.env.DEV
  ? React.lazy(async () => ({ default: (await import('../../billing/components/BillingDevTools')).BillingDevTools }))
  : null;

const ConfiguracionesPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  return (
    <div className="configuraciones-container"><div className="configuraciones-wrapper">
      <Card variant="elevated" padding="lg" className="configuraciones-card">
        <div className="configuraciones-header"><div className="configuraciones-header-icon">⚙️</div><div className="configuraciones-header-content"><Title level={2}>Configuraciones</Title><p>Administra las preferencias y opciones de Quality GYM.</p></div></div>
        <div className="configuraciones-tabs" role="tablist" aria-label="Secciones de configuración">
          <button role="tab" aria-selected={activeTab === 'general'} className={`configuraciones-tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>General</button>
          <button role="tab" aria-selected={activeTab === 'plans'} className={`configuraciones-tab ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => setActiveTab('plans')}>Planes</button>
          {BillingDevTools && <button role="tab" aria-selected={activeTab === 'billing-dev'} className={`configuraciones-tab ${activeTab === 'billing-dev' ? 'active' : ''}`} onClick={() => setActiveTab('billing-dev')}>Desarrollo</button>}
        </div>
        <div className="configuraciones-content">
          {activeTab === 'general' ? <section className="configuraciones-tab-panel" role="tabpanel">
            <div className="configuraciones-section-heading"><Title level={2}>Configuración general</Title><p>Ajusta la apariencia y el comportamiento general de la aplicación.</p></div>
            <div className="configuraciones-action-card"><div className="configuraciones-action-content"><div className="configuraciones-action-icon">⚙️</div><div className="configuraciones-action-body"><div className="configuraciones-action-header"><h3>Preferencias de la aplicación</h3><button className="configuraciones-action-button" onClick={() => setShowSettingsModal(true)}>Configurar</button></div><p>Ajusta el tema, idioma y otras preferencias de Quality GYM.</p></div></div></div>
          </section> : activeTab === 'plans' ? <section className="configuraciones-tab-panel" role="tabpanel"><PlansManager /></section> : BillingDevTools ? (
            <section className="configuraciones-tab-panel" role="tabpanel">
              <Suspense fallback={<div className="plans-state">Cargando herramientas…</div>}><BillingDevTools /></Suspense>
            </section>
          ) : null}
        </div>
      </Card>
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </div></div>
  );
};
export default ConfiguracionesPage;
