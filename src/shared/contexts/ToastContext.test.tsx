import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ToastProvider, useToast } from './ToastContext';

function NotificationTrigger() {
  const { addNotification } = useToast();
  return <button onClick={() => addNotification('Pago registrado correctamente', 'success')}>Notificar</button>;
}

afterEach(() => {
  vi.useRealTimers();
});

test('el toast completa su ciclo aunque cambie el contenido de la página', () => {
  vi.useFakeTimers();
  const { rerender } = render(<ToastProvider><NotificationTrigger /></ToastProvider>);

  fireEvent.click(screen.getByRole('button', { name: 'Notificar' }));
  expect(screen.getByText('Pago registrado correctamente')).toBeInTheDocument();

  rerender(<ToastProvider><div>Otra página</div></ToastProvider>);
  expect(screen.getByText('Pago registrado correctamente')).toBeInTheDocument();

  act(() => { vi.advanceTimersByTime(5300); });
  expect(screen.queryByText('Pago registrado correctamente')).not.toBeInTheDocument();
});
