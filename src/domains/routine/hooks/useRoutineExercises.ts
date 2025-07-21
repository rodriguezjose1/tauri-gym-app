import { useState, useCallback } from 'react';
import { RoutineService } from '../services';
import { useToast } from '../../../shared/contexts/ToastContext';
import { RoutineExerciseWithDetails } from '../../../shared/types/dashboard';
import { ROUTINE_ERROR_MESSAGES, ROUTINE_UI_LABELS } from '../../../shared/constants';

interface UseRoutineExercisesProps {
  routineId: number | null;
}

export const useRoutineExercises = ({ routineId }: UseRoutineExercisesProps) => {
  const [exercises, setExercises] = useState<RoutineExerciseWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { addNotification } = useToast();

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

    console.log('DEBUG: addExercise called with:', { exerciseId, orderIndex, groupNumber });

    try {
      setLoading(true);
      console.log('DEBUG: About to call RoutineService.addExerciseToRoutine');
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
      
      console.log('DEBUG: RoutineService.addExerciseToRoutine completed successfully');
      
      // Solo recargar ejercicios si la operación fue exitosa
      await loadExercises();
      
      addNotification(ROUTINE_UI_LABELS.EXERCISE_ADDED_SUCCESS, 'success');
    } catch (error) {
      console.error('DEBUG: Error in addExercise:', error);
      
      // Check for specific duplicate exercise error
      const errorMessage = String(error);
      if (errorMessage.includes('Este ejercicio ya está en la rutina')) {
        addNotification(ROUTINE_ERROR_MESSAGES.EXERCISE_ALREADY_IN_ROUTINE, 'warning');
      } else if (errorMessage.includes('⚠️ No puedes saltar grupos')) {
        // Use longer duration for group validation errors so user can read it
        addNotification(ROUTINE_ERROR_MESSAGES.ADD_EXERCISE_FAILED(errorMessage), 'error', 10000);
      } else {
        addNotification(ROUTINE_ERROR_MESSAGES.ADD_EXERCISE_FAILED(errorMessage), 'error');
      }
      // NO recargar ejercicios ni mostrar mensaje de éxito cuando hay error
      // Propagar el error para que se maneje en el componente padre
      throw error;
    } finally {
      setLoading(false);
    }
  }, [routineId, loadExercises, addNotification]);

  const updateExercise = useCallback(async (
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
      
      // Encontrar el ejercicio actual
      const currentExercise = exercises.find(ex => ex.id === exerciseId);
      if (!currentExercise) {
        throw new Error('Exercise not found');
      }
      
      // Verificar que el ID del ejercicio existe
      if (!currentExercise.id) {
        throw new Error('Exercise ID is required for update');
      }
      
      await RoutineService.updateRoutineExercise(
        currentExercise.id,
        routineId,
        currentExercise.exercise_id,
        orderIndex,
        sets || currentExercise.sets,
        reps || currentExercise.reps,
        weight || currentExercise.weight,
        notes || currentExercise.notes,
        groupNumber || currentExercise.group_number
      );
      
      // Solo recargar ejercicios si la operación fue exitosa
      await loadExercises();
      
      addNotification(ROUTINE_UI_LABELS.EXERCISE_UPDATED_SUCCESS, 'success');
    } catch (error) {
      console.error('Error updating exercise in routine:', error);
      const errorMessage = String(error);
      if (errorMessage.includes('⚠️ No puedes saltar grupos')) {
        // Use longer duration for group validation errors so user can read it
        addNotification(ROUTINE_ERROR_MESSAGES.UPDATE_EXERCISE_FAILED(errorMessage), 'error', 10000);
      } else {
        addNotification(ROUTINE_ERROR_MESSAGES.UPDATE_EXERCISE_FAILED(errorMessage), 'error');
      }
      // NO recargar ejercicios ni mostrar mensaje de éxito cuando hay error
      // Propagar el error para que se maneje en el componente padre
      throw error;
    } finally {
      setLoading(false);
    }
  }, [routineId, exercises, loadExercises, addNotification]);

  const removeExercise = useCallback(async (exerciseId: number) => {
    if (!routineId) return;

    try {
      setLoading(true);
      
      // Encontrar el ejercicio actual antes de hacer cambios
      const currentExercise = exercises.find(ex => ex.id === exerciseId);
      if (!currentExercise) {
        console.error('Exercise not found with id:', exerciseId);
        console.error('Available exercises:', exercises.map(ex => ({ id: ex.id, exercise_id: ex.exercise_id, name: ex.exercise_name })));
        throw new Error('Exercise not found');
      }
      
      console.log('Removing exercise:', {
        routineId,
        exerciseId,
        currentExercise: {
          id: currentExercise.id,
          exercise_id: currentExercise.exercise_id,
          name: currentExercise.exercise_name
        }
      });
      
      // Sincronizar con el servidor primero
      await RoutineService.removeExerciseFromRoutine(routineId, currentExercise.exercise_id);
      
      // Renumerar grupos automáticamente después de eliminar
      await RoutineService.renumberRoutineGroups(routineId);
      
      // Recargar ejercicios para obtener los números de grupo actualizados
      await loadExercises();
      
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