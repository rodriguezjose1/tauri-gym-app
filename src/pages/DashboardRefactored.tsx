import React, { useState, useEffect } from 'react';
import { PersonSearch } from '../components/forms/PersonSearch';
import { WeeklyCalendar } from '../components/calendar/WeeklyCalendar';
import { WorkoutModals } from '../components/complex/WorkoutModals';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { SettingsModal } from '../components/settings/SettingsModal';
import ToastContainer from '../components/notifications/ToastContainer';
import { Button } from '../components/base/Button';
import { Input } from '../components/base/Input';
import { Modal } from '../components/base/Modal';
import { Person, Exercise, WorkoutEntry, WorkoutEntryWithDetails, WorkoutEntryForm, WorkoutSessionForm, RoutineWithExercises, RoutineOption } from '../types/dashboard';
import { getContainerStyles, getDashboardWrapperStyles } from '../config/layout';
import { useToastNotifications } from '../hooks/useToastNotifications';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardModals } from '../hooks/useDashboardModals';
import { useWorkoutOperations } from '../hooks/useWorkoutOperations';
import { useRoutineOperations } from '../hooks/useRoutineOperations';
import { 
  DASHBOARD_ERROR_MESSAGES, 
  DASHBOARD_SUCCESS_MESSAGES, 
  DASHBOARD_WARNING_MESSAGES, 
  DASHBOARD_UI_LABELS 
} from '../constants/errorMessages';
import '../styles/Dashboard.css';

export default function DashboardRefactored() {
  // Use custom hooks for data management
  const {
    people,
    exercises,
    routines,
    workoutData,
    selectedPerson,
    selectedDate,
    peopleLoading,
    exercisesLoading,
    routinesLoading,
    workoutLoading,
    error,
    handlePersonSelect: hookHandlePersonSelect,
    handleDateSelect,
    refreshWorkoutData,
    getWorkoutEntriesForDate,
    setWorkoutData,
    setSelectedPerson,
    setSelectedDate
  } = useDashboardData();

  // Use custom hooks for modal management
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
    openLoadRoutineModal,
    closeLoadRoutineModal,
    showConfirm,
    setShowSettingsModal,
    updateWorkoutForm,
    updateSessionExercise,
    addExerciseToSession,
    deleteSessionExercise,
    loadRoutineToSessionForm,
    setSelectedRoutineForLoad,
    setSelectedDateForRoutine,
    setSelectedGroupForRoutine,
    setShowLoadRoutineModal
  } = useDashboardModals();

  // Use custom hooks for workout operations
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
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      addNotification(message, type);
    }
  });

  // Use custom hooks for routine operations
  const {
    loadRoutineToSession,
    applyRoutineToDate
  } = useRoutineOperations({
    selectedPerson,
    workoutData,
    refreshWorkoutData,
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      addNotification(message, type);
    },
    showConfirm
  });

  // Toast notifications
  const { notifications, addNotification, removeNotification } = useToastNotifications();

  // Local state that matches original Dashboard
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [loadingRoutine, setLoadingRoutine] = useState(false);

  // Helper function to show toast notifications (same as original)
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    addNotification(message, type);
  };

  // Routines are already in RoutineOption format from the hook
  const routineOptions: RoutineOption[] = routines;

  // Handle person selection with session storage (same logic as original)
  const handlePersonSelect = (person: Person | null) => {
    hookHandlePersonSelect(person);
  };

  // Handle fetch workout data for date range (same as original)
  const handleFetchWorkoutDataForDateRange = async (startDate: string, endDate: string) => {
    if (selectedPerson) {
      await refreshWorkoutData();
    }
  };

  // Handle clear selection (same as original)
  const handleClearSelection = () => {
    setSelectedPerson(null);
    setWorkoutData([]);
  };

  // Handle day click (same logic as original)
  const handleDayClick = (date: string) => {
    if (!selectedPerson) return;
    
    setSelectedDate(date);
    
    // Find existing exercises for this date
    const existingExercises = workoutData.filter(entry => entry.date === date);
    
    console.log("Existing exercises for date", date, ":", existingExercises);
    console.log("All workout data:", workoutData.map(entry => ({ date: entry.date, exercise: entry.exercise_name })));
    
    if (existingExercises.length > 0) {
      // Load existing exercises into session form
      const exerciseForms: WorkoutEntryForm[] = existingExercises.map(exercise => {
        console.log("Mapping exercise:", exercise);
        return {
          exercise_id: exercise.exercise_id,
          sets: exercise.sets || 1,
          reps: exercise.reps || 1,
          weight: exercise.weight || 0,
          notes: exercise.notes || "",
          order: exercise.order || 0,
          group_number: exercise.group_number || 1
        };
      });
      
      console.log("Setting session form with exercises:", exerciseForms);
      loadRoutineToSessionForm(exerciseForms);
    } else {
      // Start with empty session form
      console.log("No existing exercises, starting with empty form");
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

  // Handle add workout click (same as original)
  const handleAddWorkoutClick = (date: string) => {
    if (!selectedPerson) return;
    
    setSelectedDate(date);
    
    // Always start with empty session form when clicking "Agregar"
    console.log("Add workout clicked for date", date, "- starting with empty form");
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

  // Handle day right click (same as original)
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

  // Handle close workout modal (same as original)
  const handleCloseWorkoutModal = () => {
    closeWorkoutModal();
    setSelectedDate("");
  };

  // Handle close session modal (same as original)
  const handleCloseSessionModal = () => {
    closeSessionModal();
    setSelectedDate("");
  };

  // Handle save workout entry (use hook but maintain same interface)
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

  // Handle save workout session (use hook but maintain same interface)
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

  // Handle delete workout entry (same as original)
  const handleDeleteWorkoutEntry = async (id: number) => {
    openDeleteModal(id);
  };

  // Confirm delete workout entry (use hook but maintain same interface)
  const confirmDeleteWorkoutEntry = async () => {
    if (workoutToDelete) {
      const success = await deleteWorkoutEntry(workoutToDelete);
      if (success) {
        closeDeleteModal();
      }
    }
  };

  // Cancel delete workout entry (same as original)
  const cancelDeleteWorkoutEntry = () => {
    closeDeleteModal();
  };

  // Handle reorder exercises (use hook but maintain same interface)
  const handleReorderExercises = async (exerciseOrders: Array<{ id: number; order: number }>) => {
    await reorderExercises(exerciseOrders);
  };

  // Handle load routine (use hook but maintain same interface)
  const handleLoadRoutine = async (routineId: number) => {
    setLoadingRoutine(true);
    try {
      const exerciseForms = await loadRoutineToSession(routineId);
      if (exerciseForms) {
        loadRoutineToSessionForm(exerciseForms);
        // Don't close load routine modal since we're in session modal context
        // Don't open session modal again since we're already in it
      }
    } finally {
      setLoadingRoutine(false);
    }
  };

  // Handle show load routine modal (same as original)
  const handleShowLoadRoutineModal = () => {
    setShowLoadRoutineModal(true);
  };

  // Handle load routine to date (use hook but maintain same interface)
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
        showToast(DASHBOARD_SUCCESS_MESSAGES.ROUTINE_APPLIED, 'success');
      } catch (error) {
        console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_APPLY_ROUTINE, error);
        showToast(DASHBOARD_ERROR_MESSAGES.APPLY_ROUTINE_FAILED, 'error');
      } finally {
        setLoadingRoutine(false);
      }
    }
  };

  // Initialize data on component mount (same as original)
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // Data is already loaded by the hooks, just wait for them
        setInitialLoadDone(true);
      } catch (error) {
        console.error("Error initializing dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Debug: Log exercises when they change (same as original)
  useEffect(() => {
    console.log("Exercises loaded:", exercises.length, exercises);
  }, [exercises]);

  // Debug: Log session form when it changes (same as original)
  useEffect(() => {
    console.log("Session form changed:", sessionForm);
  }, [sessionForm]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            {/* Configuraciones button moved to navbar */}
          </div>
        </div>
        {/* Weekly Calendar with Embedded Person Search */}
        <div className="dashboard-calendar-container">
          <WeeklyCalendar
            selectedPerson={selectedPerson}
            workoutData={workoutData}
            onWorkoutDataChange={setWorkoutData}
            onReorderExercises={handleReorderExercises}
            onAddWorkoutClick={handleAddWorkoutClick}
            onDeleteWorkoutEntry={handleDeleteWorkoutEntry}
            onDayClick={handleDayClick}
            onDayRightClick={handleDayRightClick}
            onSelectedDateChange={setSelectedDate}
            handlePersonSelect={handlePersonSelect}
            handleClearSelection={handleClearSelection}
          />
        </div>
      </div>

      {/* Workout Modals */}
      <WorkoutModals
        // Single workout modal
        showWorkoutModal={showWorkoutModal}
        workoutForm={workoutForm}
        savingWorkout={savingWorkout}
        onCloseWorkoutModal={handleCloseWorkoutModal}
        onSaveWorkoutEntry={handleSaveWorkoutEntry}
        onUpdateWorkoutForm={updateWorkoutForm}
        
        // Session modal
        showSessionModal={showSessionModal}
        sessionForm={sessionForm}
        savingSession={savingSession}
        onCloseSessionModal={handleCloseSessionModal}
        onSaveWorkoutSession={handleSaveWorkoutSession}
        onUpdateSessionExercise={updateSessionExercise}
        onDeleteSessionExercise={deleteSessionExercise}
        onAddExerciseToSession={addExerciseToSession}
        onDeleteWorkoutEntry={handleDeleteWorkoutEntry}
        
        // Routine functionality
        routines={routineOptions}
        onLoadRoutine={handleLoadRoutine}
        loadingRoutine={loadingRoutine}
        
        // Common props
        selectedPerson={selectedPerson}
        selectedDate={selectedDate}
        exercises={exercises}
        workoutData={workoutData}
      />

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onCancel={cancelDeleteWorkoutEntry}
        onConfirm={confirmDeleteWorkoutEntry}
        isDeleting={deletingWorkout}
        title="Eliminar Ejercicio"
        message="¿Estás seguro de que deseas eliminar este ejercicio? Esta acción no se puede deshacer."
      />

      {/* Load Routine Modal */}
      <Modal
        isOpen={showLoadRoutineModal}
        onClose={() => {
          setShowLoadRoutineModal(false);
          setSelectedRoutineForLoad(null);
          setSelectedDateForRoutine("");
          setSelectedGroupForRoutine(1);
        }}
        title="Cargar Rutina a Fecha Específica"
        size="md"
      >
        <div className="load-routine-modal-content">
          {selectedPerson && (
            <div className="load-routine-person-info">
              <div className="load-routine-person-name">
                {selectedPerson.name} {selectedPerson.last_name}
              </div>
              <div className="load-routine-person-subtitle">
                Aplicar rutina a una fecha específica
              </div>
            </div>
          )}

          <div className="load-routine-form-grid">
            <div className="load-routine-form-group">
              <label className="load-routine-label">
                Seleccionar Rutina:
              </label>
              <select
                value={selectedRoutineForLoad || ''}
                onChange={(e) => setSelectedRoutineForLoad(e.target.value ? parseInt(e.target.value) : null)}
                className="load-routine-select"
              >
                <option value="">-- Seleccionar rutina --</option>
                {routineOptions.map(routine => (
                  <option key={routine.id} value={routine.id}>
                    {routine.name} ({routine.exerciseCount} ejercicios)
                  </option>
                ))}
              </select>
            </div>

            <div className="load-routine-form-group">
              <label className="load-routine-label">
                Fecha:
              </label>
              <Input
                type="date"
                value={selectedDateForRoutine}
                onChange={(e) => setSelectedDateForRoutine(e.target.value)}
                variant="primary"
                fullWidth
              />
            </div>

            <div className="load-routine-form-group">
              <label className="load-routine-label">
                Grupo:
              </label>
              <select
                value={selectedGroupForRoutine}
                onChange={(e) => setSelectedGroupForRoutine(parseInt(e.target.value))}
                className="load-routine-select"
              >
                <option value={1}>Grupo 1</option>
                <option value={2}>Grupo 2</option>
                <option value={3}>Grupo 3</option>
                <option value={4}>Grupo 4</option>
                <option value={5}>Grupo 5</option>
              </select>
              <div className="load-routine-group-help">
                Todos los ejercicios de la rutina se asignarán a este grupo
              </div>
            </div>

            {selectedRoutineForLoad && selectedDateForRoutine && (
              <div className="load-routine-info-box">
                ℹ️ La rutina seleccionada se aplicará a la fecha {new Date(selectedDateForRoutine).toLocaleDateString('es-ES')} en el Grupo {selectedGroupForRoutine}. 
                Si ya existen ejercicios para esa fecha, serán reemplazados.
              </div>
            )}
          </div>

          <div className="load-routine-actions">
            <Button
              onClick={() => {
                setShowLoadRoutineModal(false);
                setSelectedRoutineForLoad(null);
                setSelectedDateForRoutine("");
                setSelectedGroupForRoutine(1);
              }}
              variant="secondary"
              disabled={loadingRoutine}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLoadRoutineToDate}
              variant="primary"
              disabled={!selectedRoutineForLoad || !selectedDateForRoutine || loadingRoutine}
              loading={loadingRoutine}
            >
              {loadingRoutine ? "Aplicando..." : "Aplicar Rutina"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Custom Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title={confirmModalData.title}
        message={confirmModalData.message}
        confirmText={confirmModalData.confirmText}
        type={confirmModalData.type}
        onConfirm={confirmModalData.onConfirm}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
    </div>
  );
} 