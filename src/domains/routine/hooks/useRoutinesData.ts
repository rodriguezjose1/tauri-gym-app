import { useState, useEffect } from 'react';
import { RoutineOption } from '../../../shared/types/dashboard';
import { RoutineService } from '../../../services';

export const useRoutinesData = () => {
  const [routines, setRoutines] = useState<RoutineOption[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load routines without exercise count (optimized)
  const loadRoutines = async () => {
    setRoutinesLoading(true);
    try {
      const result = await RoutineService.listRoutinesPaginated(1, 100);
      
      // Transform routines without loading exercise count (lazy loading)
      const routineOptions: RoutineOption[] = result.map((routine: any) => ({
        id: routine.id,
        name: routine.name,
        code: routine.code,
        exerciseCount: 0 // Will be loaded on demand if needed
      }));
      
      setRoutines(routineOptions);
    } catch (error) {
      console.error('Error loading routines:', error);
      setRoutines([]);
    } finally {
      setRoutinesLoading(false);
    }
  };

  // Load exercise count for a specific routine (lazy loading)
  const loadExerciseCount = async (routineId: number) => {
    try {
      const routineWithExercises = await RoutineService.getRoutineWithExercises(routineId);
      const exerciseCount = routineWithExercises?.exercises?.length || 0;
      
      // Update the routine with exercise count
      setRoutines(prev => prev.map(routine => 
        routine.id === routineId 
          ? { ...routine, exerciseCount }
          : routine
      ));
      
      return exerciseCount;
    } catch (error) {
      console.error(`Error loading exercise count for routine ${routineId}:`, error);
      return 0;
    }
  };

  // Get routine by ID
  const getRoutineById = (routineId: number): RoutineOption | undefined => {
    return routines.find(routine => routine.id === routineId);
  };

  // Initialize data on mount
  useEffect(() => {
    loadRoutines();
  }, []);

  return {
    routines,
    routinesLoading,
    error,
    loadRoutines,
    loadExerciseCount,
    getRoutineById
  };
}; 