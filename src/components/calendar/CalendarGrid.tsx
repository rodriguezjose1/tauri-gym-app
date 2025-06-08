import React from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { WorkoutEntryWithDetails } from '../../services';
import { SortableWorkoutItem } from '../lists/SortableWorkoutItem';
import '../../styles/CalendarGrid.css';

interface CalendarGridProps {
  threeWeeks: Date[][];
  workoutData: WorkoutEntryWithDetails[];
  onDayClick: (date: string) => void;
  onDayRightClick: (e: React.MouseEvent, date: string) => void;
  onAddWorkoutClick: (date: string) => void;
  onDeleteWorkoutEntry: (id: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
  sensors: any;
  showWeekends?: boolean;
  onSelectedDateChange?: (date: string) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  threeWeeks,
  workoutData,
  onDayClick,
  onDayRightClick,
  onAddWorkoutClick,
  onDeleteWorkoutEntry,
  onDragEnd,
  sensors,
  showWeekends = false,
  onSelectedDateChange
}) => {
  const formatDateForDB = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatWeekRange = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = weekStart.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });

    const endStr = weekEnd.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });

    return `${startStr} - ${endStr}`;
  };

  const getWeekNumber = (date: Date) => {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  };

  return (
    <div className="calendar-grid-container">
      {threeWeeks.map((week, weekIndex) => {
        const weekStart = week[0];
        const weekNumber = getWeekNumber(weekStart);
        
        return (
          <div key={weekIndex} className="calendar-week-container">
            {/* Week Header */}
            <div className="calendar-week-header">
              Semana {weekNumber}: {formatWeekRange(weekStart)}
            </div>
            
            {/* Week Days Grid */}
            <div className={`calendar-week-grid ${showWeekends ? 'show-weekends' : 'weekdays-only'}`}>
              {week.map((day, dayIndex) => {
                const dayDateString = formatDateForDB(day);
                const dayWorkouts = workoutData.filter(workout => 
                  workout.date === dayDateString
                );
                const isToday = day.toDateString() === new Date().toDateString();
                const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));
                
                console.log(`Day ${dayDateString}: found ${dayWorkouts.length} workouts`);
                
                const dayClasses = `calendar-day-cell ${
                  isToday ? 'today' : isPastDay ? 'past-day' : 'regular-day'
                }`;
                
                return (
                  <div
                    key={dayIndex}
                    className={dayClasses}
                    onContextMenu={(e) => onDayRightClick(e, dayDateString)}
                  >
                    {/* Day Header */}
                    <div className="calendar-day-header">
                      <div className={`calendar-day-weekday ${isToday ? 'today' : ''}`}>
                        {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                      </div>
                      <div className={`calendar-day-number ${isToday ? 'today' : ''}`}>
                        {day.getDate()}
                      </div>
                    </div>

                    {/* Workouts */}
                    <div className="calendar-workouts-container">
                      {dayWorkouts.length === 0 ? (
                        <div className="calendar-no-workouts">
                          Sin entrenamientos
                        </div>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={onDragEnd}
                        >
                          <SortableContext
                            items={dayWorkouts.map(w => w.id!)}
                            strategy={verticalListSortingStrategy}
                          >
                            {dayWorkouts.map((workout, workoutIndex) => (
                              <SortableWorkoutItem
                                key={workout.id || workoutIndex}
                                workout={workout}
                                onDayClick={(date) => {
                                  onSelectedDateChange?.(date);
                                  onDayClick(date);
                                }}
                                onDeleteWorkoutEntry={onDeleteWorkoutEntry}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>

                    {/* Add Workout Button */}
                    <div className="calendar-add-workout-container">
                      <button
                        onClick={() => {
                          onSelectedDateChange?.(dayDateString);
                          onAddWorkoutClick(dayDateString);
                        }}
                        className="calendar-add-workout-btn"
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}; 