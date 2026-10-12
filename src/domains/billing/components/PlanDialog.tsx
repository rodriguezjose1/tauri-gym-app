import React, { useEffect, useState } from 'react';
import { Button, ErrorMessage, Input, Modal, Select } from '../../../shared/components/base';
import { BillingService, type Modality, type Plan } from '../services/billingService';

interface Props {
  isOpen: boolean;
  plan: Plan | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PlanDialog({ isOpen, plan, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [modality, setModality] = useState<Modality>('monthly');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(plan?.name ?? '');
    setModality(plan?.modality ?? 'monthly');
    setPrice(plan ? String(plan.price_cents / 100) : '');
    setError(null);
  }, [isOpen, plan]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericPrice = Number(price);
    if (!name.trim()) {
      setError('Ingresá un nombre para el plan.');
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError('Ingresá un precio mayor a cero.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await BillingService.savePlan({ ...plan, name: name.trim(), modality, price_cents: Math.round(numericPrice * 100), is_active: plan?.is_active ?? true });
      onSaved();
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      title={plan ? 'Editar plan' : 'Nuevo plan'}
      size="sm"
      closeOnOverlayClick={!saving}
    >
      <form className="plan-dialog-form" onSubmit={save}>
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <Input label="Nombre" value={name} onChange={(event) => setName(event.target.value)} required />
        <Select
          label="Modalidad"
          value={modality}
          disabled={Boolean(plan?.id)}
          options={[{ value: 'monthly', label: 'Mensual' }, { value: 'particular', label: 'Particular' }]}
          onChange={(value) => setModality(value as Modality)}
        />
        <Input
          label="Precio"
          type="number"
          min="0.01"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          required
        />
        <div className="billing-actions plan-dialog-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar plan'}</Button>
        </div>
      </form>
    </Modal>
  );
}
