import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../services/updaterService', () => ({ checkForUpdate: vi.fn(), installUpdate: vi.fn() }));
import { checkForUpdate, installUpdate } from '../services/updaterService';
import Updater from './Updater';
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.mocked(checkForUpdate).mockResolvedValue({ version: '0.2.0' } as never);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('waits until the UI is operational and permits deferral', async () => {
  render(<Updater />);
  expect(checkForUpdate).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(5000));
  fireEvent.click(screen.getByText('Más tarde'));
  expect(screen.queryByText(/disponible/)).toBeNull();
  expect(installUpdate).not.toHaveBeenCalled();
});
it('requires explicit confirmation before download and installation', async () => {
  render(<Updater />);
  await act(() => vi.advanceTimersByTimeAsync(5000));
  fireEvent.click(screen.getByText('Actualizar'));
  expect(installUpdate).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByText('Instalar y cerrar')); });
  expect(installUpdate).toHaveBeenCalledTimes(1);
});
it('cancels the delayed check when closed', async () => {
  const view = render(<Updater />);
  view.unmount();
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(checkForUpdate).not.toHaveBeenCalled();
});
