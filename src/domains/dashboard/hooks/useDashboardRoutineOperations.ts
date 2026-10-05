import { useCallback, useState } from 'react';
import type { Person, WorkoutEntryForm } from '../../../shared/types/dashboard';
import { RoutineService } from '../../../services';

interface UseDashboardRoutineOperationsProps {
  selectedPerson: Person | null;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const useDashboardRoutineOperations = ({
  selectedPerson,
  showToast
}: UseDashboardRoutineOperationsProps) => {
  const [loadingRoutine, setLoadingRoutine] = useState(false);

  const handleLoadRoutineToSession = useCallback(async (routineId: number): Promise<WorkoutEntryForm[] | null> => {
    if (!selectedPerson) {
      showToast('Debe seleccionar una persona primero', 'error');
      return null;
    }

    setLoadingRoutine(true);
    try {
      const routine = await RoutineService.getRoutineWithExercises(routineId);
      
      if (!routine || !routine.exercises || routine.exercises.length === 0) {
        showToast('La rutina seleccionada no tiene ejercicios', 'error');
        return null;
      }

      // Convert routine exercises to WorkoutEntryForm
      // The routine.exercises already contains full exercise details (exercise_name, exercise_code)
      const exerciseForms: WorkoutEntryForm[] = routine.exercises.map((routineExercise, index) => ({
        exercise_id: routineExercise.exercise_id,
        sets: routineExercise.sets || 1,
        reps: routineExercise.reps || 1,
        weight: routineExercise.weight || 0,
        notes: routineExercise.notes || "",
        order: routineExercise.order_index || index,
        group_number: routineExercise.group_number || 1
      }));

      showToast(`Rutina "${routine.name}" cargada exitosamente (${exerciseForms.length} ejercicios)`, 'success');
      return exerciseForms;
    } catch (error) {
      console.error('Error loading routine to session:', error);
      showToast('Error al cargar la rutina', 'error');
      return null;
    } finally {
      setLoadingRoutine(false);
    }
  }, [selectedPerson, showToast]);

  return {
    loadRoutineToSession: handleLoadRoutineToSession,
    loadingRoutine
  };
};
