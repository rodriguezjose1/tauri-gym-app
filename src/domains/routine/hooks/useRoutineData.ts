import { useState, useCallback } from 'react';
import { RoutineService } from '../services';
import { useToast } from '../../../shared/contexts/ToastContext';
import { Routine, RoutineForm } from '../../../shared/types/dashboard';
import { ROUTINE_ERROR_MESSAGES } from '../../../shared/constants';

const ROUTINE_SUCCESS_MESSAGES = {
  CREATED: 'Rutina creada exitosamente',
  DELETED: 'Rutina eliminada exitosamente',
  UPDATED: 'Rutina actualizada exitosamente'
} as const;

interface UseRoutineDataReturn {
  routines: Routine[];
  selectedRoutine: Routine | null;
  selectedRoutineId: number | null;
  loading: boolean;
  
  loadRoutines: () => Promise<void>;
  selectRoutine: (routineId: number) => Promise<void>;
  createRoutine: (form: RoutineForm) => Promise<boolean>;
  updateRoutine: (routineId: number, form: RoutineForm) => Promise<boolean>;
  deleteRoutine: (routineId: number) => Promise<boolean>;
  searchRoutines: (searchTerm: string) => Promise<void>;
  clearSelection: () => void;
}

export const useRoutineData = (): UseRoutineDataReturn => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { addNotification } = useToast();

  const loadRoutines = useCallback(async () => {
    try {
      setLoading(true);
      const data = await RoutineService.listRoutines();
      setRoutines(data);
    } catch (error) {
      console.error('Error loading routines:', error);
      addNotification(ROUTINE_ERROR_MESSAGES.LOAD_ROUTINES_FAILED, 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const selectRoutine = useCallback(async (routineId: number) => {
    try {
      setLoading(true);
      const routine = await RoutineService.getRoutineById(routineId);
      setSelectedRoutine(routine);
      setSelectedRoutineId(routineId);
    } catch (error) {
      console.error('Error loading routine:', error);
      addNotification('Error al cargar la rutina', 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const createRoutine = useCallback(async (form: RoutineForm): Promise<boolean> => {
    try {
      setLoading(true);
      const newRoutineId = await RoutineService.createRoutine(form.name, form.code);
      
      // Crear objeto rutina para el estado local
      const newRoutine: Routine = {
        id: newRoutineId,
        name: form.name,
        code: form.code
      };
      
      setRoutines(prev => [...prev, newRoutine]);
      addNotification(ROUTINE_SUCCESS_MESSAGES.CREATED, 'success');
      return true;
    } catch (error) {
      console.error('Error creating routine:', error);
      addNotification(ROUTINE_ERROR_MESSAGES.CREATE_ROUTINE_FAILED(String(error)), 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const updateRoutine = useCallback(async (routineId: number, form: RoutineForm): Promise<boolean> => {
    try {
      setLoading(true);
      await RoutineService.updateRoutine(routineId, form.name, form.code);
      
      // Actualizar la rutina en el estado local
      setRoutines(prev => prev.map(r => 
        r.id === routineId ? { ...r, name: form.name, code: form.code } : r
      ));
      
      // Actualizar la selección si la rutina actual es la seleccionada
      if (selectedRoutineId === routineId) {
        setSelectedRoutine({ ...selectedRoutine!, name: form.name, code: form.code });
      }
      
      addNotification(ROUTINE_SUCCESS_MESSAGES.UPDATED, 'success');
      return true;
    } catch (error) {
      console.error('Error updating routine:', error);
      addNotification(ROUTINE_ERROR_MESSAGES.UPDATE_ROUTINE_FAILED(String(error)), 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedRoutineId, addNotification]);

  const deleteRoutine = useCallback(async (routineId: number): Promise<boolean> => {
    try {
      setLoading(true);
      await RoutineService.deleteRoutine(routineId);
      
      // Limpiar la selección actual si estamos eliminando la rutina seleccionada
      if (selectedRoutineId === routineId) {
        setSelectedRoutine(null);
        setSelectedRoutineId(null);
      }
      
      // Actualizar la lista de rutinas
      setRoutines(prev => prev.filter(r => r.id !== routineId));
      
      addNotification(ROUTINE_SUCCESS_MESSAGES.DELETED, 'success');
      return true;
    } catch (error) {
      console.error('Error deleting routine:', error);
      addNotification(ROUTINE_ERROR_MESSAGES.DELETE_ROUTINE_FAILED(String(error)), 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedRoutineId, addNotification]);

  const searchRoutines = useCallback(async (searchTerm: string) => {
    try {
      setLoading(true);
      const data = await RoutineService.searchRoutines(searchTerm);
      setRoutines(data);
    } catch (error) {
      console.error('Error searching routines:', error);
      addNotification(ROUTINE_ERROR_MESSAGES.SEARCH_ROUTINES_FAILED, 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const clearSelection = useCallback(() => {
    setSelectedRoutine(null);
    setSelectedRoutineId(null);
  }, []);

  return {
    routines,
    selectedRoutine,
    selectedRoutineId,
    loading,
    loadRoutines,
    selectRoutine,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    searchRoutines,
    clearSelection
  };
}; 