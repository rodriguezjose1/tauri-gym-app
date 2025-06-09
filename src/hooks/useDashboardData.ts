import { useState, useEffect } from 'react';
import { Person, Exercise, Routine, WorkoutEntryWithDetails, RoutineOption } from '../types/dashboard';
import { PersonService } from '../services/personService';
import { ExerciseService } from '../services/exerciseService';
import { RoutineService } from '../services/routineService';
import { WorkoutService } from '../services/workoutService';
import { DASHBOARD_UI_LABELS } from '../constants/errorMessages';

export const useDashboardData = () => {
  // Initialize selectedPerson from sessionStorage (same as original)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(() => {
    const savedPerson = sessionStorage.getItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY);
    return savedPerson ? JSON.parse(savedPerson) : null;
  });
  
  const [people, setPeople] = useState<Person[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<RoutineOption[]>([]);
  const [workoutData, setWorkoutData] = useState<WorkoutEntryWithDetails[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  
  // Loading states
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [routinesLoading, setRoutinesLoading] = useState(false);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load people
  const loadPeople = async () => {
    setPeopleLoading(true);
    setError(null);
    try {
      const result = await PersonService.getPersonsPaginated(1, 100);
      setPeople(result);
    } catch (error) {
      console.error('Error loading people:', error);
      setError('Error loading people');
    } finally {
      setPeopleLoading(false);
    }
  };

  // Load exercises (same as original)
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
      // Try to fetch with pagination as fallback (same as original)
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

  // Load routines for a specific person
  const loadRoutines = async (personId?: number) => {
    setRoutinesLoading(true);
    setError(null);
    try {
      console.log("Fetching routines...");
      const result = await RoutineService.listRoutinesPaginated(1, 100);
      console.log("Routines fetched:", result);
      
      // Transform routines to include exercise count (same as original)
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

  // Load workout entries (same logic as original fetchWorkoutData)
  const loadWorkoutEntries = async (personId?: number, startDate?: string, endDate?: string) => {
    const targetPersonId = personId || selectedPerson?.id;
    
    if (!targetPersonId) return;

    setWorkoutLoading(true);
    setError(null);
    try {
      console.log("Fetching workout data for personId:", targetPersonId, "startDate:", startDate, "endDate:", endDate);
      
      let result;
      if (startDate && endDate) {
        // Use date range command when dates are provided
        result = await WorkoutService.getWorkoutEntriesByPersonAndDateRange(targetPersonId, startDate, endDate);
      } else {
        // Fallback to get all entries for the person (same as original)
        result = await WorkoutService.getWorkoutEntriesByPerson(targetPersonId);
      }
      
      console.log("Workout data result:", result);
      console.log("Result type:", typeof result);
      console.log("Result length:", Array.isArray(result) ? result.length : "Not an array");
      
      setWorkoutData(result as WorkoutEntryWithDetails[]);
    } catch (error) {
      console.error('Error loading workout entries:', error);
      console.error("Full error details:", error);
      
      // Try fallback if the date range command failed (same as original)
      if (startDate && endDate) {
        try {
          console.log("Trying fallback to get_workout_entries_by_person");
          const fallbackResult = await WorkoutService.getWorkoutEntriesByPerson(targetPersonId);
          console.log("Fallback result:", fallbackResult);
          setWorkoutData(fallbackResult as WorkoutEntryWithDetails[]);
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
        }
      }
      setError('Error loading workout entries');
      setWorkoutData([]);
    } finally {
      setWorkoutLoading(false);
    }
  };

  // Refresh workout data
  const refreshWorkoutData = async () => {
    if (selectedPerson?.id) {
      await loadWorkoutEntries(selectedPerson.id);
    }
  };

  // Handle person selection (same logic as original)
  const handlePersonSelect = async (person: Person | null) => {
    setSelectedPerson(person);
    if (person?.id) {
      // Immediately load workout data when person is selected (same as original)
      await loadWorkoutEntries(person.id);
    } else {
      setWorkoutData([]);
    }
  };

  // Handle date selection
  const handleDateSelect = async (date: string) => {
    setSelectedDate(date);
    // Don't automatically load data on date change, let the component handle it
  };

  // Get workout entries for a specific date
  const getWorkoutEntriesForDate = (date: string): WorkoutEntryWithDetails[] => {
    return workoutData.filter(entry => {
      const entryDate = new Date(entry.date).toISOString().split('T')[0];
      return entryDate === date;
    });
  };

  // Get exercises by IDs
  const getExercisesByIds = (exerciseIds: number[]): Exercise[] => {
    return exercises.filter(exercise => exercise.id !== undefined && exerciseIds.includes(exercise.id));
  };

  // Get exercise by ID
  const getExerciseById = (exerciseId: number): Exercise | undefined => {
    return exercises.find(exercise => exercise.id === exerciseId);
  };

  // Get routine by ID
  const getRoutineById = (routineId: number): RoutineOption | undefined => {
    return routines.find(routine => routine.id === routineId);
  };

  // Initialize data on mount (same as original)
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          loadPeople(),
          loadExercises(),
          loadRoutines()
        ]);
        
        // If there's a selected person from session storage, fetch their workout data (same as original)
        if (selectedPerson?.id) {
          await loadWorkoutEntries(selectedPerson.id);
        }
      } catch (error) {
        console.error("Error initializing dashboard data:", error);
      }
    };

    initializeData();
  }, []);

  // Save selected person to session storage when it changes (same as original)
  useEffect(() => {
    if (selectedPerson) {
      sessionStorage.setItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY, JSON.stringify(selectedPerson));
    } else {
      sessionStorage.removeItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY);
    }
  }, [selectedPerson]);

  return {
    // Data states
    people,
    exercises,
    routines,
    workoutData,
    selectedPerson,
    selectedDate,
    
    // Loading states
    peopleLoading,
    exercisesLoading,
    routinesLoading,
    workoutLoading,
    error,
    
    // Data actions
    loadPeople,
    loadExercises,
    loadRoutines,
    loadWorkoutEntries,
    refreshWorkoutData,
    
    // Selection handlers
    handlePersonSelect,
    handleDateSelect,
    setSelectedPerson,
    setSelectedDate,
    
    // Utility functions
    getWorkoutEntriesForDate,
    getExercisesByIds,
    getExerciseById,
    getRoutineById,
    
    // State setters for direct manipulation if needed
    setPeople,
    setExercises,
    setRoutines,
    setWorkoutData
  };
}; 