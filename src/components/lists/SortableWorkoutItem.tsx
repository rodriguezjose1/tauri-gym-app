import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkoutEntryWithDetails } from '../../services';

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
      {...attributes}
    >
      <div
        style={{
          padding: '6px 8px',
          backgroundColor: 'var(--accent-bg)',
          borderRadius: '4px',
          border: '1px solid var(--accent-primary)',
          fontSize: '11px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minHeight: '32px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--accent-bg)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onClick={() => onDayClick(workout.date)}
      >
        {/* Drag handle */}
        <div
          {...listeners}
          style={{
            cursor: 'grab',
            color: 'var(--text-muted)',
            fontSize: '10px',
            flexShrink: 0
          }}
          title="Arrastrar para reordenar"
        >
          ⋮⋮
        </div>

        {/* Exercise name */}
        <div style={{ 
          fontWeight: '600', 
          color: 'var(--accent-primary)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
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
          style={{
            background: 'var(--error-color)',
            color: 'var(--text-on-primary)',
            border: 'none',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.background = 'var(--error-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'var(--error-color)';
          }}
          title="Eliminar ejercicio"
        >
          ×
        </button>
      </div>
    </div>
  );
}; 