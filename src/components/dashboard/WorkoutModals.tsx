import React from "react";
import { Button, Input, Modal } from "../ui";
import { ExerciseAutocomplete } from "./ExerciseAutocomplete";
import { Person, Exercise, WorkoutEntryForm, WorkoutSessionForm, WorkoutEntryWithDetails } from '../../types/dashboard';

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
  
  // Common props
  selectedPerson,
  selectedDate,
  exercises,
  workoutData
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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
                exercises={exercises}
                value={workoutForm.exercise_id}
                onChange={(exerciseId) => {
                  console.log("Single workout form - exercise ID changed to:", exerciseId);
                  onUpdateWorkoutForm('exercise_id', exerciseId);
                  console.log("Updated workout form:", { ...workoutForm, exercise_id: exerciseId });
                }}
                placeholder="Buscar ejercicio..."
              />
            </div>

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
                      exercises={exercises}
                      value={exercise.exercise_id}
                      onChange={(exerciseId) => {
                        console.log(`Session form - exercise ${index} ID changed to:`, exerciseId);
                        onUpdateSessionExercise(index, 'exercise_id', exerciseId);
                      }}
                      placeholder="Buscar ejercicio..."
                    />

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