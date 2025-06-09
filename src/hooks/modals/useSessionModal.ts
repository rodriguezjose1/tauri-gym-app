import { useState } from 'react';
import { WorkoutEntryForm, WorkoutSessionForm, WorkoutEntryWithDetails } from '../../types/dashboard';

export const useSessionModal = () => {
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState<WorkoutSessionForm>({
    exercises: [{
      exercise_id: 0,
      sets: 1,
      reps: 1,
      weight: 0,
      notes: "",
      order: 0,
      group_number: 1
    }]
  });

  const openSessionModal = (date: string, existingExercises?: WorkoutEntryWithDetails[]) => {
    if (existingExercises && existingExercises.length > 0) {
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
      
      setSessionForm({ exercises: exerciseForms });
    } else {
      // Start with empty session form
      setSessionForm({
        exercises: [{
          exercise_id: 0,
          sets: 1,
          reps: 1,
          weight: 0,
          notes: "",
          order: 0,
          group_number: 1
        }]
      });
    }
    
    setShowSessionModal(true);
  };

  const closeSessionModal = () => {
    setShowSessionModal(false);
    setSessionForm({
      exercises: [{
        exercise_id: 0,
        sets: 1,
        reps: 1,
        weight: 0,
        notes: "",
        order: 0,
        group_number: 1
      }]
    });
  };

  const updateSessionExercise = (index: number, field: keyof WorkoutEntryForm, value: any) => {
    const updatedExercises = [...sessionForm.exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setSessionForm({ exercises: updatedExercises });
  };

  const addExerciseToSession = () => {
    setSessionForm({
      exercises: [...sessionForm.exercises, {
        exercise_id: 0,
        sets: 1,
        reps: 1,
        weight: 0,
        notes: "",
        order: sessionForm.exercises.length,
        group_number: 1
      }]
    });
  };

  const deleteSessionExercise = (index: number) => {
    const updatedExercises = sessionForm.exercises.filter((_, i) => i !== index);
    setSessionForm({ exercises: updatedExercises });
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
    deleteSessionExercise,
    loadRoutineToSessionForm
  };
}; 