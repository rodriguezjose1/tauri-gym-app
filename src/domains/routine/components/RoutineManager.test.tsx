import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RoutineManager } from './RoutineManager';

const { addNotification, routineData, routineExercises, service } = vi.hoisted(() => ({
  addNotification: vi.fn(),
  routineData: {
    routines: [{ id: 1, name: 'Fuerza', code: 'FZA' }],
    selectedRoutine: { id: 1, name: 'Fuerza', code: 'FZA' },
    selectedRoutineId: 1,
    loading: false,
    total: 1,
    page: 1,
    totalPages: 1,
    loadRoutines: vi.fn(),
    selectRoutine: vi.fn(),
    createRoutine: vi.fn(),
    updateRoutine: vi.fn(),
    deleteRoutine: vi.fn(),
    searchRoutines: vi.fn(),
    clearSelection: vi.fn(),
  },
  routineExercises: {
    exercises: [],
    loading: false,
    loadExercises: vi.fn(),
    addExercise: vi.fn(),
    updateExercise: vi.fn(),
    removeExercise: vi.fn(),
    clearExercises: vi.fn(),
  },
  service: {
    countDeletedRoutines: vi.fn(),
    getRoutinesPage: vi.fn(),
    restoreRoutine: vi.fn(),
  },
}));

vi.mock('../../../shared/contexts/ToastContext', () => ({
  useToast: () => ({ addNotification }),
}));
vi.mock('../../../shared/hooks/useDebouncedValue', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('../hooks/useRoutineData', () => ({ useRoutineData: () => routineData }));
vi.mock('../hooks/useRoutineExercises', () => ({ useRoutineExercises: () => routineExercises }));
vi.mock('../services/routineService', () => ({ RoutineService: service }));
vi.mock('./RoutineList', () => ({
  RoutineList: ({ routines, onSelectRoutine, onDeleteRoutine }: any) => (
    <div>
      {routines.map((routine: any) => <button key={routine.id} onClick={() => onSelectRoutine(routine.id)}>Seleccionar {routine.name}</button>)}
      <button onClick={() => onDeleteRoutine(1, 'Fuerza')}>Solicitar eliminación</button>
    </div>
  ),
}));
vi.mock('./RoutineForm', () => ({
  RoutineForm: ({ isOpen, editingRoutine, onSubmit, onCancel }: any) => isOpen ? (
    <div>
      <span>{editingRoutine ? 'Formulario edición' : 'Formulario creación'}</span>
      <button onClick={() => onSubmit({ name: 'Nueva', code: 'NUE' })}>Guardar formulario</button>
      <button onClick={onCancel}>Cancelar formulario</button>
    </div>
  ) : null,
}));
vi.mock('./ExerciseSearch', () => ({
  ExerciseSearch: ({ isOpen, onAddExercise, onClose }: any) => isOpen ? (
    <div>
      <span>Buscador de ejercicios</span>
      <button onClick={() => onAddExercise({ id: 8, name: 'Remo' }, 2)}>Elegir ejercicio</button>
      <button onClick={onClose}>Cerrar buscador</button>
    </div>
  ) : null,
}));
vi.mock('./RoutineExercise', () => ({ RoutineExercise: () => <div>Ejercicio de rutina</div> }));
vi.mock('../../../shared/components/modals', () => ({
  DeleteConfirmationModal: ({ isOpen, title, onConfirm, onCancel }: any) => isOpen ? (
    <div>
      <span>{title}</span>
      <button onClick={onConfirm}>Confirmar acción</button>
      <button onClick={onCancel}>Cancelar acción</button>
    </div>
  ) : null,
}));

describe('RoutineManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routineData.loadRoutines.mockResolvedValue(undefined);
    routineData.createRoutine.mockResolvedValue(true);
    routineData.updateRoutine.mockResolvedValue(true);
    routineData.deleteRoutine.mockResolvedValue(true);
    routineExercises.loadExercises.mockResolvedValue(undefined);
    routineExercises.addExercise.mockResolvedValue(undefined);
    service.countDeletedRoutines.mockResolvedValue(0);
    service.restoreRoutine.mockResolvedValue(undefined);
  });

  test('carga datos, selecciona una rutina y agrega un ejercicio al grupo elegido', async () => {
    const user = userEvent.setup();
    render(<RoutineManager />);

    await waitFor(() => expect(routineData.loadRoutines).toHaveBeenCalledWith('', 1));
    expect(service.countDeletedRoutines).toHaveBeenCalledOnce();
    expect(routineExercises.loadExercises).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Seleccionar Fuerza' }));
    expect(routineData.selectRoutine).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole('button', { name: 'Agregar Ejercicio' }));
    await user.click(screen.getByRole('button', { name: 'Elegir ejercicio' }));
    expect(routineExercises.addExercise).toHaveBeenCalledWith(8, 0, undefined, undefined, undefined, undefined, 2);
  });

  test('crea, edita y elimina sin duplicar las notificaciones del hook', async () => {
    const user = userEvent.setup();
    render(<RoutineManager />);
    await user.click(screen.getByRole('button', { name: /Nueva Rutina/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar formulario' }));
    await waitFor(() => expect(routineData.createRoutine).toHaveBeenCalledWith({ name: 'Nueva', code: 'NUE' }));

    await user.click(screen.getByRole('button', { name: /Editar/ }));
    expect(screen.getByText('Formulario edición')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar formulario' }));
    expect(routineData.updateRoutine).toHaveBeenCalledWith(1, { name: 'Nueva', code: 'NUE' });

    await user.click(screen.getByRole('button', { name: 'Solicitar eliminación' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar acción' }));
    await waitFor(() => expect(routineData.deleteRoutine).toHaveBeenCalledWith(1));
    expect(routineData.loadRoutines).toHaveBeenCalledWith('', 1);
    expect(addNotification).not.toHaveBeenCalled();
  });

  test('lista, pagina y restaura rutinas eliminadas', async () => {
    const user = userEvent.setup();
    service.getRoutinesPage.mockResolvedValue({
      routines: [{ id: 4, name: 'Archivada', code: 'ARC' }], total: 11, page: 1, page_size: 10, total_pages: 2,
    });
    render(<RoutineManager />);

    await user.click(screen.getByRole('button', { name: /Rutinas Eliminadas/ }));
    await waitFor(() => expect(screen.getByText('Archivada')).toBeInTheDocument());
    expect(service.getRoutinesPage).toHaveBeenCalledWith('', true, 1, 10);

    await user.click(screen.getByRole('button', { name: /Restaurar/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmar acción' }));
    await waitFor(() => expect(service.restoreRoutine).toHaveBeenCalledWith(4));
    expect(addNotification).toHaveBeenCalledWith('Rutina "Archivada" restaurada correctamente', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(service.getRoutinesPage).toHaveBeenCalledWith('', true, 2, 10));
  });
});
