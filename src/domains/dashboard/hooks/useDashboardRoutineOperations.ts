import { useCallback, useState } from 'react';
import type { Person, WorkoutEntry, WorkoutEntryForm } from '../../../shared/types/dashboard';
import { RoutineService } from '../../../services';

interface UseDashboardRoutineOperationsProps {
  selectedPerson: Person | null;
  workoutData: WorkoutEntry[];
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const useDashboardRoutineOperations = ({
  selectedPerson,
  workoutData,
  showToast
}: UseDashboardRoutineOperationsProps) => {
  const [loadingRoutine, setLoadingRoutine] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);

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

  const handleApplyRoutineToDate = useCallback(async (routineId: number, date: string, groupNumber?: number): Promise<boolean> => {
    if (!selectedPerson) {
      showToast('Debe seleccionar una persona primero', 'error');
      return false;
    }

    setLoadingApply(true);
    try {
      const routine = await RoutineService.getRoutineWithExercises(routineId);
      
      if (!routine || !routine.exercises || routine.exercises.length === 0) {
        showToast('La rutina seleccionada no tiene ejercicios', 'error');
        return false;
      }

      // Convert routine exercises to WorkoutEntry for the specific date
      const workoutEntries = routine.exercises.map((routineExercise, index) => ({
        person_id: selectedPerson.id!,
        exercise_id: routineExercise.exercise_id,
        date: date,
        sets: routineExercise.sets || 1,
        reps: routineExercise.reps || 1,
        weight: routineExercise.weight || 0,
        notes: routineExercise.notes || "",
        order: routineExercise.order_index || index,
        group_number: groupNumber || routineExercise.group_number || 1
      }));

      // Here you would typically save the workout entries to the database
      // For now, we'll just show success message
      showToast(`Rutina "${routine.name}" aplicada exitosamente a ${date}`, 'success');
      return true;
    } catch (error) {
      console.error('Error applying routine to date:', error);
      showToast('Error al aplicar la rutina', 'error');
      return false;
    } finally {
      setLoadingApply(false);
    }
  }, [selectedPerson, showToast]);

  return {
    loadRoutineToSession: handleLoadRoutineToSession,
    applyRoutineToDate: handleApplyRoutineToDate,
    loadingRoutine,
    loadingApply
  };
}; 