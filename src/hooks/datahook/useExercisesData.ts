import { useState, useEffect } from 'react';
import { Exercise } from '../../shared/types/dashboard';
import { ExerciseService } from '../../services';

export const useExercisesData = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load exercises
  const loadExercises = async () => {
    setExercisesLoading(true);
    setError(null);
    try {
      console.log("Fetching exercises...");
      const result = await ExerciseService.getExercises();
      console.log("Exercises fetched:", result);
      setExercises(result as Exercise[]);
    } catch (error) {
      console.error('Error loading exercises:', error);
      // Try to fetch with pagination as fallback
      try {
        const fallbackResult = await ExerciseService.getExercisesPaginated(1, 100);
        console.log("Exercises fetched via pagination:", fallbackResult);
        setExercises(fallbackResult.exercises);
      } catch (fallbackError) {
        console.error('Error loading exercises with pagination:', fallbackError);
        setError('Error loading exercises');
      }
    } finally {
      setExercisesLoading(false);
    }
  };

  // Get exercise by ID
  const getExerciseById = (exerciseId: number): Exercise | undefined => {
    return exercises.find(exercise => exercise.id === exerciseId);
  };

  // Get exercises by IDs
  const getExercisesByIds = (exerciseIds: number[]): Exercise[] => {
    return exercises.filter(exercise => exercise.id !== undefined && exerciseIds.includes(exercise.id));
  };

  // Initialize data on mount
  useEffect(() => {
    loadExercises();
  }, []);

  return {
    // Data
    exercises,
    
    // Loading states
    exercisesLoading,
    error,
    
    // Actions
    loadExercises,
    setExercises,
    
    // Utilities
    getExerciseById,
    getExercisesByIds
  };
}; 