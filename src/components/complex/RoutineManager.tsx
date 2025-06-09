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
import { Input, Button, ErrorMessage } from "../../shared/components/base";
import { DeleteConfirmationModal } from "../modals";
import { ExerciseAutocomplete } from "../forms/ExerciseAutocomplete";
import ToastContainer from "../notifications/ToastContainer";
import { useToastNotifications } from "../../shared/hooks/useToastNotifications";
import {
  RoutineForm,
} from "../../shared/types/dashboard";
import { ROUTINE_ERROR_MESSAGES, ROUTINE_UI_LABELS } from "../../constants/errorMessages";
import "../../styles/RoutineManager.css";

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
      className="routine-manager-exercise-item"
    >
      <div className="routine-manager-exercise-content">
        {/* Drag handle */}
        <div
          {...listeners}
          className="routine-manager-drag-handle"
          title={ROUTINE_UI_LABELS.DRAG_TOOLTIP}
        >
          ⋮⋮
        </div>

        {/* Exercise info */}
        <div className="routine-manager-exercise-info">
          <div className="routine-manager-exercise-name">
            {exercise.exercise_name}
          </div>
          
          {!isEditing ? (
            <div className="routine-manager-exercise-details">
              {/* Solo mostrar el nombre del ejercicio */}
            </div>
          ) : (
            <div className="routine-manager-exercise-edit-form">
              {/* Group Selection */}
              <div className="routine-manager-group-selection">
                <label className="routine-manager-group-label">
                  {ROUTINE_UI_LABELS.GROUP_LABEL}
                </label>
                <select
                  value={editForm.group_number}
                  onChange={(e) => setEditForm(prev => ({ ...prev, group_number: parseInt(e.target.value) }))}
                  className="routine-manager-group-select"
                >
                  <option value={1}>Grupo 1</option>
                  <option value={2}>Grupo 2</option>
                  <option value={3}>Grupo 3</option>
                  <option value={4}>Grupo 4</option>
                  <option value={5}>Grupo 5</option>
                </select>
              </div>
              
              <div className="routine-manager-exercise-form-grid">
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
              <div className="routine-manager-exercise-notes">
                <Input
                  label={ROUTINE_UI_LABELS.NOTES_LABEL}
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  variant="primary"
                  fullWidth
                />
              </div>
              <div className="routine-manager-exercise-form-actions">
                <button
                  onClick={handleSave}
                  className="routine-manager-save-button"
                >
                  {ROUTINE_UI_LABELS.SAVE_BUTTON}
                </button>
                <button
                  onClick={handleCancel}
                  className="routine-manager-cancel-button"
                >
                  {ROUTINE_UI_LABELS.CANCEL_BUTTON}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="routine-manager-exercise-actions">
            <button
              onClick={() => setIsEditing(true)}
              className="routine-manager-exercise-edit-button"
              title={ROUTINE_UI_LABELS.EDIT_TOOLTIP}
            >
              ✏️
            </button>
            <button
              onClick={() => onRemove(exercise.id!)}
              className="routine-manager-exercise-remove-button"
              title={ROUTINE_UI_LABELS.REMOVE_TOOLTIP}
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const RoutineManager: React.FC<RoutineManagerProps> = ({ onClose }) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineWithExercises | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [createForm, setCreateForm] = useState<RoutineForm>({ name: '', code: '' });
  const [addExerciseForm, setAddExerciseForm] = useState({
    exerciseId: 0,
    sets: 1,
    reps: 1,
    weight: 0,
    notes: '',
    group_number: 1,
  });

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState<number | null>(null);
  const [deleteRoutineName, setDeleteRoutineName] = useState<string>("");
  const [deletingRoutine, setDeletingRoutine] = useState(false);

  // Toast notifications
  const { notifications, addNotification, removeNotification } = useToastNotifications();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadRoutines = async () => {
    setLoading(true);
    try {
      const result = await RoutineService.listRoutines();
      setRoutines(result);
    } catch (error) {
      console.error(ROUTINE_ERROR_MESSAGES.LOAD_ROUTINES_FAILED, error);
    } finally {
      setLoading(false);
    }
  };

  const searchRoutines = async (query: string) => {
    setLoading(true);
    try {
      const result = await RoutineService.searchRoutines(query);
      setRoutines(result);
    } catch (error) {
      console.error(ROUTINE_ERROR_MESSAGES.SEARCH_ROUTINES_FAILED, error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoutineWithExercises = async (routineId: number) => {
    try {
      const routine = await RoutineService.getRoutineWithExercises(routineId);
      setSelectedRoutine(routine);
    } catch (error) {
      console.error(ROUTINE_ERROR_MESSAGES.LOAD_ROUTINE_EXERCISES_FAILED, error);
    }
  };

  const loadExercises = async () => {
    try {
      const result = await ExerciseService.getExercises();
      setExercises(result);
    } catch (error) {
      console.error(ROUTINE_ERROR_MESSAGES.LOAD_EXERCISES_FAILED, error);
    }
  };

  const handleCreateRoutine = async () => {
    if (!createForm.name.trim() || !createForm.code.trim()) {
      showToast(ROUTINE_ERROR_MESSAGES.REQUIRED_FIELDS, 'error');
      return;
    }

    setLoading(true);
    try {
      const newRoutineId = await RoutineService.createRoutine(
        createForm.name.trim(),
        createForm.code.trim()
      );

      showToast(ROUTINE_UI_LABELS.ROUTINE_CREATED_SUCCESS, 'success');
      setCreateForm({ name: '', code: '' });
      setShowCreateForm(false);
      await loadRoutines();
      
      // Auto-select the new routine
      if (newRoutineId) {
        await loadRoutineWithExercises(newRoutineId);
      }
    } catch (error) {
      console.error('Error creating routine:', error);
      showToast('Error al crear la rutina', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoutine = async (routineId: number, routineName: string) => {
    setRoutineToDelete(routineId);
    setDeleteRoutineName(routineName);
    setShowDeleteModal(true);
  };

  const confirmDeleteRoutine = async () => {
    if (!routineToDelete) return;

    setDeletingRoutine(true);
    try {
      await RoutineService.deleteRoutine(routineToDelete);
      showToast(ROUTINE_UI_LABELS.ROUTINE_DELETED_SUCCESS, 'success');
      
      // Clear selection if deleted routine was selected
      if (selectedRoutine?.id === routineToDelete) {
        setSelectedRoutine(null);
      }
      
      await loadRoutines();
      setShowDeleteModal(false);
      setRoutineToDelete(null);
      setDeleteRoutineName("");
    } catch (error) {
      console.error('Error deleting routine:', error);
      showToast('Error al eliminar la rutina', 'error');
    } finally {
      setDeletingRoutine(false);
    }
  };

  const cancelDeleteRoutine = () => {
    setShowDeleteModal(false);
    setRoutineToDelete(null);
    setDeleteRoutineName("");
  };

  const handleAddExercise = async () => {
    if (!selectedRoutine || !addExerciseForm.exerciseId) {
      showToast(ROUTINE_ERROR_MESSAGES.REQUIRED_FIELDS, 'error');
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
        addExerciseForm.group_number || undefined
      );

      showToast(ROUTINE_UI_LABELS.EXERCISE_ADDED_SUCCESS, 'success');
      
      // Reset form
      setAddExerciseForm({
        exerciseId: 0,
        sets: 1,
        reps: 1,
        weight: 0,
        notes: '',
        group_number: 1,
      });
      setShowAddExercise(false);
      
      // Reload routine
      await loadRoutineWithExercises(selectedRoutine.id!);
    } catch (error) {
      console.error('Error adding exercise:', error);
      showToast('Error al agregar ejercicio', 'error');
    }
  };

  const handleUpdateRoutineExercise = async (exercise: RoutineExerciseWithDetails) => {
    if (!selectedRoutine) return;

    try {
      await RoutineService.updateRoutineExercise(
        exercise.id!,
        selectedRoutine.id!,
        exercise.exercise_id!,
        exercise.order_index || 0,
        exercise.sets,
        exercise.reps,
        exercise.weight,
        exercise.notes,
        exercise.group_number
      );

      showToast(ROUTINE_UI_LABELS.EXERCISE_UPDATED_SUCCESS, 'success');
      
      // Reload routine
      await loadRoutineWithExercises(selectedRoutine.id!);
    } catch (error) {
      console.error('Error updating exercise:', error);
      showToast('Error al actualizar ejercicio', 'error');
    }
  };

  const handleRemoveExercise = async (exerciseId: number) => {
    if (!selectedRoutine) return;

    try {
      await RoutineService.removeExerciseFromRoutine(selectedRoutine.id!, exerciseId);
      showToast(ROUTINE_UI_LABELS.EXERCISE_REMOVED_SUCCESS, 'success');
      
      // Reload routine
      await loadRoutineWithExercises(selectedRoutine.id!);
    } catch (error) {
      console.error('Error removing exercise:', error);
      showToast('Error al eliminar ejercicio', 'error');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!selectedRoutine || !over || active.id === over.id) {
      return;
    }

    const oldIndex = selectedRoutine.exercises.findIndex(ex => ex.id === active.id);
    const newIndex = selectedRoutine.exercises.findIndex(ex => ex.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newExercises = arrayMove(selectedRoutine.exercises, oldIndex, newIndex);
    
    // Update local state immediately for better UX
    setSelectedRoutine({
      ...selectedRoutine,
      exercises: newExercises
    });

    try {
      // Update order in backend
      const exerciseOrders: Array<[number, number]> = newExercises.map((exercise, index) => [
        exercise.id!,
        index
      ]);

      await RoutineService.reorderRoutineExercises(selectedRoutine.id!, exerciseOrders);
      showToast(ROUTINE_UI_LABELS.EXERCISES_REORDERED_SUCCESS, 'success');
    } catch (error) {
      console.error('Error reordering exercises:', error);
      showToast('Error al reordenar ejercicios', 'error');
      
      // Revert on error
      await loadRoutineWithExercises(selectedRoutine.id!);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (value.trim()) {
        searchRoutines(value.trim());
      } else {
        loadRoutines();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    addNotification(message, type);
  };

  // Load initial data
  useEffect(() => {
    loadRoutines();
    loadExercises();
  }, []);

  return (
    <div className={onClose ? "routine-manager-overlay" : "routine-manager-page"}>
      <div className={`routine-manager-container ${!onClose ? 'page-mode' : ''}`}>
        {/* Header */}
        <div className="routine-manager-header">
          <h2 className="routine-manager-title">🏋️ Gestor de Rutinas</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="routine-manager-close-button"
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div className="routine-manager-content">
          {/* Left Panel - Routines List */}
          <div className="routine-manager-left-panel">
            {/* Search and Create */}
            <div className="routine-manager-search-section">
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
                className="routine-manager-new-routine-button"
              >
                + Nueva Rutina
              </Button>
            </div>

            {/* Routines List */}
            <div className="routine-manager-routines-list">
              {loading ? (
                <div className="routine-manager-loading">
                  {ROUTINE_ERROR_MESSAGES.LOADING_ROUTINES}
                </div>
              ) : routines.length === 0 ? (
                <div className="routine-manager-empty">
                  {ROUTINE_ERROR_MESSAGES.NO_ROUTINES_AVAILABLE}
                </div>
              ) : (
                routines.map((routine) => (
                  <div
                    key={routine.id}
                    onClick={() => loadRoutineWithExercises(routine.id!)}
                    className={`routine-manager-routine-item ${
                      selectedRoutine?.id === routine.id ? 'selected' : ''
                    }`}
                  >
                    <div className="routine-manager-routine-name">
                      {routine.name}
                    </div>
                    <div className="routine-manager-routine-code">
                      {routine.code}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoutine(routine.id!, routine.name);
                      }}
                      className="routine-manager-routine-delete"
                    >
                      {ROUTINE_UI_LABELS.DELETE_BUTTON}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Routine Details */}
          <div className="routine-manager-right-panel">
            {selectedRoutine ? (
              <>
                {/* Routine Header */}
                <div className="routine-manager-routine-header">
                  <h3 className="routine-manager-routine-title">
                    {selectedRoutine.name} ({selectedRoutine.code})
                  </h3>
                  <p className="routine-manager-routine-subtitle">
                    {selectedRoutine.exercises.length} ejercicios
                  </p>
                  <Button
                    onClick={() => setShowAddExercise(true)}
                    variant="primary"
                    className="routine-manager-add-exercise-button"
                  >
                    + Agregar Ejercicio
                  </Button>
                </div>

                {/* Exercises List */}
                <div className="routine-manager-exercises-container">
                  {selectedRoutine.exercises.length === 0 ? (
                    <div className="routine-manager-no-exercises">
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
                            <div key={`group-${groupNumber}`} className="routine-manager-exercise-group">
                              {/* Group Header */}
                              <div className="routine-manager-group-header">
                                Grupo {groupNumber}
                              </div>

                              {/* Group Exercises */}
                              <div className="routine-manager-group-container">
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
              <div className="routine-manager-no-routine">
                {ROUTINE_ERROR_MESSAGES.SELECT_ROUTINE_PROMPT}
              </div>
            )}
          </div>
        </div>

        {/* Create Routine Modal */}
        {showCreateForm && (
          <div className="routine-manager-modal-overlay">
            <div className="routine-manager-modal-content routine-manager-create-modal">
              <h3 className="routine-manager-modal-title">{ROUTINE_UI_LABELS.NEW_ROUTINE_TITLE}</h3>
              
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
                className="routine-manager-input-spacing"
                placeholder={ROUTINE_UI_LABELS.CODE_PLACEHOLDER}
              />
              <div className="routine-manager-modal-actions">
                <Button
                  onClick={handleCreateRoutine}
                  variant="primary"
                  className="routine-manager-modal-button"
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
                  className="routine-manager-modal-button"
                >
                  {ROUTINE_UI_LABELS.CANCEL_BUTTON}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Exercise Modal */}
        {showAddExercise && (
          <div className="routine-manager-modal-overlay">
            <div className="routine-manager-modal-content routine-manager-add-exercise-modal">
              <h3 className="routine-manager-modal-title">{ROUTINE_UI_LABELS.ADD_EXERCISE_TITLE}</h3>
              
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
              <div className="routine-manager-modal-group-section">
                <label className="routine-manager-modal-group-label">
                  {ROUTINE_UI_LABELS.GROUP_LABEL}
                </label>
                <select
                  value={addExerciseForm.group_number}
                  onChange={(e) => setAddExerciseForm(prev => ({ ...prev, group_number: parseInt(e.target.value) }))}
                  className="routine-manager-modal-group-select"
                >
                  <option value={1}>Grupo 1</option>
                  <option value={2}>Grupo 2</option>
                  <option value={3}>Grupo 3</option>
                  <option value={4}>Grupo 4</option>
                  <option value={5}>Grupo 5</option>
                </select>
                <div className="routine-manager-modal-group-description">
                  {ROUTINE_UI_LABELS.GROUP_DESCRIPTION}
                </div>
              </div>

              <div className="routine-manager-modal-form-grid">
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
                className="routine-manager-input-spacing"
              />

              <div className="routine-manager-modal-actions">
                <Button
                  onClick={handleAddExercise}
                  variant="primary"
                  className="routine-manager-modal-button"
                  disabled={!addExerciseForm.exerciseId}
                >
                  {ROUTINE_UI_LABELS.ADD_BUTTON}
                </Button>
                <Button
                  onClick={() => {
                    setShowAddExercise(false);
                  }}
                  variant="secondary"
                  className="routine-manager-modal-button"
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