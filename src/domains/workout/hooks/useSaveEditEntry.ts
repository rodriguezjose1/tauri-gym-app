import { EditWorkoutEntryForm } from '../../../shared/types/dashboard';
import { DASHBOARD_ERROR_MESSAGES } from "../../../shared/constants";

interface UseSaveEditEntryProps {
  editForm: EditWorkoutEntryForm;
  updateWorkoutEntry: (workoutEntry: any) => Promise<boolean>;
  closeEditModal: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useSaveEditEntry = ({
  editForm,
  updateWorkoutEntry,
  closeEditModal,
  showToast
}: UseSaveEditEntryProps) => {

  const handleSaveEditEntry = async () => {
    if (!editForm.person_id || !editForm.date || !editForm.exercise_id || !editForm.id) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return;
    }

    const success = await updateWorkoutEntry({
      id: editForm.id,
      person_id: editForm.person_id,
      exercise_id: editForm.exercise_id,
      date: editForm.date,
      sets: editForm.sets,
      reps: editForm.reps,
      weight: editForm.weight,
      notes: editForm.notes,
      order_index: editForm.order_index,
      group_number: editForm.group_number
    });
    
    if (success) {
      closeEditModal();
    }
  };

  return { handleSaveEditEntry };
}; 