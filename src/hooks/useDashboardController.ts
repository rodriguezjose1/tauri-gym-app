import { useState } from 'react';
import { Person, WorkoutEntryForm } from '../types/dashboard';
import { useDashboardData } from './useDashboardData';
import { useDashboardModals } from './useDashboardModals';
import { useWorkoutOperations } from './useWorkoutOperations';
import { useRoutineOperations } from './useRoutineOperations';
import { useToastNotifications } from './useToastNotifications';
import { DASHBOARD_ERROR_MESSAGES, DASHBOARD_SUCCESS_MESSAGES } from '../constants/errorMessages';

export const useDashboardController = () => {
  // Local loading states
  const [loadingRoutine, setLoadingRoutine] = useState(false);

  // Data management hook
  const {
    exercises,
    routines,
    workoutData,
    selectedPerson,
    selectedDate,
    handlePersonSelect: hookHandlePersonSelect,
    refreshWorkoutData,
    setWorkoutData,
    setSelectedPerson,
    setSelectedDate
  } = useDashboardData();

  // Modal management hook
  const {
    showWorkoutModal,
    showSessionModal,
    showDeleteModal,
    showLoadRoutineModal,
    showConfirmModal,
    showSettingsModal,
    workoutForm,
    sessionForm,
    workoutToDelete,
    selectedRoutineForLoad,
    selectedDateForRoutine,
    selectedGroupForRoutine,
    confirmModalData,
    openWorkoutModal,
    closeWorkoutModal,
    openSessionModal,
    closeSessionModal,
    openDeleteModal,
    closeDeleteModal,
    showConfirm,
    updateWorkoutForm,
    updateSessionExercise,
    addExerciseToSession,
    deleteSessionExercise,
    loadRoutineToSessionForm,
    setSelectedRoutineForLoad,
    setSelectedDateForRoutine,
    setSelectedGroupForRoutine,
    setShowLoadRoutineModal,
    setShowConfirmModal,
    setShowSettingsModal
  } = useDashboardModals();

  // Toast notifications
  const { notifications, addNotification, removeNotification } = useToastNotifications();

  // Helper function to show toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    addNotification(message, type);
  };

  // Workout operations hook
  const {
    saveWorkoutEntry,
    saveWorkoutSession,
    deleteWorkoutEntry,
    reorderExercises,
    savingWorkout,
    savingSession,
    deletingWorkout
  } = useWorkoutOperations({
    selectedPerson,
    workoutData,
    refreshWorkoutData,
    showToast
  });

  // Routine operations hook
  const {
    loadRoutineToSession,
    applyRoutineToDate
  } = useRoutineOperations({
    selectedPerson,
    workoutData,
    refreshWorkoutData,
    showToast,
    showConfirm
  });

  // Event handlers
  const handlePersonSelect = (person: Person | null) => {
    hookHandlePersonSelect(person);
  };

  const handleClearSelection = () => {
    setSelectedPerson(null);
    setWorkoutData([]);
  };

  const handleDayClick = (date: string) => {
    if (!selectedPerson) return;
    
    setSelectedDate(date);
    
    // Find existing exercises for this date
    const existingExercises = workoutData.filter(entry => entry.date === date);
    
    if (existingExercises.length > 0) {
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
      
      loadRoutineToSessionForm(exerciseForms);
    } else {
      // Start with empty session form
      loadRoutineToSessionForm([{
        exercise_id: 0,
        sets: 1,
        reps: 1,
        weight: 0,
        notes: "",
        order: 0,
        group_number: 1
      }]);
    }
    
    openSessionModal(date, []);
  };

  const handleAddWorkoutClick = (date: string) => {
    if (!selectedPerson) return;
    
    setSelectedDate(date);
    
    // Always start with empty session form when clicking "Agregar"
    loadRoutineToSessionForm([{
      exercise_id: 0,
      sets: 1,
      reps: 1,
      weight: 0,
      notes: "",
      order: 0,
      group_number: 1
    }]);
    
    openSessionModal(date, []);
  };

  const handleDayRightClick = (e: React.MouseEvent, date: string) => {
    e.preventDefault();
    if (!selectedPerson) return;
    
    setSelectedDate(date);
    updateWorkoutForm('exercise_id', 0);
    updateWorkoutForm('sets', 1);
    updateWorkoutForm('reps', 1);
    updateWorkoutForm('weight', 0);
    updateWorkoutForm('notes', "");
    updateWorkoutForm('order', 0);
    updateWorkoutForm('group_number', 1);
    openWorkoutModal(date);
  };

  const handleCloseWorkoutModal = () => {
    closeWorkoutModal();
    setSelectedDate("");
  };

  const handleCloseSessionModal = () => {
    closeSessionModal();
    setSelectedDate("");
  };

  const handleSaveWorkoutEntry = async () => {
    if (!selectedPerson || !selectedDate || !workoutForm.exercise_id) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return;
    }

    const success = await saveWorkoutEntry({
      ...workoutForm,
      person_id: selectedPerson.id!,
      date: selectedDate
    });
    
    if (success) {
      handleCloseWorkoutModal();
    }
  };

  const handleSaveWorkoutSession = async () => {
    if (!selectedPerson || !selectedDate) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return;
    }

    const workoutEntries = sessionForm.exercises.map((exercise, index) => ({
      ...exercise,
      person_id: selectedPerson.id!,
      date: selectedDate,
      order: index
    }));
    
    const success = await saveWorkoutSession(workoutEntries);
    
    if (success) {
      handleCloseSessionModal();
    }
  };

  const handleDeleteWorkoutEntry = async (id: number) => {
    openDeleteModal(id);
  };

  const confirmDeleteWorkoutEntry = async () => {
    if (workoutToDelete) {
      const success = await deleteWorkoutEntry(workoutToDelete);
      if (success) {
        closeDeleteModal();
      }
    }
  };

  const cancelDeleteWorkoutEntry = () => {
    closeDeleteModal();
  };

  const handleReorderExercises = async (exerciseOrders: Array<{ id: number; order: number }>) => {
    await reorderExercises(exerciseOrders);
  };

  const handleLoadRoutine = async (routineId: number) => {
    setLoadingRoutine(true);
    try {
      const exerciseForms = await loadRoutineToSession(routineId);
      if (exerciseForms) {
        loadRoutineToSessionForm(exerciseForms);
      }
    } finally {
      setLoadingRoutine(false);
    }
  };

  const handleShowLoadRoutineModal = () => {
    setShowLoadRoutineModal(true);
  };

  const handleLoadRoutineToDate = async () => {
    if (!selectedRoutineForLoad || !selectedDateForRoutine) {
      showToast("Por favor selecciona una rutina y una fecha", 'error');
      return;
    }

    const confirmed = await showConfirm(
      `¿Estás seguro de que quieres aplicar esta rutina al ${new Date(selectedDateForRoutine).toLocaleDateString('es-ES')}? Si ya existen ejercicios para esa fecha, serán reemplazados.`,
      {
        title: 'Confirmar aplicación de rutina',
        confirmText: 'Aplicar Rutina',
        type: 'warning'
      }
    );
    
    if (confirmed) {
      setLoadingRoutine(true);
      try {
        await applyRoutineToDate(selectedRoutineForLoad, selectedDateForRoutine, selectedGroupForRoutine);
        setShowLoadRoutineModal(false);
        setSelectedRoutineForLoad(null);
        setSelectedDateForRoutine("");
        setSelectedGroupForRoutine(1);
        showToast(DASHBOARD_SUCCESS_MESSAGES.ROUTINE_APPLIED("Rutina", 0, selectedGroupForRoutine), 'success');
      } catch (error) {
        console.error("Error applying routine:", error);
        showToast("Error al aplicar la rutina", 'error');
      } finally {
        setLoadingRoutine(false);
      }
    }
  };

  return {
    // Data
    selectedPerson,
    workoutData,
    exercises,
    routines,
    
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
    
    // Loading states
    savingWorkout,
    savingSession,
    deletingWorkout,
    loadingRoutine,
    
    // Event handlers
    handlePersonSelect,
    handleClearSelection,
    handleDayClick,
    handleAddWorkoutClick,
    handleDayRightClick,
    handleCloseWorkoutModal,
    handleCloseSessionModal,
    handleSaveWorkoutEntry,
    handleSaveWorkoutSession,
    handleDeleteWorkoutEntry,
    confirmDeleteWorkoutEntry,
    cancelDeleteWorkoutEntry,
    handleReorderExercises,
    handleLoadRoutine,
    handleShowLoadRoutineModal,
    handleLoadRoutineToDate,
    updateWorkoutForm,
    updateSessionExercise,
    addExerciseToSession,
    deleteSessionExercise,
    setSelectedRoutineForLoad,
    setSelectedDateForRoutine,
    setSelectedGroupForRoutine,
    setShowLoadRoutineModal,
    setShowConfirmModal,
    setShowSettingsModal,
    setWorkoutData,
    setSelectedDate,
    
    // Toast notifications
    notifications,
    removeNotification
  };
}; 