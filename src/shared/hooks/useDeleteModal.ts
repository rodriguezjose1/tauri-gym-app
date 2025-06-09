import { useState } from 'react';

export const useDeleteModal = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<number | null>(null);

  const openDeleteModal = (workoutId: number) => {
    setWorkoutToDelete(workoutId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setWorkoutToDelete(null);
  };

  return {
    showDeleteModal,
    workoutToDelete,
    openDeleteModal,
    closeDeleteModal
  };
}; 