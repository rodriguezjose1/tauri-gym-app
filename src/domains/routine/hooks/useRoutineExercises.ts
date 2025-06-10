import { useState, useCallback } from 'react';
import { RoutineService } from '../services';
import { useToastNotifications } from '../../../shared/hooks/useToastNotifications';
import { RoutineExerciseWithDetails } from '../../../shared/types/dashboard';
import { ROUTINE_ERROR_MESSAGES, ROUTINE_UI_LABELS } from '../../../shared/constants';

interface UseRoutineExercisesProps {
  routineId: number | null;
}

interface UseRoutineExercisesReturn {
  exercises: RoutineExerciseWithDetails[];
  loading: boolean;
  
  loadExercises: () => Promise<void>;
  addExercise: (exerciseId: number, orderIndex: number, sets?: number, reps?: number, weight?: number, notes?: string, groupNumber?: number) => Promise<void>;
  updateExercise: (id: number, routineId: number, exerciseId: number, orderIndex: number, sets?: number, reps?: number, weight?: number, notes?: string, groupNumber?: number) => Promise<void>;
  removeExercise: (exerciseId: number) => Promise<void>;
  reorderExercises: (exerciseOrders: Array<[number, number]>) => Promise<void>;
  clearExercises: () => void;
}

export const useRoutineExercises = ({ routineId }: UseRoutineExercisesProps): UseRoutineExercisesReturn => {
  const [exercises, setExercises] = useState<RoutineExerciseWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { addNotification } = useToastNotifications();

  const loadExercises = useCallback(async () => {
    if (!routineId) {
      setExercises([]);
      return;
    }

    try {
      setLoading(true);
      const data = await RoutineService.getRoutineExercises(routineId);
      setExercises(data);
    } catch (error) {
      console.error('Error loading routine exercises:', error);
      addNotification(ROUTINE_ERROR_MESSAGES.LOAD_ROUTINE_EXERCISES_FAILED, 'error');
    } finally {
      setLoading(false);
    }
  }, [routineId, addNotification]);

  const addExercise = useCallback(async (
    exerciseId: number,
    orderIndex: number,
    sets?: number,
    reps?: number,
    weight?: number,
    notes?: string,
    groupNumber?: number
  ) => {
    if (!routineId) return;

    try {
      setLoading(true);
      await RoutineService.addExerciseToRoutine(
        routineId,
        exerciseId,
        orderIndex,
        sets,
        reps,
        weight,
        notes,
        groupNumber
      );
      
      // Recargar ejercicios para obtener los datos actualizados
      await loadExercises();
      
      addNotification(ROUTINE_UI_LABELS.EXERCISE_ADDED_SUCCESS, 'success');
    } catch (error) {
      console.error('Error adding exercise to routine:', error);
      addNotification(ROUTINE_ERROR_MESSAGES.ADD_EXERCISE_FAILED(String(error)), 'error');
    } finally {
      setLoading(false);
    }
  }, [routineId, loadExercises, addNotification]);

  const updateExercise = useCallback(async (
    id: number,
    routineId: number,
    exerciseId: number,
    orderIndex: number,
    sets?: number,
    reps?: number,
    weight?: number,
    notes?: string,
    groupNumber?: number
  ) => {
    try {
      setLoading(true);
      await RoutineService.updateRoutineExercise(
        id,
        routineId,
        exerciseId,
        orderIndex,
        sets,
        reps,
        weight,
        notes,
        groupNumber
      );
      
      // Recargar ejercicios para obtener los datos actualizados
      await loadExercises();
      
      addNotification(ROUTINE_UI_LABELS.EXERCISE_UPDATED_SUCCESS, 'success');
    } catch (error) {
      console.error('Error updating routine exercise:', error);
      addNotification(ROUTINE_ERROR_MESSAGES.UPDATE_EXERCISE_FAILED(String(error)), 'error');
    } finally {
      setLoading(false);
    }
  }, [loadExercises, addNotification]);

  const removeExercise = useCallback(async (exerciseId: number) => {
    if (!routineId) return;

    try {
      setLoading(true);
      await RoutineService.removeExerciseFromRoutine(routineId, exerciseId);
      
      // Actualizar estado local removiendo el ejercicio
      setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
      
      addNotification(ROUTINE_UI_LABELS.EXERCISE_REMOVED_SUCCESS, 'success');
    } catch (error) {
      console.error('Error removing exercise from routine:', error);
      addNotification(ROUTINE_ERROR_MESSAGES.REMOVE_EXERCISE_FAILED(String(error)), 'error');
    } finally {
      setLoading(false);
    }
  }, [routineId, addNotification]);

  const reorderExercises = useCallback(async (exerciseOrders: Array<[number, number]>) => {
    if (!routineId) return;

    try {
      setLoading(true);
      await RoutineService.reorderRoutineExercises(routineId, exerciseOrders);
      
      // Recargar ejercicios para obtener el orden actualizado
      await loadExercises();
      
      addNotification(ROUTINE_UI_LABELS.EXERCISES_REORDERED_SUCCESS, 'success');
    } catch (error) {
      console.error('Error reordering exercises:', error);
      addNotification(ROUTINE_ERROR_MESSAGES.REORDER_EXERCISES_FAILED, 'error');
    } finally {
      setLoading(false);
    }
  }, [routineId, loadExercises, addNotification]);

  const clearExercises = useCallback(() => {
    setExercises([]);
  }, []);

  return {
    exercises,
    loading,
    loadExercises,
    addExercise,
    updateExercise,
    removeExercise,
    reorderExercises,
    clearExercises
  };
}; 