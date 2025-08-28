import { WorkoutEntryWithDetails } from '../types/dashboard';
import { DASHBOARD_SUCCESS_MESSAGES } from '../constants/errorMessages';

interface UseDeleteEventHandlersProps {
  workoutToDelete: number | null;
  deleteWorkoutEntry: (id: number) => Promise<boolean>;
  openDeleteModal: (id: number) => void;
  closeDeleteModal: () => void;
  workoutData?: WorkoutEntryWithDetails[];
  showToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useDeleteEventHandlers = ({
  workoutToDelete,
  deleteWorkoutEntry,
  openDeleteModal,
  closeDeleteModal,
  workoutData = [],
  showToast
}: UseDeleteEventHandlersProps) => {

  const handleDeleteWorkoutEntry = async (id: number) => {
    // Eliminar directamente sin mostrar modal de confirmación
    const success = await deleteWorkoutEntry(id);
    if (success) {
      showToast?.(DASHBOARD_SUCCESS_MESSAGES.WORKOUT_DELETED, 'success');
    }
  };

  const confirmDeleteWorkoutEntry = async () => {
    if (workoutToDelete) {
      const success = await deleteWorkoutEntry(workoutToDelete);
      if (success) {
        closeDeleteModal();
      }
    }
  };

  const cancelDeleteWorkoutEntry = () => {
    closeDeleteModal();
  };

  return {
    handleDeleteWorkoutEntry,
    confirmDeleteWorkoutEntry,
    cancelDeleteWorkoutEntry
  };
}; 