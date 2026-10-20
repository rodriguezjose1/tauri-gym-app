import React, { useMemo, useRef, useState } from 'react';
import { Input } from '../../../shared/components/base';
import type { Product } from '../../products/services/productService';

interface Props {
  products: Product[];
  onAdd: (product: Product) => boolean;
}

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();

export function SaleProductSearch({ products, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const refocusWithoutOpening = useRef(false);
  const results = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    return products
      .filter((product) => product.id && product.available_stock > 0 && (!normalizedQuery || normalize(product.name).includes(normalizedQuery)))
      .slice(0, 8);
  }, [products, query]);

  const add = (product: Product) => {
    if (!onAdd(product)) return;
    setQuery('');
    setOpen(false);
    setActiveIndex(0);
    requestAnimationFrame(() => {
      if (document.activeElement === inputRef.current) return;
      refocusWithoutOpening.current = true;
      inputRef.current?.focus();
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      add(results[activeIndex]);
    }
  };

  return <div className="sale-product-search" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <Input
      inputRef={inputRef}
      label="Producto"
      aria-label="Buscar producto"
      autoComplete="off"
      placeholder="Buscar por nombre…"
      value={query}
      onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }}
      onFocus={() => {
        if (refocusWithoutOpening.current) { refocusWithoutOpening.current = false; return; }
        setOpen(true);
      }}
      onKeyDown={handleKeyDown}
      role="combobox"
      aria-expanded={open}
      aria-controls="sale-product-results"
      fullWidth
    />
    {open && <div id="sale-product-results" className="sale-product-results" role="listbox">
      {results.length === 0
        ? <div className="sale-product-no-results">No hay productos disponibles.</div>
        : results.map((product, index) => <button
          key={product.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={`sale-product-result${index === activeIndex ? ' sale-product-result--active' : ''}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => add(product)}
          onMouseEnter={() => setActiveIndex(index)}
        >
          <span><strong>{product.name}</strong><small>Stock: {product.available_stock}</small></span>
          <strong>{money.format(product.sale_price_cents / 100)}</strong>
        </button>)}
    </div>}
  </div>;
}
