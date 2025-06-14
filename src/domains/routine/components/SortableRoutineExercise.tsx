import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Select } from '../../../shared/components/base';
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

  const groupOptions = [
    { value: 1, label: "Grupo 1" },
    { value: 2, label: "Grupo 2" },
    { value: 3, label: "Grupo 3" },
    { value: 4, label: "Grupo 4" },
    { value: 5, label: "Grupo 5" }
  ];

  const handleSave = () => {
    const updatedExercise: RoutineExerciseWithDetails = {
      ...exercise,
      group_number: editForm.group_number,
    };
    onUpdate(updatedExercise);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      group_number: exercise.group_number || 1,
    });
    setIsEditing(false);
  };

  const handleEdit = () => {
    setEditForm({
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
              {exercise.group_number && exercise.group_number > 1 && (
                <span className="routine-manager-exercise-detail">
                  Grupo {exercise.group_number}
                </span>
              )}
            </div>
          ) : (
            <div className="routine-manager-exercise-edit-form">
              {/* Group Selection */}
              <div className="routine-manager-group-selection">
                <Select
                  label={ROUTINE_UI_LABELS.GROUP_LABEL}
                  options={groupOptions}
                  value={editForm.group_number}
                  onChange={(value) => setEditForm(prev => ({ ...prev, group_number: parseInt(value.toString()) }))}
                  variant="primary"
                  size="sm"
                  fullWidth
                  helperText="Los ejercicios del mismo grupo se mostrarán juntos"
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