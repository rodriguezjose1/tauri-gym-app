import { useState } from 'react';
import { WorkoutService } from '../services/workoutService';
import { WorkoutEntry, WorkoutEntryWithDetails, Person } from '../../../shared/types/dashboard';
import { DASHBOARD_ERROR_MESSAGES, DASHBOARD_SUCCESS_MESSAGES } from '../../../shared/constants/errorMessages';

interface UseWorkoutOperationsProps {
  selectedPerson: Person | null;
  workoutData: WorkoutEntryWithDetails[];
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
  const [savingEdit, setSavingEdit] = useState(false);
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

  const updateWorkoutEntry = async (workoutEntry: WorkoutEntry) => {
    if (!selectedPerson || !workoutEntry.date || !workoutEntry.exercise_id || !workoutEntry.id) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return false;
    }

    setSavingEdit(true);
    try {
      console.log("Updating workout entry:", workoutEntry);
      await WorkoutService.updateWorkoutEntry(workoutEntry);
      
      showToast("Ejercicio actualizado exitosamente", 'success');
      
      // Refresh workout data
      await refreshWorkoutData(selectedPerson.id!);
      
      return true;
    } catch (error) {
      console.error("Error updating workout entry:", error);
      
      // Extract the error message - it could be a string or Error object
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = "Error al actualizar el ejercicio";
      }
      
      // Check if it's a group validation error and use the backend message directly
      if (errorMessage.includes('⚠️')) {
        showToast(errorMessage, 'error');
      } else {
        showToast("Error al actualizar el ejercicio", 'error');
      }
      
      return false;
    } finally {
      setSavingEdit(false);
    }
  };

  const saveWorkoutSession = async (workoutEntries: WorkoutEntry[]) => {
    if (!selectedPerson) return false;

    setSavingSession(true);
    try {
      await WorkoutService.saveWorkoutSessionMerge(
        selectedPerson.id!,
        workoutEntries[0].date,
        workoutEntries.map(entry => ({
          exercise_id: entry.exercise_id,
          sets: entry.sets || 1,
          reps: entry.reps || 1,
          weight: entry.weight || 0,
          notes: entry.notes || "",
          order_index: entry.order_index,
          group_number: entry.group_number
        }))
      );
      
      await refreshWorkoutData(selectedPerson.id!);
      showToast(DASHBOARD_SUCCESS_MESSAGES.SESSION_SAVED, 'success');
      return true;
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_SAVE_WORKOUT_SESSION, error);
      
      // Extract the error message - it could be a string or Error object
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = DASHBOARD_ERROR_MESSAGES.SAVE_SESSION_FAILED;
      }
      
      // Check if it's a group validation error and use the backend message directly
      if (errorMessage.includes('⚠️')) {
        showToast(errorMessage, 'error');
      } else {
        showToast(DASHBOARD_ERROR_MESSAGES.SAVE_SESSION_FAILED, 'error');
      }
      
      return false;
    } finally {
      setSavingSession(false);
    }
  };

  const deleteWorkoutEntry = async (id: number) => {
    if (!selectedPerson) return false;

    setDeletingWorkout(true);
    try {
      // Find the workout entry to get person and date for renumbering
      const workoutToDelete = workoutData.find(entry => entry.id === id);
      
      // Delete the workout entry
      await WorkoutService.deleteWorkoutEntry(id);
      
      // If we found the workout entry, renumber groups for that person and date
      if (workoutToDelete) {
        await WorkoutService.renumberWorkoutGroups(workoutToDelete.person_id, workoutToDelete.date);
      }
      
      // Refresh the data to show updated group numbers
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

  return {
    // State
    savingWorkout,
    savingSession,
    savingEdit,
    deletingWorkout,
    
    // Actions
    saveWorkoutEntry,
    updateWorkoutEntry,
    saveWorkoutSession,
    deleteWorkoutEntry
  };
}; 