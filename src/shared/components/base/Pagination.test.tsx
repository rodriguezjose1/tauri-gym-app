import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Pagination } from './Pagination';

test('muestra total y página, navega y respeta los límites', async () => {
  const user = userEvent.setup();
  const onPageChange = vi.fn();
  const { rerender } = render(
    <Pagination total={77} page={2} totalPages={8} singularLabel="persona" pluralLabel="personas" onPageChange={onPageChange} />,
  );

  expect(screen.getByText('77 personas · Página 2 de 8')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Anterior' }));
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(onPageChange.mock.calls).toEqual([[1], [3]]);

  rerender(
    <Pagination total={1} page={1} totalPages={1} singularLabel="persona" pluralLabel="personas" onPageChange={onPageChange} />,
  );
  expect(screen.getByText('1 persona · Página 1 de 1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
});
