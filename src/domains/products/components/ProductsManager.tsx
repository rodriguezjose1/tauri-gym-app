import React, { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Button, ErrorMessage, Pagination, SearchInput } from '../../../shared/components/base';
import { ManagementPageHeader, ManagementToolbar } from '../../../shared/components/management';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { ProductService, type Product } from '../services/productService';
import { ProductDialog } from './ProductDialog';
import { StockReceiptDialog } from './StockReceiptDialog';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const PAGE_SIZE = 8;

interface ProductsManagerProps { toolbar?: ReactNode }

export function ProductsManager({ toolbar }: ProductsManagerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [restocking, setRestocking] = useState<Product | null>(null);
  const [changingId, setChangingId] = useState<number | null>(null);
  const requestId = useRef(0);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const load = useCallback(async (targetPage: number) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await ProductService.page(debouncedQuery, targetPage, PAGE_SIZE);
      if (currentRequest !== requestId.current) return;
      setProducts(result.products);
      setTotal(result.total);
      setTotalPages(result.total_pages);
      setPage(result.page);
    } catch (loadError) {
      if (currentRequest === requestId.current) setError(String(loadError));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const openNewProduct = () => {
    setEditing(null);
    setProductDialogOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditing(product);
    setProductDialogOpen(true);
  };

  const handleSaved = () => {
    setProductDialogOpen(false);
    setRestocking(null);
    void load(page);
  };

  const toggleProduct = async (product: Product) => {
    if (!product.id) return;
    setChangingId(product.id);
    setError(null);
    try {
      await ProductService.save({ ...product, is_active: !product.is_active });
      await load(page);
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setChangingId(null);
    }
  };

  return (
    <div className="products-manager">
      <div className="management-page-controls products-header">
        <ManagementPageHeader title="Productos" action={<Button onClick={openNewProduct}>Nuevo producto</Button>} />
        <ManagementToolbar
          tabs={toolbar}
          search={<SearchInput ariaLabel="Buscar productos" placeholder="Buscar por nombre" value={query} onChange={changeQuery} onClear={() => changeQuery('')} clearLabel="Limpiar búsqueda" />}
        />
      </div>

      <div className="products-content">
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        {loading ? (
          <div className="plans-state">Cargando productos…</div>
        ) : products.length === 0 ? (
          <div className="plans-state">No hay productos para mostrar.</div>
        ) : (
          <div className="product-list">
            {products.map((product) => (
              <div className="product-row" key={product.id}>
                <div className="plan-details">
                  <strong>{product.name}</strong>
                  <span>{money.format(product.sale_price_cents / 100)}</span>
                </div>
                <div className="product-stock"><small>Existencias</small><strong>{product.available_stock}</strong></div>
                <span className={`plan-status ${product.is_active ? 'active' : 'inactive'}`}>{product.is_active ? 'Activo' : 'Inactivo'}</span>
                <div className="plan-actions">
                  <Button size="sm" variant="secondary" onClick={() => setRestocking(product)}>Reponer</Button>
                  <Button size="sm" variant="secondary" onClick={() => openEditProduct(product)}>Editar</Button>
                  <Button size="sm" variant={product.is_active ? 'danger' : 'secondary'} disabled={changingId === product.id} onClick={() => toggleProduct(product)}>
                    {product.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination className="plans-pagination" total={total} page={page} totalPages={totalPages} singularLabel="producto" pluralLabel="productos" loading={loading} onPageChange={setPage} />
      <ProductDialog isOpen={productDialogOpen} product={editing} onClose={() => setProductDialogOpen(false)} onSaved={handleSaved} />
      <StockReceiptDialog product={restocking} onClose={() => setRestocking(null)} onSaved={handleSaved} />
    </div>
  );
}
