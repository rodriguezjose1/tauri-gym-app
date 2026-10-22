import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, ErrorMessage, Input, Modal, Pagination, SearchInput, Select } from '../../../shared/components/base';
import { ManagementPageHeader } from '../../../shared/components/management';
import { useToast } from '../../../shared/contexts/ToastContext';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { PeriodSelect } from '../../billing/components/PeriodSelect';
import { currentPeriod } from '../../billing/utils/periodOptions';
import { SaleDialog } from '../components/SaleDialog';
import { SaleService, type SalePage, type SaleResult, type SaleSummary } from '../services/saleService';
import '../../../styles/Sales.css';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const date = (value: string) => new Date(value.replace(' ', 'T')).toLocaleString('es-AR');
const detailDate = (value: string) => new Date(value.replace(' ', 'T')).toLocaleString('es-AR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});
const payment = (value: string) => value === 'cash' ? 'Efectivo' : value === 'transfer' ? 'Transferencia' : 'Otro';

export default function SalesPage() {
  const requestedPeriod = new URLSearchParams(window.location.search).get('period');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [month, setMonth] = useState(() => /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedPeriod || '') ? requestedPeriod! : currentPeriod());
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'voided'>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SalePage | null>(null);
  const [detail, setDetail] = useState<SaleResult | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmingVoid, setConfirmingVoid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const requestId = useRef(0);
  const { addNotification } = useToast();

  const load = useCallback(async (target: number) => {
    const id = ++requestId.current;
    setLoading(true); setError(null);
    try {
      const result = await SaleService.page(month, debouncedQuery, status, target);
      if (id !== requestId.current) return;
      setData(result); setPage(result.page);
    } catch (loadError) { if (id === requestId.current) setError(String(loadError)); }
    finally { if (id === requestId.current) setLoading(false); }
  }, [month, debouncedQuery, status]);

  useEffect(() => { setPage(1); void load(1); }, [load]);

  const changeMonth = (value: string) => {
    setMonth(value);
    const params = new URLSearchParams(window.location.search);
    params.set('period', value);
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  };

  const openDetail = async (sale: SaleSummary) => {
    setLoadingDetail(true); setError(null); setReason(''); setConfirmingVoid(false);
    try { setDetail(await SaleService.detail(sale.id)); }
    catch (detailError) { setError(String(detailError)); }
    finally { setLoadingDetail(false); }
  };
  const closeDetail = () => { setDetail(null); setReason(''); setConfirmingVoid(false); };
  const voidSale = async () => {
    if (!detail || !reason.trim() || mutating) return;
    setMutating(true);
    try {
      await SaleService.void(detail.id, reason.trim());
      setDetail(null); setReason(''); await load(page);
      addNotification('Venta anulada y stock restaurado', 'success');
    } catch (voidError) { setError(String(voidError)); addNotification('No se pudo anular la venta', 'error'); }
    finally { setMutating(false); }
  };
  const saleSaved = async () => {
    setDialogOpen(false); await load(1);
    addNotification('Venta registrada correctamente', 'success');
  };

  return <div className="sales-page management-page-frame"><Card variant="elevated" padding="md" className="management-page-card sales-card">
    <ManagementPageHeader title="Ventas" action={<div className="sales-header-actions"><div className="sales-period"><PeriodSelect value={month} onChange={changeMonth} fullWidth /></div><Button onClick={() => setDialogOpen(true)}>Registrar venta</Button></div>} />
    <div className="sales-filters">
      <SearchInput ariaLabel="Buscar ventas" placeholder="Buscar alumno o producto" value={query} onChange={setQuery} onClear={() => setQuery('')} clearLabel="Limpiar búsqueda" />
      <Select ariaLabel="Estado de venta" value={status} options={[{ value: 'all', label: 'Todas' }, { value: 'active', label: 'Vigentes' }, { value: 'voided', label: 'Anuladas' }]} onChange={(value) => setStatus(value as typeof status)} fullWidth />
    </div>
    <div className="sales-history-scroll">
      {error && <div className="sales-error"><ErrorMessage message={error} onDismiss={() => setError(null)} /><Button variant="secondary" onClick={() => load(page)}>Reintentar</Button></div>}
      {loading && !data ? <div className="sales-state">Cargando ventas…</div> : data?.sales.length === 0 ? <div className="sales-state">No hay ventas para los filtros seleccionados.</div> : <div className="payment-table-wrap"><table className="payment-table sales-table"><thead><tr><th>Comprador</th><th>Productos</th><th>Fecha de venta</th><th>Medio de pago</th><th>Importe</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{data?.sales.map((sale) => <tr key={sale.id} className={sale.voided_at ? 'reversed' : ''}><td>{sale.buyer_name || 'Sin identificar'}</td><td className="sales-products-cell" title={sale.products}>{sale.products}</td><td>{date(sale.sold_at)}</td><td>{payment(sale.payment_method)}</td><td>{money.format(sale.total_amount_cents / 100)}</td><td>{sale.voided_at ? 'Anulada' : 'Vigente'}</td><td><Button size="sm" variant="secondary" disabled={loadingDetail} onClick={() => openDetail(sale)}>Ver detalle</Button></td></tr>)}</tbody></table></div>}
    </div>
    <Pagination className="sales-pagination" total={data?.total || 0} page={data?.page || 1} totalPages={data?.total_pages || 0} singularLabel="venta" pluralLabel="ventas" loading={loading} onPageChange={(target) => void load(target)} />
    <SaleDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={saleSaved} />
    <Modal isOpen={Boolean(detail)} onClose={() => !mutating && closeDetail()} title={detail ? `Detalle de venta #${detail.id}` : 'Detalle de venta'} size="md" closeOnOverlayClick={!mutating} className="sale-detail-dialog">
      {detail && <div className="sale-detail">
        <div className="sale-detail-meta"><span><small>Fecha</small>{detailDate(detail.sold_at)}</span><span><small>Comprador</small>{detail.buyer_name || 'Sin identificar'}</span><span><small>Medio de pago</small>{payment(detail.payment_method)}</span></div>
        <div className="sale-detail-lines-scroll"><div className="sale-detail-lines">{detail.items.map((item) => <div key={item.product_id}><span>{item.quantity} × {item.product_name}<small>{money.format(item.unit_price_cents / 100)} c/u</small></span><strong>{money.format(item.line_total_cents / 100)}</strong></div>)}</div></div>
        <div className="sale-detail-footer"><div className="sale-detail-total"><span>Total cobrado</span><strong>{money.format(detail.total_amount_cents / 100)}</strong></div>
          {detail.voided_at ? <div className="sale-voided-note"><strong>Venta anulada</strong><span>{date(detail.voided_at)} · {detail.void_reason}</span></div> : confirmingVoid ? <div className="sale-void-confirm"><Input label="Motivo de anulación" value={reason} onChange={(event) => setReason(event.target.value)} autoFocus required /><div className="billing-actions"><Button type="button" variant="secondary" onClick={() => { setConfirmingVoid(false); setReason(''); }} disabled={mutating}>Volver</Button><Button type="button" variant="danger" onClick={voidSale} disabled={mutating || !reason.trim()}>{mutating ? 'Anulando…' : 'Confirmar anulación'}</Button></div></div> : <div className="sale-detail-actions"><Button type="button" variant="secondary" onClick={closeDetail}>Cerrar</Button><Button type="button" variant="danger" onClick={() => setConfirmingVoid(true)}>Anular venta</Button></div>}
        </div>
      </div>}
    </Modal>
  </Card></div>;
}
