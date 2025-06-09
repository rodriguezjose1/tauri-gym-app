import { WorkoutEntryForm } from '../../../shared/types/dashboard';
import { DASHBOARD_ERROR_MESSAGES } from "../../../shared/constants";

interface UseSaveWorkoutEntryProps {
  selectedPerson: any;
  selectedDate: string;
  workoutForm: WorkoutEntryForm;
  saveWorkoutEntry: (entry: any) => Promise<boolean>;
  closeWorkoutModal: () => void;
  setSelectedDate: (date: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useSaveWorkoutEntry = ({
  selectedPerson,
  selectedDate,
  workoutForm,
  saveWorkoutEntry,
  closeWorkoutModal,
  setSelectedDate,
  showToast
}: UseSaveWorkoutEntryProps) => {

  const handleSaveWorkoutEntry = async () => {
    if (!selectedPerson || !selectedDate || !workoutForm.exercise_id) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return;
    }

    const success = await saveWorkoutEntry({
      ...workoutForm,
      person_id: selectedPerson.id!,
      date: selectedDate
    });
    
    if (success) {
      closeWorkoutModal();
      setSelectedDate("");
    }
  };

  return { handleSaveWorkoutEntry };
}; 