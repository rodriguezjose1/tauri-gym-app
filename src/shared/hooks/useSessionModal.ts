import { useState } from 'react';
import { WorkoutSessionForm, WorkoutEntryForm, WorkoutEntryWithDetails } from '../types/dashboard';

export const useSessionModal = (showToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void) => {
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState<WorkoutSessionForm>({
    exercises: []
  });

  const openSessionModal = (date: string, existingExercises?: WorkoutEntryWithDetails[]) => {
    if (existingExercises && existingExercises.length > 0) {
      // Convert existing exercises to WorkoutEntryForm
      const exerciseForms: WorkoutEntryForm[] = existingExercises.map((exercise, index) => ({
        exercise_id: exercise.exercise_id,
        sets: exercise.sets || 1,
        reps: exercise.reps || 1,
        weight: exercise.weight || 0,
        notes: exercise.notes || "",
        order_index: exercise.order_index || index,
        group_number: exercise.group_number || 1
      }));
      
      setSessionForm({ exercises: exerciseForms });
    } else {
      // Start with one empty exercise
      setSessionForm({
        exercises: [{
          exercise_id: 0,
          sets: 1,
          reps: 1,
          weight: 0,
          notes: "",
          order_index: 0,
          group_number: 1
        }]
      });
    }
    setShowSessionModal(true);
  };

  const closeSessionModal = () => {
    setShowSessionModal(false);
    setSessionForm({ exercises: [] });
  };

  const updateSessionExercise = (index: number, field: keyof WorkoutEntryForm, value: any) => {
    const updatedExercises = [...sessionForm.exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    
    setSessionForm({ exercises: updatedExercises });
  };

  const addExerciseToSession = () => {
    setSessionForm((prev: WorkoutSessionForm) => ({
      exercises: [
        ...prev.exercises,
        {
          exercise_id: 0,
          sets: 1,
          reps: 1,
          weight: 0,
          notes: "",
          order_index: sessionForm.exercises.length,
          group_number: 1 // Default to group 1, user can change it
        }
      ]
    }));
  };

  const deleteExerciseFromSession = (index: number) => {
    if (sessionForm.exercises.length > 1) {
      const updatedExercises = sessionForm.exercises.filter((_: WorkoutEntryForm, i: number) => i !== index);
      setSessionForm({ exercises: updatedExercises });
    }
  };

  const loadRoutineToSessionForm = (exerciseForms: WorkoutEntryForm[]) => {
    setSessionForm({ exercises: exerciseForms });
  };

  return {
    showSessionModal,
    sessionForm,
    openSessionModal,
    closeSessionModal,
    updateSessionExercise,
    addExerciseToSession,
    deleteExerciseFromSession,
    loadRoutineToSessionForm
  };
}; 