import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { ProductsManager } from './ProductsManager';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke }));

const product = {
  id: 1,
  name: 'Proteína',
  category: '',
  sale_price_cents: 250000,
  is_active: true,
  available_stock: 5,
};

const page = (products = [product], currentPage = 1, total = products.length) => ({
  products,
  total,
  page: currentPage,
  page_size: 8,
  total_pages: total ? Math.ceil(total / 8) : 0,
});

beforeEach(() => {
  invoke.mockReset();
  invoke.mockImplementation((command) => {
    if (command === 'get_products_page') return Promise.resolve(page());
    if (command === 'save_product') return Promise.resolve(product);
    if (command === 'receive_product_stock') return Promise.resolve();
    return Promise.reject(new Error(`Comando inesperado: ${command}`));
  });
});

test('crea un producto sin categoría y registra el stock inicial en la misma solicitud', async () => {
  render(<ProductsManager />);
  await screen.findByText('Proteína');
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }));
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Creatina' } });
  fireEvent.change(screen.getByLabelText('Precio de venta'), { target: { value: '1500.50' } });
  fireEvent.change(screen.getByLabelText('Cantidad inicial'), { target: { value: '4' } });
  fireEvent.change(screen.getByLabelText('Costo unitario'), { target: { value: '800.25' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar producto' }));

  await waitFor(() => expect(invoke).toHaveBeenCalledWith('save_product', {
    request: {
      product: {
        name: 'Creatina',
        category: '',
        sale_price_cents: 150050,
        is_active: true,
        available_stock: 0,
      },
      initial_stock: { quantity: 4, unit_cost_cents: 80025 },
    },
  }));
});

test('edita el precio, cambia el estado y conserva los datos internos del producto', async () => {
  render(<ProductsManager />);
  await screen.findByText('Proteína');
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  fireEvent.change(screen.getByLabelText('Precio de venta'), { target: { value: '2750' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar producto' }));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('save_product', {
    request: { product: { ...product, category: '', sale_price_cents: 275000 }, initial_stock: undefined },
  }));

  fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('save_product', {
    request: { product: { ...product, is_active: false }, initial_stock: undefined },
  }));
});

test('registra una reposición con cantidad, costo y fecha', async () => {
  render(<ProductsManager />);
  await screen.findByText('Proteína');
  fireEvent.click(screen.getByRole('button', { name: 'Reponer' }));
  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Costo unitario'), { target: { value: '1200' } });
  fireEvent.change(screen.getByLabelText('Fecha de ingreso'), { target: { value: '2026-10-19' } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar reposición' }));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('receive_product_stock', {
    productId: 1,
    receipt: { quantity: 3, unit_cost_cents: 120000, received_at: '2026-10-19' },
  }));
});

test('pagina, busca sólo por nombre y descarta respuestas antiguas', async () => {
  let resolveOld: ((value: ReturnType<typeof page>) => void) | undefined;
  invoke.mockImplementation((command, args) => {
    if (command !== 'get_products_page') return Promise.resolve(product);
    if (args.query === 'Pro') return new Promise((resolve) => { resolveOld = resolve; });
    if (args.query === 'Prote') return Promise.resolve(page([{ ...product, name: 'Proteína nueva' }]));
    return Promise.resolve(page(Array.from({ length: 8 }, (_, index) => ({ ...product, id: index + 1, name: `Producto ${index + 1}` })), 1, 9));
  });
  render(<ProductsManager />);
  await screen.findByText('9 productos · Página 1 de 2');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('get_products_page', { query: '', page: 2, pageSize: 8 }));
  fireEvent.change(screen.getByLabelText('Buscar productos'), { target: { value: 'Pro' } });
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('get_products_page', { query: 'Pro', page: 1, pageSize: 8 }));
  fireEvent.change(screen.getByLabelText('Buscar productos'), { target: { value: 'Prote' } });
  expect(await screen.findByText('Proteína nueva')).toBeInTheDocument();
  resolveOld?.(page([{ ...product, name: 'Resultado viejo' }]));
  await waitFor(() => expect(screen.queryByText('Resultado viejo')).not.toBeInTheDocument());
});

test('muestra errores de persistencia y bloquea envíos duplicados', async () => {
  let rejectSave: ((reason: Error) => void) | undefined;
  invoke.mockImplementation((command) => {
    if (command === 'get_products_page') return Promise.resolve(page());
    if (command === 'save_product') return new Promise((_resolve, reject) => { rejectSave = reject; });
    return Promise.resolve();
  });
  render(<ProductsManager />);
  await screen.findByText('Proteína');
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }));
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Barra' } });
  fireEvent.change(screen.getByLabelText('Precio de venta'), { target: { value: '500' } });
  const saveButton = screen.getByRole('button', { name: 'Guardar producto' });
  fireEvent.click(saveButton);
  expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardando…' }));
  expect(invoke.mock.calls.filter(([command]) => command === 'save_product')).toHaveLength(1);
  rejectSave?.(new Error('base bloqueada'));
  expect(await screen.findByText(/base bloqueada/)).toBeInTheDocument();
});
