import React, { useState, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WorkoutEntryWithDetails {
  id?: number;
  person_id: number;
  exercise_id: number;
  date: string;
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  person_name: string;
  person_last_name: string;
  exercise_name: string;
  exercise_code: string;
  order_index?: number;
}

interface WeeklyCalendarProps {
  workoutData: WorkoutEntryWithDetails[];
  workoutLoading: boolean;
  onDayClick: (date: string) => void;
  onDayRightClick: (e: React.MouseEvent, date: string) => void;
  onAddWorkoutClick: (date: string) => void;
  onDeleteWorkoutEntry: (id: number) => void;
  onReorderExercises: (exerciseOrders: Array<{ id: number; order: number }>) => void;
  onFetchWorkoutData: (startDate: string, endDate: string) => Promise<void>;
  showWeekends?: boolean;
}

interface SortableWorkoutItemProps {
  workout: WorkoutEntryWithDetails;
  onDayClick: (date: string) => void;
  onDeleteWorkoutEntry: (id: number) => void;
}

const SortableWorkoutItem: React.FC<SortableWorkoutItemProps> = ({
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

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  workoutData,
  workoutLoading,
  onDayClick,
  onDayRightClick,
  onAddWorkoutClick,
  onDeleteWorkoutEntry,
  onReorderExercises,
  onFetchWorkoutData,
  showWeekends = false
}) => {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current 3 weeks, 3 = next 3 weeks back, etc.
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollPosition = useRef<number>(0);
  const isReordering = useRef<boolean>(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save scroll position before data refresh
  const saveScrollPosition = () => {
    if (scrollContainerRef.current) {
      savedScrollPosition.current = scrollContainerRef.current.scrollTop;
    }
  };

  // Restore scroll position after data refresh
  const restoreScrollPosition = () => {
    if (scrollContainerRef.current && isReordering.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedScrollPosition.current;
          isReordering.current = false;
        }
      }, 50); // Small delay to ensure DOM is updated
    }
  };

  // Restore scroll position when workoutData changes after reordering
  useEffect(() => {
    restoreScrollPosition();
  }, [workoutData]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Find the date for the dragged items
    const activeWorkout = workoutData.find(w => w.id === active.id);
    if (!activeWorkout) return;

    const dayDateString = formatDateForDB(new Date(activeWorkout.date));
    const dayWorkouts = workoutData
      .filter(workout => formatDateForDB(new Date(workout.date)) === dayDateString)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const oldIndex = dayWorkouts.findIndex(w => w.id === active.id);
    const newIndex = dayWorkouts.findIndex(w => w.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedWorkouts = arrayMove(dayWorkouts, oldIndex, newIndex);
      
      // Create the order updates
      const exerciseOrders = reorderedWorkouts.map((workout, index) => ({
        id: workout.id!,
        order: index
      }));

      // Mark that we're reordering and save scroll position
      isReordering.current = true;
      saveScrollPosition();

      onReorderExercises(exerciseOrders);
    }
  };

  // Generate 3 weeks based on offset
  const generateThreeWeeks = () => {
    const today = new Date();
    const weeks = [];
    
    for (let i = 2; i >= 0; i--) {
      const weekStart = new Date(today);
      const totalWeeksBack = (weekOffset * 3) + i;
      weekStart.setDate(today.getDate() - (totalWeeksBack * 7) - today.getDay());
      
      const weekDays = Array.from({ length: 7 }, (_, dayIndex) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + dayIndex);
        return day;
      });
      
      // Filter out weekends if showWeekends is false
      const filteredDays = showWeekends ? weekDays : weekDays.filter(day => {
        const dayOfWeek = day.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday
      });
      
      weeks.push({
        weekStart,
        days: filteredDays,
        weekNumber: 3 - i
      });
    }
    
    // Reverse the weeks array so the most recent weeks appear first
    return weeks.reverse();
  };

  const threeWeeks = generateThreeWeeks();

  // Helper function to format date as YYYY-MM-DD to match database format
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

  const getDateRangeTitle = () => {
    if (weekOffset === 0) {
      return "📅 Últimas 3 Semanas de Entrenamientos";
    } else {
      const weeksAgo = weekOffset * 3;
      return `📅 Entrenamientos de hace ${weeksAgo}-${weeksAgo + 2} semanas`;
    }
  };

  const goToNewerWeeks = async () => {
    if (weekOffset > 0) {
      const newOffset = weekOffset - 1;
      setWeekOffset(newOffset);
      await fetchDataForOffset(newOffset);
    }
  };

  const goToOlderWeeks = async () => {
    const newOffset = weekOffset + 1;
    setWeekOffset(newOffset);
    await fetchDataForOffset(newOffset);
  };

  const goToCurrentWeeks = async () => {
    setWeekOffset(0);
    await fetchDataForOffset(0);
  };

  const fetchDataForOffset = async (offset: number) => {
    const today = new Date();
    
    // Calculate the date range for the 3 weeks we want to show
    const oldestWeekStart = new Date(today);
    const totalWeeksBack = (offset * 3) + 2; // +2 because we show 3 weeks (0, 1, 2)
    oldestWeekStart.setDate(today.getDate() - (totalWeeksBack * 7) - today.getDay());
    
    const newestWeekEnd = new Date(today);
    const newestWeeksBack = offset * 3;
    newestWeekEnd.setDate(today.getDate() - (newestWeeksBack * 7) - today.getDay() + 6);
    
    const startDate = oldestWeekStart.toISOString().split('T')[0];
    const endDate = newestWeekEnd.toISOString().split('T')[0];
    
    await onFetchWorkoutData(startDate, endDate);
  };

  if (workoutLoading) {
    return (
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontWeight: '600',
            color: '#1f2937',
            fontSize: '16px'
          }}>
            📅 Últimas 3 Semanas de Entrenamientos
          </div>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '300px',
          color: '#6b7280'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            <div>Cargando entrenamientos...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Header with Navigation */}
      <div style={{ 
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f8fafc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ 
          fontWeight: '600',
          color: '#1f2937',
          fontSize: '16px'
        }}>
          {getDateRangeTitle()}
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={goToOlderWeeks}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            title="Ver semanas anteriores"
          >
            ← Anteriores
          </button>
          
          {weekOffset > 0 && (
            <button
              onClick={goToCurrentWeeks}
              style={{
                padding: '6px 12px',
                backgroundColor: '#2563eb',
                border: '1px solid #2563eb',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              title="Volver a las últimas 3 semanas"
            >
              Actuales
            </button>
          )}
          
          <button
            onClick={goToNewerWeeks}
            disabled={weekOffset === 0}
            style={{
              padding: '6px 12px',
              backgroundColor: weekOffset === 0 ? '#f9fafb' : '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: weekOffset === 0 ? '#9ca3af' : '#374151',
              fontSize: '14px',
              cursor: weekOffset === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              if (weekOffset > 0) {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }
            }}
            onMouseLeave={(e) => {
              if (weekOffset > 0) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            title={weekOffset === 0 ? "Ya estás en las semanas más recientes" : "Ver semanas más recientes"}
          >
            Recientes →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div 
        ref={scrollContainerRef}
        style={{ 
          padding: '16px',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {threeWeeks.map((week, weekIndex) => (
            <div key={weekIndex} style={{ 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {/* Week Header */}
              <div style={{ 
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e5e7eb',
                fontWeight: '600',
                fontSize: '14px',
                color: '#374151'
              }}>
                Semana {week.weekNumber}: {formatWeekRange(week.weekStart)}
              </div>
              
              {/* Week Days Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: showWeekends 
                  ? 'repeat(7, 1fr)' 
                  : 'repeat(5, 1fr)', 
                gap: '1px',
                backgroundColor: '#e5e7eb',
                width: '100%'
              }}>
                {week.days.map((day, dayIndex) => {
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
                        backgroundColor: isToday ? '#eff6ff' : isPastDay ? '#f9fafb' : 'white',
                        padding: '8px',
                        minHeight: '120px',
                        display: 'flex',
                        flexDirection: 'column',
                        border: isToday ? '2px solid #3b82f6' : 'none',
                        overflow: 'hidden'
                      }}
                      onContextMenu={(e) => onDayRightClick(e, dayDateString)}
                    >
                      {/* Day Header */}
                      <div style={{ 
                        textAlign: 'center', 
                        marginBottom: '8px',
                        paddingBottom: '6px',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <div style={{ 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          color: isToday ? '#3b82f6' : '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                        </div>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          color: isToday ? '#3b82f6' : '#1f2937'
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
                            color: '#9ca3af',
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
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={dayWorkouts.map(w => w.id!)}
                              strategy={verticalListSortingStrategy}
                            >
                              {dayWorkouts.map((workout, workoutIndex) => (
                                <SortableWorkoutItem
                                  key={workout.id || workoutIndex}
                                  workout={workout}
                                  onDayClick={onDayClick}
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
                          onClick={() => onAddWorkoutClick(dayDateString)}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            backgroundColor: 'transparent',
                            border: '1px dashed #9ca3af',
                            borderRadius: '4px',
                            color: '#6b7280',
                            fontSize: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.color = '#3b82f6';
                            e.currentTarget.style.backgroundColor = '#f0f9ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#9ca3af';
                            e.currentTarget.style.color = '#6b7280';
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
          ))}
        </div>
      </div>
    </div>
  );
}; 