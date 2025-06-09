interface UseDeleteEventHandlersProps {
  workoutToDelete: number | null;
  deleteWorkoutEntry: (id: number) => Promise<boolean>;
  openDeleteModal: (id: number) => void;
  closeDeleteModal: () => void;
}

export const useDeleteEventHandlers = ({
  workoutToDelete,
  deleteWorkoutEntry,
  openDeleteModal,
  closeDeleteModal
}: UseDeleteEventHandlersProps) => {

  const handleDeleteWorkoutEntry = async (id: number) => {
    openDeleteModal(id);
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