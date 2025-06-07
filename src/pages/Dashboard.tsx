import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
      const result = await invoke("get_exercises");
      console.log("Exercises fetched:", result);
      setExercises(result as Exercise[]);
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.FETCH_EXERCISES_FAILED, error);
      // Try to fetch with pagination as fallback
      try {
        const fallbackResult = await invoke("get_exercises_paginated", { page: 1, pageSize: 100 });
        console.log("Exercises fetched via pagination:", fallbackResult);
        setExercises(fallbackResult as Exercise[]);
      } catch (fallbackError) {
        console.error(DASHBOARD_ERROR_MESSAGES.FETCH_EXERCISES_PAGINATION_FAILED, fallbackError);
      }
    }
  };

  const fetchRoutines = async () => {
    try {
      console.log("Fetching routines...");
      const result = await invoke("list_routines", { page: 1, pageSize: 100 });
      console.log("Routines fetched:", result);
      
      // Transform routines to include exercise count
      const routineOptions: RoutineOption[] = await Promise.all(
        (result as any[]).map(async (routine) => {
          try {
            const routineWithExercises = await invoke("get_routine_with_exercises", { id: routine.id }) as RoutineWithExercises;
            return {
              id: routine.id,
              name: routine.name,
              code: routine.code,
              exerciseCount: routineWithExercises.exercises?.length || 0
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
        result = await invoke("get_workout_entries_by_person_and_date_range", {
          personId: personId,
          startDate: startDate,
          endDate: endDate
        });
      } else {
        // Fallback to get all entries for the person
        result = await invoke("get_workout_entries_by_person", {
          personId: personId
        });
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
          const fallbackResult = await invoke("get_workout_entries_by_person", {
            personId: personId
          });
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
    console.log(`Updating session exercise ${index}, field: ${field}, value:`, value);
    const newExercises = [...sessionForm.exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    setSessionForm({ exercises: newExercises });
    console.log("Updated session form:", { exercises: newExercises });
  };

  const deleteSessionExercise = (index: number) => {
    console.log(`Deleting session exercise at index ${index}`);
    const newExercises = sessionForm.exercises.filter((_, i) => i !== index);
    setSessionForm({ exercises: newExercises });
  };

  const updateWorkoutForm = (field: keyof WorkoutEntryForm, value: any) => {
    console.log("=== UPDATE WORKOUT FORM ===");
    console.log("Field:", field);
    console.log("Value:", value);
    console.log("Current workoutForm:", workoutForm);
    const newForm = { ...workoutForm, [field]: value };
    console.log("New workoutForm:", newForm);
    setWorkoutForm(newForm);
  };

  const handleSaveWorkoutEntry = async () => {
    if (!selectedPerson) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_REQUIRED, "error");
      return;
    }

    if (!workoutForm.exercise_id) {
      showToast(DASHBOARD_ERROR_MESSAGES.EXERCISE_REQUIRED, "error");
      return;
    }

    if (!selectedDate) {
      showToast(DASHBOARD_ERROR_MESSAGES.DATE_REQUIRED, "error");
      return;
    }

    try {
      const workoutEntry = {
        person_id: selectedPerson.id!,
        exercise_id: workoutForm.exercise_id,
        date: selectedDate,
        sets: workoutForm.sets || 0,
        reps: workoutForm.reps || 0,
        weight: workoutForm.weight || 0,
        notes: workoutForm.notes || "",
        order: workoutForm.order || 0,
        group_number: workoutForm.group_number || 1
      };

      console.log("Sending single workoutEntry:", workoutEntry);
      await invoke("create_workout_entry", { workoutEntry: workoutEntry });
      showToast(DASHBOARD_SUCCESS_MESSAGES.WORKOUT_ENTRY_SAVED, "success");
      
      // Refresh workout data
      await fetchWorkoutData(selectedPerson.id!);
      
      // Close modal
      setShowWorkoutModal(false);
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.SAVE_WORKOUT_ENTRY_FAILED, error);
      showToast(DASHBOARD_ERROR_MESSAGES.SAVE_WORKOUT_ENTRY_FAILED, "error");
    }
  };

  const handleSaveWorkoutSession = async () => {
    if (!selectedPerson) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_REQUIRED, "error");
      return;
    }

    if (!selectedDate) {
      showToast(DASHBOARD_ERROR_MESSAGES.DATE_REQUIRED, "error");
      return;
    }

    if (!sessionForm.exercises || sessionForm.exercises.length === 0) {
      showToast(DASHBOARD_ERROR_MESSAGES.EXERCISES_REQUIRED, "error");
      return;
    }

    // Validate that all entries have valid exercises
    const validEntries = sessionForm.exercises.filter((entry: WorkoutEntryForm) => entry.exercise_id && entry.exercise_id > 0);
    if (validEntries.length === 0) {
      showToast(DASHBOARD_WARNING_MESSAGES.NO_VALID_EXERCISES, "warning");
      return;
    }

    try {
      setSavingSession(true);
      
      // Get existing exercises for this date
      const existingEntries = workoutData.filter(entry => entry.date === selectedDate);
      
      // Create a map of existing exercises by exercise_id and group_number for efficient lookup
      const existingExercisesMap = new Map();
      existingEntries.forEach(entry => {
        const key = `${entry.exercise_id}-${entry.group_number || 1}`;
        existingExercisesMap.set(key, entry);
      });
      
      // Prepare arrays for the granular replace operation
      const idsToDelete: number[] = [];
      const workoutEntriesToInsert: any[] = [];
      
      // Process each valid entry from the session form
      validEntries.forEach((entry: WorkoutEntryForm, index: number) => {
        const key = `${entry.exercise_id}-${entry.group_number || 1}`;
        const existingEntry = existingExercisesMap.get(key);
        
        if (existingEntry && existingEntry.id) {
          // Mark existing entry for deletion (we'll replace it)
          idsToDelete.push(existingEntry.id);
        }
        
        // Create new workout entry
        const workoutEntry = {
          person_id: selectedPerson.id!,
          exercise_id: entry.exercise_id,
          date: selectedDate,
          sets: entry.sets || 0,
          reps: entry.reps || 0,
          weight: entry.weight || 0,
          notes: entry.notes || "",
          order: index, // Use the index from the session form for proper ordering
          group_number: entry.group_number || 1
        };
        
        workoutEntriesToInsert.push(workoutEntry);
      });
      
      console.log("Merge operation:", {
        idsToDelete,
        workoutEntriesToInsert,
        existingEntries: existingEntries.length,
        newEntries: validEntries.length
      });
      
      // Use the granular replace operation for efficient merge
      if (idsToDelete.length > 0 || workoutEntriesToInsert.length > 0) {
        await invoke("replace_workout_session_granular", {
          idsToDelete: idsToDelete,
          workoutEntriesToInsert: workoutEntriesToInsert
        });
      }

      showToast(DASHBOARD_SUCCESS_MESSAGES.SESSION_SAVED, "success");
      
      // Refresh workout data
      await fetchWorkoutData(selectedPerson.id!);
      
      // Close modal
      setShowSessionModal(false);
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.SAVE_SESSION_FAILED, error);
      showToast(DASHBOARD_ERROR_MESSAGES.SAVE_SESSION_FAILED, "error");
    } finally {
      setSavingSession(false);
    }
  };

  const handleDeleteWorkoutEntry = async (id: number) => {
    setWorkoutToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteWorkoutEntry = async () => {
    if (workoutToDelete && selectedPerson) {
      try {
        await invoke("delete_workout_entry", { id: workoutToDelete });
        
        // Refresh workout data
        await fetchWorkoutData(selectedPerson.id!);
        
        // Close modal
        setShowDeleteModal(false);
        setWorkoutToDelete(null);
        
        showToast(DASHBOARD_SUCCESS_MESSAGES.WORKOUT_DELETED, "success");
      } catch (error) {
        console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_DELETE_WORKOUT, error);
        showToast(DASHBOARD_ERROR_MESSAGES.DELETE_WORKOUT_FAILED, "error");
      }
    }
  };

  const cancelDeleteWorkoutEntry = () => {
    setShowDeleteModal(false);
    setWorkoutToDelete(null);
  };

  const handleReorderExercises = async (exerciseOrders: Array<{ id: number; order: number }>) => {
    if (!selectedPerson) return;
    
    try {
      await invoke("reorder_workout_entries", { exercise_orders: exerciseOrders });
      
      // Refresh workout data
      await fetchWorkoutData(selectedPerson.id!);
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_REORDER_EXERCISES, error);
      showToast(DASHBOARD_ERROR_MESSAGES.REORDER_EXERCISES_FAILED, "error");
    }
  };

  const handleLoadRoutine = async (routineId: number) => {
    if (!selectedPerson) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_REQUIRED, "warning");
      return;
    }

    try {
      const routine = await invoke("get_routine_with_exercises", { id: routineId }) as RoutineWithExercises;
      
      if (routine.exercises && routine.exercises.length > 0) {
        const exerciseForms: WorkoutEntryForm[] = routine.exercises.map((exercise, index) => ({
          exercise_id: exercise.exercise_id,
          sets: exercise.sets || 1,
          reps: exercise.reps || 1,
          weight: exercise.weight || 0,
          notes: exercise.notes || "",
          order: index,
          group_number: selectedGroupForRoutine
        }));
        
        setSessionForm({ exercises: exerciseForms });
        setShowLoadRoutineModal(false);
        
        showToast(DASHBOARD_SUCCESS_MESSAGES.ROUTINE_LOADED(routine.name, routine.exercises.length, selectedGroupForRoutine), "success");
      } else {
        showToast(DASHBOARD_WARNING_MESSAGES.ROUTINE_NO_EXERCISES, "warning");
      }
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_LOAD_ROUTINE, error);
      showToast(DASHBOARD_ERROR_MESSAGES.LOAD_ROUTINE_FAILED, "error");
    }
  };

  const handleShowLoadRoutineModal = () => {
    if (!selectedPerson) {
      showToast(DASHBOARD_ERROR_MESSAGES.PERSON_REQUIRED, "warning");
      return;
    }
    
    setShowLoadRoutineModal(true);
  };

  const handleLoadRoutineToDate = async () => {
    if (!selectedPerson || !selectedRoutineForLoad || !selectedDateForRoutine) {
      showToast(DASHBOARD_ERROR_MESSAGES.REQUIRED_FIELDS, "error");
      return;
    }

    try {
      const routine = await invoke("get_routine_with_exercises", { id: selectedRoutineForLoad }) as RoutineWithExercises;
      
      if (routine.exercises && routine.exercises.length > 0) {
        // Check if there are existing exercises for the selected date
        const existingExercises = workoutData.filter(entry => entry.date === selectedDateForRoutine);
        
        let shouldProceed = true;
        if (existingExercises.length > 0) {
          shouldProceed = await showConfirm(
            DASHBOARD_WARNING_MESSAGES.REPLACE_EXISTING_EXERCISES,
            { title: DASHBOARD_UI_LABELS.WARNING_TITLE, type: "warning" }
          );
        }
        
        if (shouldProceed) {
          // Delete existing exercises for this date if any
          if (existingExercises.length > 0) {
            for (const exercise of existingExercises) {
              if (exercise.id) {
                await invoke("delete_workout_entry", { id: exercise.id });
              }
            }
          }
          
          // Create new workout entries from routine
          for (let i = 0; i < routine.exercises.length; i++) {
            const exercise = routine.exercises[i];
            const workoutEntry = {
              person_id: selectedPerson.id!,
              exercise_id: exercise.exercise_id,
              date: selectedDateForRoutine,
              sets: exercise.sets || 1,
              reps: exercise.reps || 1,
              weight: exercise.weight || 0,
              notes: exercise.notes || "",
              order: i,
              group_number: selectedGroupForRoutine
            };
            
            console.log("Sending routine workoutEntry:", workoutEntry);
            await invoke("create_workout_entry", { workoutEntry: workoutEntry });
          }
          
          // Refresh workout data
          await fetchWorkoutData(selectedPerson.id!);
          
          // Close modal and reset form
          setShowLoadRoutineModal(false);
          setSelectedRoutineForLoad(null);
          setSelectedDateForRoutine("");
          setSelectedGroupForRoutine(1);
          
          showToast(DASHBOARD_SUCCESS_MESSAGES.ROUTINE_APPLIED(routine.name, routine.exercises.length, selectedGroupForRoutine), "success");
        }
      } else {
        showToast(DASHBOARD_WARNING_MESSAGES.ROUTINE_NO_EXERCISES, "warning");
      }
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.CONSOLE_APPLY_ROUTINE, error);
      showToast(DASHBOARD_ERROR_MESSAGES.APPLY_ROUTINE_FAILED, "error");
    }
  };

  // Load workout data when selectedPerson is available (including from sessionStorage)
  useEffect(() => {
    if (selectedPerson && selectedPerson.id) {
      // Calculate date range for the last 3 weeks
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 20); // Go back 20 days to cover 3 weeks
      const endDate = new Date(today);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Load workout data for the selected person
      WorkoutService.getWorkoutEntriesByPersonAndDateRange(
        selectedPerson.id,
        startDateStr,
        endDateStr
      ).then((data) => {
        setWorkoutData(data);
      }).catch((error) => {
        console.error("Error loading workout data:", error);
        showToast("Error al cargar los datos de entrenamiento", "error");
      });
    }
  }, [selectedPerson]); // This will run when selectedPerson changes or is loaded from sessionStorage

  useEffect(() => {
    const initializeData = async () => {
      try {
        await fetchAllExercises();
        await fetchRoutines();
      } catch (error) {
        console.error(DASHBOARD_ERROR_MESSAGES.INITIALIZE_DATA_FAILED, error);
      }
    };

    initializeData();
  }, []);

  // Save selectedPerson to sessionStorage whenever it changes
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
    <div style={getDashboardWrapperStyles()}>
      <div style={{ ...getContainerStyles(), height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Configuraciones button moved to navbar */}
          </div>
          {/* 
          {selectedPerson && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Button
                onClick={handleShowLoadRoutineModal}
                variant="secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontSize: '14px'
                }}
              >
                <span>🏋️</span>
                Cargar desde Rutina
              </Button>
            </div>
          )}
          */}
        </div>
        {/* Weekly Calendar with Embedded Person Search */}
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
        <div style={{ padding: '8px 0' }}>
          {selectedPerson && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {selectedPerson.name} {selectedPerson.last_name}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Aplicar rutina a una fecha específica
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Seleccionar Rutina:
              </label>
              <select
                value={selectedRoutineForLoad || ''}
                onChange={(e) => setSelectedRoutineForLoad(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)'
                }}
              >
                <option value="">-- Seleccionar rutina --</option>
                {routines.map(routine => (
                  <option key={routine.id} value={routine.id}>
                    {routine.name} ({routine.exerciseCount} ejercicios)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
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

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Grupo:
              </label>
              <select
                value={selectedGroupForRoutine}
                onChange={(e) => setSelectedGroupForRoutine(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)'
                }}
              >
                <option value={1}>Grupo 1</option>
                <option value={2}>Grupo 2</option>
                <option value={3}>Grupo 3</option>
                <option value={4}>Grupo 4</option>
                <option value={5}>Grupo 5</option>
              </select>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Todos los ejercicios de la rutina se asignarán a este grupo
              </div>
            </div>

            {selectedRoutineForLoad && selectedDateForRoutine && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: 'var(--bg-tertiary)', 
                borderRadius: '8px', 
                fontSize: '14px', 
                color: 'var(--accent-primary)',
                border: '1px solid var(--border-light)'
              }}>
                ℹ️ La rutina seleccionada se aplicará a la fecha {new Date(selectedDateForRoutine).toLocaleDateString('es-ES')} en el Grupo {selectedGroupForRoutine}. 
                Si ya existen ejercicios para esa fecha, serán reemplazados.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
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