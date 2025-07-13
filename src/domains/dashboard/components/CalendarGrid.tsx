import React from 'react';
import { WorkoutEntryWithDetails } from '../../../services';
import { WorkoutItem } from '../../workout';
import '../../../styles/CalendarGrid.css';

interface CalendarGridProps {
  threeWeeks: Date[][];
  workoutData: WorkoutEntryWithDetails[];
  onDayClick: (date: string) => void;
  onDayRightClick: (e: React.MouseEvent, date: string) => void;
  onAddWorkoutClick: (date: string) => void;
  onDeleteWorkoutEntry: (id: number) => void;
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
  showWeekends = true,
  onSelectedDateChange
}) => {
  const formatDateForDB = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return formatDateForDB(date) === formatDateForDB(today);
  };

  return (
    <div className="calendar-grid">
      {threeWeeks.map((week, weekIndex) => {
        const weekStart = week[0];
        const weekEnd = week[6];
        const weekLabel = `${weekStart.getDate()} ${weekStart.toLocaleDateString('es-ES', { month: 'short' })} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('es-ES', { month: 'short' })}`;

        return (
          <div key={weekIndex} className="calendar-week-container">
            <div className="calendar-week-header">
              {weekLabel}
            </div>
            <div className="calendar-week">
              {week.map((day, dayIndex) => {
                const dayDateString = formatDateForDB(day);
                const dayWorkouts = workoutData
                  .filter(workout => formatDateForDB(new Date(workout.date)) === dayDateString)
                  .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

                const dayOfWeek = day.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                
                if (!showWeekends && isWeekend) {
                  return null;
                }

                return (
                  <div
                    key={dayIndex}
                    className={`calendar-day ${isToday(day) ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}
                    onContextMenu={(e) => onDayRightClick(e, dayDateString)}
                  >
                    <div className="calendar-day-header">
                      <div className="calendar-day-number">
                        {day.getDate()}
                      </div>
                      <div className="calendar-day-name">
                        {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                      </div>
                    </div>

                    <div className="calendar-workouts">
                      {dayWorkouts.length === 0 ? (
                        <div className="calendar-no-workouts">
                          Sin entrenamientos
                        </div>
                      ) : (
                        dayWorkouts.map((workout, workoutIndex) => (
                          <WorkoutItem
                            key={workout.id || workoutIndex}
                            workout={workout}
                            onDayClick={(date) => {
                              onSelectedDateChange?.(date);
                              onDayClick(date);
                            }}
                            onDeleteWorkoutEntry={onDeleteWorkoutEntry}
                          />
                        ))
                      )}
                    </div>

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