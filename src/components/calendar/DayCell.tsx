import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { WorkoutEntryWithDetails } from '../../services';
import { SortableWorkoutItem } from '../lists/SortableWorkoutItem';

interface DayCellProps {
  day: Date;
  dayWorkouts: WorkoutEntryWithDetails[];
  isToday: boolean;
  isPastDay: boolean;
  onDayClick: (date: string) => void;
  onDayRightClick: (e: React.MouseEvent, date: string) => void;
  onAddWorkoutClick: (date: string) => void;
  onDeleteWorkoutEntry: (id: number) => void;
}

export const DayCell: React.FC<DayCellProps> = ({
  day,
  dayWorkouts,
  isToday,
  isPastDay,
  onDayClick,
  onDayRightClick,
  onAddWorkoutClick,
  onDeleteWorkoutEntry
}) => {
  const formatDateForDB = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const dayDateString = formatDateForDB(day);

  return (
    <div
      style={{
        minHeight: '120px',
        border: '1px solid var(--border-light)',
        borderRadius: '8px',
        padding: '8px',
        backgroundColor: isToday ? 'var(--accent-bg)' : 'var(--bg-primary)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        opacity: isPastDay ? 0.7 : 1,
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!isToday) {
          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isToday) {
          e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
        }
      }}
      onClick={() => onDayClick(dayDateString)}
      onContextMenu={(e) => onDayRightClick(e, dayDateString)}
    >
      {/* Day Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <div style={{
          fontWeight: isToday ? '700' : '600',
          color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)',
          fontSize: '14px'
        }}>
          {day.toLocaleDateString('es-ES', { 
            weekday: 'short', 
            day: 'numeric' 
          })}
        </div>
        
        {/* Add workout button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddWorkoutClick(dayDateString);
          }}
          style={{
            background: 'var(--success-color)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            opacity: 0.7
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Agregar entrenamiento"
        >
          +
        </button>
      </div>

      {/* Workouts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {dayWorkouts.length > 0 ? (
          <SortableContext
            items={dayWorkouts.map(w => w.id!)}
            strategy={verticalListSortingStrategy}
          >
            {dayWorkouts.map((workout) => (
              <SortableWorkoutItem
                key={workout.id}
                workout={workout}
                onDayClick={onDayClick}
                onDeleteWorkoutEntry={onDeleteWorkoutEntry}
              />
            ))}
          </SortableContext>
        ) : (
          <div style={{
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '8px'
          }}>
            Sin entrenamientos
          </div>
        )}
      </div>
    </div>
  );
}; 