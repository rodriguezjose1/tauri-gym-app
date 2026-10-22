import React, { useEffect, useState } from 'react';
import { Button, ErrorMessage, Input, Modal, Select } from '../../../shared/components/base';
import type { Person } from '../../../shared/types/dashboard';
import { PersonSearch } from '../../person/components/PersonSearch';
import { ProductService, type Product } from '../../products/services/productService';
import { SaleService, type PaymentMethod, type SaleRequestItem, type SaleResult } from '../services/saleService';
import { SaleProductSearch } from './SaleProductSearch';

interface Props { isOpen: boolean; onClose: () => void; onSaved: (sale: SaleResult) => void }
interface DraftLine extends SaleRequestItem { product: Product }
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

export function SaleDialog({ isOpen, onClose, onSaved }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [person, setPerson] = useState<Person | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLines([]); setPerson(null); setPaymentMethod('transfer'); setError(null);
    ProductService.active().then(setProducts).catch((loadError) => setError(String(loadError)));
  }, [isOpen]);

  const total = lines.reduce((sum, line) => sum + line.product.sale_price_cents * line.quantity, 0);
  const addProduct = (product: Product) => {
    if (!product.id) return false;
    const existing = lines.find((line) => line.product_id === product.id);
    if (existing && existing.quantity >= product.available_stock) {
      setError(`No hay más stock disponible de ${product.name}.`);
      return false;
    }
    setLines((current) => existing
      ? current.map((line) => line.product_id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...current, { product_id: product.id!, quantity: 1, product }]);
    setError(null);
    return true;
  };
  const changeQuantity = (productId: number, value: string) => {
    const quantity = Number(value);
    setLines((current) => current.map((line) => line.product_id === productId ? { ...line, quantity } : line));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lines.length || lines.some((line) => !Number.isInteger(line.quantity) || line.quantity <= 0)) { setError('Agregá productos con cantidades válidas.'); return; }
    setSaving(true); setError(null);
    try {
      const sale = await SaleService.register({ buyer_person_id: person?.id, payment_method: paymentMethod, items: lines.map(({ product_id, quantity }) => ({ product_id, quantity })) });
      onSaved(sale);
    } catch (saveError) { setError(String(saveError)); } finally { setSaving(false); }
  };

  return <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title="Registrar venta" size="lg" closeOnOverlayClick={!saving} closeOnEscape={!saving} className="sale-dialog">
    <form className="sale-form" onSubmit={submit}>
      <div className="sale-fixed-controls">
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <div className="sale-context-row">
          <div className="sale-context-field sale-person-field">
            <span className="sale-field-label">Alumno (opcional)</span>
            <PersonSearch ariaLabel="Alumno (opcional)" placeholder="Buscar alumno…" selectedPerson={person} onPersonSelect={setPerson} onClearSelection={() => setPerson(null)} clearSelectionLabel="Quitar alumno" />
          </div>
          <div className="sale-context-field">
            <span className="sale-field-label">Medio de pago</span>
            <Select ariaLabel="Medio de pago" value={paymentMethod} options={[{ value: 'cash', label: 'Efectivo' }, { value: 'transfer', label: 'Transferencia' }, { value: 'other', label: 'Otro' }]} onChange={(value) => setPaymentMethod(value as PaymentMethod)} fullWidth />
          </div>
        </div>
        <SaleProductSearch products={products} onAdd={addProduct} />
      </div>
      <div className="sale-lines-scroll">
        {lines.length === 0 ? <div className="sale-empty">Todavía no agregaste productos.</div> : <div className="sale-lines">{lines.map((line) => <div className="sale-line" key={line.product_id}><div><strong>{line.product.name}</strong><span>{money.format(line.product.sale_price_cents / 100)} c/u</span></div><Input aria-label={`Cantidad de ${line.product.name}`} type="number" min="1" max={line.product.available_stock} step="1" value={line.quantity} onChange={(event) => changeQuantity(line.product_id, event.target.value)} /><strong>{money.format(line.product.sale_price_cents * line.quantity / 100)}</strong><Button type="button" size="sm" variant="danger" onClick={() => setLines((current) => current.filter((item) => item.product_id !== line.product_id))}>Quitar</Button></div>)}</div>}
      </div>
      <div className="sale-footer">
        <div className="sale-total"><span>Total</span><strong>{money.format(total / 100)}</strong></div>
        <div className="billing-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving || lines.length === 0}>{saving ? 'Registrando…' : 'Confirmar venta'}</Button></div>
      </div>
    </form>
  </Modal>;
}
