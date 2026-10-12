import React, { useCallback, useEffect, useState } from 'react';
import { Button, ErrorMessage, Title } from '../../../shared/components/base';
import { billingTexts } from '../constants/billingTexts';
import { BillingService, type Plan } from '../services/billingService';
import { PlanDialog } from './PlanDialog';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

export function PlansManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingId, setChangingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlans(await BillingService.plans());
    } catch (loadError) {
      setError(String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openNewPlan = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    void load();
  };

  const togglePlan = async (plan: Plan) => {
    if (!plan.id) return;
    setChangingId(plan.id);
    setError(null);
    try {
      await BillingService.savePlan({ ...plan, is_active: !plan.is_active });
      await load();
    } catch (toggleError) {
      setError(String(toggleError));
    } finally {
      setChangingId(null);
    }
  };

  return (
    <div className="plans-manager">
      <div className="plans-header">
        <div>
          <Title level={2}>{billingTexts.plans.title}</Title>
          <p>{billingTexts.plans.description}</p>
        </div>
        <Button onClick={openNewPlan}>{billingTexts.plans.new}</Button>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      {loading ? (
        <div className="plans-state">{billingTexts.plans.loading}</div>
      ) : plans.length === 0 ? (
        <div className="plans-state">{billingTexts.plans.empty}</div>
      ) : (
        <div className="plan-list">
          {plans.map((plan) => (
            <div className="plan-row" key={plan.id}>
              <div className="plan-details">
                <strong>{plan.name}</strong>
                <span>
                  {plan.modality === 'monthly' ? 'Mensual' : 'Particular'} · {money.format(plan.price_cents / 100)}
                </span>
              </div>
              <span className={`plan-status ${plan.is_active ? 'active' : 'inactive'}`}>
                {plan.is_active ? 'Activo' : 'Inactivo'}
              </span>
              <div className="plan-actions">
                <Button size="sm" variant="secondary" onClick={() => { setEditing(plan); setDialogOpen(true); }}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant={plan.is_active ? 'danger' : 'secondary'}
                  disabled={changingId === plan.id}
                  onClick={() => togglePlan(plan)}
                >
                  {plan.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PlanDialog
        isOpen={dialogOpen}
        plan={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
