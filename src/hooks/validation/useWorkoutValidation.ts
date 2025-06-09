import { Person, WorkoutEntryForm } from '../../types/dashboard';
import { DASHBOARD_ERROR_MESSAGES } from '../../constants/errorMessages';

interface UseWorkoutValidationProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useWorkoutValidation = ({ showToast }: UseWorkoutValidationProps) => {
  
  const validatePersonAndDate = (selectedPerson: Person | null, selectedDate: string): boolean => {
    if (!selectedPerson || !selectedDate) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return false;
    }
    return true;
  };

  const validateWorkoutEntry = (
    selectedPerson: Person | null, 
    selectedDate: string, 
    workoutForm: WorkoutEntryForm
  ): boolean => {
    if (!selectedPerson || !selectedDate || !workoutForm.exercise_id) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return false;
    }
    return true;
  };

  const validatePerson = (selectedPerson: Person | null): boolean => {
    if (!selectedPerson) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_REQUIRED, 'error');
      return false;
    }
    return true;
  };

  const validateRoutineSelection = (routineId: number | null, date: string): boolean => {
    if (!routineId || !date) {
      showToast("Por favor selecciona una rutina y una fecha", 'error');
      return false;
    }
    return true;
  };

  return {
    validatePersonAndDate,
    validateWorkoutEntry,
    validatePerson,
    validateRoutineSelection
  };
}; 