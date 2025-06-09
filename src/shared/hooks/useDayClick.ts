import { WorkoutEntryForm } from '../../types/dashboard';

interface UseDayClickProps {
  selectedPerson: any;
  workoutData: any[];
  setSelectedDate: (date: string) => void;
  openSessionModal: (date: string, exercises: any[]) => void;
  loadRoutineToSessionForm: (exercises: WorkoutEntryForm[]) => void;
}

export const useDayClick = ({
  selectedPerson,
  workoutData,
  setSelectedDate,
  openSessionModal,
  loadRoutineToSessionForm
}: UseDayClickProps) => {

  const handleDayClick = (date: string) => {
    if (!selectedPerson) return;
    
    setSelectedDate(date);
    
    // Find existing exercises for this date
    const existingExercises = workoutData.filter(entry => entry.date === date);
    
    if (existingExercises.length > 0) {
      // Load existing exercises into session form
      const exerciseForms: WorkoutEntryForm[] = existingExercises.map(exercise => ({
        exercise_id: exercise.exercise_id,
        sets: exercise.sets || 1,
        reps: exercise.reps || 1,
        weight: exercise.weight || 0,
        notes: exercise.notes || "",
        order: exercise.order || 0,
        group_number: exercise.group_number || 1
      }));
      
      loadRoutineToSessionForm(exerciseForms);
    } else {
      // Start with empty session form
      loadRoutineToSessionForm([{
        exercise_id: 0,
        sets: 1,
        reps: 1,
        weight: 0,
        notes: "",
        order: 0,
        group_number: 1
      }]);
    }
    
    openSessionModal(date, []);
  };

  return { handleDayClick };
}; 