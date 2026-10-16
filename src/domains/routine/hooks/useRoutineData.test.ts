import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useRoutineData } from './useRoutineData';

const addNotification = vi.fn();

vi.mock('../../../shared/contexts/ToastContext', () => ({
  useToast: () => ({ addNotification }),
}));

describe('useRoutineData', () => {
  beforeEach(() => {
    addNotification.mockClear();
  });

  test('carga, busca y selecciona rutinas con sus metadatos de paginación', async () => {
    global.mockInvoke
      .mockResolvedValueOnce({ routines: [{ id: 1, name: 'Fuerza', code: 'FZA' }], total: 11, page: 2, page_size: 10, total_pages: 2 })
      .mockResolvedValueOnce({ routines: [], total: 0, page: 1, page_size: 10, total_pages: 0 })
      .mockResolvedValueOnce({ id: 1, name: 'Fuerza', code: 'FZA' });
    const { result } = renderHook(() => useRoutineData());

    await act(async () => result.current.loadRoutines('', 2));
    expect(result.current.routines).toHaveLength(1);
    expect(result.current).toMatchObject({ total: 11, page: 2, totalPages: 2, loading: false });
    expect(global.mockInvoke).toHaveBeenCalledWith('get_routines_page', { query: '', deleted: false, page: 2, pageSize: 10 });

    await act(async () => result.current.searchRoutines('movilidad'));
    expect(global.mockInvoke).toHaveBeenCalledWith('get_routines_page', { query: 'movilidad', deleted: false, page: 1, pageSize: 10 });

    await act(async () => result.current.selectRoutine(1));
    expect(result.current.selectedRoutine).toEqual({ id: 1, name: 'Fuerza', code: 'FZA' });
  });

  test('crea, actualiza y elimina manteniendo sincronizados lista y selección', async () => {
    global.mockInvoke
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce({ id: 7, name: 'Inicial', code: 'INI' })
      .mockResolvedValue(undefined);
    const { result } = renderHook(() => useRoutineData());

    await act(async () => expect(await result.current.createRoutine({ name: 'Inicial', code: 'INI' })).toBe(true));
    await act(async () => result.current.selectRoutine(7));
    await act(async () => expect(await result.current.updateRoutine(7, { name: 'Actualizada', code: 'ACT' })).toBe(true));
    expect(result.current.routines[0]).toMatchObject({ id: 7, name: 'Actualizada', code: 'ACT' });
    expect(result.current.selectedRoutine).toMatchObject({ name: 'Actualizada', code: 'ACT' });

    await act(async () => expect(await result.current.deleteRoutine(7)).toBe(true));
    expect(result.current.routines).toEqual([]);
    expect(result.current.selectedRoutine).toBeNull();
    expect(addNotification).toHaveBeenCalledWith('Rutina eliminada exitosamente', 'success');
  });

  test('muestra el error de código duplicado con duración extendida', async () => {
    global.mockInvoke.mockRejectedValue('UNIQUE constraint failed: routines.code');
    const { result } = renderHook(() => useRoutineData());

    await act(async () => expect(await result.current.createRoutine({ name: 'Duplicada', code: 'DUP' })).toBe(false));

    expect(addNotification).toHaveBeenCalledWith(expect.stringContaining('Ya existe una rutina'), 'error', 10000);
    expect(result.current.loading).toBe(false);
  });
});
