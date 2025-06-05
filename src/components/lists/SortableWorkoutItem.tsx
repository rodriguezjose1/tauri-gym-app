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
          backgroundColor: '#dbeafe',
          borderRadius: '4px',
          border: '1px solid #93c5fd',
          fontSize: '11px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minHeight: '32px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#bfdbfe';
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#dbeafe';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onClick={() => onDayClick(workout.date)}
      >
        {/* Drag handle */}
        <div
          {...listeners}
          style={{
            cursor: 'grab',
            color: '#6b7280',
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
          color: '#1e40af',
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
            background: '#dc2626',
            color: 'white',
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
            e.currentTarget.style.background = '#b91c1c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = '#dc2626';
          }}
          title="Eliminar ejercicio"
        >
          ×
        </button>
      </div>
    </div>
  );
}; 