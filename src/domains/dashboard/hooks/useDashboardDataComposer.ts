import { useEffect, useState } from 'react';
import { usePeopleData } from '../../person/hooks/usePeopleData';
import { useExercisesData } from '../../exercise/hooks/useExercisesData';
import { useRoutinesData } from '../../routine/hooks/useRoutinesData';
import { useWorkoutData } from '../../workout/hooks/useWorkoutData';

export const useDashboardDataComposer = () => {
  // Atomic data hooks
  const peopleHook = usePeopleData();
  const exercisesHook = useExercisesData();
  const routinesHook = useRoutinesData();
  const workoutHook = useWorkoutData({ selectedPerson: peopleHook.selectedPerson });

  // Lazy loading state for exercises - not needed since ExerciseSearch handles its own loading
  // const [exercisesLoaded, setExercisesLoaded] = useState(false);

  // Load exercises only when needed (when Dashboard is actually being used)
  // const loadExercisesIfNeeded = async () => {
  //   if (!exercisesLoaded) {
  //     await exercisesHook.loadExercises();
  //     setExercisesLoaded(true);
  //   }
  // };

  // Enhanced person selection handler that also loads workout data
  const handlePersonSelect = async (person: any) => {
    peopleHook.handlePersonSelect(person);
    if (person?.id) {
      // Load workout data when person is selected
      await workoutHook.loadWorkoutEntries(person.id);
    } else {
      workoutHook.setWorkoutData([]);
    }
  };

  // Load workout data when selected person changes
  useEffect(() => {
    if (peopleHook.selectedPerson?.id) {
      workoutHook.loadWorkoutEntries(peopleHook.selectedPerson.id);
    }
  }, [peopleHook.selectedPerson?.id]);

  return {
    // Data states - Combined from all hooks
    people: peopleHook.people,
    exercises: exercisesHook.exercises,
    routines: routinesHook.routines,
    workoutData: workoutHook.workoutData,
    selectedPerson: peopleHook.selectedPerson,
    selectedDate: workoutHook.selectedDate,
    
    // Loading states - Combined
    peopleLoading: peopleHook.peopleLoading,
    exercisesLoading: exercisesHook.exercisesLoading,
    routinesLoading: routinesHook.routinesLoading,
    workoutLoading: workoutHook.workoutLoading,
    error: peopleHook.error || exercisesHook.error || routinesHook.error || workoutHook.error,
    
    // Data actions - Delegated to specific hooks
    loadPeople: peopleHook.loadPeople,
    loadExercises: exercisesHook.loadExercises, // Keep the method available but don't auto-load
    loadRoutines: routinesHook.loadRoutines,
    loadWorkoutEntries: workoutHook.loadWorkoutEntries,
    refreshWorkoutData: workoutHook.refreshWorkoutData,
    
    // Selection handlers - Enhanced
    handlePersonSelect,
    handleDateSelect: workoutHook.handleDateSelect,
    setSelectedPerson: peopleHook.setSelectedPerson,
    setSelectedDate: workoutHook.setSelectedDate,
    
    // Utility functions - Delegated
    getWorkoutEntriesForDate: workoutHook.getWorkoutEntriesForDate,
    getExercisesByIds: exercisesHook.getExercisesByIds,
    getExerciseById: exercisesHook.getExerciseById,
    getRoutineById: routinesHook.getRoutineById,
    
    // State setters - Delegated
    setPeople: peopleHook.setPeople,
    setExercises: exercisesHook.setExercises,
    setRoutines: routinesHook.setRoutines,
    setWorkoutData: workoutHook.setWorkoutData
  };
}; 