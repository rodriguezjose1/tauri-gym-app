import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { RoutineForm } from './RoutineForm';

describe('RoutineForm', () => {
  test('genera un código legible para nombres con acentos y envía valores limpios', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<RoutineForm isOpen loading={false} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Nombre'), '  Rutina rápida  ');
    expect(screen.getByLabelText('Código')).toHaveValue('RUTINA_RAPIDA');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Rutina rápida', code: 'RUTINA_RAPIDA' }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
  });

  test('valida nombres y códigos demasiado cortos', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RoutineForm isOpen loading={false} onSubmit={onSubmit} onCancel={vi.fn()} />);

    const name = screen.getByLabelText('Nombre');
    await user.type(name, 'A');
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: 'X' } });
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
    expect(screen.getByText('El código debe tener al menos 2 caracteres')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('edita sin regenerar el código y conserva el modal si falla el guardado', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(
      <RoutineForm
        isOpen
        loading={false}
        editingRoutine={{ id: 2, name: 'Original', code: 'ORI' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Modificada');
    expect(screen.getByLabelText('Código')).toHaveValue('ORI');
    await user.click(screen.getByRole('button', { name: 'Actualizar Rutina' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Modificada', code: 'ORI' }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Modificada');
  });

  test('cancela y limpia el formulario', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<RoutineForm isOpen loading={false} onSubmit={vi.fn()} onCancel={onCancel} />);
    await user.type(screen.getByLabelText('Nombre'), 'Temporal');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
  });
});
