import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import { DeleteConfirmationModal } from "../components/ui";
import { WeeklyCalendar, WorkoutModals } from "../components/dashboard";
import {
  Person,
  Exercise,
  WorkoutEntry,
  WorkoutEntryWithDetails,
  WorkoutEntryForm,
  WorkoutSessionForm
} from "../types/dashboard";

export default function Dashboard() {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(() => {
    // Initialize selectedPerson from localStorage if available
    const savedPerson = localStorage.getItem('dashboard-selectedPerson');
    return savedPerson ? JSON.parse(savedPerson) : null;
  });
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutData, setWorkoutData] = useState<WorkoutEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

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

  useEffect(() => {
    fetchAllExercises();
  }, []);

  // Save selectedPerson to localStorage whenever it changes
  useEffect(() => {
    if (selectedPerson) {
      localStorage.setItem('dashboard-selectedPerson', JSON.stringify(selectedPerson));
    } else {
      localStorage.removeItem('dashboard-selectedPerson');
    }
  }, [selectedPerson]);

  // Fetch workout data when component mounts if there's a saved person (only once)
  useEffect(() => {
    if (!initialLoadDone && selectedPerson?.id) {
      fetchWorkoutData(selectedPerson.id);
      setInitialLoadDone(true);
    }
  }, [selectedPerson?.id, initialLoadDone]);

  // Debug: Log exercises when they change
  useEffect(() => {
    console.log("Exercises loaded:", exercises.length, exercises);
  }, [exercises]);

  // Debug: Log session form when it changes
  useEffect(() => {
    console.log("Session form changed:", sessionForm);
  }, [sessionForm]);

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 80px)', 
      width: '100%', 
      padding: '16px', 
      fontFamily: 'Inter, system-ui, sans-serif',
      backgroundColor: '#f8fafc'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
        
        // Common props
        selectedPerson={selectedPerson}
        selectedDate={selectedDate}
        exercises={exercises}
        workoutData={workoutData}
      />

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        title="Confirmar eliminación"
        message="¿Estás seguro de que quieres eliminar este ejercicio? Esta acción no se puede deshacer."
        onCancel={cancelDeleteWorkoutEntry}
        onConfirm={confirmDeleteWorkoutEntry}
        isDeleting={deletingWorkout}
      />
    </div>
  );
} 