import React, { useState } from 'react';
import { Button, ErrorMessage, Select, Title } from '../../../shared/components/base';
import { useToast } from '../../../shared/contexts/ToastContext';
import { nextPeriod, periodOptions } from '../utils/periodOptions';
import {
  BillingDevService,
  type DevGenerationResult,
} from '../services/billingDevService';

const STORAGE_KEY = 'quality-gym:dev-billing-generation';
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

interface StoredGeneration extends DevGenerationResult {
  through: string;
}

const readStoredGeneration = (): StoredGeneration | null => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as StoredGeneration;
    return Array.isArray(parsed.items) && typeof parsed.through === 'string' ? parsed : null;
  } catch {
    return null;
  }
};

export function BillingDevTools() {
  const [through, setThrough] = useState(nextPeriod());
  const [preview, setPreview] = useState<DevGenerationResult | null>(null);
  const [lastGeneration, setLastGeneration] = useState<StoredGeneration | null>(readStoredGeneration);
  const [loading, setLoading] = useState<'preview' | 'apply' | 'rollback' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useToast();

  const runPreview = async () => {
    setLoading('preview');
    setError(null);
    try {
      setPreview(await BillingDevService.preview(through));
    } catch (previewError) {
      setError(String(previewError));
    } finally {
      setLoading(null);
    }
  };

  const applyGeneration = async () => {
    setLoading('apply');
    setError(null);
    try {
      const result = await BillingDevService.apply(through);
      const stored = { ...result, through };
      setPreview(result);
      setLastGeneration(stored);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      addNotification(`${result.items.length} obligaciones de prueba generadas`, 'success');
    } catch (applyError) {
      setError(String(applyError));
    } finally {
      setLoading(null);
    }
  };

  const rollbackGeneration = async () => {
    if (!lastGeneration) return;
    setLoading('rollback');
    setError(null);
    try {
      const deleted = await BillingDevService.rollback(lastGeneration.items);
      setLastGeneration(null);
      setPreview(null);
      window.localStorage.removeItem(STORAGE_KEY);
      addNotification(`${deleted} obligaciones de prueba eliminadas`, 'success');
    } catch (rollbackError) {
      setError(String(rollbackError));
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="billing-dev-tools">
      <div className="configuraciones-section-heading">
        <div className="billing-dev-heading">
          <Title level={2}>Simulación de períodos</Title>
          <span className="billing-dev-badge">Solo desarrollo</span>
        </div>
        <p>Previsualiza y genera obligaciones futuras usando las reglas reales de cobranzas.</p>
      </div>

      <div className="billing-dev-controls">
        <Select
          label="Generar hasta el período"
          value={through}
          options={periodOptions(0, 12)}
          onChange={(value) => {
            setThrough(String(value));
            setPreview(null);
          }}
          disabled={Boolean(loading)}
          fullWidth
        />
        <Button variant="secondary" onClick={runPreview} loading={loading === 'preview'} disabled={Boolean(loading)}>
          Previsualizar
        </Button>
        <Button onClick={applyGeneration} loading={loading === 'apply'} disabled={Boolean(loading) || !preview?.items.length}>
          Generar para prueba
        </Button>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {preview && (
        <div className="billing-dev-result">
          <div className="billing-dev-summary">
            <strong>{preview.items.length} obligaciones nuevas</strong>
            <span>{money.format(preview.total_amount_cents / 100)} proyectados</span>
          </div>
          {preview.items.length === 0 ? (
            <p className="billing-dev-empty">No hay obligaciones pendientes de generación hasta ese período.</p>
          ) : (
            <div className="billing-dev-table-wrap">
              <table className="billing-dev-table">
                <thead><tr><th>Persona</th><th>Período</th><th>Plan</th><th>Importe</th></tr></thead>
                <tbody>{preview.items.map((item) => (
                  <tr key={item.id}><td>{item.person_name}</td><td>{item.period}</td><td>{item.plan_name}</td><td>{money.format(item.amount_cents / 100)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {lastGeneration && (
        <div className="billing-dev-rollback">
          <div>
            <strong>Última generación de prueba: {lastGeneration.through}</strong>
            <p>{lastGeneration.items.length} obligaciones identificadas para rollback.</p>
          </div>
          <Button variant="danger" onClick={rollbackGeneration} loading={loading === 'rollback'} disabled={Boolean(loading)}>
            Revertir generación
          </Button>
        </div>
      )}
    </section>
  );
}
