import { useState } from 'react';
import { WorkoutEntryForm, WorkoutSessionForm, WorkoutEntryWithDetails } from '../types/dashboard';

export const useDashboardModals = () => {
  // Workout Entry Modal State
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutForm, setWorkoutForm] = useState<WorkoutEntryForm>({
    exercise_id: 0,
    sets: 1,
    reps: 1,
    weight: 0,
    notes: "",
    order: 0,
    group_number: 1
  });

  // Workout Session Modal State
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

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<number | null>(null);

  // Load from routine modal state
  const [showLoadRoutineModal, setShowLoadRoutineModal] = useState(false);
  const [selectedRoutineForLoad, setSelectedRoutineForLoad] = useState<number | null>(null);
  const [selectedDateForRoutine, setSelectedDateForRoutine] = useState<string>("");
  const [selectedGroupForRoutine, setSelectedGroupForRoutine] = useState<number>(1);

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title?: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type?: 'warning' | 'info' | 'success' | 'error';
  }>({ message: '', onConfirm: () => {} });

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Selected date state
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Modal actions
  const openWorkoutModal = (date: string) => {
    setSelectedDate(date);
    setWorkoutForm({
      exercise_id: 0,
      sets: 1,
      reps: 1,
      weight: 0,
      notes: "",
      order: 0,
      group_number: 1
    });
    setShowWorkoutModal(true);
  };

  const closeWorkoutModal = () => {
    setShowWorkoutModal(false);
    setSelectedDate("");
    setWorkoutForm({
      exercise_id: 0,
      sets: 1,
      reps: 1,
      weight: 0,
      notes: "",
      order: 0,
      group_number: 1
    });
  };

  const openSessionModal = (date: string, existingExercises?: WorkoutEntryWithDetails[]) => {
    setSelectedDate(date);
    
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
    setSelectedDate("");
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

  const openDeleteModal = (workoutId: number) => {
    setWorkoutToDelete(workoutId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setWorkoutToDelete(null);
  };

  const openLoadRoutineModal = (date?: string) => {
    setSelectedDateForRoutine(date || selectedDate);
    setShowLoadRoutineModal(true);
  };

  const closeLoadRoutineModal = () => {
    setShowLoadRoutineModal(false);
    setSelectedRoutineForLoad(null);
    setSelectedDateForRoutine("");
    setSelectedGroupForRoutine(1);
  };

  const showConfirm = (message: string, options?: { 
    title?: string; 
    confirmText?: string;
    type?: 'warning' | 'info' | 'success' | 'error';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      const handleConfirm = () => {
        setShowConfirmModal(false);
        resolve(true);
      };
      
      const handleCancel = () => {
        setShowConfirmModal(false);
        resolve(false);
      };
      
      setConfirmModalData({
        message,
        title: options?.title,
        confirmText: options?.confirmText,
        type: options?.type || 'warning',
        onConfirm: handleConfirm,
        onCancel: handleCancel
      });
      setShowConfirmModal(true);
    });
  };

  // Form update functions
  const updateWorkoutForm = (field: keyof WorkoutEntryForm, value: any) => {
    setWorkoutForm(prev => ({
      ...prev,
      [field]: value
    }));
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
    // Modal states
    showWorkoutModal,
    showSessionModal,
    showDeleteModal,
    showLoadRoutineModal,
    showConfirmModal,
    showSettingsModal,
    
    // Form states
    workoutForm,
    sessionForm,
    selectedDate,
    workoutToDelete,
    selectedRoutineForLoad,
    selectedDateForRoutine,
    selectedGroupForRoutine,
    confirmModalData,
    
    // Modal actions
    openWorkoutModal,
    closeWorkoutModal,
    openSessionModal,
    closeSessionModal,
    openDeleteModal,
    closeDeleteModal,
    openLoadRoutineModal,
    closeLoadRoutineModal,
    showConfirm,
    setShowSettingsModal,
    setShowConfirmModal,
    
    // Form actions
    updateWorkoutForm,
    updateSessionExercise,
    addExerciseToSession,
    deleteSessionExercise,
    loadRoutineToSessionForm,
    setSelectedRoutineForLoad,
    setSelectedDateForRoutine,
    setSelectedGroupForRoutine,
    setSelectedDate,
    setShowLoadRoutineModal
  };
}; 