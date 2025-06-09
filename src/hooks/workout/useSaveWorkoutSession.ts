import { DASHBOARD_ERROR_MESSAGES } from '../../constants/errorMessages';

interface UseSaveWorkoutSessionProps {
  selectedPerson: any;
  selectedDate: string;
  sessionForm: any;
  saveWorkoutSession: (entries: any[]) => Promise<boolean>;
  closeSessionModal: () => void;
  setSelectedDate: (date: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useSaveWorkoutSession = ({
  selectedPerson,
  selectedDate,
  sessionForm,
  saveWorkoutSession,
  closeSessionModal,
  setSelectedDate,
  showToast
}: UseSaveWorkoutSessionProps) => {

  const handleSaveWorkoutSession = async () => {
    if (!selectedPerson || !selectedDate) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return;
    }

    const workoutEntries = sessionForm.exercises.map((exercise: any, index: number) => ({
      ...exercise,
      person_id: selectedPerson.id!,
      date: selectedDate,
      order: index
    }));
    
    const success = await saveWorkoutSession(workoutEntries);
    
    if (success) {
      closeSessionModal();
      setSelectedDate("");
    }
  };

  return { handleSaveWorkoutSession };
}; 