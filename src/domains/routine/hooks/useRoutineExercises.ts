import { useState, useCallback } from 'react';
import { RoutineService } from '../services';
import { useToastNotifications } from '../../../shared/hooks/useToastNotifications';
import { RoutineExerciseWithDetails } from '../../../shared/types/dashboard';
import { ROUTINE_ERROR_MESSAGES, ROUTINE_UI_LABELS } from '../../../shared/constants';

interface UseRoutineExercisesProps {
  routineId: number | null;
}

export const useRoutineExercises = ({ routineId }: UseRoutineExercisesProps) => {
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
      
      // Encontrar el ejercicio actual antes de hacer cambios
      const currentExercise = exercises.find(ex => ex.id === exerciseId);
      if (!currentExercise) {
        console.error('Exercise not found with id:', exerciseId);
        console.error('Available exercises:', exercises.map(ex => ({ id: ex.id, name: ex.exercise_name })));
        throw new Error('Exercise not found');
      }

      // Sincronizar con el servidor primero
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

      // Actualizar estado local después del éxito
      setExercises(prev => prev.map(ex => 
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      ));
      
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

  const removeExercise = useCallback(async (exerciseId: number) => {
    console.log('removeExercise called with ID:', exerciseId);
    console.log('Current routineId:', routineId);
    console.log('Available exercises:', exercises.map(ex => ({ id: ex.id, exercise_id: ex.exercise_id, name: ex.exercise_name })));
    
    if (!routineId) {
      console.error('No routineId available');
      return;
    }

    try {
      setLoading(true);
      
      // Encontrar el ejercicio actual antes de hacer cambios
      const currentExercise = exercises.find(ex => ex.id === exerciseId);
      if (!currentExercise) {
        console.error('Exercise not found with id:', exerciseId);
        console.error('Available exercises:', exercises.map(ex => ({ id: ex.id, name: ex.exercise_name })));
        throw new Error('Exercise not found');
      }
      
      console.log('Found exercise to delete:', currentExercise);
      console.log('Will call service with routineId:', routineId, 'and exerciseId:', currentExercise.exercise_id);
      
      // Sincronizar con el servidor primero
      await RoutineService.removeExerciseFromRoutine(routineId, currentExercise.exercise_id);
      
      console.log('Service call completed, now renumbering groups');
      
      // Renumerar grupos automáticamente después de eliminar
      await RoutineService.renumberRoutineGroups(routineId);
      
      console.log('Groups renumbered, now reloading exercises');
      
      // Recargar ejercicios para obtener los números de grupo actualizados
      await loadExercises();
      
      console.log('Exercises reloaded successfully');
      
      addNotification(ROUTINE_UI_LABELS.EXERCISE_REMOVED_SUCCESS, 'success');
    } catch (error) {
      console.error('Error removing exercise from routine:', error);
      // Recargar en caso de error
      await loadExercises();
      addNotification(ROUTINE_ERROR_MESSAGES.REMOVE_EXERCISE_FAILED(String(error)), 'error');
    } finally {
      setLoading(false);
    }
  }, [routineId, exercises, loadExercises, addNotification]);

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
    clearExercises
  };
}; 