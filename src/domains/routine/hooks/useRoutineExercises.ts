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
  updateExercise: (exerciseId: number, updates: Partial<RoutineExerciseWithDetails>) => Promise<void>;
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

  // Función simplificada para actualizar ejercicio
  const updateExercise = useCallback(async (
    exerciseId: number,
    updates: Partial<RoutineExerciseWithDetails>
  ) => {
    if (!routineId) return;

    try {
      setLoading(true);
      
      // Encontrar el ejercicio actual
      const currentExercise = exercises.find(ex => ex.id === exerciseId);
      if (!currentExercise) throw new Error('Exercise not found');

      // Actualizar estado local inmediatamente
      setExercises(prev => prev.map(ex => 
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      ));

      // Sincronizar con el servidor
      await RoutineService.updateRoutineExercise(
        exerciseId,
        routineId,
        currentExercise.exercise_id!,
        updates.order_index ?? currentExercise.order_index ?? 0,
        updates.sets ?? currentExercise.sets,
        updates.reps ?? currentExercise.reps,
        updates.weight ?? currentExercise.weight,
        updates.notes ?? currentExercise.notes,
        updates.group_number ?? currentExercise.group_number
      );
      
      addNotification(ROUTINE_UI_LABELS.EXERCISE_UPDATED_SUCCESS, 'success');
    } catch (error) {
      console.error('Error updating routine exercise:', error);
      // Recargar en caso de error para restaurar estado
      await loadExercises();
      addNotification(ROUTINE_ERROR_MESSAGES.UPDATE_EXERCISE_FAILED(String(error)), 'error');
    } finally {
      setLoading(false);
    }
  }, [routineId, exercises, loadExercises, addNotification]);

  const removeExercise = async (exerciseId: number): Promise<void> => {
    try {
      setLoading(true);
      await RoutineService.deleteRoutineExercise(exerciseId);
      setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
      addNotification(ROUTINE_UI_LABELS.EXERCISE_REMOVED_SUCCESS, 'success');
    } catch (error) {
      console.error('Error removing exercise:', error);
      addNotification(ROUTINE_ERROR_MESSAGES.REMOVE_EXERCISE_FAILED(String(error)), 'error');
    } finally {
      setLoading(false);
    }
  };

  const reorderExercises = useCallback(async (exerciseOrders: Array<[number, number]>) => {
    if (!routineId) return;

    try {
      setLoading(true);
      
      // Actualizar estado local inmediatamente
      setExercises(prev => {
        const updated = [...prev];
        exerciseOrders.forEach(([exerciseId, newOrder]) => {
          const index = updated.findIndex(ex => ex.id === exerciseId);
          if (index !== -1) {
            updated[index] = { ...updated[index], order_index: newOrder };
          }
        });
        return updated;
      });
      
      await RoutineService.reorderRoutineExercises(routineId, exerciseOrders);
      
      addNotification(ROUTINE_UI_LABELS.EXERCISES_REORDERED_SUCCESS, 'success');
    } catch (error) {
      console.error('Error reordering exercises:', error);
      // Recargar en caso de error
      await loadExercises();
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