import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import ConfiguracionesPage from './ConfiguracionesPage';
import { ConfigProvider } from '../../../shared/contexts/ConfigContext';
import { ToastProvider } from '../../../shared/contexts/ToastContext';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke }));

const plans = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  name: `Plan ${index + 1}`,
  modality: 'monthly',
  price_cents: 30000 + index * 1000,
  is_active: true,
}));

beforeEach(() => {
  invoke.mockImplementation((command, args = {}) => {
    if (command === 'get_products_page') return Promise.resolve({ products: [], total: 0, page: 1, page_size: 8, total_pages: 0 });
    if (command !== 'get_plans_page') return Promise.resolve({});
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 8;
    return Promise.resolve({
      plans: plans.slice((page - 1) * pageSize, page * pageSize),
      total: plans.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(plans.length / pageSize),
    });
  });
});

const renderPage = () => render(
  <ToastProvider><ConfigProvider><ConfiguracionesPage /></ConfigProvider></ToastProvider>,
);

test('muestra solamente planes y permite abrir el diálogo de creación', async () => {
  renderPage();
  expect(await screen.findByRole('heading', { name: 'Planes' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Planes' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Desarrollo' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Productos' })).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'General' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo plan' }));
  expect(screen.getByRole('heading', { name: 'Nuevo plan' })).toBeInTheDocument();
  expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  expect(screen.getByLabelText('Modalidad')).toBeInTheDocument();
  expect(screen.getByLabelText('Precio')).toBeInTheDocument();
});

test('muestra productos como una pestaña de configuración y permite iniciar el alta', async () => {
  renderPage();
  await screen.findByRole('heading', { name: 'Planes' });
  fireEvent.click(screen.getByRole('tab', { name: 'Productos' }));
  expect(await screen.findByRole('heading', { name: 'Productos' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }));
  expect(screen.getByRole('heading', { name: 'Nuevo producto' })).toBeInTheDocument();
  expect(screen.getByLabelText('Precio de venta')).toBeInTheDocument();
  expect(screen.queryByLabelText('Categoría')).not.toBeInTheDocument();
  expect(screen.getByText('Stock inicial (opcional)')).toBeInTheDocument();
});

test('pagina los planes sin desplazar la página completa', async () => {
  renderPage();

  expect(await screen.findByText('Plan 1')).toBeInTheDocument();
  expect(screen.getByText('10 planes · Página 1 de 2')).toBeInTheDocument();
  expect(screen.queryByText('Plan 9')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

  expect(await screen.findByText('Plan 9')).toBeInTheDocument();
  expect(screen.getByText('10 planes · Página 2 de 2')).toBeInTheDocument();
  expect(invoke).toHaveBeenCalledWith('get_plans_page', { page: 2, pageSize: 8 });
});

test('mantiene disponible la pestaña de desarrollo en el entorno de desarrollo', async () => {
  renderPage();

  await screen.findByRole('heading', { name: 'Planes' });
  fireEvent.click(screen.getByRole('tab', { name: 'Desarrollo' }));

  expect(await screen.findByRole('heading', { name: 'Desarrollo' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Desarrollo' })).toHaveAttribute('aria-selected', 'true');
  expect(await screen.findByRole('heading', { name: 'Simulación de períodos' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Nuevo plan' })).not.toBeInTheDocument();
});
