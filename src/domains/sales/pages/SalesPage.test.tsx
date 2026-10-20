import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import SalesPage from './SalesPage';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke }));

const products = [
  { id: 1, name: 'Proteína', category: '', sale_price_cents: 20000, is_active: true, available_stock: 10 },
  { id: 2, name: 'Barra', category: '', sale_price_cents: 5000, is_active: true, available_stock: 3 },
];

beforeEach(() => {
  invoke.mockReset();
  invoke.mockImplementation((command) => {
    if (command === 'list_active_products') return Promise.resolve(products);
    if (command === 'search_persons_paginated') return Promise.resolve([{
      id: 3, name: 'Ana', last_name: 'Pérez', phone: '3515551234', email: '', dni: '', birth_date: '', gender: '', address: '', emergency_contact: '', medical_conditions: '', notes: '', created_at: '', updated_at: '',
    }]);
    if (command === 'register_sale') return Promise.resolve({
      id: 7, buyer_name: 'Ana Pérez', payment_method: 'transfer', total_amount_cents: 45000,
      total_cost_cents: 25000, sold_at: '2026-10-19 12:00:00',
      items: [
        { product_id: 1, product_name: 'Proteína', quantity: 2, unit_price_cents: 20000, line_total_cents: 40000, cost_total_cents: 22000 },
        { product_id: 2, product_name: 'Barra', quantity: 1, unit_price_cents: 5000, line_total_cents: 5000, cost_total_cents: 3000 },
      ],
    });
    return Promise.resolve([]);
  });
});

test('registra una venta con varios productos, alumno del gimnasio y medio de pago', async () => {
  render(<SalesPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar venta' }));
  const productSearch = await screen.findByLabelText('Buscar producto');
  expect(screen.getByText('Alumno (opcional)')).toBeInTheDocument();
  expect(screen.queryByText('Cliente externo (opcional)')).not.toBeInTheDocument();
  fireEvent.change(productSearch, { target: { value: 'proteina' } });
  fireEvent.click(screen.getByRole('option', { name: /Proteína/ }));
  fireEvent.change(screen.getByLabelText('Cantidad de Proteína'), { target: { value: '2' } });
  fireEvent.change(productSearch, { target: { value: 'Barra' } });
  fireEvent.click(screen.getByRole('option', { name: /Barra/ }));
  fireEvent.change(screen.getByLabelText('Alumno (opcional)'), { target: { value: 'Ana' } });
  fireEvent.click(await screen.findByText('Ana Pérez'));
  expect(screen.getByRole('button', { name: 'Quitar alumno' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Medio de pago'), { target: { value: 'transfer' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar venta' }));

  await waitFor(() => expect(invoke).toHaveBeenCalledWith('register_sale', { request: {
    buyer_person_id: 3,
    payment_method: 'transfer',
    items: [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }],
  } }));
  expect(await screen.findByRole('heading', { name: 'Venta #7 registrada' })).toBeInTheDocument();
  expect(screen.getByText('2 × Proteína')).toBeInTheDocument();
});

test('conserva el formulario y muestra el error cuando el backend rechaza el stock', async () => {
  invoke.mockImplementation((command) => {
    if (command === 'list_active_products') return Promise.resolve(products);
    if (command === 'register_sale') return Promise.reject(new Error('Stock insuficiente para Proteína'));
    return Promise.resolve([]);
  });
  render(<SalesPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar venta' }));
  const productSearch = await screen.findByLabelText('Buscar producto');
  fireEvent.change(productSearch, { target: { value: 'Proteína' } });
  fireEvent.keyDown(productSearch, { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar venta' }));
  expect(await screen.findByText(/Stock insuficiente/)).toBeInTheDocument();
  expect(screen.getByText('Proteína')).toBeInTheDocument();
});

test('permite quitar explícitamente el alumno seleccionado sin enviar el formulario', async () => {
  render(<SalesPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar venta' }));
  fireEvent.change(await screen.findByLabelText('Alumno (opcional)'), { target: { value: 'Ana' } });
  fireEvent.click(await screen.findByText('Ana Pérez'));

  fireEvent.click(screen.getByRole('button', { name: 'Quitar alumno' }));

  expect(screen.getByLabelText('Alumno (opcional)')).toHaveValue('');
  expect(invoke).not.toHaveBeenCalledWith('register_sale', expect.anything());
});

test('filtra un catálogo grande y al repetir un producto incrementa su cantidad', async () => {
  const largeCatalog = Array.from({ length: 50 }, (_, index) => ({
    id: index + 1,
    name: `Producto ${index + 1}`,
    category: '',
    sale_price_cents: 1000 + index,
    is_active: true,
    available_stock: 10,
  }));
  invoke.mockImplementation((command) => command === 'list_active_products' ? Promise.resolve(largeCatalog) : Promise.resolve([]));
  render(<SalesPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar venta' }));
  const productSearch = await screen.findByLabelText('Buscar producto');

  fireEvent.focus(productSearch);
  expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(8);
  fireEvent.change(productSearch, { target: { value: 'Producto 50' } });
  fireEvent.keyDown(productSearch, { key: 'Enter' });
  fireEvent.change(productSearch, { target: { value: 'Producto 50' } });
  fireEvent.keyDown(productSearch, { key: 'Enter' });

  expect(screen.getByLabelText('Cantidad de Producto 50')).toHaveValue(2);
  await waitFor(() => expect(productSearch).toHaveFocus());
});
