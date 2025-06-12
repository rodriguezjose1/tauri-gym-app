import React, { useState } from "react";
import { Button, Input, Modal, Select } from "../../../shared/components/base";
import { ExerciseAutocomplete } from "../../exercise";
import { Person, Exercise, WorkoutEntryForm, WorkoutSessionForm, WorkoutEntryWithDetails, RoutineOption } from '../../../shared/types/dashboard';
import '../../../styles/WorkoutModals.css';

interface WorkoutModalsProps {
  // Single workout modal
  showWorkoutModal: boolean;
  workoutForm: WorkoutEntryForm;
  savingWorkout: boolean;
  onCloseWorkoutModal: () => void;
  onSaveWorkoutEntry: () => void;
  onUpdateWorkoutForm: (field: keyof WorkoutEntryForm, value: any) => void;
  
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
  exercises: Exercise[];
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
  exercises,
  workoutData
}) => {
  const [showRoutineSelector, setShowRoutineSelector] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<number | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleLoadRoutine = () => {
    if (selectedRoutineId) {
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
                    console.log("Setting exercise_id to:", exercise.id);
                    onUpdateWorkoutForm('exercise_id', exercise.id || 0);
                    console.log("After update - workoutForm should have exercise_id:", exercise.id);
                  } else {
                    console.log("Clearing exercise_id");
                    onUpdateWorkoutForm('exercise_id', 0);
                  }
                }}
                placeholder="Buscar ejercicio..."
                selectedExercise={exercises.find(ex => ex.id === workoutForm.exercise_id) || null}
              />
            </div>

            {/* Group Selection */}
            <div>
              <label className="workout-modal-label">
                Grupo:
              </label>
              <select
                value={workoutForm.group_number || 1}
                onChange={(e) => onUpdateWorkoutForm('group_number', parseInt(e.target.value))}
                className="workout-modal-group-select"
              >
                <option value={1}>Grupo 1</option>
                <option value={2}>Grupo 2</option>
                <option value={3}>Grupo 3</option>
                <option value={4}>Grupo 4</option>
                <option value={5}>Grupo 5</option>
              </select>
              <div className="workout-modal-group-help">
                Los ejercicios del mismo grupo se mostrarán juntos en el calendario
              </div>
            </div>

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

          {/* Routine Selection Section */}
          <div className="workout-modal-routine-section">
            <div className="workout-modal-routine-header">
              <h4 className="workout-modal-routine-title">
                🏋️ Cargar desde Rutina
              </h4>
              <Button
                onClick={() => setShowRoutineSelector(!showRoutineSelector)}
                variant="secondary"
                style={{ fontSize: '14px' }}
              >
                {showRoutineSelector ? 'Cancelar' : 'Seleccionar Rutina'}
              </Button>
            </div>
            
            {showRoutineSelector && (
              <div className="workout-modal-routine-selector">
                <div>
                  <label className="workout-modal-label">
                    Seleccionar Rutina:
                  </label>
                  <select
                    value={selectedRoutineId || ''}
                    onChange={(e) => setSelectedRoutineId(e.target.value ? parseInt(e.target.value) : null)}
                    className="workout-modal-routine-select"
                  >
                    <option value="">-- Seleccionar rutina --</option>
                    {routines.map(routine => (
                      <option key={routine.id} value={routine.id}>
                        {routine.name} ({routine.exerciseCount} ejercicios)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="workout-modal-routine-actions">
                  <Button
                    onClick={() => {
                      setShowRoutineSelector(false);
                      setSelectedRoutineId(null);
                    }}
                    variant="secondary"
                    style={{ fontSize: '14px' }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      console.log("Cargar Ejercicios button clicked, selectedRoutineId:", selectedRoutineId);
                      if (selectedRoutineId) {
                        console.log("Calling handleLoadRoutine");
                        handleLoadRoutine();
                      } else {
                        console.log("No routine selected");
                      }
                    }}
                    disabled={!selectedRoutineId || loadingRoutine}
                    className={`workout-modal-load-routine-btn ${(!selectedRoutineId || loadingRoutine) ? 'disabled' : ''}`}
                  >
                    {loadingRoutine ? (
                      <>
                        <span>⏳</span>
                        Cargando...
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        Cargar Ejercicios
                      </>
                    )}
                  </Button>
                </div>
                
                {sessionForm.exercises.length > 1 && (
                  <div className="workout-modal-warning">
                    ⚠️ Los ejercicios actuales serán reemplazados por los de la rutina seleccionada.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="workout-modal-form-grid">
            {/* Exercise Forms */}
            <div className="workout-modal-exercise-list">
              {sessionForm.exercises.map((exercise, index) => (
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
                      selectedExercise={exercises.find(ex => ex.id === exercise.exercise_id) || null}
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