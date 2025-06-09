import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkoutEntryWithDetails } from '../../../services';
import '../../../styles/SortableWorkoutItem.css';

interface SortableWorkoutItemProps {
  workout: WorkoutEntryWithDetails;
  onDayClick: (date: string) => void;
  onDeleteWorkoutEntry: (id: number) => void;
}

export const SortableWorkoutItem: React.FC<SortableWorkoutItemProps> = ({
  workout,
  onDayClick,
  onDeleteWorkoutEntry
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workout.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="sortable-workout-item"
      {...attributes}
    >
      <div
        className="sortable-workout-item-content"
        onClick={() => onDayClick(workout.date)}
      >
        {/* Drag handle */}
        <div
          {...listeners}
          className="sortable-workout-item-drag-handle"
          title="Arrastrar para reordenar"
        >
          ⋮⋮
        </div>

        {/* Exercise name */}
        <div className="sortable-workout-item-name">
          {workout.exercise_name}
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (workout.id) {
              onDeleteWorkoutEntry(workout.id);
            }
          }}
          className="sortable-workout-item-delete-btn"
          title="Eliminar ejercicio"
        >
          ×
        </button>
      </div>
    </div>
  );
}; 