import { useState, useEffect } from 'react';
import { Exercise } from '../../../shared/types/dashboard';
import { ExerciseService } from '../../../services';

export const useExercisesData = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load exercises
  const loadExercises = async () => {
    setExercisesLoading(true);
    try {
      const result = await ExerciseService.getExercises();
      setExercises(result);
    } catch (error) {
      console.error('Error loading exercises:', error);
      
      // Fallback: try pagination method
      try {
        const fallbackResult = await ExerciseService.getExercisesPaginated(1, 100);
        setExercises(fallbackResult.exercises);
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        setExercises([]);
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