import React, { Suspense, useState } from 'react';
import { Card } from '../../../shared/components/base';
import { ManagementPageHeader, ManagementToolbar } from '../../../shared/components/management';
import { PlansManager } from '../../billing/components/PlansManager';
import { ProductsManager } from '../../products';
import '../../../styles/ConfiguracionesPage.css';

const BillingDevTools = import.meta.env.DEV
  ? React.lazy(async () => ({ default: (await import('../../billing/components/BillingDevTools')).BillingDevTools }))
  : null;

const ConfiguracionesPage = () => {
  const [activeTab, setActiveTab] = useState('plans');
  const tabs = <div className="management-tabs" role="tablist" aria-label="Secciones de configuración">
    <button role="tab" aria-selected={activeTab === 'plans'} className={`management-tab ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => setActiveTab('plans')}>Planes</button>
    <button role="tab" aria-selected={activeTab === 'products'} className={`management-tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>Productos</button>
    {BillingDevTools && <button role="tab" aria-selected={activeTab === 'billing-dev'} className={`management-tab ${activeTab === 'billing-dev' ? 'active' : ''}`} onClick={() => setActiveTab('billing-dev')}>Desarrollo</button>}
  </div>;

  return (
    <div className="configuraciones-container management-page-frame"><div className="configuraciones-wrapper">
      <Card variant="elevated" padding="md" className="configuraciones-card management-page-card">
        {activeTab === 'plans' ? <PlansManager toolbar={tabs} /> : activeTab === 'products' ? <ProductsManager toolbar={tabs} /> : (
          <div className="configuraciones-development">
            <div className="management-page-controls">
              <ManagementPageHeader title="Desarrollo" />
              <ManagementToolbar tabs={tabs} />
            </div>
            <div className="configuraciones-development-content">
              <Suspense fallback={<div className="plans-state">Cargando herramientas…</div>}>
                <BillingDevTools />
              </Suspense>
            </div>
          </div>
        )}
      </Card>
    </div></div>
  );
};
export default ConfiguracionesPage;
