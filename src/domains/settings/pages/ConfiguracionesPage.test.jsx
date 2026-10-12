import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ConfiguracionesPage from './ConfiguracionesPage';
import { ConfigProvider } from '../../../shared/contexts/ConfigContext';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(() => Promise.resolve([])) }));

test('permite administrar planes desde su propia pestaña y diálogo', async () => {
  render(<ConfigProvider><ConfiguracionesPage /></ConfigProvider>);
  expect(screen.getByRole('heading', { name: 'Configuraciones' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Planes' }));
  expect(await screen.findByRole('heading', { name: 'Planes' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo plan' }));
  expect(screen.getByRole('heading', { name: 'Nuevo plan' })).toBeInTheDocument();
  expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  expect(screen.getByLabelText('Modalidad')).toBeInTheDocument();
  expect(screen.getByLabelText('Precio')).toBeInTheDocument();
});
