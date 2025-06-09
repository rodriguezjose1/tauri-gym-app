import { WorkoutEntryForm } from '../../types/dashboard';

interface UseAddWorkoutProps {
  selectedPerson: any;
  setSelectedDate: (date: string) => void;
  openSessionModal: (date: string, exercises: any[]) => void;
  loadRoutineToSessionForm: (exercises: WorkoutEntryForm[]) => void;
}

export const useAddWorkout = ({
  selectedPerson,
  setSelectedDate,
  openSessionModal,
  loadRoutineToSessionForm
}: UseAddWorkoutProps) => {

  const handleAddWorkoutClick = (date: string) => {
    if (!selectedPerson) return;
    
    setSelectedDate(date);
    
    // Always start with empty session form when clicking "Agregar"
    loadRoutineToSessionForm([{
      exercise_id: 0,
      sets: 1,
      reps: 1,
      weight: 0,
      notes: "",
      order: 0,
      group_number: 1
    }]);
    
    openSessionModal(date, []);
  };

  return { handleAddWorkoutClick };
}; 