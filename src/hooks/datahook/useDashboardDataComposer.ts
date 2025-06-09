import { useEffect } from 'react';
import { usePeopleData } from './usePeopleData';
import { useExercisesData } from './useExercisesData';
import { useRoutinesData } from './useRoutinesData';
import { useWorkoutData } from './useWorkoutData';

export const useDashboardDataComposer = () => {
  // Atomic data hooks
  const peopleHook = usePeopleData();
  const exercisesHook = useExercisesData();
  const routinesHook = useRoutinesData();
  const workoutHook = useWorkoutData({ selectedPerson: peopleHook.selectedPerson });

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
    loadExercises: exercisesHook.loadExercises,
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