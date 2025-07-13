import React from 'react';
import { WorkoutEntryWithDetails } from '../../../services';
import '../../../styles/WorkoutItem.css';

interface WorkoutItemProps {
  workout: WorkoutEntryWithDetails;
  onDayClick: (date: string) => void;
  onDeleteWorkoutEntry: (id: number) => void;
  onEditWorkoutEntry?: (workout: WorkoutEntryWithDetails) => void;
}

export const WorkoutItem: React.FC<WorkoutItemProps> = ({
  workout,
  onDayClick,
  onDeleteWorkoutEntry,
  onEditWorkoutEntry
}) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (workout.id) {
      onDeleteWorkoutEntry(workout.id);
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Solo permitir click si no es en el botón de eliminar
    const target = e.target as HTMLElement;
    if (!target.closest('.workout-item-delete-btn')) {
      // Si hay función de edición, usar esa; sino usar la función original
      if (onEditWorkoutEntry) {
        onEditWorkoutEntry(workout);
      } else {
        onDayClick(workout.date);
      }
    }
  };

  return (
    <div className="workout-item">
      <div
        className="workout-item-content"
        onClick={handleContentClick}
        style={{ cursor: 'pointer' }}
        title={onEditWorkoutEntry ? "Hacer clic para editar" : "Hacer clic para ver día"}
      >
        {/* Exercise name */}
        <div className="workout-item-name">
          {workout.exercise_name}
        </div>

        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="workout-item-delete-btn"
          title="Eliminar ejercicio"
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  );
}; 