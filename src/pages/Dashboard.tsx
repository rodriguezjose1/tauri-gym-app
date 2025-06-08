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
import { 
  DASHBOARD_ERROR_MESSAGES, 
  DASHBOARD_SUCCESS_MESSAGES, 
  DASHBOARD_WARNING_MESSAGES, 
  DASHBOARD_UI_LABELS 
} from '../constants/errorMessages';
import { WorkoutService } from '../services/workoutService';
import { ExerciseService } from '../services/exerciseService';
import { RoutineService } from '../services/routineService';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(() => {
    // Use sessionStorage instead of localStorage for automatic cleanup on app close
    const savedPerson = sessionStorage.getItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY);
    return savedPerson ? JSON.parse(savedPerson) : null;
  });
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutData, setWorkoutData] = useState<WorkoutEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Toast notifications
  const { notifications, addNotification, removeNotification } = useToastNotifications();

  // Routine state
  const [routines, setRoutines] = useState<RoutineOption[]>([]);
  const [loadingRoutine, setLoadingRoutine] = useState(false);

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Workout Entry Modal State
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [workoutForm, setWorkoutForm] = useState<WorkoutEntryForm>({
    exercise_id: 0,
    sets: 1,
    reps: 1,
    weight: 0,
    notes: "",
    order: 0,
    group_number: 1
  });
  const [savingWorkout, setSavingWorkout] = useState(false);

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
  const [savingSession, setSavingSession] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<number | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState(false);

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

  // Helper function to show toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    addNotification(message, type);
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

  const fetchAllExercises = async () => {
    try {
      console.log("Fetching exercises...");
      const result = await ExerciseService.getExercises();
      console.log("Exercises fetched:", result);
      setExercises(result as Exercise[]);
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.FETCH_EXERCISES_FAILED, error);
      // Try to fetch with pagination as fallback
      try {
        const fallbackResult = await ExerciseService.getExercisesPaginated(1, 100);
        console.log("Exercises fetched via pagination:", fallbackResult);
        setExercises(fallbackResult.exercises);
      } catch (fallbackError) {
        console.error(DASHBOARD_ERROR_MESSAGES.FETCH_EXERCISES_PAGINATION_FAILED, fallbackError);
      }
    }
  };

  const fetchRoutines = async () => {
    try {
      console.log("Fetching routines...");
      const result = await RoutineService.listRoutinesPaginated(1, 100);
      console.log("Routines fetched:", result);
      
      // Transform routines to include exercise count
      const routineOptions: RoutineOption[] = await Promise.all(
        (result as any[]).map(async (routine) => {
          try {
            const routineWithExercises = await RoutineService.getRoutineWithExercises(routine.id) as RoutineWithExercises;
            return {
              id: routine.id,
              name: routine.name,
              code: routine.code,
              exerciseCount: routineWithExercises?.exercises?.length || 0
            };
          } catch (error) {
            console.error(DASHBOARD_ERROR_MESSAGES.FETCH_ROUTINE_EXERCISES_FAILED(routine.id), error);
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
      console.error(DASHBOARD_ERROR_MESSAGES.FETCH_ROUTINES_FAILED, error);
    }
  };

  const fetchWorkoutData = async (personId: number, startDate?: string, endDate?: string) => {
    setWorkoutLoading(true);
    try {
      console.log("Fetching workout data for personId:", personId, "startDate:", startDate, "endDate:", endDate);
      
      let result;
      if (startDate && endDate) {
        // Use date range command when dates are provided
        result = await WorkoutService.getWorkoutEntriesByPersonAndDateRange(personId, startDate, endDate);
      } else {
        // Fallback to get all entries for the person
        result = await WorkoutService.getWorkoutEntriesByPerson(personId);
      }
      
      console.log("Workout data result:", result);
      console.log("Result type:", typeof result);
      console.log("Result length:", Array.isArray(result) ? result.length : "Not an array");
      
      setWorkoutData(result as WorkoutEntryWithDetails[]);
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.FETCH_WORKOUT_DATA_FAILED, error);
      console.error("Full error details:", error);
      
      // Try fallback if the date range command failed
      if (startDate && endDate) {
        try {
          console.log("Trying fallback to get_workout_entries_by_person");
          const fallbackResult = await WorkoutService.getWorkoutEntriesByPerson(personId);
          console.log("Fallback result:", fallbackResult);
          setWorkoutData(fallbackResult as WorkoutEntryWithDetails[]);
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
        }
      }
    } finally {
      setWorkoutLoading(false);
    }
  };

  const handlePersonSelect = (person: Person | null) => {
    setSelectedPerson(person);
    if (person?.id) {
      fetchWorkoutData(person.id);
    } else {
      setWorkoutData([]);
    }
  };

  const handleFetchWorkoutDataForDateRange = async (startDate: string, endDate: string) => {
    if (selectedPerson) {
      await fetchWorkoutData(selectedPerson.id!, startDate, endDate);
    }
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
      setSessionForm({ exercises: exerciseForms });
    } else {
      // Start with empty session form
      console.log("No existing exercises, starting with empty form");
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

  const handleAddWorkoutClick = (date: string) => {
    if (!selectedPerson) return;
    
    setSelectedDate(date);
    
    // Always start with empty session form when clicking "Agregar"
    console.log("Add workout clicked for date", date, "- starting with empty form");
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
    
    setShowSessionModal(true);
  };

  const handleDayRightClick = (e: React.MouseEvent, date: string) => {
    e.preventDefault();
    if (!selectedPerson) return;
    
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

  const handleCloseWorkoutModal = () => {
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

  const handleCloseSessionModal = () => {
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

  const updateSessionExercise = (index: number, field: keyof WorkoutEntryForm, value: any) => {
    const updatedExercises = [...sessionForm.exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setSessionForm({ exercises: updatedExercises });
  };

  const deleteSessionExercise = (index: number) => {
    const updatedExercises = sessionForm.exercises.filter((_, i) => i !== index);
    setSessionForm({ exercises: updatedExercises });
  };

  const updateWorkoutForm = (field: keyof WorkoutEntryForm, value: any) => {
    setWorkoutForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveWorkoutEntry = async () => {
    if (!selectedPerson || !selectedDate || !workoutForm.exercise_id) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return;
    }

    setSavingWorkout(true);
    try {
      const workoutEntry = {
        person_id: selectedPerson.id!,
        exercise_id: workoutForm.exercise_id,
        date: selectedDate,
        sets: workoutForm.sets,
        reps: workoutForm.reps,
        weight: workoutForm.weight,
        notes: workoutForm.notes,
        order: workoutForm.order,
        group_number: workoutForm.group_number
      };

      console.log("Saving workout entry:", workoutEntry);
      await WorkoutService.createWorkoutEntry(workoutEntry);
      
      showToast(DASHBOARD_SUCCESS_MESSAGES.WORKOUT_ENTRY_SAVED, 'success');
      
      // Refresh workout data
      await fetchWorkoutData(selectedPerson.id!);
      
      // Close modal
      handleCloseWorkoutModal();
    } catch (error) {
      console.error("Error saving workout entry:", error);
      showToast(DASHBOARD_ERROR_MESSAGES.SAVE_WORKOUT_ENTRY_FAILED, 'error');
    } finally {
      setSavingWorkout(false);
    }
  };

  const handleSaveWorkoutSession = async () => {
    if (!selectedPerson || !selectedDate) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return;
    }

    const validExercises = sessionForm.exercises.filter(ex => ex.exercise_id > 0);
    if (validExercises.length === 0) {
      showToast(DASHBOARD_WARNING_MESSAGES.NO_VALID_EXERCISES, 'error');
      return;
    }

    setSavingSession(true);
    try {
      console.log("Saving workout session with exercises:", validExercises);
      
      // First, delete existing entries for this date and person
      const existingEntries = workoutData.filter(entry => entry.date === selectedDate);
      console.log("Existing entries to delete:", existingEntries);
      
      for (const entry of existingEntries) {
        if (entry.id) {
          console.log("Deleting existing entry:", entry.id);
          await WorkoutService.deleteWorkoutEntry(entry.id);
        }
      }
      
      // Then create new entries
      for (let i = 0; i < validExercises.length; i++) {
        const exercise = validExercises[i];
        const workoutEntry = {
          person_id: selectedPerson.id!,
          exercise_id: exercise.exercise_id,
          date: selectedDate,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          notes: exercise.notes,
          order: i, // Use index as order
          group_number: exercise.group_number
        };

        console.log("Creating workout entry:", workoutEntry);
        await WorkoutService.createWorkoutEntry(workoutEntry);
      }
      
      showToast(DASHBOARD_SUCCESS_MESSAGES.SESSION_SAVED, 'success');
      
      // Refresh workout data
      await fetchWorkoutData(selectedPerson.id!);
      
      // Close modal
      handleCloseSessionModal();
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_SAVE_WORKOUT_SESSION, error);
      showToast(DASHBOARD_ERROR_MESSAGES.SAVE_SESSION_FAILED, 'error');
    } finally {
      setSavingSession(false);
    }
  };

  const handleDeleteWorkoutEntry = async (id: number) => {
    setWorkoutToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteWorkoutEntry = async () => {
    if (!workoutToDelete || !selectedPerson) return;

    try {
      setDeletingWorkout(true);
      await WorkoutService.deleteWorkoutEntry(workoutToDelete);
      await fetchWorkoutData(selectedPerson.id!);
      showToast(DASHBOARD_SUCCESS_MESSAGES.WORKOUT_DELETED, 'success');
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_DELETE_WORKOUT, error);
      showToast(DASHBOARD_ERROR_MESSAGES.DELETE_WORKOUT_FAILED, 'error');
    } finally {
      setDeletingWorkout(false);
    }
  };

  const cancelDeleteWorkoutEntry = () => {
    setShowDeleteModal(false);
    setWorkoutToDelete(null);
  };

  const handleReorderExercises = async (exerciseOrders: Array<{ id: number; order: number }>) => {
    try {
      await WorkoutService.reorderExercises(exerciseOrders);
      
      // Refresh workout data
      if (selectedPerson) {
        await fetchWorkoutData(selectedPerson.id!);
      }
    } catch (error) {
      console.error("Error reordering exercises:", error);
      showToast(DASHBOARD_ERROR_MESSAGES.REORDER_EXERCISES_FAILED, 'error');
    }
  };

  const handleLoadRoutine = async (routineId: number) => {
    if (!selectedPerson) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_REQUIRED, 'error');
      return;
    }

    setLoadingRoutine(true);
    try {
      console.log("Loading routine", routineId, "for person", selectedPerson.id);
      
      // Get routine with exercises
      const routineWithExercises = await RoutineService.getRoutineWithExercises(routineId) as RoutineWithExercises;
      console.log("Routine with exercises:", routineWithExercises);
      
      if (!routineWithExercises.exercises || routineWithExercises.exercises.length === 0) {
        showToast(DASHBOARD_WARNING_MESSAGES.ROUTINE_NO_EXERCISES, 'warning');
        return;
      }

      // Convert routine exercises to session form
      const exerciseForms: WorkoutEntryForm[] = routineWithExercises.exercises.map((routineExercise, index) => ({
        exercise_id: routineExercise.exercise_id,
        sets: routineExercise.sets || 1,
        reps: routineExercise.reps || 1,
        weight: routineExercise.weight || 0,
        notes: routineExercise.notes || "",
        order: index,
        group_number: routineExercise.group_number || 1
      }));

      setSessionForm({ exercises: exerciseForms });
      showToast(DASHBOARD_SUCCESS_MESSAGES.ROUTINE_LOADED(routineWithExercises.name, routineWithExercises.exercises.length, 1), 'success');
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_LOAD_ROUTINE, error);
      showToast(DASHBOARD_ERROR_MESSAGES.LOAD_ROUTINE_FAILED, 'error');
    } finally {
      setLoadingRoutine(false);
    }
  };

  const handleShowLoadRoutineModal = () => {
    setSelectedDateForRoutine(selectedDate);
    setShowLoadRoutineModal(true);
  };

  const handleLoadRoutineToDate = async () => {
    if (!selectedRoutineForLoad || !selectedDateForRoutine || !selectedPerson) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_AND_DATE_REQUIRED, 'error');
      return;
    }

    const confirmed = await showConfirm(
      `¿Estás seguro de que quieres aplicar la rutina a la fecha ${new Date(selectedDateForRoutine).toLocaleDateString('es-ES')}? Si ya existen ejercicios para esa fecha, serán reemplazados.`,
      {
        title: 'Confirmar aplicación de rutina',
        confirmText: 'Aplicar rutina',
        type: 'warning'
      }
    );

    if (!confirmed) return;

    setLoadingRoutine(true);
    try {
      console.log("Loading routine", selectedRoutineForLoad, "for person", selectedPerson.id, "on date", selectedDateForRoutine);
      
      // Get routine with exercises
      const routineWithExercises = await RoutineService.getRoutineWithExercises(selectedRoutineForLoad) as RoutineWithExercises;
      console.log("Routine with exercises:", routineWithExercises);
      
      if (!routineWithExercises.exercises || routineWithExercises.exercises.length === 0) {
        showToast(DASHBOARD_WARNING_MESSAGES.ROUTINE_NO_EXERCISES, 'warning');
        return;
      }

      // First, delete existing entries for this date and person
      const existingEntries = workoutData.filter(entry => entry.date === selectedDateForRoutine);
      console.log("Existing entries to delete:", existingEntries);
      
      for (const entry of existingEntries) {
        if (entry.id) {
          console.log("Deleting existing entry:", entry.id);
          await WorkoutService.deleteWorkoutEntry(entry.id);
        }
      }

      // Then create new entries from routine
      for (let i = 0; i < routineWithExercises.exercises.length; i++) {
        const routineExercise = routineWithExercises.exercises[i];
        const workoutEntry = {
          person_id: selectedPerson.id!,
          exercise_id: routineExercise.exercise_id,
          date: selectedDateForRoutine,
          sets: routineExercise.sets || 1,
          reps: routineExercise.reps || 1,
          weight: routineExercise.weight || 0,
          notes: routineExercise.notes || "",
          order: i,
          group_number: selectedGroupForRoutine // Use the selected group
        };

        console.log("Creating workout entry from routine:", workoutEntry);
        await WorkoutService.createWorkoutEntry(workoutEntry);
      }

      showToast(DASHBOARD_SUCCESS_MESSAGES.ROUTINE_APPLIED_TO_DATE, 'success');
      
      // Refresh workout data
      await fetchWorkoutData(selectedPerson.id!);
      
      // Close modal
      setShowLoadRoutineModal(false);
      setSelectedRoutineForLoad(null);
      setSelectedDateForRoutine("");
      setSelectedGroupForRoutine(1);
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_APPLY_ROUTINE, error);
      showToast(DASHBOARD_ERROR_MESSAGES.APPLY_ROUTINE_FAILED, 'error');
    } finally {
      setLoadingRoutine(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchAllExercises(),
          fetchRoutines()
        ]);
        
        // If there's a selected person from session storage, fetch their workout data
        if (selectedPerson?.id) {
          await fetchWorkoutData(selectedPerson.id);
        }
      } catch (error) {
        console.error("Error initializing dashboard data:", error);
      } finally {
        setLoading(false);
        setInitialLoadDone(true);
      }
    };

    initializeData();
  }, []);

  // Save selected person to session storage when it changes
  useEffect(() => {
    if (selectedPerson) {
      sessionStorage.setItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY, JSON.stringify(selectedPerson));
    } else {
      sessionStorage.removeItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY);
    }
  }, [selectedPerson]);

  // Debug: Log exercises when they change
  useEffect(() => {
    console.log("Exercises loaded:", exercises.length, exercises);
  }, [exercises]);

  // Debug: Log session form when it changes
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
          {/* 
          {selectedPerson && (
            <div className="dashboard-header-right">
              <Button
                onClick={handleShowLoadRoutineModal}
                variant="secondary"
                className="dashboard-load-routine-button"
              >
                <span>🏋️</span>
                Cargar desde Rutina
              </Button>
            </div>
          )}
          */}
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
        routines={routines}
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
                {routines.map(routine => (
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