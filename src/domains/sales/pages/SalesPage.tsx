import React, { useState } from 'react';
import { Button, Card, Title } from '../../../shared/components/base';
import { ManagementPageHeader } from '../../../shared/components/management';
import { SaleDialog } from '../components/SaleDialog';
import type { SaleResult } from '../services/saleService';
import '../../../styles/Sales.css';
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

export default function SalesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastSale, setLastSale] = useState<SaleResult | null>(null);
  return <div className="sales-page management-page-frame"><Card variant="elevated" padding="md" className="management-page-card sales-card">
    <ManagementPageHeader title="Ventas" action={<Button onClick={() => setDialogOpen(true)}>Registrar venta</Button>} />
    <div className="sales-content">{lastSale ? <Card variant="default" padding="md" className="sale-receipt"><Title level={3}>Venta #{lastSale.id} registrada</Title><p>{lastSale.buyer_name || 'Comprador no identificado'} · {lastSale.payment_method === 'cash' ? 'Efectivo' : lastSale.payment_method === 'transfer' ? 'Transferencia' : 'Otro'}</p>{lastSale.items.map((item) => <div key={item.product_id}><span>{item.quantity} × {item.product_name}</span><strong>{money.format(item.line_total_cents / 100)}</strong></div>)}<div className="sale-receipt-total"><span>Total cobrado</span><strong>{money.format(lastSale.total_amount_cents / 100)}</strong></div></Card> : <div className="sales-state">Registrá una venta para comenzar. El historial completo se incorporará en el siguiente incremento.</div>}</div>
    <SaleDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={(sale) => { setLastSale(sale); setDialogOpen(false); }} />
  </Card></div>;
}
