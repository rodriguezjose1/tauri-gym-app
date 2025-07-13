import React from 'react';
import { Exercise } from '../../../shared/types/dashboard';

interface ExerciseItemProps {
  exercise: Exercise;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exerciseId: number) => void;
}

export const ExerciseItem: React.FC<ExerciseItemProps> = ({
  exercise,
  onEdit,
  onDelete
}) => {
  return (
    <div className="exercise-item">
      <div className="exercise-item-content">
        <div className="exercise-item-info">
          <div className="exercise-item-name">
            {exercise.name}
          </div>
          {exercise.code && (
            <div className="exercise-item-code">
              {exercise.code}
            </div>
          )}
        </div>
        <div className="exercise-item-actions">
          {onEdit && (
            <button
              onClick={() => onEdit(exercise)}
              className="exercise-item-edit-button"
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(exercise.id!)}
              className="exercise-item-delete-button"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 