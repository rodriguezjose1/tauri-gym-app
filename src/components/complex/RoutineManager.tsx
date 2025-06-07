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
import { Input, Button, ErrorMessage } from "../base";
import { DeleteConfirmationModal } from "../modals";
import { ExerciseAutocomplete } from "../forms/ExerciseAutocomplete";
import ToastContainer from "../notifications/ToastContainer";
import { useToastNotifications } from "../../hooks/useToastNotifications";
import {
  RoutineForm,
} from "../../types/dashboard";
import { ROUTINE_ERROR_MESSAGES, ROUTINE_UI_LABELS } from "../../constants/errorMessages";

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
    group_number: exercise.group_number || 1,
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
      group_number: editForm.group_number || undefined,
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
      group_number: exercise.group_number || 1,
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
        padding: '8px 4px',
        backgroundColor: 'transparent',
        borderRadius: '4px',
        border: 'none',
        marginBottom: '4px',
        transition: 'all 0.2s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Drag handle */}
          <div
            {...listeners}
            style={{
              cursor: 'grab',
              color: 'var(--text-muted)',
              fontSize: '14px',
              flexShrink: 0
            }}
            title={ROUTINE_UI_LABELS.DRAG_TOOLTIP}
          >
            ⋮⋮
          </div>

          {/* Exercise info */}
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: '500', 
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}>
              {exercise.exercise_name}
            </div>
            
            {!isEditing ? (
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {/* Solo mostrar el nombre del ejercicio */}
              </div>
            ) : (
              <div style={{ marginTop: '8px' }}>
                {/* Group Selection */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '12px', 
                    fontWeight: '500', 
                    color: 'var(--text-primary)' 
                  }}>
                    {ROUTINE_UI_LABELS.GROUP_LABEL}
                  </label>
                  <select
                    value={editForm.group_number}
                    onChange={(e) => setEditForm(prev => ({ ...prev, group_number: parseInt(e.target.value) }))}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value={1}>Grupo 1</option>
                    <option value={2}>Grupo 2</option>
                    <option value={3}>Grupo 3</option>
                    <option value={4}>Grupo 4</option>
                    <option value={5}>Grupo 5</option>
                  </select>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <Input
                    label={ROUTINE_UI_LABELS.SETS_LABEL}
                    type="number"
                    value={editForm.sets.toString()}
                    onChange={(e) => setEditForm(prev => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}
                    variant="primary"
                  />
                  <Input
                    label={ROUTINE_UI_LABELS.REPS_LABEL}
                    type="number"
                    value={editForm.reps.toString()}
                    onChange={(e) => setEditForm(prev => ({ ...prev, reps: parseInt(e.target.value) || 0 }))}
                    variant="primary"
                  />
                  <Input
                    label={ROUTINE_UI_LABELS.WEIGHT_LABEL}
                    type="number"
                    step="0.5"
                    value={editForm.weight.toString()}
                    onChange={(e) => setEditForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                    variant="primary"
                  />
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Input
                    label={ROUTINE_UI_LABELS.NOTES_LABEL}
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
                    background: 'var(--accent-primary)',
                    color: 'var(--text-on-primary)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title={ROUTINE_UI_LABELS.EDIT_TOOLTIP}
                >
                  {ROUTINE_UI_LABELS.EDIT_BUTTON}
                </button>
                <button
                  onClick={() => onRemove(exercise.exercise_id)}
                  style={{
                    background: 'var(--error-color)',
                    color: 'var(--text-on-primary)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title={ROUTINE_UI_LABELS.DELETE_TOOLTIP}
                >
                  {ROUTINE_UI_LABELS.DELETE_BUTTON}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  style={{
                    background: 'var(--success-color)',
                    color: 'var(--text-on-primary)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {ROUTINE_UI_LABELS.SAVE_BUTTON}
                </button>
                <button
                  onClick={handleCancel}
                  style={{
                    background: 'var(--text-secondary)',
                    color: 'var(--text-on-primary)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {ROUTINE_UI_LABELS.CANCEL_BUTTON}
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
    notes: '',
    group_number: 1
  });

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRoutineId, setDeleteRoutineId] = useState<number | null>(null);
  const [deleteRoutineName, setDeleteRoutineName] = useState("");
  const [deletingRoutine, setDeletingRoutine] = useState(false);

  // Toast notifications
  const { notifications, addNotification, removeNotification } = useToastNotifications();

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
    } catch (err) {
      console.error("Error loading routines:", err);
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
    } catch (err) {
      console.error("Error searching routines:", err);
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
    } catch (err) {
      console.error("Error loading routine with exercises:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load exercises
  const loadExercises = async () => {
    try {
      const data = await ExerciseService.getExercises();
      setExercises(data);
    } catch (err) {
      console.error("Error loading exercises:", err);
    }
  };

  // Create routine
  const handleCreateRoutine = async () => {
    if (!createForm.name.trim() || !createForm.code.trim()) {
      showToast(ROUTINE_ERROR_MESSAGES.REQUIRED_FIELDS, "error");
      return;
    }

    try {
      setLoading(true);
      await RoutineService.createRoutine(createForm.name.trim(), createForm.code.trim().toUpperCase());
      setCreateForm({ name: '', code: '' });
      setShowCreateForm(false);
      await loadRoutines();
      
      // Load the newly created routine
      const newRoutines = await RoutineService.listRoutines();
      const newRoutine = newRoutines.find(r => r.code === createForm.code.trim().toUpperCase());
      if (newRoutine) {
        await loadRoutineWithExercises(newRoutine.id!);
      }
      
      showToast(`Rutina "${createForm.name}" creada exitosamente`, "success");
    } catch (error) {
      console.error("Error creating routine:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes(ROUTINE_ERROR_MESSAGES.UNIQUE_CONSTRAINT_FAILED)) {
        showToast(ROUTINE_ERROR_MESSAGES.DUPLICATE_CODE(createForm.code.trim().toUpperCase()), "error");
      } else {
        showToast(ROUTINE_ERROR_MESSAGES.CREATE_ROUTINE_FAILED(errorMessage), "error");
      }
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
      
      showToast(`Rutina "${deleteRoutineName}" eliminada exitosamente`, "success");
    } catch (error) {
      console.error("Error deleting routine:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(ROUTINE_ERROR_MESSAGES.DELETE_ROUTINE_FAILED(errorMessage), "error");
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
      await RoutineService.addExerciseToRoutine(
        selectedRoutine.id!,
        addExerciseForm.exerciseId,
        selectedRoutine.exercises.length,
        addExerciseForm.sets || undefined,
        addExerciseForm.reps || undefined,
        addExerciseForm.weight || undefined,
        addExerciseForm.notes.trim() || undefined,
        addExerciseForm.group_number || undefined,
      );

      // Reload routine
      await loadRoutineWithExercises(selectedRoutine.id!);
      
      // Reset form
      setAddExerciseForm({
        exerciseId: 0,
        sets: 3,
        reps: 10,
        weight: 0,
        notes: '',
        group_number: 1
      });
      setShowAddExercise(false);
      
      showToast("Ejercicio agregado exitosamente", "success");
    } catch (error) {
      console.error("Error adding exercise to routine:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(ROUTINE_ERROR_MESSAGES.ADD_EXERCISE_FAILED(errorMessage), "error");
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
        exercise.group_number || undefined,
      );

      // Reload routine
      if (selectedRoutine) {
        await loadRoutineWithExercises(selectedRoutine.id!);
      }
      
      showToast("Ejercicio actualizado exitosamente", "success");
    } catch (error) {
      console.error("Error updating routine exercise:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(ROUTINE_ERROR_MESSAGES.UPDATE_EXERCISE_FAILED(errorMessage), "error");
    }
  };

  // Remove exercise from routine
  const handleRemoveExercise = async (exerciseId: number) => {
    if (!selectedRoutine) return;

    try {
      await RoutineService.removeExerciseFromRoutine(selectedRoutine.id!, exerciseId);

      // Reload routine
      await loadRoutineWithExercises(selectedRoutine.id!);
      
      showToast("Ejercicio eliminado exitosamente", "success");
    } catch (error) {
      console.error("Error removing exercise from routine:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(ROUTINE_ERROR_MESSAGES.REMOVE_EXERCISE_FAILED(errorMessage), "error");
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

  // Helper function to show toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    addNotification(message, type);
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
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border-light)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>🏋️ Gestor de Rutinas</h2>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
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
            borderRight: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Search and Create */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)' }}>
              <Input
                label=""
                placeholder={ROUTINE_UI_LABELS.SEARCH_PLACEHOLDER}
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
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {ROUTINE_ERROR_MESSAGES.LOADING_ROUTINES}
                </div>
              ) : routines.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {ROUTINE_ERROR_MESSAGES.NO_ROUTINES_AVAILABLE}
                </div>
              ) : (
                routines.map((routine) => (
                  <div
                    key={routine.id}
                    onClick={() => loadRoutineWithExercises(routine.id!)}
                    style={{
                      padding: '12px',
                      backgroundColor: selectedRoutine?.id === routine.id ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                      borderRadius: '8px',
                      border: selectedRoutine?.id === routine.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {routine.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {routine.code}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoutine(routine.id!, routine.name);
                      }}
                      style={{
                        background: 'var(--error-color)',
                        color: 'var(--text-on-primary)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        marginTop: '8px'
                      }}
                    >
                      {ROUTINE_UI_LABELS.DELETE_BUTTON}
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
                  borderBottom: '1px solid var(--border-light)'
                }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                    {selectedRoutine.name} ({selectedRoutine.code})
                  </h3>
                  <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)' }}>
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
                      color: 'var(--text-secondary)',
                      padding: '40px'
                    }}>
                      {ROUTINE_ERROR_MESSAGES.NO_EXERCISES_IN_ROUTINE}
                      <br />
                      {ROUTINE_ERROR_MESSAGES.ADD_EXERCISE_PROMPT}
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
                        {(() => {
                          // Group exercises by group_number
                          const groupedExercises = selectedRoutine.exercises.reduce((groups, exercise) => {
                            const groupNumber = exercise.group_number || 1;
                            if (!groups[groupNumber]) {
                              groups[groupNumber] = [];
                            }
                            groups[groupNumber].push(exercise);
                            return groups;
                          }, {} as Record<number, typeof selectedRoutine.exercises>);

                          // Sort groups by group number
                          const sortedGroups = Object.keys(groupedExercises)
                            .map(Number)
                            .sort((a, b) => a - b);

                          return sortedGroups.map(groupNumber => (
                            <div key={`group-${groupNumber}`} style={{ marginBottom: '20px' }}>
                              {/* Group Header */}
                              <div style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                marginBottom: '8px',
                                paddingLeft: '4px'
                              }}>
                                Grupo {groupNumber}
                              </div>

                              {/* Group Exercises */}
                              <div style={{
                                border: '1px dashed var(--border-color)',
                                borderRadius: '6px',
                                padding: '8px'
                              }}>
                                {groupedExercises[groupNumber].map((exercise) => (
                                  <SortableRoutineExercise
                                    key={exercise.id}
                                    exercise={exercise}
                                    onUpdate={handleUpdateRoutineExercise}
                                    onRemove={handleRemoveExercise}
                                  />
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
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
                color: 'var(--text-secondary)'
              }}>
                {ROUTINE_ERROR_MESSAGES.SELECT_ROUTINE_PROMPT}
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
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '24px',
              width: '400px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>{ROUTINE_UI_LABELS.NEW_ROUTINE_TITLE}</h3>
              
              <Input
                label={ROUTINE_UI_LABELS.NAME_LABEL}
                value={createForm.name}
                onChange={(e) => {
                  setCreateForm(prev => ({ ...prev, name: e.target.value }));
                }}
                variant="primary"
                fullWidth
              />
              <Input
                label={ROUTINE_UI_LABELS.CODE_LABEL}
                value={createForm.code}
                onChange={(e) => {
                  setCreateForm(prev => ({ ...prev, code: e.target.value }));
                }}
                variant="primary"
                fullWidth
                style={{ marginTop: '12px' }}
                placeholder={ROUTINE_UI_LABELS.CODE_PLACEHOLDER}
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <Button
                  onClick={handleCreateRoutine}
                  variant="primary"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  {loading ? ROUTINE_UI_LABELS.CREATING_BUTTON : ROUTINE_UI_LABELS.CREATE_BUTTON}
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateForm({ name: '', code: '' });
                  }}
                  variant="secondary"
                  style={{ flex: 1 }}
                >
                  {ROUTINE_UI_LABELS.CANCEL_BUTTON}
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
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '24px',
              width: '500px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>{ROUTINE_UI_LABELS.ADD_EXERCISE_TITLE}</h3>
              
              <ExerciseAutocomplete
                onExerciseSelect={(exercise) => {
                  if (exercise) {
                    setAddExerciseForm(prev => ({ ...prev, exerciseId: exercise.id || 0 }));
                  } else {
                    setAddExerciseForm(prev => ({ ...prev, exerciseId: 0 }));
                  }
                }}
                placeholder={ROUTINE_UI_LABELS.EXERCISE_SEARCH_PLACEHOLDER}
              />

              {/* Group Selection */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: 'var(--text-primary)' 
                }}>
                  {ROUTINE_UI_LABELS.GROUP_LABEL}
                </label>
                <select
                  value={addExerciseForm.group_number}
                  onChange={(e) => setAddExerciseForm(prev => ({ ...prev, group_number: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value={1}>Grupo 1</option>
                  <option value={2}>Grupo 2</option>
                  <option value={3}>Grupo 3</option>
                  <option value={4}>Grupo 4</option>
                  <option value={5}>Grupo 5</option>
                </select>
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-secondary)', 
                  marginTop: '4px' 
                }}>
                  {ROUTINE_UI_LABELS.GROUP_DESCRIPTION}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
                <Input
                  label={ROUTINE_UI_LABELS.SETS_LABEL}
                  type="number"
                  value={addExerciseForm.sets.toString()}
                  onChange={(e) => setAddExerciseForm(prev => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}
                  variant="primary"
                />
                <Input
                  label={ROUTINE_UI_LABELS.REPS_LABEL}
                  type="number"
                  value={addExerciseForm.reps.toString()}
                  onChange={(e) => setAddExerciseForm(prev => ({ ...prev, reps: parseInt(e.target.value) || 0 }))}
                  variant="primary"
                />
                <Input
                  label={ROUTINE_UI_LABELS.WEIGHT_LABEL}
                  type="number"
                  step="0.5"
                  value={addExerciseForm.weight.toString()}
                  onChange={(e) => setAddExerciseForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  variant="primary"
                />
              </div>

              <Input
                label={ROUTINE_UI_LABELS.NOTES_LABEL}
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
                  {ROUTINE_UI_LABELS.ADD_BUTTON}
                </Button>
                <Button
                  onClick={() => {
                    setShowAddExercise(false);
                  }}
                  variant="secondary"
                  style={{ flex: 1 }}
                >
                  {ROUTINE_UI_LABELS.CANCEL_BUTTON}
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

        {/* Toast Notifications */}
        <ToastContainer
          notifications={notifications}
          onRemoveNotification={removeNotification}
        />
      </div>
    </div>
  );
}; 