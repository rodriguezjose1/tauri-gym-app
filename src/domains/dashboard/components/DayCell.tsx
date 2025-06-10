import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { WorkoutEntryWithDetails } from '../../../services';
import { SortableWorkoutItem } from '../../workout';
import '../../../styles/DayCell.css';

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

  const dayCellClasses = `day-cell ${isToday ? 'today' : ''} ${isPastDay ? 'past-day' : ''}`.trim();

  return (
    <div
      className={dayCellClasses}
      onClick={() => onDayClick(dayDateString)}
      onContextMenu={(e) => onDayRightClick(e, dayDateString)}
    >
      {/* Day Header */}
      <div className="day-cell-header">
        <div className={`day-cell-date ${isToday ? 'today' : ''}`}>
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
          className="day-cell-add-btn"
          title="Agregar entrenamiento"
        >
          +
        </button>
      </div>

      {/* Workouts List */}
      <div className="day-cell-workouts">
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
          <div className="day-cell-no-workouts">
            Sin entrenamientos
          </div>
        )}
      </div>
    </div>
  );
}; 