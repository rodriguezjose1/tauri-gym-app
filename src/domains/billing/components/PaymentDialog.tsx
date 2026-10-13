import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, ErrorMessage, Input, Modal, Select } from '../../../shared/components/base';
import type { Person } from '../../../shared/types/dashboard';
import { PersonSearch } from '../../person/components/PersonSearch';
import { billingTexts } from '../constants/billingTexts';
import { BillingService, type Modality, type Plan } from '../services/billingService';
import { currentPeriod, periodOptions } from '../utils/periodOptions';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initial?: {
    person: Person;
    period: string;
    planId: number;
    amountCents: number;
  };
}

export function PaymentDialog({ isOpen, onClose, onSuccess, initial }: PaymentDialogProps) {
  const [person, setPerson] = useState<Person | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modality, setModality] = useState<Modality>('monthly');
  const [period, setPeriod] = useState(currentPeriod());
  const [planId, setPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quoteRequest = useRef(0);

  const availablePlans = useMemo(
    () => plans.filter((plan) => plan.is_active && plan.modality === modality),
    [plans, modality],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      setPerson(initial.person);
      setModality('monthly');
      setPeriod(initial.period);
      setPlanId(String(initial.planId));
      setAmount(String(initial.amountCents / 100));
    }
    BillingService.plans(true).then(setPlans).catch((loadError) => setError(String(loadError)));
  }, [isOpen, initial]);

  useEffect(() => {
    if (!person?.id || modality !== 'monthly' || !period) return;
    const request = ++quoteRequest.current;
    BillingService.quote(person.id, period)
      .then((quote) => {
        if (request !== quoteRequest.current) return;
        if (quote.already_paid) {
          setError(billingTexts.paymentDialog.alreadyPaid);
          return;
        }
        setError(null);
        if (quote.plan_id) {
          setPlanId(String(quote.plan_id));
          setAmount(String((quote.amount_cents || 0) / 100));
        } else {
          setPlanId('');
          setAmount('');
        }
      })
      .catch((quoteError) => request === quoteRequest.current && setError(String(quoteError)));
  }, [person, period, modality]);

  useEffect(() => {
    if (modality !== 'particular') return;
    const plan = availablePlans[0];
    setPlanId(plan?.id ? String(plan.id) : '');
    setAmount(plan ? String(plan.price_cents / 100) : '');
  }, [modality, availablePlans]);

  const choosePlan = (value: string | number) => {
    const plan = plans.find((candidate) => candidate.id === Number(value));
    setPlanId(String(value));
    if (plan) setAmount(String(plan.price_cents / 100));
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!person?.id || !planId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await BillingService.pay({
        person_id: person.id,
        modality,
        period: modality === 'monthly' ? period : undefined,
        plan_id: Number(planId),
        amount_cents: Math.round(Number(amount) * 100),
      });
      onSuccess();
      onClose();
      setPerson(null);
      setPlanId('');
      setAmount('');
    } catch (paymentError) {
      setError(String(paymentError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !busy && onClose()}
      title={billingTexts.paymentDialog.title}
      size="lg"
      closeOnOverlayClick={!busy}
      closeOnEscape={!busy}
    >
      <form className="billing-form" onSubmit={submit}>
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <PersonSearch
          selectedPerson={person}
          onPersonSelect={setPerson}
          onClearSelection={() => setPerson(null)}
        />
        <Select
          label="Modalidad"
          value={modality}
          options={[{ value: 'monthly', label: 'Mensual' }, { value: 'particular', label: 'Particular' }]}
          onChange={(value) => setModality(value as Modality)}
          fullWidth
        />
        {modality === 'monthly' && (
          <Select label="Período" value={period} options={periodOptions()} onChange={(value) => setPeriod(String(value))} fullWidth />
        )}
        <Select
          label="Plan"
          value={planId}
          options={availablePlans.map((plan) => ({ value: plan.id!, label: plan.name }))}
          onChange={choosePlan}
          fullWidth
        />
        <Input label="Importe" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
        <div className="billing-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" disabled={busy || !person || !planId || !amount}>
            {busy ? billingTexts.paymentDialog.submitting : billingTexts.paymentDialog.submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
