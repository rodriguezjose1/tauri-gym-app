import React, { useState, useEffect } from "react";
import { Button, Input, Modal, Select } from "../../../shared/components/base";
import { ExerciseAutocomplete } from "../../exercise";
import { Person, Exercise, WorkoutEntryWithDetails, RoutineService, ExerciseService } from '../../../services';
import { WorkoutEntryForm, EditWorkoutEntryForm, WorkoutSessionForm, RoutineOption } from '../../../shared/types/dashboard';
import '../../../styles/WorkoutModals.css';

interface WorkoutModalsProps {
  // Single workout modal
  showWorkoutModal: boolean;
  workoutForm: WorkoutEntryForm;
  savingWorkout: boolean;
  onCloseWorkoutModal: () => void;
  onSaveWorkoutEntry: () => void;
  onUpdateWorkoutForm: (field: keyof WorkoutEntryForm, value: any) => void;
  
  // Edit workout modal
  showEditModal: boolean;
  editForm: EditWorkoutEntryForm;
  savingEdit: boolean;
  onCloseEditModal: () => void;
  onSaveEditEntry: () => void;
  onUpdateEditForm: (field: keyof EditWorkoutEntryForm, value: any) => void;
  
  // Session modal
  showSessionModal: boolean;
  sessionForm: WorkoutSessionForm;
  savingSession: boolean;
  onCloseSessionModal: () => void;
  onSaveWorkoutSession: () => void;
  onUpdateSessionExercise: (index: number, field: keyof WorkoutEntryForm, value: any) => void;
  onDeleteSessionExercise: (index: number) => void;
  onAddExerciseToSession: () => void;
  onDeleteWorkoutEntry: (id: number) => void;
  
  // Routine functionality
  routines: RoutineOption[];
  onLoadRoutine: (routineId: number) => void;
  loadingRoutine: boolean;
  
  // Common props
  selectedPerson: Person | null;
  selectedDate: string;
  workoutData: WorkoutEntryWithDetails[];
}

export const WorkoutModals: React.FC<WorkoutModalsProps> = ({
  // Single workout modal
  showWorkoutModal,
  workoutForm,
  savingWorkout,
  onCloseWorkoutModal,
  onSaveWorkoutEntry,
  onUpdateWorkoutForm,
  
  // Edit workout modal
  showEditModal,
  editForm,
  savingEdit,
  onCloseEditModal,
  onSaveEditEntry,
  onUpdateEditForm,
  
  // Session modal
  showSessionModal,
  sessionForm,
  savingSession,
  onCloseSessionModal,
  onSaveWorkoutSession,
  onUpdateSessionExercise,
  onDeleteSessionExercise,
  onAddExerciseToSession,
  onDeleteWorkoutEntry,
  
  // Routine functionality
  routines,
  onLoadRoutine,
  loadingRoutine,
  
  // Common props
  selectedPerson,
  selectedDate,
  workoutData
}) => {
  const [showRoutineSelector, setShowRoutineSelector] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<number | null>(null);
  const [routineExerciseCounts, setRoutineExerciseCounts] = useState<{ [key: number]: number }>({});
  const [loadingCounts, setLoadingCounts] = useState<{ [key: number]: boolean }>({});
  const [sessionExercises, setSessionExercises] = useState<{ [key: number]: Exercise | null }>({});

  // Load exercise count for a routine
  const loadRoutineExerciseCount = async (routineId: number) => {
    if (routineExerciseCounts[routineId] !== undefined || loadingCounts[routineId]) {
      return;
    }

    setLoadingCounts(prev => ({ ...prev, [routineId]: true }));
    try {
      const routineWithExercises = await RoutineService.getRoutineWithExercises(routineId);
      const count = routineWithExercises?.exercises?.length || 0;
      setRoutineExerciseCounts(prev => ({ ...prev, [routineId]: count }));
    } catch (error) {
      console.error(`Error loading exercise count for routine ${routineId}:`, error);
      setRoutineExerciseCounts(prev => ({ ...prev, [routineId]: 0 }));
    } finally {
      setLoadingCounts(prev => ({ ...prev, [routineId]: false }));
    }
  };

  // Load exercise details for session exercises
  const loadExerciseDetails = async (exerciseId: number) => {
    if (sessionExercises[exerciseId] !== undefined) {
      return sessionExercises[exerciseId];
    }

    // First try to find the exercise in workoutData (for existing exercises)
    const existingExercise = workoutData.find(entry => entry.exercise_id === exerciseId);
    if (existingExercise) {
      const exercise: Exercise = {
        id: existingExercise.exercise_id,
        name: existingExercise.exercise_name,
        code: existingExercise.exercise_code
      };
      setSessionExercises(prev => ({ ...prev, [exerciseId]: exercise }));
      return exercise;
    }

    // If not found in workoutData, try to get from API
    try {
      // Use search to find the exercise by ID
      const response = await ExerciseService.searchExercisesPaginated(exerciseId.toString(), 1, 100);
      const exercise = response.exercises.find(e => e.id === exerciseId);
      
      if (exercise) {
        setSessionExercises(prev => ({ ...prev, [exerciseId]: exercise }));
        return exercise;
      } else {
        setSessionExercises(prev => ({ ...prev, [exerciseId]: null }));
        return null;
      }
    } catch (error) {
      console.error(`Error loading exercise details for ID ${exerciseId}:`, error);
      setSessionExercises(prev => ({ ...prev, [exerciseId]: null }));
      return null;
    }
  };

  // Load exercise details from routine exercises
  const loadExerciseDetailsFromRoutine = async (routineId: number) => {
    try {
      const routine = await RoutineService.getRoutineWithExercises(routineId);
      if (routine && routine.exercises) {
        // Create Exercise objects from routine exercises
        const exerciseDetails: { [key: number]: Exercise } = {};
        routine.exercises.forEach(routineExercise => {
          exerciseDetails[routineExercise.exercise_id] = {
            id: routineExercise.exercise_id,
            name: routineExercise.exercise_name,
            code: routineExercise.exercise_code
          };
        });
        
        // Update session exercises with the loaded details
        setSessionExercises(prev => ({ ...prev, ...exerciseDetails }));
      }
    } catch (error) {
      console.error(`Error loading exercise details from routine ${routineId}:`, error);
    }
  };

  // Load exercise counts for all routines when session modal opens
  useEffect(() => {
    if (showSessionModal && routines.length > 0) {
      routines.forEach(routine => {
        if (routine.exerciseCount === 0) {
          loadRoutineExerciseCount(routine.id);
        }
      });
    }
  }, [showSessionModal, routines]);

  // Load exercise details when session form changes
  useEffect(() => {
    if (showSessionModal && sessionForm.exercises) {
      sessionForm.exercises.forEach((exercise: WorkoutEntryForm) => {
        if (exercise.exercise_id && exercise.exercise_id > 0) {
          loadExerciseDetails(exercise.exercise_id);
        }
      });
    }
  }, [showSessionModal, sessionForm.exercises]);

  // Load exercise details when edit modal opens
  useEffect(() => {
    if (showEditModal && editForm.exercise_id && editForm.exercise_id > 0) {
      loadExerciseDetails(editForm.exercise_id);
    }
  }, [showEditModal, editForm.exercise_id]);

  // Load exercise details for all exercises in session form when it changes
  useEffect(() => {
    if (showSessionModal && sessionForm.exercises) {
      const loadAllExerciseDetails = async () => {
        const exerciseIds = sessionForm.exercises
          .map((exercise: WorkoutEntryForm) => exercise.exercise_id)
          .filter((id: number) => id && id > 0);
        
        // Load details for all exercises in parallel
        await Promise.all(
          exerciseIds.map((exerciseId: number) => loadExerciseDetails(exerciseId))
        );
      };
      
      loadAllExerciseDetails();
    }
  }, [showSessionModal, sessionForm.exercises]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleLoadRoutine = async () => {
    if (selectedRoutineId) {
      // Load routine exercises and their details
      await loadExerciseDetailsFromRoutine(selectedRoutineId);
      
      // Call the parent handler to load the routine
      onLoadRoutine(selectedRoutineId);
      setShowRoutineSelector(false);
      setSelectedRoutineId(null);
    }
  };

  return (
    <>
      {/* Workout Entry Modal */}
      <Modal
        isOpen={showWorkoutModal}
        onClose={onCloseWorkoutModal}
        title="Agregar Entrenamiento"
        size="md"
      >
        <div className="workout-modal-content">
          {selectedPerson && selectedDate && (
            <div className="workout-modal-person-date-info">
              <div className="workout-modal-person-name">
                {selectedPerson.name} {selectedPerson.last_name}
              </div>
              <div className="workout-modal-date">
                📅 {formatDate(selectedDate)}
              </div>
            </div>
          )}

          <div className="workout-modal-form-grid">
            <div>
              <ExerciseAutocomplete
                onExerciseSelect={(exercise) => {
                  console.log("=== SINGLE WORKOUT MODAL ===");
                  console.log("Exercise received in modal:", exercise);
                  console.log("Current workoutForm.exercise_id:", workoutForm.exercise_id);
                  if (exercise) {
                    console.log("Setting exercise_id to:", exercise.id || 0);
                    onUpdateWorkoutForm('exercise_id', exercise.id || 0);
                    console.log("After update - workoutForm should have exercise_id:", exercise.id);
                  } else {
                    console.log("Clearing exercise_id");
                    onUpdateWorkoutForm('exercise_id', 0);
                  }
                }}
                placeholder="Buscar ejercicio..."
                selectedExercise={null}
              />
            </div>

            {/* Group Selection */}
            <Select
              label="Grupo:"
              options={[
                { value: 1, label: "Grupo 1" },
                { value: 2, label: "Grupo 2" },
                { value: 3, label: "Grupo 3" },
                { value: 4, label: "Grupo 4" },
                { value: 5, label: "Grupo 5" }
              ]}
              value={workoutForm.group_number || 1}
              onChange={(value) => onUpdateWorkoutForm('group_number', parseInt(value.toString()))}
              placeholder="Seleccionar grupo"
              variant="primary"
              size="md"
              fullWidth
              helperText="Los ejercicios del mismo grupo se mostrarán juntos en el calendario"
            />

            {/* Temporarily commented out - using default values
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <Input
                label="Series *"
                type="number"
                min="1"
                value={workoutForm.sets.toString()}
                onChange={(e) => onUpdateWorkoutForm('sets', parseInt(e.target.value) || 1)}
                variant="primary"
                fullWidth
              />
              
              <Input
                label="Repeticiones *"
                type="number"
                min="1"
                value={workoutForm.reps.toString()}
                onChange={(e) => onUpdateWorkoutForm('reps', parseInt(e.target.value) || 1)}
                variant="primary"
                fullWidth
              />
              
              <Input
                label="Peso (kg)"
                type="number"
                min="0"
                step="0.5"
                value={workoutForm.weight.toString()}
                onChange={(e) => onUpdateWorkoutForm('weight', parseFloat(e.target.value) || 0)}
                variant="primary"
                fullWidth
              />
            </div>

            <Input
              label="Notas"
              placeholder="Observaciones adicionales..."
              value={workoutForm.notes}
              onChange={(e) => onUpdateWorkoutForm('notes', e.target.value)}
              variant="primary"
              fullWidth
            />
            */}
          </div>

          <div className="workout-modal-actions">
            <Button
              onClick={onCloseWorkoutModal}
              variant="secondary"
              disabled={savingWorkout}
            >
              Cancelar
            </Button>
            <Button
              onClick={onSaveWorkoutEntry}
              variant="primary"
              loading={savingWorkout}
              disabled={workoutForm.exercise_id === 0}
            >
              {savingWorkout ? "Guardando..." : "Guardar Entrenamiento"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Workout Entry Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={onCloseEditModal}
        title="Editar Ejercicio"
        size="md"
      >
        <div className="workout-modal-content">
          {selectedPerson && editForm.date && (
            <div className="workout-modal-person-date-info">
              <div className="workout-modal-person-name">
                {selectedPerson.name} {selectedPerson.last_name}
              </div>
              <div className="workout-modal-date">
                📅 {formatDate(editForm.date)}
              </div>
            </div>
          )}

          <div className="workout-modal-form-grid">
            <div>
              <ExerciseAutocomplete
                onExerciseSelect={(exercise) => {
                  if (exercise) {
                    onUpdateEditForm('exercise_id', exercise.id || 0);
                  } else {
                    onUpdateEditForm('exercise_id', 0);
                  }
                }}
                placeholder="Buscar ejercicio..."
                selectedExercise={sessionExercises[editForm.exercise_id] || null}
              />
            </div>

            {/* Group Selection */}
            <Select
              label="Grupo:"
              options={[
                { value: 1, label: "Grupo 1" },
                { value: 2, label: "Grupo 2" },
                { value: 3, label: "Grupo 3" },
                { value: 4, label: "Grupo 4" },
                { value: 5, label: "Grupo 5" }
              ]}
              value={editForm.group_number || 1}
              onChange={(value) => onUpdateEditForm('group_number', parseInt(value.toString()))}
              placeholder="Seleccionar grupo"
              variant="primary"
              size="md"
              fullWidth
              helperText="Los ejercicios del mismo grupo se mostrarán juntos en el calendario"
            />

            {/* Temporarily commented out - using default values
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <Input
                label="Series *"
                type="number"
                min="1"
                value={editForm.sets?.toString() || '1'}
                onChange={(e) => onUpdateEditForm('sets', parseInt(e.target.value) || 1)}
                variant="primary"
                fullWidth
              />
              
              <Input
                label="Repeticiones *"
                type="number"
                min="1"
                value={editForm.reps?.toString() || '1'}
                onChange={(e) => onUpdateEditForm('reps', parseInt(e.target.value) || 1)}
                variant="primary"
                fullWidth
              />
              
              <Input
                label="Peso (kg)"
                type="number"
                min="0"
                step="0.5"
                value={editForm.weight?.toString() || '0'}
                onChange={(e) => onUpdateEditForm('weight', parseFloat(e.target.value) || 0)}
                variant="primary"
                fullWidth
              />
            </div>

            <Input
              label="Notas"
              placeholder="Observaciones adicionales..."
              value={editForm.notes || ''}
              onChange={(e) => onUpdateEditForm('notes', e.target.value)}
              variant="primary"
              fullWidth
            />
            */}
          </div>

          <div className="workout-modal-actions">
            <Button
              onClick={onCloseEditModal}
              variant="secondary"
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button
              onClick={onSaveEditEntry}
              variant="primary"
              loading={savingEdit}
              disabled={editForm.exercise_id === 0}
            >
              {savingEdit ? "Guardando..." : "Actualizar Ejercicio"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Workout Session Modal */}
      <Modal
        isOpen={showSessionModal}
        onClose={onCloseSessionModal}
        title={(() => {
          if (!selectedDate) return "Gestionar Sesión de Entrenamiento";
          
          const existingExercises = workoutData
            .filter(entry => entry.date === selectedDate)
            .map(entry => ({
              ...entry,
              person_name: `${entry.person_name} ${entry.person_last_name}`,
              exercise_name: entry.exercise_name,
              exercise_code: entry.exercise_code
            }));
          
          return existingExercises.length > 0 
            ? "Editar Sesión de Entrenamiento" 
            : "Nueva Sesión de Entrenamiento";
        })()}
        size="lg"
      >
        <div className="workout-modal-content">
          <div className="workout-modal-routine-selector">
            <div className="workout-modal-routine-compact">
              <Select
                label=""
                options={[
                  { value: '', label: 'Seleccionar rutina...' },
                  ...routines.map(routine => {
                    const count = routineExerciseCounts[routine.id];
                    const isLoading = loadingCounts[routine.id];
                    const displayCount = count !== undefined ? count : (isLoading ? '...' : '0');
                    
                    return {
                      value: routine.id,
                      label: `${routine.name} (${displayCount} ejercicios)`
                    };
                  })
                ]}
                value={selectedRoutineId || ''}
                onChange={(value) => setSelectedRoutineId(value ? Number(value) : null)}
                placeholder="Seleccionar rutina..."
                variant="primary"
                size="sm"
                fullWidth
              />
              <Button
                onClick={async () => {
                  console.log("Cargar Ejercicios button clicked, selectedRoutineId:", selectedRoutineId);
                  if (selectedRoutineId) {
                    console.log("Calling handleLoadRoutine");
                    await handleLoadRoutine();
                  } else {
                    console.log("No routine selected");
                  }
                }}
                disabled={!selectedRoutineId || loadingRoutine}
                variant="primary"
                size="sm"
                className="workout-modal-load-routine-compact"
              >
                {loadingRoutine ? '⏳' : '📋'}
              </Button>
            </div>
            
            {sessionForm.exercises.length > 1 && selectedRoutineId && (
              <div className="workout-modal-warning-compact">
                ⚠️ Los ejercicios actuales serán reemplazados
              </div>
            )}
          </div>

          <div className="workout-modal-form-grid">
            {/* Exercise Forms */}
            <div className="workout-modal-exercise-list">
              {sessionForm.exercises.map((exercise: WorkoutEntryForm, index: number) => (
                <div key={index} className="workout-modal-exercise-item">
                  <div className="workout-modal-exercise-header">
                    <h4 className="workout-modal-exercise-title">
                      Ejercicio {index + 1}
                    </h4>
                    {sessionForm.exercises.length > 1 && (
                      <Button
                        onClick={() => onDeleteSessionExercise(index)}
                        variant="danger"
                        size="sm"
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>

                  <div className="workout-modal-form-grid">
                    <ExerciseAutocomplete
                      onExerciseSelect={(exercise) => {
                        if (exercise) {
                          console.log(`Session form - exercise ${index} selected:`, exercise);
                          onUpdateSessionExercise(index, 'exercise_id', exercise.id || 0);
                        } else {
                          onUpdateSessionExercise(index, 'exercise_id', 0);
                        }
                      }}
                      placeholder="Buscar ejercicio..."
                      selectedExercise={sessionExercises[exercise.exercise_id] || null}
                    />

                    {/* Group Selection */}
                    <Select
                      label="Grupo:"
                      options={[
                        { value: 1, label: "Grupo 1" },
                        { value: 2, label: "Grupo 2" },
                        { value: 3, label: "Grupo 3" },
                        { value: 4, label: "Grupo 4" },
                        { value: 5, label: "Grupo 5" }
                      ]}
                      value={exercise.group_number || 1}
                      onChange={(value) => onUpdateSessionExercise(index, 'group_number', parseInt(value.toString()))}
                      placeholder="Seleccionar grupo"
                      variant="primary"
                      size="md"
                      fullWidth
                      helperText="Los ejercicios del mismo grupo se mostrarán juntos en el calendario"
                    />

                    {/* Temporarily commented out - using default values
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <Input
                        label="Series *"
                        type="number"
                        min="1"
                        value={exercise.sets.toString()}
                        onChange={(e) => onUpdateSessionExercise(index, 'sets', parseInt(e.target.value) || 1)}
                        variant="primary"
                        fullWidth
                      />
                      
                      <Input
                        label="Repeticiones *"
                        type="number"
                        min="1"
                        value={exercise.reps.toString()}
                        onChange={(e) => onUpdateSessionExercise(index, 'reps', parseInt(e.target.value) || 1)}
                        variant="primary"
                        fullWidth
                      />
                      
                      <Input
                        label="Peso (kg)"
                        type="number"
                        min="0"
                        step="0.5"
                        value={exercise.weight.toString()}
                        onChange={(e) => onUpdateSessionExercise(index, 'weight', parseFloat(e.target.value) || 0)}
                        variant="primary"
                        fullWidth
                      />
                    </div>

                    <Input
                      label="Notas"
                      placeholder="Observaciones adicionales..."
                      value={exercise.notes}
                      onChange={(e) => onUpdateSessionExercise(index, 'notes', e.target.value)}
                      variant="primary"
                      fullWidth
                    />
                    */}
                  </div>
                </div>
              ))}
            </div>

            <div className="workout-modal-add-exercise">
              <Button
                onClick={onAddExerciseToSession}
                variant="secondary"
                style={{ alignSelf: 'start' }}
              >
                + Agregar Ejercicio
              </Button>
            </div>
          </div>

          <div className="workout-modal-actions">
            <Button
              onClick={onCloseSessionModal}
              variant="secondary"
              disabled={savingSession}
            >
              Cancelar
            </Button>
            <Button
              onClick={onSaveWorkoutSession}
              variant="primary"
              loading={savingSession}
            >
              {savingSession ? "Guardando..." : "Guardar Sesión"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}; 