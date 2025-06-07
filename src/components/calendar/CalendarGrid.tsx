import React from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { WorkoutEntryWithDetails } from '../../services';
import { SortableWorkoutItem } from '../lists/SortableWorkoutItem';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {threeWeeks.map((week, weekIndex) => {
        const weekStart = week[0];
        const weekNumber = getWeekNumber(weekStart);
        
        return (
          <div key={weekIndex} style={{ 
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {/* Week Header */}
            <div style={{ 
              padding: '12px 16px',
              backgroundColor: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border-light)',
              fontWeight: '600',
              fontSize: '14px',
              color: 'var(--text-primary)'
            }}>
              Semana {weekNumber}: {formatWeekRange(weekStart)}
            </div>
            
            {/* Week Days Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: showWeekends 
                ? 'repeat(7, 1fr)' 
                : 'repeat(5, 1fr)', 
              gap: '1px',
              backgroundColor: 'var(--border-light)',
              width: '100%'
            }}>
              {week.map((day, dayIndex) => {
                const dayDateString = formatDateForDB(day);
                const dayWorkouts = workoutData.filter(workout => 
                  workout.date === dayDateString
                );
                const isToday = day.toDateString() === new Date().toDateString();
                const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));
                
                console.log(`Day ${dayDateString}: found ${dayWorkouts.length} workouts`);
                
                return (
                  <div
                    key={dayIndex}
                    style={{
                      backgroundColor: isToday ? 'var(--accent-bg)' : isPastDay ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      padding: '8px',
                      minHeight: '120px',
                      display: 'flex',
                      flexDirection: 'column',
                      border: isToday ? '2px solid var(--accent-primary)' : 'none',
                      overflow: 'hidden'
                    }}
                    onContextMenu={(e) => onDayRightClick(e, dayDateString)}
                  >
                    {/* Day Header */}
                    <div style={{ 
                      textAlign: 'center', 
                      marginBottom: '8px',
                      paddingBottom: '6px',
                      borderBottom: '1px solid var(--border-light)'
                    }}>
                      <div style={{ 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: isToday ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                      </div>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)'
                      }}>
                        {day.getDate()}
                      </div>
                    </div>

                    {/* Workouts */}
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '4px'
                    }}>
                      {dayWorkouts.length === 0 ? (
                        <div style={{ 
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          fontSize: '11px',
                          textAlign: 'center',
                          minHeight: '60px'
                        }}>
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
                    <div style={{ marginTop: '8px' }}>
                      <button
                        onClick={() => {
                          onSelectedDateChange?.(dayDateString);
                          onAddWorkoutClick(dayDateString);
                        }}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          backgroundColor: 'transparent',
                          border: '1px dashed var(--text-muted)',
                          borderRadius: '4px',
                          color: 'var(--text-secondary)',
                          fontSize: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-primary)';
                          e.currentTarget.style.color = 'var(--accent-primary)';
                          e.currentTarget.style.backgroundColor = 'var(--accent-bg)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--text-muted)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
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