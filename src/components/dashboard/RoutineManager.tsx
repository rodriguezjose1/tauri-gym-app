import React, { useState, useEffect, useRef } from "react";
import { RoutineService, ExerciseService, Routine, RoutineWithExercises, RoutineExerciseWithDetails, Exercise } from "../../services";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input, Button, DeleteConfirmationModal } from "../ui";
import { ExerciseAutocomplete } from "./ExerciseAutocomplete";
import {
  RoutineForm,
} from "../../types/dashboard";

interface RoutineManagerProps {
  onClose?: () => void;
}

interface SortableRoutineExerciseProps {
  exercise: RoutineExerciseWithDetails;
  onUpdate: (exercise: RoutineExerciseWithDetails) => void;
  onRemove: (exerciseId: number) => void;
}

const SortableRoutineExercise: React.FC<SortableRoutineExerciseProps> = ({
  exercise,
  onUpdate,
  onRemove
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    sets: exercise.sets || 0,
    reps: exercise.reps || 0,
    weight: exercise.weight || 0,
    notes: exercise.notes || '',
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    const updatedExercise: RoutineExerciseWithDetails = {
      ...exercise,
      sets: editForm.sets || undefined,
      reps: editForm.reps || undefined,
      weight: editForm.weight || undefined,
      notes: editForm.notes.trim() || undefined,
    };
    onUpdate(updatedExercise);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      sets: exercise.sets || 0,
      reps: exercise.reps || 0,
      weight: exercise.weight || 0,
      notes: exercise.notes || '',
    });
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <div style={{
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '8px',
        transition: 'all 0.2s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Drag handle */}
          <div
            {...listeners}
            style={{
              cursor: 'grab',
              color: '#6b7280',
              fontSize: '16px',
              flexShrink: 0
            }}
            title="Arrastrar para reordenar"
          >
            ⋮⋮
          </div>

          {/* Exercise info */}
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: '600', 
              color: '#1e40af',
              marginBottom: '4px'
            }}>
              {exercise.exercise_name} ({exercise.exercise_code})
            </div>
            
            {!isEditing ? (
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {exercise.sets && `${exercise.sets} series`}
                {exercise.sets && exercise.reps && ' × '}
                {exercise.reps && `${exercise.reps} reps`}
                {exercise.weight && ` @ ${exercise.weight}kg`}
                {exercise.notes && (
                  <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                    {exercise.notes}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
                <Input
                  label="Series"
                  type="number"
                  value={editForm.sets.toString()}
                  onChange={(e) => setEditForm(prev => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}
                  variant="primary"
                />
                <Input
                  label="Reps"
                  type="number"
                  value={editForm.reps.toString()}
                  onChange={(e) => setEditForm(prev => ({ ...prev, reps: parseInt(e.target.value) || 0 }))}
                  variant="primary"
                />
                <Input
                  label="Peso (kg)"
                  type="number"
                  step="0.5"
                  value={editForm.weight.toString()}
                  onChange={(e) => setEditForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  variant="primary"
                />
                <div style={{ gridColumn: 'span 3' }}>
                  <Input
                    label="Notas"
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    variant="primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Editar ejercicio"
                >
                  Editar
                </button>
                <button
                  onClick={() => onRemove(exercise.exercise_id)}
                  style={{
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Eliminar ejercicio"
                >
                  Eliminar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Guardar
                </button>
                <button
                  onClick={handleCancel}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const RoutineManager: React.FC<RoutineManagerProps> = ({ onClose }) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineWithExercises | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  
  const [createForm, setCreateForm] = useState<RoutineForm>({
    name: '',
    code: ''
  });

  const [addExerciseForm, setAddExerciseForm] = useState({
    exerciseId: 0,
    sets: 3,
    reps: 10,
    weight: 0,
    notes: ''
  });

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRoutineId, setDeleteRoutineId] = useState<number | null>(null);
  const [deleteRoutineName, setDeleteRoutineName] = useState("");
  const [deletingRoutine, setDeletingRoutine] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load routines
  const loadRoutines = async () => {
    try {
      setLoading(true);
      const data = await RoutineService.listRoutines();
      setRoutines(data);
    } catch (error) {
      console.error("Error loading routines:", error);
    } finally {
      setLoading(false);
    }
  };

  // Search routines
  const searchRoutines = async (query: string) => {
    setLoading(true);
    try {
      const result = await RoutineService.searchRoutines(query) as Routine[];
      setRoutines(result);
    } catch (error) {
      console.error("Error searching routines:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load routine with exercises
  const loadRoutineWithExercises = async (routineId: number) => {
    try {
      setLoading(true);
      const routine = await RoutineService.getRoutineWithExercises(routineId);
      setSelectedRoutine(routine);
    } catch (error) {
      console.error("Error loading routine with exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load exercises
  const loadExercises = async () => {
    try {
      const data = await ExerciseService.getExercises();
      setExercises(data);
    } catch (error) {
      console.error("Error loading exercises:", error);
    }
  };

  // Create routine
  const handleCreateRoutine = async () => {
    if (!createForm.name.trim() || !createForm.code.trim()) {
      alert("Por favor completa todos los campos");
      return;
    }

    try {
      setLoading(true);
      await RoutineService.createRoutine(createForm.name.trim(), createForm.code.trim().toUpperCase());
      setCreateForm({ name: '', code: '' });
      setShowCreateForm(false);
      await loadRoutines();
      
      // Load the newly created routine
      await loadRoutineWithExercises(routines[routines.length - 1].id!);
    } catch (error) {
      console.error("Error creating routine:", error);
      alert("Error al crear la rutina: " + error);
    } finally {
      setLoading(false);
    }
  };

  // Delete routine
  const handleDeleteRoutine = async (routineId: number, routineName: string) => {
    setDeleteRoutineId(routineId);
    setDeleteRoutineName(routineName);
    setShowDeleteModal(true);
  };

  const confirmDeleteRoutine = async () => {
    if (!deleteRoutineId) return;

    setDeletingRoutine(true);
    try {
      await RoutineService.deleteRoutine(deleteRoutineId);
      await loadRoutines();
      if (selectedRoutine?.id === deleteRoutineId) {
        setSelectedRoutine(null);
      }
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setDeleteRoutineId(null);
      setDeleteRoutineName("");
    } catch (error) {
      console.error("Error deleting routine:", error);
      alert("Error al eliminar la rutina: " + error);
    } finally {
      setDeletingRoutine(false);
    }
  };

  const cancelDeleteRoutine = () => {
    setShowDeleteModal(false);
    setDeleteRoutineId(null);
    setDeleteRoutineName("");
  };

  // Add exercise to routine
  const handleAddExercise = async () => {
    if (!selectedRoutine || !addExerciseForm.exerciseId) {
      return;
    }

    try {
      setLoading(true);
      await RoutineService.addExerciseToRoutine(
        selectedRoutine.id!,
        addExerciseForm.exerciseId,
        selectedRoutine.exercises.length,
        addExerciseForm.sets || undefined,
        addExerciseForm.reps || undefined,
        addExerciseForm.weight || undefined,
        addExerciseForm.notes.trim() || undefined,
      );

      // Reload routine
      await loadRoutineWithExercises(selectedRoutine.id!);
      
      // Reset form
      setAddExerciseForm({
        exerciseId: 0,
        sets: 3,
        reps: 10,
        weight: 0,
        notes: ''
      });
      setShowAddExercise(false);
    } catch (error) {
      console.error("Error adding exercise to routine:", error);
      alert("Error al agregar ejercicio: " + error);
    } finally {
      setLoading(false);
    }
  };

  // Update routine exercise
  const handleUpdateRoutineExercise = async (exercise: RoutineExerciseWithDetails) => {
    try {
      await RoutineService.updateRoutineExercise(
        exercise.id!,
        exercise.routine_id,
        exercise.exercise_id,
        exercise.order_index,
        exercise.sets || 0,
        exercise.reps || 0,
        exercise.weight || 0,
        exercise.notes || '',
      );

      // Reload routine
      if (selectedRoutine) {
        await loadRoutineWithExercises(selectedRoutine.id!);
      }
    } catch (error) {
      console.error("Error updating routine exercise:", error);
      alert("Error al actualizar ejercicio: " + error);
    }
  };

  // Remove exercise from routine
  const handleRemoveExercise = async (exerciseId: number) => {
    if (!selectedRoutine) return;

    try {
      await RoutineService.removeExerciseFromRoutine(selectedRoutine.id!, exerciseId);

      // Reload routine
      await loadRoutineWithExercises(selectedRoutine.id!);
    } catch (error) {
      console.error("Error removing exercise from routine:", error);
      alert("Error al eliminar ejercicio: " + error);
    }
  };

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !selectedRoutine) {
      return;
    }

    const oldIndex = selectedRoutine.exercises.findIndex(ex => ex.id === active.id);
    const newIndex = selectedRoutine.exercises.findIndex(ex => ex.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedExercises = arrayMove(selectedRoutine.exercises, oldIndex, newIndex);
      
      // Update local state immediately for better UX
      setSelectedRoutine(prev => prev ? {
        ...prev,
        exercises: reorderedExercises
      } : null);

      // Create the order updates
      const exerciseOrders: [number, number][] = reorderedExercises.map((exercise, index) => [
        exercise.exercise_id,
        index
      ]);

      try {
        await RoutineService.reorderRoutineExercises(selectedRoutine.id!, exerciseOrders);
      } catch (error) {
        console.error("Error reordering exercises:", error);
        // Reload to get correct state
        await loadRoutineWithExercises(selectedRoutine.id!);
      }
    }
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      searchRoutines(value.trim());
    } else {
      loadRoutines();
    }
  };

  useEffect(() => {
    loadRoutines();
    loadExercises();
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: '#1f2937' }}>🏋️ Gestor de Rutinas</h2>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Panel - Routines List */}
          <div style={{
            width: '400px',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Search and Create */}
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <Input
                label=""
                placeholder="🔍 Buscar rutinas..."
                value={searchTerm}
                onChange={handleSearch}
                variant="primary"
                fullWidth
              />
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="primary"
                style={{ marginTop: '12px', width: '100%' }}
              >
                + Nueva Rutina
              </Button>
            </div>

            {/* Routines List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: '#6b7280' }}>
                  Cargando rutinas...
                </div>
              ) : routines.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280' }}>
                  No hay rutinas disponibles
                </div>
              ) : (
                routines.map((routine) => (
                  <div
                    key={routine.id}
                    onClick={() => loadRoutineWithExercises(routine.id!)}
                    style={{
                      padding: '12px',
                      backgroundColor: selectedRoutine?.id === routine.id ? '#eff6ff' : '#f8fafc',
                      borderRadius: '8px',
                      border: selectedRoutine?.id === routine.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>
                      {routine.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {routine.code}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoutine(routine.id!, routine.name);
                      }}
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        marginTop: '8px'
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Routine Details */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedRoutine ? (
              <>
                {/* Routine Header */}
                <div style={{
                  padding: '20px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <h3 style={{ margin: 0, color: '#1f2937' }}>
                    {selectedRoutine.name} ({selectedRoutine.code})
                  </h3>
                  <p style={{ margin: '8px 0 0 0', color: '#6b7280' }}>
                    {selectedRoutine.exercises.length} ejercicios
                  </p>
                  <Button
                    onClick={() => setShowAddExercise(true)}
                    variant="primary"
                    style={{ marginTop: '12px' }}
                  >
                    + Agregar Ejercicio
                  </Button>
                </div>

                {/* Exercises List */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                  {selectedRoutine.exercises.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: '#6b7280',
                      padding: '40px'
                    }}>
                      Esta rutina no tiene ejercicios aún.
                      <br />
                      Haz clic en "Agregar Ejercicio" para comenzar.
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={selectedRoutine.exercises.map(ex => ex.id!)}
                        strategy={verticalListSortingStrategy}
                      >
                        {selectedRoutine.exercises.map((exercise) => (
                          <SortableRoutineExercise
                            key={exercise.id}
                            exercise={exercise}
                            onUpdate={handleUpdateRoutineExercise}
                            onRemove={handleRemoveExercise}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}>
                Selecciona una rutina para ver sus detalles
              </div>
            )}
          </div>
        </div>

        {/* Create Routine Modal */}
        {showCreateForm && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              width: '400px'
            }}>
              <h3 style={{ margin: '0 0 16px 0' }}>Nueva Rutina</h3>
              <Input
                label="Nombre"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                variant="primary"
                fullWidth
              />
              <Input
                label="Código"
                value={createForm.code}
                onChange={(e) => setCreateForm(prev => ({ ...prev, code: e.target.value }))}
                variant="primary"
                fullWidth
                style={{ marginTop: '12px' }}
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <Button
                  onClick={handleCreateRoutine}
                  variant="primary"
                  style={{ flex: 1 }}
                >
                  Crear
                </Button>
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Exercise Modal */}
        {showAddExercise && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              width: '500px'
            }}>
              <h3 style={{ margin: '0 0 16px 0' }}>Agregar Ejercicio</h3>
              
              <ExerciseAutocomplete
                onExerciseSelect={(exercise) => {
                  if (exercise) {
                    setAddExerciseForm(prev => ({ ...prev, exerciseId: exercise.id || 0 }));
                  } else {
                    setAddExerciseForm(prev => ({ ...prev, exerciseId: 0 }));
                  }
                }}
                placeholder="Buscar ejercicio..."
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
                <Input
                  label="Series"
                  type="number"
                  value={addExerciseForm.sets.toString()}
                  onChange={(e) => setAddExerciseForm(prev => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}
                  variant="primary"
                />
                <Input
                  label="Reps"
                  type="number"
                  value={addExerciseForm.reps.toString()}
                  onChange={(e) => setAddExerciseForm(prev => ({ ...prev, reps: parseInt(e.target.value) || 0 }))}
                  variant="primary"
                />
                <Input
                  label="Peso (kg)"
                  type="number"
                  step="0.5"
                  value={addExerciseForm.weight.toString()}
                  onChange={(e) => setAddExerciseForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  variant="primary"
                />
              </div>

              <Input
                label="Notas"
                value={addExerciseForm.notes}
                onChange={(e) => setAddExerciseForm(prev => ({ ...prev, notes: e.target.value }))}
                variant="primary"
                fullWidth
                style={{ marginTop: '12px' }}
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <Button
                  onClick={handleAddExercise}
                  variant="primary"
                  style={{ flex: 1 }}
                  disabled={!addExerciseForm.exerciseId}
                >
                  Agregar
                </Button>
                <Button
                  onClick={() => setShowAddExercise(false)}
                  variant="secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onCancel={cancelDeleteRoutine}
          onConfirm={confirmDeleteRoutine}
          isDeleting={deletingRoutine}
          title="Eliminar Rutina"
          message={`¿Estás seguro de que deseas eliminar la rutina "${deleteRoutineName}"? Esta acción no se puede deshacer y eliminará todos los ejercicios asociados.`}
        />
      </div>
    </div>
  );
}; 