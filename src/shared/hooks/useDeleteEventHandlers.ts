import { WorkoutEntryWithDetails } from '../types/dashboard';

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
    await deleteWorkoutEntry(id);
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