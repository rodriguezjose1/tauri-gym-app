import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import { DeleteConfirmationModal, Modal, Input, Button } from "../components/ui";
import { WeeklyCalendar, WorkoutModals } from "../components/dashboard";
import { getDashboardWrapperStyles, getContainerStyles } from "../config/layout";
import {
  Person,
  Exercise,
  WorkoutEntry,
  WorkoutEntryWithDetails,
  WorkoutEntryForm,
  WorkoutSessionForm,
  RoutineOption,
  RoutineWithExercises
} from "../types/dashboard";

export default function Dashboard() {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(() => {
    // Use sessionStorage instead of localStorage for automatic cleanup on app close
    const savedPerson = sessionStorage.getItem('dashboard-selectedPerson');
    return savedPerson ? JSON.parse(savedPerson) : null;
  });
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutData, setWorkoutData] = useState<WorkoutEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Routine state
  const [routines, setRoutines] = useState<RoutineOption[]>([]);
  const [loadingRoutine, setLoadingRoutine] = useState(false);

  // Workout Entry Modal State
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [workoutForm, setWorkoutForm] = useState<WorkoutEntryForm>({
    exercise_id: 0,
    sets: 1,
    reps: 1,
    weight: 0,
    notes: ""
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
      notes: ""
    }]
  });
  const [savingSession, setSavingSession] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteWorkoutId, setDeleteWorkoutId] = useState<number | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState(false);

  // Load from routine modal state
  const [showLoadRoutineModal, setShowLoadRoutineModal] = useState(false);
  const [selectedRoutineForLoad, setSelectedRoutineForLoad] = useState<number | null>(null);
  const [selectedDateForRoutine, setSelectedDateForRoutine] = useState<string>("");

  const fetchAllExercises = async () => {
    try {
      console.log("Fetching exercises...");
      const result = await invoke("get_exercises");
      console.log("Exercises fetched:", result);
      setExercises(result as Exercise[]);
    } catch (error) {
      console.error("Error fetching all exercises:", error);
      // Try to fetch with pagination as fallback
      try {
        const fallbackResult = await invoke("get_exercises_paginated", { page: 1, pageSize: 100 });
        console.log("Exercises fetched via pagination:", fallbackResult);
        setExercises(fallbackResult as Exercise[]);
      } catch (fallbackError) {
        console.error("Error fetching exercises with pagination:", fallbackError);
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
      console.error("Error fetching routines:", error);
    }
  };

  const fetchWorkoutData = async (personId: number, startDate?: string, endDate?: string) => {
    setWorkoutLoading(true);
    try {
      let actualStartDate: string;
      let actualEndDate: string;

      if (startDate && endDate) {
        actualStartDate = startDate;
        actualEndDate = endDate;
      } else {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 20); // Last 3 weeks
        actualStartDate = start.toISOString().split('T')[0];
        actualEndDate = today.toISOString().split('T')[0];
      }
      
      const result = await invoke("get_workout_entries_by_person_and_date_range", {
        personId,
        startDate: actualStartDate,
        endDate: actualEndDate
      });

      const workoutEntries = result as WorkoutEntryWithDetails[];
      setWorkoutData(workoutEntries);
    } catch (error) {
      console.error("Error fetching workout data:", error);
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
          order: exercise.order || 0
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
          order: 0
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
        order: 0
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
      notes: ""
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
      notes: ""
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
        order: 0
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
        order: sessionForm.exercises.length
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
    setWorkoutForm({ ...workoutForm, [field]: value });
  };

  const handleSaveWorkoutEntry = async () => {
    if (!selectedPerson || !selectedDate || workoutForm.exercise_id === 0) {
      await message("Por favor, completa todos los campos requeridos", { title: "Error", kind: "error" });
      return;
    }

    setSavingWorkout(true);
    try {
      const workoutEntry: WorkoutEntry = {
        person_id: selectedPerson.id!,
        exercise_id: workoutForm.exercise_id,
        date: selectedDate,
        sets: workoutForm.sets,
        reps: workoutForm.reps,
        weight: workoutForm.weight || undefined,
        notes: workoutForm.notes || undefined
      };

      await invoke("create_workout_entry", { workoutEntry });
      
      // Refresh workout data
      await fetchWorkoutData(selectedPerson.id!);
      
      // Close modal
      handleCloseWorkoutModal();
      
      await message("Entrada de entrenamiento agregada correctamente", { title: "Éxito", kind: "info" });
    } catch (error) {
      console.error("Error saving workout entry:", error);
      await message("Error al guardar la entrada de entrenamiento", { title: "Error", kind: "error" });
    } finally {
      setSavingWorkout(false);
    }
  };

  const handleSaveWorkoutSession = async () => {
    if (!selectedPerson || !selectedDate) {
      await message("Por favor, selecciona una persona y fecha", { title: "Error", kind: "error" });
      return;
    }

    // Check if we're trying to save an empty session (all exercises have exercise_id = 0)
    const hasValidExercises = sessionForm.exercises.some(exercise => exercise.exercise_id !== 0);
    
    if (!hasValidExercises) {
      // If no valid exercises, ask user if they want to delete all workouts for this date
      const confirmDelete = await confirm(
        "No hay ejercicios válidos seleccionados. ¿Quieres eliminar todos los entrenamientos de esta fecha?",
        { title: "Confirmar eliminación", kind: "warning" }
      );
      
      if (confirmDelete) {
        try {
          await invoke("replace_workout_session", { 
            personId: selectedPerson.id!, 
            date: selectedDate, 
            workoutEntries: [] 
          });
          
          // Refresh workout data
          await fetchWorkoutData(selectedPerson.id!);
          
          // Close modal
          handleCloseSessionModal();
          
          await message("Todos los ejercicios han sido eliminados correctamente", { title: "Éxito", kind: "info" });
        } catch (error) {
          console.error("Error clearing exercises:", error);
          await message("Error al eliminar los ejercicios", { title: "Error", kind: "error" });
        }
      }
      return;
    }

    // Validate that all exercises have required fields
    for (let i = 0; i < sessionForm.exercises.length; i++) {
      const exercise = sessionForm.exercises[i];
      if (exercise.exercise_id === 0) {
        await message(`Por favor, selecciona un ejercicio para el ejercicio ${i + 1} o elimínalo`, { title: "Error", kind: "error" });
        return;
      }
    }

    setSavingSession(true);
    try {
      // Get existing exercises for this date
      const existingExercises = workoutData.filter(entry => entry.date === selectedDate);
      
      // Filter out exercises with exercise_id = 0
      const validExercises = sessionForm.exercises.filter(exercise => exercise.exercise_id !== 0);
      
      // Determine which exercises to update (existing ones with same exercise_id) and which to insert (new ones)
      const idsToDelete: number[] = [];
      const workoutEntriesToInsert: WorkoutEntry[] = [];
      
      for (const formExercise of validExercises) {
        // Check if there's an existing exercise with the same exercise_id for this date
        const existingExercise = existingExercises.find(existing => 
          existing.exercise_id === formExercise.exercise_id
        );
        
        if (existingExercise) {
          // Check if the data has actually changed
          const hasChanged = 
            existingExercise.sets !== formExercise.sets ||
            existingExercise.reps !== formExercise.reps ||
            existingExercise.weight !== formExercise.weight ||
            (existingExercise.notes || "") !== (formExercise.notes || "");
          
          if (hasChanged && existingExercise.id) {
            // Mark for deletion and re-insertion (update)
            idsToDelete.push(existingExercise.id);
            workoutEntriesToInsert.push({
              person_id: selectedPerson.id!,
              exercise_id: formExercise.exercise_id,
              date: selectedDate,
              sets: formExercise.sets,
              reps: formExercise.reps,
              weight: formExercise.weight || undefined,
              notes: formExercise.notes || undefined,
              order: formExercise.order || validExercises.indexOf(formExercise)
            });
          }
          // If no changes, do nothing (preserve existing)
        } else {
          // New exercise, add it
          workoutEntriesToInsert.push({
            person_id: selectedPerson.id!,
            exercise_id: formExercise.exercise_id,
            date: selectedDate,
            sets: formExercise.sets,
            reps: formExercise.reps,
            weight: formExercise.weight || undefined,
            notes: formExercise.notes || undefined,
            order: formExercise.order || validExercises.indexOf(formExercise)
          });
        }
      }
      
      // Use granular replace if we have specific changes, otherwise do nothing
      if (idsToDelete.length > 0 || workoutEntriesToInsert.length > 0) {
        await invoke("replace_workout_session_granular", { 
          idsToDelete, 
          workoutEntriesToInsert 
        });
      }
      
      // Refresh workout data
      await fetchWorkoutData(selectedPerson.id!);
      
      // Close modal
      handleCloseSessionModal();
      
      await message("Sesión de entrenamiento guardada correctamente", { title: "Éxito", kind: "info" });
      
    } catch (error) {
      console.error("Error saving workout session:", error);
      await message("Error al guardar la sesión de entrenamiento", { title: "Error", kind: "error" });
    } finally {
      setSavingSession(false);
    }
  };

  const handleDeleteWorkoutEntry = async (id: number) => {
    console.log("handleDeleteWorkoutEntry called with id:", id);
    if (!selectedPerson) {
      console.log("No selected person, returning");
      return;
    }

    // Show custom delete confirmation modal
    setDeleteWorkoutId(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteWorkoutEntry = async () => {
    if (!deleteWorkoutId || !selectedPerson) return;

    setDeletingWorkout(true);
    try {
      console.log("Calling delete_workout_entry with id:", deleteWorkoutId);
      await invoke("delete_workout_entry", { id: deleteWorkoutId });
      
      console.log("Delete successful, refreshing workout data...");
      // Refresh workout data
      await fetchWorkoutData(selectedPerson.id!);
      
      // Close modal
      setShowDeleteModal(false);
      setDeleteWorkoutId(null);
      
      console.log("Showing success message...");
      await message("Ejercicio eliminado correctamente", { title: "Éxito", kind: "info" });
    } catch (error) {
      console.error("Error deleting workout entry:", error);
      await message("Error al eliminar el ejercicio", { title: "Error", kind: "error" });
    } finally {
      setDeletingWorkout(false);
    }
  };

  const cancelDeleteWorkoutEntry = () => {
    setShowDeleteModal(false);
    setDeleteWorkoutId(null);
  };

  const handleReorderExercises = async (exerciseOrders: Array<{ id: number; order: number }>) => {
    try {
      console.log("Reordering exercises:", exerciseOrders);
      
      // Convert to the format expected by the backend
      const orderUpdates = exerciseOrders.map(item => [item.id, item.order]);
      
      await invoke("update_exercise_order", {
        exerciseOrders: orderUpdates
      });

      // Refresh workout data to reflect the new order
      if (selectedPerson) {
        await fetchWorkoutData(selectedPerson.id!);
      }
    } catch (error) {
      console.error("Error reordering exercises:", error);
      await message("Error al reordenar ejercicios", { title: "Error", kind: "error" });
    }
  };

  const handleLoadRoutine = async (routineId: number) => {
    setLoadingRoutine(true);
    try {
      console.log("Loading routine:", routineId);
      const routine = await invoke("get_routine_with_exercises", { id: routineId }) as RoutineWithExercises;
      console.log("Routine loaded:", routine);
      
      if (routine.exercises && routine.exercises.length > 0) {
        const exerciseForms: WorkoutEntryForm[] = routine.exercises.map((exercise, index) => ({
          exercise_id: exercise.exercise_id,
          sets: exercise.sets || 3,
          reps: exercise.reps || 10,
          weight: exercise.weight || 0,
          notes: exercise.notes || "",
          order: index
        }));
        
        console.log("Setting session form with routine exercises:", exerciseForms);
        setSessionForm({ exercises: exerciseForms });
        
        await message(`Rutina "${routine.name}" cargada con ${routine.exercises.length} ejercicios.`, {
          title: "Rutina Cargada",
          kind: "info"
        });
      } else {
        await message("La rutina seleccionada no tiene ejercicios.", {
          title: "Rutina Vacía",
          kind: "warning"
        });
      }
    } catch (error) {
      console.error("Error loading routine:", error);
      await message("Error al cargar la rutina. Por favor, inténtalo de nuevo.", {
        title: "Error",
        kind: "error"
      });
    } finally {
      setLoadingRoutine(false);
    }
  };

  const handleShowLoadRoutineModal = () => {
    if (!selectedPerson) {
      message("Por favor, selecciona una persona primero.", {
        title: "Persona Requerida",
        kind: "warning"
      });
      return;
    }
    setShowLoadRoutineModal(true);
  };

  const handleLoadRoutineToDate = async () => {
    if (!selectedRoutineForLoad || !selectedDateForRoutine || !selectedPerson || !selectedPerson.id) {
      return;
    }

    setLoadingRoutine(true);
    try {
      const routine = await invoke("get_routine_with_exercises", { id: selectedRoutineForLoad }) as RoutineWithExercises;
      
      if (routine.exercises && routine.exercises.length > 0) {
        // Check if there are existing exercises for this date
        const existingExercises = workoutData.filter(entry => 
          entry.date === selectedDateForRoutine && entry.person_id === selectedPerson.id
        );

        let shouldProceed = true;
        if (existingExercises.length > 0) {
          shouldProceed = await confirm(
            `Ya existen ${existingExercises.length} ejercicios para esta fecha. ¿Deseas reemplazarlos con la rutina "${routine.name}"?`,
            { title: "Confirmar Reemplazo", kind: "warning" }
          );
        }

        if (shouldProceed) {
          // Delete existing exercises if any
          if (existingExercises.length > 0) {
            for (const exercise of existingExercises) {
              if (exercise.id) {
                await invoke("delete_workout_entry", { id: exercise.id });
              }
            }
          }

          // Create new exercises from routine
          for (let i = 0; i < routine.exercises.length; i++) {
            const exercise = routine.exercises[i];
            await invoke("create_workout_entry", {
              entry: {
                person_id: selectedPerson.id,
                exercise_id: exercise.exercise_id,
                date: selectedDateForRoutine,
                sets: exercise.sets || 3,
                reps: exercise.reps || 10,
                weight: exercise.weight || 0,
                notes: exercise.notes || "",
                order: i
              }
            });
          }

          // Refresh workout data
          await fetchWorkoutData(selectedPerson.id);
          
          await message(`Rutina "${routine.name}" aplicada exitosamente con ${routine.exercises.length} ejercicios.`, {
            title: "Rutina Aplicada",
            kind: "info"
          });

          // Close modal and reset state
          setShowLoadRoutineModal(false);
          setSelectedRoutineForLoad(null);
          setSelectedDateForRoutine("");
        }
      } else {
        await message("La rutina seleccionada no tiene ejercicios.", {
          title: "Rutina Vacía",
          kind: "warning"
        });
      }
    } catch (error) {
      console.error("Error applying routine:", error);
      await message("Error al aplicar la rutina. Por favor, inténtalo de nuevo.", {
        title: "Error",
        kind: "error"
      });
    } finally {
      setLoadingRoutine(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await fetchAllExercises();
        await fetchRoutines();
        
        if (selectedPerson?.id) {
          await fetchWorkoutData(selectedPerson.id);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setLoading(false);
        setInitialLoadDone(true);
      }
    };

    initializeData();
  }, []);

  // Save selectedPerson to sessionStorage whenever it changes
  useEffect(() => {
    if (selectedPerson) {
      sessionStorage.setItem('dashboard-selectedPerson', JSON.stringify(selectedPerson));
    } else {
      sessionStorage.removeItem('dashboard-selectedPerson');
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
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#1f2937', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span>📊</span>
            Dashboard de Entrenamientos
          </h1>
          
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
        </div>
        {/* Weekly Calendar with Embedded Person Search */}
        <WeeklyCalendar
          onPersonSelect={handlePersonSelect}
          onWorkoutDataChange={setWorkoutData}
          onSelectedDateChange={setSelectedDate}
          onAddWorkoutClick={handleAddWorkoutClick}
          onDayClick={handleDayClick}
          onDayRightClick={handleDayRightClick}
          onDeleteWorkoutEntry={handleDeleteWorkoutEntry}
          onReorderExercises={handleReorderExercises}
          workoutData={workoutData}
          selectedPerson={selectedPerson}
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
        }}
        title="Cargar Rutina a Fecha Específica"
        size="md"
      >
        <div style={{ padding: '8px 0' }}>
          {selectedPerson && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                {selectedPerson.name} {selectedPerson.last_name}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Aplicar rutina a una fecha específica
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Seleccionar Rutina:
              </label>
              <select
                value={selectedRoutineForLoad || ''}
                onChange={(e) => setSelectedRoutineForLoad(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
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
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
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

            {selectedRoutineForLoad && selectedDateForRoutine && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#f0f9ff', 
                borderRadius: '8px', 
                fontSize: '14px', 
                color: '#1e40af',
                border: '1px solid #bfdbfe'
              }}>
                ℹ️ La rutina seleccionada se aplicará a la fecha {new Date(selectedDateForRoutine).toLocaleDateString('es-ES')}. 
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
    </div>
  );
} 