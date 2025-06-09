import { useState } from 'react';
import { Person, WorkoutEntry, WorkoutEntryForm, WorkoutSessionForm, WorkoutEntryWithDetails } from '../shared/types/dashboard';
import { WorkoutService } from '../services';
import { 
  DASHBOARD_ERROR_MESSAGES, 
  DASHBOARD_SUCCESS_MESSAGES, 
  DASHBOARD_WARNING_MESSAGES 
} from '../constants/errorMessages';

interface UseWorkoutOperationsProps {
  selectedPerson: Person | null;
  workoutData: any[]; // Add workoutData to access existing entries
  refreshWorkoutData: (personId: number) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useWorkoutOperations = ({
  selectedPerson,
  workoutData,
  refreshWorkoutData,
  showToast
}: UseWorkoutOperationsProps) => {
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [deletingWorkout, setDeletingWorkout] = useState(false);

  const saveWorkoutEntry = async (workoutEntry: WorkoutEntry) => {
    if (!selectedPerson || !workoutEntry.date || !workoutEntry.exercise_id) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return false;
    }

    setSavingWorkout(true);
    try {
      console.log("Saving workout entry:", workoutEntry);
      await WorkoutService.createWorkoutEntry(workoutEntry);
      
      showToast(DASHBOARD_SUCCESS_MESSAGES.WORKOUT_ENTRY_SAVED, 'success');
      
      // Refresh workout data
      await refreshWorkoutData(selectedPerson.id!);
      
      return true;
    } catch (error) {
      console.error("Error saving workout entry:", error);
      showToast(DASHBOARD_ERROR_MESSAGES.SAVE_WORKOUT_ENTRY_FAILED, 'error');
      return false;
    } finally {
      setSavingWorkout(false);
    }
  };

  const saveWorkoutSession = async (workoutEntries: WorkoutEntry[]) => {
    if (!selectedPerson) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_REQUIRED, 'error');
      return false;
    }

    const validExercises = workoutEntries.filter(ex => ex.exercise_id > 0);
    if (validExercises.length === 0) {
      showToast(DASHBOARD_WARNING_MESSAGES.NO_VALID_EXERCISES, 'error');
      return false;
    }

    setSavingSession(true);
    try {
      console.log("Saving workout session with exercises:", validExercises);
      
      // First, delete existing entries for this date and person
      const selectedDate = validExercises[0].date;
      const existingEntries = workoutData.filter(entry => entry.date === selectedDate);
      console.log("Existing entries to delete:", existingEntries);
      
      for (const entry of existingEntries) {
        if (entry.id) {
          console.log("Deleting existing entry:", entry.id);
          await WorkoutService.deleteWorkoutEntry(entry.id);
        }
      }
      
      // Then create new entries
      for (let i = 0; i < validExercises.length; i++) {
        const exercise = validExercises[i];
        const workoutEntry = {
          person_id: selectedPerson.id!,
          exercise_id: exercise.exercise_id,
          date: selectedDate,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          notes: exercise.notes,
          order: i,
          group_number: exercise.group_number
        };

        console.log("Creating workout entry:", workoutEntry);
        await WorkoutService.createWorkoutEntry(workoutEntry);
      }
      
      showToast(DASHBOARD_SUCCESS_MESSAGES.SESSION_SAVED, 'success');
      
      // Refresh workout data
      await refreshWorkoutData(selectedPerson.id!);
      
      return true;
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_SAVE_WORKOUT_SESSION, error);
      showToast(DASHBOARD_ERROR_MESSAGES.SAVE_SESSION_FAILED, 'error');
      return false;
    } finally {
      setSavingSession(false);
    }
  };

  const deleteWorkoutEntry = async (id: number) => {
    if (!selectedPerson) return false;

    setDeletingWorkout(true);
    try {
      await WorkoutService.deleteWorkoutEntry(id);
      await refreshWorkoutData(selectedPerson.id!);
      showToast(DASHBOARD_SUCCESS_MESSAGES.WORKOUT_DELETED, 'success');
      return true;
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_DELETE_WORKOUT, error);
      showToast(DASHBOARD_ERROR_MESSAGES.DELETE_WORKOUT_FAILED, 'error');
      return false;
    } finally {
      setDeletingWorkout(false);
    }
  };

  const reorderExercises = async (exerciseOrders: Array<{ id: number; order: number }>) => {
    try {
      await WorkoutService.reorderExercises(exerciseOrders);
      
      // Refresh workout data
      if (selectedPerson) {
        await refreshWorkoutData(selectedPerson.id!);
      }
      return true;
    } catch (error) {
      console.error("Error reordering exercises:", error);
      showToast(DASHBOARD_ERROR_MESSAGES.REORDER_EXERCISES_FAILED, 'error');
      return false;
    }
  };

  return {
    // State
    savingWorkout,
    savingSession,
    deletingWorkout,
    
    // Actions
    saveWorkoutEntry,
    saveWorkoutSession,
    deleteWorkoutEntry,
    reorderExercises
  };
}; 