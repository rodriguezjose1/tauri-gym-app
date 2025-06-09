import { WorkoutEntryForm } from '../../types/dashboard';

interface UseDayRightClickProps {
  selectedPerson: any;
  setSelectedDate: (date: string) => void;
  openWorkoutModal: (date: string) => void;
  updateWorkoutForm: (field: keyof WorkoutEntryForm, value: any) => void;
}

export const useDayRightClick = ({
  selectedPerson,
  setSelectedDate,
  openWorkoutModal,
  updateWorkoutForm
}: UseDayRightClickProps) => {

  const handleDayRightClick = (e: React.MouseEvent, date: string) => {
    e.preventDefault();
    if (!selectedPerson) return;
    
    setSelectedDate(date);
    updateWorkoutForm('exercise_id', 0);
    updateWorkoutForm('sets', 1);
    updateWorkoutForm('reps', 1);
    updateWorkoutForm('weight', 0);
    updateWorkoutForm('notes', "");
    updateWorkoutForm('order', 0);
    updateWorkoutForm('group_number', 1);
    openWorkoutModal(date);
  };

  return { handleDayRightClick };
}; 