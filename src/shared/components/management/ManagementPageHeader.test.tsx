import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ManagementPageHeader, ManagementToolbar } from './ManagementPageHeader';

test('renderiza el encabezado con una acción opcional', () => {
  const { rerender } = render(<ManagementPageHeader title="Personas" />);

  expect(screen.getByRole('heading', { name: 'Personas' })).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();

  rerender(<ManagementPageHeader title="Personas" action={<button>Nueva persona</button>} />);
  expect(screen.getByRole('button', { name: 'Nueva persona' })).toBeInTheDocument();
});

test('distribuye pestañas, búsqueda y controles adicionales mediante composición', () => {
  render(
    <ManagementToolbar
      tabs={<button>Activas</button>}
      search={<input aria-label="Buscar personas" />}
    >
      <select aria-label="Estado"><option>Todos</option></select>
    </ManagementToolbar>,
  );

  expect(screen.getByRole('button', { name: 'Activas' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Buscar personas' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Estado' })).toBeInTheDocument();
});
