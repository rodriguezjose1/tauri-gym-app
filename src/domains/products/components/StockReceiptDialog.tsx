import React, { useEffect, useState } from 'react';
import { Button, ErrorMessage, Input, Modal } from '../../../shared/components/base';
import { ProductService, type Product } from '../services/productService';

interface StockReceiptDialogProps {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export function StockReceiptDialog({ product, onClose, onSaved }: StockReceiptDialogProps) {
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;
    setQuantity('');
    setCost('');
    setReceivedAt('');
    setError(null);
  }, [product]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!product?.id) return;
    const numericQuantity = Number(quantity);
    const numericCost = Number(cost);
    if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
      setError('Ingresá una cantidad entera mayor a cero.');
      return;
    }
    if (!Number.isFinite(numericCost) || numericCost < 0) {
      setError('Ingresá un costo unitario válido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await ProductService.receiveStock(product.id, {
        quantity: numericQuantity,
        unit_cost_cents: Math.round(numericCost * 100),
        received_at: receivedAt || undefined,
      });
      onSaved();
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={Boolean(product)} onClose={() => !saving && onClose()} title={`Reponer ${product?.name ?? ''}`} size="sm" closeOnOverlayClick={!saving}>
      <form className="product-dialog-form" onSubmit={submit}>
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <Input label="Cantidad" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
        <Input label="Costo unitario" type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} required />
        <Input label="Fecha de ingreso" type="date" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} />
        <div className="billing-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Registrando…' : 'Registrar reposición'}</Button>
        </div>
      </form>
    </Modal>
  );
}
