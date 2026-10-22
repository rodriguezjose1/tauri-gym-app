import React, { useEffect, useState } from 'react';
import { Button, ErrorMessage, Input, Modal } from '../../../shared/components/base';
import { ProductService, type Product, type StockReceipt } from '../services/productService';

interface ProductDialogProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

const parseMoneyToCents = (value: string) => Math.round(Number(value) * 100);

export function ProductDialog({ isOpen, product, onClose, onSaved }: ProductDialogProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [initialCost, setInitialCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(product?.name ?? '');
    setPrice(product ? String(product.sale_price_cents / 100) : '');
    setInitialQuantity('');
    setInitialCost('');
    setError(null);
  }, [isOpen, product]);

  const buildInitialStock = (): StockReceipt | undefined => {
    if (product) return undefined;
    const quantity = Number(initialQuantity || 0);
    if (quantity === 0) return undefined;
    return { quantity, unit_cost_cents: parseMoneyToCents(initialCost || '0') };
  };

  const validate = () => {
    const numericPrice = Number(price);
    const numericQuantity = Number(initialQuantity || 0);
    const numericCost = Number(initialCost || 0);
    if (!name.trim()) return 'Ingresá un nombre para el producto.';
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return 'Ingresá un precio de venta mayor a cero.';
    if (!product && (!Number.isInteger(numericQuantity) || numericQuantity < 0)) return 'La cantidad inicial debe ser un número entero mayor o igual a cero.';
    if (!product && numericQuantity > 0 && (!Number.isFinite(numericCost) || numericCost < 0)) return 'Ingresá un costo unitario válido.';
    return null;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await ProductService.save({
        ...product,
        name: name.trim(),
        category: '',
        sale_price_cents: parseMoneyToCents(price),
        is_active: product?.is_active ?? true,
        available_stock: product?.available_stock ?? 0,
      }, buildInitialStock());
      onSaved();
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title={product ? 'Editar producto' : 'Nuevo producto'} size="sm" closeOnOverlayClick={!saving}>
      <form className="product-dialog-form" onSubmit={submit}>
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <Input label="Nombre" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input label="Precio de venta" type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
        {!product && (
          <div className="product-initial-stock">
            <p>Stock inicial (opcional)</p>
            <Input label="Cantidad inicial" type="number" min="0" step="1" value={initialQuantity} onChange={(event) => setInitialQuantity(event.target.value)} />
            <Input label="Costo unitario" type="number" min="0" step="0.01" value={initialCost} onChange={(event) => setInitialCost(event.target.value)} />
          </div>
        )}
        <div className="billing-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar producto'}</Button>
        </div>
      </form>
    </Modal>
  );
}
