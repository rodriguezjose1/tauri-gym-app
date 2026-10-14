import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button, Card, ErrorMessage, Input, Modal, Select, Title } from '../../../shared/components/base';
import { useToast } from '../../../shared/contexts/ToastContext';
import { PaymentDialog } from '../components/PaymentDialog';
import { BillingService, type Payment, type PaymentPage } from '../services/billingService';
import { currentPeriod, periodOptions } from '../utils/periodOptions';
import { billingTexts } from '../constants/billingTexts';
import '../../../styles/Billing.css';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const date = (value: string) => new Date(value.replace(' ', 'T')).toLocaleString('es-AR');

export default function BillingPage() {
  const [month, setMonth] = useState(currentPeriod());
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaymentPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [reversing, setReversing] = useState<Payment | null>(null);
  const [reason, setReason] = useState('');
  const [mutating, setMutating] = useState(false);
  const [compactHeader, setCompactHeader] = useState(false);
  const [personSearch, setPersonSearch] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const requestId = useRef(0);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const previousToolbarRects = useRef<DOMRect[]>([]);
  const paginationInProgress = useRef(false);
  const { addNotification } = useToast();

  const setHeaderMode = (compact: boolean) => {
    if (compact === compactHeader) return;
    previousToolbarRects.current = [headingRef.current, summaryRef.current, actionRef.current]
      .filter((element): element is HTMLDivElement => Boolean(element))
      .map((element) => element.getBoundingClientRect());
    setCompactHeader(compact);
  };

  useLayoutEffect(() => {
    const elements = [headingRef.current, summaryRef.current, actionRef.current]
      .filter((element): element is HTMLDivElement => Boolean(element));
    const previous = previousToolbarRects.current;
    if (previous.length !== elements.length || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    elements.forEach((element, index) => {
      if (typeof element.animate !== 'function') return;
      const current = element.getBoundingClientRect();
      const deltaX = previous[index].left - current.left;
      const deltaY = previous[index].top - current.top;
      const scaleX = current.width ? previous[index].width / current.width : 1;
      const scaleY = current.height ? previous[index].height / current.height : 1;
      element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})` },
          { transform: 'translate(0, 0) scale(1, 1)' },
        ],
        { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)' },
      );
    });
    previousToolbarRects.current = [];
  }, [compactHeader]);

  const load = useCallback(async (target: number) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await BillingService.paymentsPage(month, personQuery, target);
      if (id !== requestId.current) return;
      setData(result);
      setPage(result.page);
    } catch (loadError) {
      if (id === requestId.current) setError(String(loadError));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [month, personQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPersonQuery(personSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [personSearch]);

  useEffect(() => { setPage(1); void load(1); }, [month, personQuery, load]);
  const changeMonth = (value: string | number) => {
    setMonth(String(value));
    if (historyScrollRef.current) historyScrollRef.current.scrollTop = 0;
  };
  const changePage = (target: number) => {
    paginationInProgress.current = true;
    void load(target).finally(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => { paginationInProgress.current = false; });
      });
    });
  };
  const clearPersonSearch = () => {
    setPersonSearch('');
    setPersonQuery('');
  };
  const refreshed = () => { void load(page); addNotification(billingTexts.page.success, 'success'); };
  const reverse = async () => {
    if (!reversing || !reason.trim() || mutating) return;
    setMutating(true);
    try {
      await BillingService.reverse(reversing.id, reason);
      setReversing(null); setReason(''); await load(page);
      addNotification('Pago revertido correctamente', 'success');
    } catch (reverseError) {
      setError(String(reverseError)); addNotification('No se pudo revertir el pago', 'error');
    } finally { setMutating(false); }
  };

  return (
    <div className="billing-page">
      <div className="billing-page-content">
        <Card variant="elevated" padding="lg" className={`billing-main-card${compactHeader ? ' is-compact' : ''}`}>
          <div className="billing-toolbar">
            <div className="billing-heading" ref={headingRef}><Title level={2}>{billingTexts.page.title}</Title><p className="billing-description">{billingTexts.page.description}</p></div>
            <div className="billing-summary" ref={summaryRef}>
            <Select label="Período" value={month} options={periodOptions()} onChange={changeMonth} fullWidth />
            <div className="billing-metric"><span>Recaudado en el mes</span><strong>{loading ? '—' : money.format((data?.collected_cents || 0) / 100)}</strong></div>
            <div className="billing-metric"><span>Pagado del período</span><strong>{loading ? '—' : money.format((data?.period_paid_cents || 0) / 100)}</strong></div>
            <div className="billing-metric"><span>Pagos registrados en el mes</span><strong>{loading ? '—' : data?.payment_count || 0}</strong></div>
            </div>
            <div className="billing-register-action" ref={actionRef}><Button onClick={() => setShowPayment(true)}>{billingTexts.page.register}</Button></div>
          </div>
          <section className="billing-history">
            <div className="billing-history-header">
              <Title level={3}>{billingTexts.page.history}</Title>
              <div className="billing-person-search">
                <Input
                  aria-label={billingTexts.page.searchLabel}
                  placeholder={billingTexts.page.searchPlaceholder}
                  value={personSearch}
                  onChange={(event) => setPersonSearch(event.target.value)}
                  leftIcon={<Search size={17} aria-hidden="true" />}
                />
                {personSearch && (
                  <button type="button" className="billing-search-clear" onClick={clearPersonSearch} aria-label={billingTexts.page.clearSearch}>
                    <X size={17} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <div className="billing-history-scroll" ref={historyScrollRef} onScroll={(event) => { if (!paginationInProgress.current && event.currentTarget.scrollTop > 24) setHeaderMode(true); }} data-testid="billing-history-scroll">
              {error && <div className="billing-error"><ErrorMessage message={error} onDismiss={() => setError(null)} /><Button variant="secondary" onClick={() => load(page)}>Reintentar</Button></div>}
              {loading && !data ? <div className="billing-state">Cargando pagos…</div> : data?.payments.length === 0 ? <div className="billing-state">{personQuery ? billingTexts.page.emptySearch(personQuery) : billingTexts.page.empty}</div> : (
                <div className="payment-table-wrap"><table className="payment-table"><thead><tr><th>Alumno</th><th>Plan o concepto</th><th>Período</th><th>{billingTexts.table.paymentDate}</th><th>Importe</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{data?.payments.map((payment) => (
                  <tr key={payment.id} className={payment.reversed_at ? 'reversed' : ''}><td>{payment.person_name}</td><td>{payment.plan_name}</td><td>{payment.period || 'Clase particular'}</td><td>{date(payment.paid_at)}</td><td>{money.format(payment.amount_cents / 100)}</td><td>{payment.reversed_at ? 'Revertido' : billingTexts.table.paid}</td><td>{payment.reversed_at ? '—' : <Button size="sm" variant="danger" onClick={() => setReversing(payment)}>Revertir</Button>}</td></tr>
                ))}</tbody></table></div>
              )}
            </div>
            <div className="billing-pagination"><span>{data?.total || 0} registros · Página {data?.page || 1} de {Math.max(data?.total_pages || 0, 1)}</span><span className="billing-pagination-actions"><Button size="sm" variant="secondary" disabled={loading || page <= 1} onClick={() => changePage(page - 1)}>Anterior</Button><Button size="sm" variant="secondary" disabled={loading || !data || page >= data.total_pages} onClick={() => changePage(page + 1)}>Siguiente</Button></span></div>
          </section>
        </Card>
      </div>
      <PaymentDialog isOpen={showPayment} onClose={() => setShowPayment(false)} onSuccess={refreshed} />
      <Modal isOpen={Boolean(reversing)} onClose={() => !mutating && setReversing(null)} title="Revertir pago" size="sm" closeOnOverlayClick={!mutating}>
        <div className="reversal-dialog"><p>El pago se conservará en el historial como revertido.</p><Input label="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} required /><div className="billing-actions"><Button variant="secondary" onClick={() => setReversing(null)} disabled={mutating}>Cancelar</Button><Button variant="danger" onClick={reverse} disabled={mutating || !reason.trim()}>{mutating ? 'Revirtiendo…' : 'Confirmar reversión'}</Button></div></div>
      </Modal>
    </div>
  );
}
