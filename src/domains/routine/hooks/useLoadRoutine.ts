import { useState } from 'react';
import { WorkoutEntryForm } from '../../types/dashboard';

interface UseLoadRoutineProps {
  loadRoutineToSession: (routineId: number) => Promise<WorkoutEntryForm[] | null>;
  loadRoutineToSessionForm: (exercises: WorkoutEntryForm[]) => void;
}

export const useLoadRoutine = ({
  loadRoutineToSession,
  loadRoutineToSessionForm
}: UseLoadRoutineProps) => {
  const [loadingRoutine, setLoadingRoutine] = useState(false);

  const handleLoadRoutine = async (routineId: number) => {
    setLoadingRoutine(true);
    try {
      const exerciseForms = await loadRoutineToSession(routineId);
      if (exerciseForms) {
        loadRoutineToSessionForm(exerciseForms);
      }
    } finally {
      setLoadingRoutine(false);
    }
  };

  return { 
    handleLoadRoutine,
    loadingRoutine 
  };
}; 