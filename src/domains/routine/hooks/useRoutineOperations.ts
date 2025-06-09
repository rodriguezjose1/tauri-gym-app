import { useState } from 'react';
import { Person, WorkoutEntry, WorkoutEntryForm, WorkoutSessionForm, WorkoutEntryWithDetails, RoutineWithExercises } from '../../../shared/types/dashboard';
import { RoutineService, WorkoutService } from '../../../services';
import { 
  DASHBOARD_ERROR_MESSAGES, 
  DASHBOARD_SUCCESS_MESSAGES, 
  DASHBOARD_WARNING_MESSAGES 
} from "../../../shared/constants";

interface UseRoutineOperationsProps {
  selectedPerson: Person | null;
  workoutData: WorkoutEntryWithDetails[];
  refreshWorkoutData: (personId: number) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (message: string, options?: { 
    title?: string; 
    confirmText?: string;
    type?: 'warning' | 'info' | 'success' | 'error';
  }) => Promise<boolean>;
}

export const useRoutineOperations = ({
  selectedPerson,
  workoutData,
  refreshWorkoutData,
  showToast,
  showConfirm
}: UseRoutineOperationsProps) => {
  const [loadingRoutine, setLoadingRoutine] = useState(false);

  const loadRoutineToSession = async (routineId: number): Promise<WorkoutEntryForm[] | null> => {
    if (!selectedPerson) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_REQUIRED, 'error');
      return null;
    }

    setLoadingRoutine(true);
    try {
      console.log("Loading routine", routineId, "for person", selectedPerson.id);
      
      // Get routine with exercises
      const routineWithExercises = await RoutineService.getRoutineWithExercises(routineId);
      console.log("Routine with exercises:", routineWithExercises);
      
      if (!routineWithExercises?.exercises || routineWithExercises.exercises.length === 0) {
        showToast(DASHBOARD_WARNING_MESSAGES.ROUTINE_NO_EXERCISES, 'warning');
        return null;
      }

      // Convert routine exercises to session form
      const exerciseForms: WorkoutEntryForm[] = routineWithExercises.exercises.map((routineExercise, index) => ({
        exercise_id: routineExercise.exercise_id,
        sets: routineExercise.sets || 1,
        reps: routineExercise.reps || 1,
        weight: routineExercise.weight || 0,
        notes: routineExercise.notes || "",
        order: index,
        group_number: routineExercise.group_number || 1
      }));

      showToast(DASHBOARD_SUCCESS_MESSAGES.ROUTINE_LOADED(routineWithExercises.name, routineWithExercises.exercises.length, 1), 'success');
      return exerciseForms;
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_LOAD_ROUTINE, error);
      showToast(DASHBOARD_ERROR_MESSAGES.LOAD_ROUTINE_FAILED, 'error');
      return null;
    } finally {
      setLoadingRoutine(false);
    }
  };

  const applyRoutineToDate = async (
    routineId: number, 
    selectedDate: string, 
    groupNumber: number = 1
  ): Promise<boolean> => {
    if (!selectedPerson) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return false;
    }

    const confirmed = await showConfirm(
      `¿Estás seguro de que quieres aplicar la rutina a la fecha ${new Date(selectedDate).toLocaleDateString('es-ES')}? Si ya existen ejercicios para esa fecha, serán reemplazados.`,
      {
        title: 'Confirmar aplicación de rutina',
        confirmText: 'Aplicar rutina',
        type: 'warning'
      }
    );

    if (!confirmed) return false;

    setLoadingRoutine(true);
    try {
      console.log("Loading routine", routineId, "for person", selectedPerson.id, "on date", selectedDate);
      
      // Get routine with exercises
      const routineWithExercises = await RoutineService.getRoutineWithExercises(routineId);
      console.log("Routine with exercises:", routineWithExercises);
      
      if (!routineWithExercises?.exercises || routineWithExercises.exercises.length === 0) {
        showToast(DASHBOARD_WARNING_MESSAGES.ROUTINE_NO_EXERCISES, 'warning');
        return false;
      }

      // First, delete existing entries for this date and person
      const existingEntries = workoutData.filter(entry => entry.date === selectedDate);
      console.log("Existing entries to delete:", existingEntries);
      
      for (const entry of existingEntries) {
        if (entry.id) {
          console.log("Deleting existing entry:", entry.id);
          await WorkoutService.deleteWorkoutEntry(entry.id);
        }
      }

      // Then create new entries from routine
      for (let i = 0; i < routineWithExercises.exercises.length; i++) {
        const routineExercise = routineWithExercises.exercises[i];
        const workoutEntry: WorkoutEntry = {
          person_id: selectedPerson.id!,
          exercise_id: routineExercise.exercise_id,
          date: selectedDate,
          sets: routineExercise.sets || 1,
          reps: routineExercise.reps || 1,
          weight: routineExercise.weight || 0,
          notes: routineExercise.notes || "",
          order: i,
          group_number: groupNumber // Use the selected group
        };

        console.log("Creating workout entry from routine:", workoutEntry);
        await WorkoutService.createWorkoutEntry(workoutEntry);
      }

      showToast(DASHBOARD_SUCCESS_MESSAGES.ROUTINE_APPLIED_TO_DATE, 'success');
      
      // Refresh workout data
      await refreshWorkoutData(selectedPerson.id!);
      
      return true;
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_APPLY_ROUTINE, error);
      showToast(DASHBOARD_ERROR_MESSAGES.APPLY_ROUTINE_FAILED, 'error');
      return false;
    } finally {
      setLoadingRoutine(false);
    }
  };

  return {
    // State
    loadingRoutine,
    
    // Actions
    loadRoutineToSession,
    applyRoutineToDate
  };
}; 