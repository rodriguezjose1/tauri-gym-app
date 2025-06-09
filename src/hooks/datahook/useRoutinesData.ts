import { useState, useEffect } from 'react';
import { RoutineOption } from '../../types/dashboard';
import { RoutineService } from '../../services/routineService';

export const useRoutinesData = () => {
  const [routines, setRoutines] = useState<RoutineOption[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load routines
  const loadRoutines = async () => {
    setRoutinesLoading(true);
    setError(null);
    try {
      console.log("Fetching routines...");
      const result = await RoutineService.listRoutinesPaginated(1, 100);
      console.log("Routines fetched:", result);
      
      // Transform routines to include exercise count
      const routineOptions: RoutineOption[] = await Promise.all(
        (result as any[]).map(async (routine) => {
          try {
            const routineWithExercises = await RoutineService.getRoutineWithExercises(routine.id);
            return {
              id: routine.id,
              name: routine.name,
              code: routine.code,
              exerciseCount: routineWithExercises?.exercises?.length || 0
            };
          } catch (error) {
            console.error(`Error fetching exercises for routine ${routine.id}:`, error);
            return {
              id: routine.id,
              name: routine.name,
              code: routine.code,
              exerciseCount: 0
            };
          }
        })
      );
      
      setRoutines(routineOptions);
    } catch (error) {
      console.error('Error loading routines:', error);
      setError('Error loading routines');
    } finally {
      setRoutinesLoading(false);
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
    // Data
    routines,
    
    // Loading states
    routinesLoading,
    error,
    
    // Actions
    loadRoutines,
    setRoutines,
    
    // Utilities
    getRoutineById
  };
}; 