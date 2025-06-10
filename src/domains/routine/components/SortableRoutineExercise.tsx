import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '../../../shared/components/base';
import { RoutineExerciseWithDetails } from '../../../services';
import { ROUTINE_UI_LABELS } from '../../../shared/constants';

interface SortableRoutineExerciseProps {
  exercise: RoutineExerciseWithDetails;
  onUpdate: (exercise: RoutineExerciseWithDetails) => void;
  onRemove: (exerciseId: number) => void;
}

export const SortableRoutineExercise: React.FC<SortableRoutineExerciseProps> = ({
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

  const handleEdit = () => {
    setEditForm({
      sets: exercise.sets || 0,
      reps: exercise.reps || 0,
      weight: exercise.weight || 0,
      notes: exercise.notes || '',
      group_number: exercise.group_number || 1,
    });
    setIsEditing(true);
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
              {exercise.sets && exercise.reps && (
                <span className="routine-manager-exercise-detail">
                  {exercise.sets} series × {exercise.reps} reps
                </span>
              )}
              {exercise.weight && (
                <span className="routine-manager-exercise-detail">
                  {exercise.weight} kg
                </span>
              )}
              {exercise.group_number && exercise.group_number > 1 && (
                <span className="routine-manager-exercise-detail">
                  Grupo {exercise.group_number}
                </span>
              )}
              {exercise.notes && (
                <span className="routine-manager-exercise-notes">
                  {exercise.notes}
                </span>
              )}
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
              onClick={handleEdit}
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