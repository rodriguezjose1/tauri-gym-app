import React, { useState } from "react";
import { Button, Input, Modal } from "../ui";
import { ExerciseAutocomplete } from "./ExerciseAutocomplete";
import { Person, Exercise, WorkoutEntryForm, WorkoutSessionForm, WorkoutEntryWithDetails, RoutineOption } from '../../types/dashboard';

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
        <div style={{ padding: '8px 0' }}>
          {selectedPerson && selectedDate && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                {selectedPerson.name} {selectedPerson.last_name}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                📅 {formatDate(selectedDate)}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: '20px' }}>
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

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
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
        <div style={{ padding: '8px 0' }}>
          {selectedPerson && selectedDate && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                {selectedPerson.name} {selectedPerson.last_name}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                📅 {formatDate(selectedDate)}
              </div>
            </div>
          )}

          {/* Routine Selection Section */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: '#374151', fontSize: '16px', fontWeight: '600' }}>
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
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Seleccionar Rutina:
                  </label>
                  <select
                    value={selectedRoutineId || ''}
                    onChange={(e) => setSelectedRoutineId(e.target.value ? parseInt(e.target.value) : null)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
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
                
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
                    style={{
                      backgroundColor: selectedRoutineId && !loadingRoutine ? '#007bff' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: selectedRoutineId && !loadingRoutine ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
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
                  <div style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#fef3c7', 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    color: '#92400e',
                    border: '1px solid #fbbf24'
                  }}>
                    ⚠️ Los ejercicios actuales serán reemplazados por los de la rutina seleccionada.
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Exercise Forms */}
            <div style={{ display: 'grid', gap: '16px' }}>
              {sessionForm.exercises.map((exercise, index) => (
                <div key={index} style={{ 
                  padding: '16px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, color: '#374151', fontSize: '16px' }}>
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

                  <div style={{ display: 'grid', gap: '16px' }}>
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

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                onClick={onAddExerciseToSession}
                variant="secondary"
                style={{ alignSelf: 'start' }}
              >
                + Agregar Ejercicio
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
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