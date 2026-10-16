import React, { useCallback, useEffect, useState } from 'react';
import { Button, ErrorMessage, Input, Modal, Pagination, Title } from '../../../shared/components/base';
import { useToast } from '../../../shared/contexts/ToastContext';
import type { Person } from '../../../shared/types/dashboard';
import { BillingService, type PersonPaymentHistoryItem, type PersonPaymentHistoryPage } from '../services/billingService';
import { PaymentDialog } from './PaymentDialog';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const statusLabels: Record<PersonPaymentHistoryItem['status'], string> = {
  paid: 'Pagado', pending: 'Pendiente', overdue: 'Vencido', excluded: 'No corresponde', reversed: 'Revertido',
};

interface Props { person: Person | null; onClose: () => void; onChanged: () => void; }

export function PersonPaymentProfile({ person, onClose, onChanged }: Props) {
  const [data, setData] = useState<PersonPaymentHistoryPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<PersonPaymentHistoryItem | null>(null);
  const [creatingFirstPayment, setCreatingFirstPayment] = useState(false);
  const [excluding, setExcluding] = useState<PersonPaymentHistoryItem | null>(null);
  const [viewing, setViewing] = useState<PersonPaymentHistoryItem | null>(null);
  const [reason, setReason] = useState('');
  const { addNotification } = useToast();

  const load = useCallback(async (targetPage = 1) => {
    if (!person?.id) return;
    setLoading(true); setError(null);
    try {
      const result = await BillingService.personHistory(person.id, targetPage);
      setData(result); setPage(result.page);
    } catch (loadError) { setError(String(loadError)); }
    finally { setLoading(false); }
  }, [person?.id]);

  useEffect(() => { if (person) void load(1); }, [person, load]);

  const refresh = async () => { await load(page); onChanged(); };
  const setExcluded = async (item: PersonPaymentHistoryItem, excluded: boolean) => {
    if (!item.obligation_id) return;
    try {
      await BillingService.setPeriodExcluded(item.obligation_id, excluded);
      setExcluding(null); await refresh();
      addNotification(excluded ? 'Período marcado como No corresponde' : 'Período restaurado', 'success');
    } catch (actionError) { setError(String(actionError)); }
  };
  const reverse = async () => {
    if (!viewing?.payment_id || !reason.trim()) return;
    try {
      await BillingService.reverse(viewing.payment_id, reason);
      setViewing(null); setReason(''); await refresh();
      addNotification('Pago revertido correctamente', 'success');
    } catch (actionError) { setError(String(actionError)); }
  };

  if (!person) return null;
  return (
    <>
      <Modal isOpen onClose={onClose} title={`${person.name} ${person.last_name}`} size="xl" className="person-payment-profile-modal">
        <div className="person-payment-profile">
          <div className="person-payment-profile-heading"><Title level={2}>Historial de pagos</Title><p>Períodos mensuales y pagos particulares del alumno.</p></div>
          {error && <div className="person-payment-profile-error"><ErrorMessage message={error} onDismiss={() => setError(null)} /></div>}
          {loading ? <div className="billing-state person-payment-profile-state">Cargando historial…</div> : data?.items.length === 0 ? <div className="billing-state person-payment-profile-state person-payment-profile-empty"><span>Todavía no hay pagos ni períodos mensuales.</span><Button onClick={() => setCreatingFirstPayment(true)}>Registrar pago</Button></div> : (
              <div className="payment-table-wrap person-payment-profile-scroll"><table className="payment-table"><thead><tr><th>Período</th><th>Plan</th><th>Importe</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
              {data?.items.map((item, index) => <tr key={`${item.item_type}-${item.obligation_id ?? item.payment_id}-${index}`}>
                <td>{item.item_type === 'particular' ? 'Pago particular' : item.period}</td><td>{item.plan_name}</td><td>{money.format(item.amount_cents / 100)}</td><td><span className={`payment-status ${item.status}`}>{statusLabels[item.status]}</span></td>
                <td><div className="profile-payment-actions">
                  {(item.status === 'pending' || item.status === 'overdue') && <><Button size="sm" onClick={() => setPaying(item)}>Registrar pago</Button><Button size="sm" variant="secondary" onClick={() => setExcluding(item)}>No corresponde</Button></>}
                  {item.status === 'excluded' && <Button size="sm" variant="secondary" onClick={() => setExcluded(item, false)}>Restaurar</Button>}
                  {item.status === 'paid' && item.payment_id && <Button size="sm" variant="secondary" onClick={() => setViewing(item)}>Ver pago</Button>}
                </div></td>
              </tr>)}
              </tbody></table></div>
          )}
          <Pagination className="person-payment-profile-footer" total={data?.total ?? 0} page={data?.page ?? 1} totalPages={data?.total_pages ?? 0} singularLabel="registro" pluralLabel="registros" loading={loading} onPageChange={load} />
        </div>
      </Modal>
      <PaymentDialog isOpen={Boolean(paying)} onClose={() => setPaying(null)} onSuccess={() => { setPaying(null); void refresh(); }} initial={paying && person.id ? { person, period: paying.period!, planId: paying.plan_id, amountCents: paying.amount_cents } : undefined} />
      <PaymentDialog isOpen={creatingFirstPayment} onClose={() => setCreatingFirstPayment(false)} onSuccess={() => { setCreatingFirstPayment(false); void refresh(); }} initialPerson={person} />
      <Modal isOpen={Boolean(excluding)} onClose={() => setExcluding(null)} title="Marcar como No corresponde" size="sm"><div className="reversal-dialog"><p>Este período dejará de participar en el estado de pagos del alumno.</p><div className="billing-actions"><Button variant="secondary" onClick={() => setExcluding(null)}>Cancelar</Button><Button onClick={() => excluding && setExcluded(excluding, true)}>Confirmar</Button></div></div></Modal>
      <Modal isOpen={Boolean(viewing)} onClose={() => { setViewing(null); setReason(''); }} title="Detalle del pago" size="sm"><div className="reversal-dialog"><p><strong>{viewing?.period ?? 'Pago particular'}</strong> · {viewing && money.format(viewing.amount_cents / 100)}</p><Input label="Motivo de reversión" value={reason} onChange={(event) => setReason(event.target.value)} /><div className="billing-actions"><Button variant="secondary" onClick={() => setViewing(null)}>Cerrar</Button><Button variant="danger" disabled={!reason.trim()} onClick={reverse}>Revertir pago</Button></div></div></Modal>
    </>
  );
}
