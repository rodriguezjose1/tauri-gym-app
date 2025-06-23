import React, { useState, useEffect, useMemo } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable, DragOverlay } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PersonSearch } from "../../person";
import { SortableWorkoutItem } from "../../workout";
import { useWeeklyCalendar } from "../hooks/useWeeklyCalendar";
import { useCalendarDragAndDrop } from "../hooks/useCalendarDragAndDrop";
import { WorkoutEntryWithDetails, WorkoutService } from '../../../services';
import "../../../styles/WeeklyCalendar.css";

// Droppable Group Component
const DroppableGroup: React.FC<{
  groupNumber: number;
  dayDateString: string;
  children: React.ReactNode;
}> = ({ groupNumber, dayDateString, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${groupNumber}-${dayDateString}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`weekly-calendar-droppable-group ${isOver ? 'is-over' : ''}`}
    >
      <div className="weekly-calendar-group-header">
        Grupo {groupNumber}
      </div>
      <div className="weekly-calendar-group-container">
        {children}
        {React.Children.count(children) === 0 && (
          <div className="weekly-calendar-group-empty">
            Arrastra ejercicios aquí
          </div>
        )}
      </div>
    </div>
  );
};

interface WeeklyCalendarProps {
  selectedPerson?: any;
  workoutData?: any[];
  onWorkoutDataChange?: (data: any[]) => void;
  onReorderExercises: (exerciseOrders: Array<{ id: number; order: number }>) => void;
  onAddWorkoutClick: (date: string) => void;
  onDeleteWorkoutEntry: (workoutId: number) => void;
  onDayClick: (date: string) => void;
  onDayRightClick: (e: React.MouseEvent, date: string) => void;
  onSelectedDateChange?: (date: string) => void;
  handlePersonSelect: (person: any) => void;
  handleClearSelection: () => void;
}

// Helper function to group workouts by group_number
const groupWorkoutsByGroup = (workouts: WorkoutEntryWithDetails[], dayDateString?: string, emptyGroups: number[] = []) => {
  const groups = workouts.reduce((acc, workout) => {
    const groupNumber = workout.group_number || 1;
    if (!acc[groupNumber]) {
      acc[groupNumber] = [];
    }
    acc[groupNumber].push(workout);
    return acc;
  }, {} as Record<number, WorkoutEntryWithDetails[]>);
  
  // Sort workouts within each group by order_index
  Object.keys(groups).forEach(groupNumber => {
    const groupWorkouts = groups[parseInt(groupNumber)];
    
    groupWorkouts.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  });
  
  // Add empty groups
  emptyGroups.forEach(groupNumber => {
    if (!groups[groupNumber]) {
      groups[groupNumber] = [];
    }
  });
  
  // Sort groups by group number and return as array
  const result = Object.keys(groups)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(groupNumber => ({
      groupNumber: parseInt(groupNumber),
      workouts: groups[parseInt(groupNumber)]
    }));
  return result;
};

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  selectedPerson,
  workoutData,
  onWorkoutDataChange,
  onReorderExercises,
  onAddWorkoutClick,
  onDeleteWorkoutEntry,
  onDayClick,
  onDayRightClick,
  onSelectedDateChange,
  handlePersonSelect,
  handleClearSelection,
}) => {
  const [showWeekends, setShowWeekends] = useState(false);
  const [emptyGroups, setEmptyGroups] = useState<Record<string, number[]>>({});
  const sensors = useSensors(useSensor(PointerSensor));
  
  const {
    workoutLoading,
    weekOffset,
    scrollContainerRef,
    currentWorkoutData,
    generateThreeWeeks,
    formatDateForDB,
    formatWeekRange,
    getDateRangeTitle,
    goToNewerWeeks,
    goToOlderWeeks,
    goToCurrentWeeks,
  } = useWeeklyCalendar({
    selectedPerson,
    workoutData,
    onWorkoutDataChange,
    onReorderExercises,
  });

  // Hook para drag and drop
  const { 
    isDragging, 
    activeWorkout, 
    handleDragStart, 
    handleDragOver, 
    handleDragEnd 
  } = useCalendarDragAndDrop({
    workouts: currentWorkoutData || [],
    onUpdateWorkout: async (workoutId, updates) => {
      // Find the current workout to get all required fields
      const currentWorkout = (currentWorkoutData || []).find(w => w.id === workoutId);
      if (!currentWorkout) {
        return;
      }
      
      // Update local state immediately for visual feedback
      const updatedWorkouts = (currentWorkoutData || []).map(workout => 
        workout.id === workoutId ? { ...workout, ...updates } : workout
      );
      onWorkoutDataChange?.(updatedWorkouts);
      
      // Then update the database with all required fields
      try {
        const workoutToUpdate = {
          ...currentWorkout,
          ...updates
        };
        
        await WorkoutService.updateWorkoutEntry(workoutToUpdate);
      } catch (error) {
        console.error('❌ Database update failed:', error);
        // Revert local state on error
        onWorkoutDataChange?.(currentWorkoutData || []);
      }
    },
    onReorderWorkouts: async (workoutOrders) => {
      // Update local state immediately for visual feedback
      const updatedWorkouts = [...(currentWorkoutData || [])];
      workoutOrders.forEach(([id, newOrder]) => {
        const index = updatedWorkouts.findIndex(w => w.id === id);
        if (index !== -1) {
          updatedWorkouts[index] = { ...updatedWorkouts[index], order_index: newOrder };
        }
      });
      
      // Update local state first
      onWorkoutDataChange?.(updatedWorkouts);
      
      // Then update the database
      try {
        await WorkoutService.updateExerciseOrder(workoutOrders);
      } catch (error) {
        console.error('❌ Database reorder failed:', error);
        // Revert local state on error
        onWorkoutDataChange?.(currentWorkoutData || []);
      }
    },
    onGroupEmpty: (date, groupNumber) => {
    }
  });

  const threeWeeks = generateThreeWeeks();

  // Local function to create new groups
  const createNewGroupLocal = (dayDateString: string) => {
    const dayWorkouts = currentWorkoutData.filter(workout => 
      formatDateForDB(new Date(workout.date)) === dayDateString
    );
    
    // Find the highest group number for this day
    const maxGroupNumber = Math.max(...dayWorkouts.map(w => w.group_number || 1), 0);
    const newGroupNumber = maxGroupNumber + 1;
    
    // Add the new empty group to the state
    setEmptyGroups(prev => ({
      ...prev,
      [dayDateString]: [...(prev[dayDateString] || []), newGroupNumber]
    }));
  };

  // Clean up empty groups when workouts are moved
  const cleanupEmptyGroups = (dayDateString: string, currentWorkouts: WorkoutEntryWithDetails[]) => {
    const dayWorkouts = currentWorkouts.filter(workout => 
      formatDateForDB(new Date(workout.date)) === dayDateString
    );
    
    const usedGroups = new Set(dayWorkouts.map(w => w.group_number || 1));
    const emptyGroupsForDay = emptyGroups[dayDateString] || [];
    
    // Remove empty groups that now have workouts
    const stillEmptyGroups = emptyGroupsForDay.filter(groupNum => !usedGroups.has(groupNum));
    
    if (stillEmptyGroups.length !== emptyGroupsForDay.length) {
      setEmptyGroups(prev => ({
        ...prev,
        [dayDateString]: stillEmptyGroups
      }));
    }
  };

  // Effect to clean up empty groups when workout data changes
  useEffect(() => {
    Object.keys(emptyGroups).forEach(dayDateString => {
      cleanupEmptyGroups(dayDateString, currentWorkoutData);
    });
  }, [currentWorkoutData, emptyGroups]);

  // Debug effect to track state changes
  useEffect(() => {
    console.log('🔄 currentWorkoutData changed:', currentWorkoutData.length, 'workouts');
    console.log('📊 Sample workouts:', currentWorkoutData.slice(0, 3).map(w => ({ 
      id: w.id, 
      name: w.exercise_name, 
      order: w.order_index, 
      group: w.group_number 
    })));
  }, [currentWorkoutData]);

  if (workoutLoading) {
    return (
      <div className="weekly-calendar-container">
        <div className="weekly-calendar-header">
          <div className="weekly-calendar-title">
            📅 Últimas 3 Semanas de Entrenamientos
          </div>
        </div>
        <div className="weekly-calendar-loading-state">
          <div className="weekly-calendar-loading-content">
            <div className="weekly-calendar-loading-icon">⏳</div>
            <div>Cargando entrenamientos...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="weekly-calendar-container">
      {/* Header with Person Search and Navigation */}
      <div className="weekly-calendar-header">
        {!selectedPerson ? (
          // Person Search Section - Consistent Layout
          <div className="weekly-calendar-header-layout">
            <div className="weekly-calendar-title">
              📅 Dashboard de Entrenamientos
            </div>
            
            <div className="weekly-calendar-person-search">
              <PersonSearch
                selectedPerson={selectedPerson || null}
                onPersonSelect={handlePersonSelect}
                onClearSelection={handleClearSelection}
                placeholder="🔍 Buscar persona para ver entrenamientos..."
              />
            </div>
          </div>
        ) : (
          // Selected Person and Navigation Section - Consistent Layout
          <div className="weekly-calendar-header-layout">
            {/* Title - Always on the left */}
            <div className="weekly-calendar-title">
              {getDateRangeTitle()}
            </div>
            
            {/* Selected Person Info and Navigation - Always on the right */}
            <div className="weekly-calendar-header-right">
              {/* Selected Person Info */}
              <div className="weekly-calendar-selected-person">
                <div className="weekly-calendar-person-avatar">
                  {selectedPerson.name.charAt(0)}{selectedPerson.last_name.charAt(0)}
                </div>
                <div className="weekly-calendar-person-info">
                  <div className="weekly-calendar-person-name">
                    {selectedPerson.name} {selectedPerson.last_name}
                  </div>
                  <div className="weekly-calendar-person-phone">
                    📞 {selectedPerson.phone}
                  </div>
                </div>
                <button
                  onClick={handleClearSelection}
                  className="weekly-calendar-change-button"
                >
                  Cambiar
                </button>
              </div>
              
              {/* Navigation Controls */}
              <div className="weekly-calendar-navigation-container">
                <button
                  onClick={goToOlderWeeks}
                  className="weekly-calendar-nav-button"
                  title="Ver semanas anteriores"
                >
                  ← Anteriores
                </button>
                
                {weekOffset > 0 && (
                  <button
                    onClick={goToCurrentWeeks}
                    className="weekly-calendar-current-button"
                    title="Volver a las últimas 3 semanas"
                  >
                    Actuales
                  </button>
                )}
                
                <button
                  onClick={goToNewerWeeks}
                  disabled={weekOffset === 0}
                  className="weekly-calendar-nav-button"
                  title={weekOffset === 0 ? "Ya estás en las semanas más recientes" : "Ver semanas más recientes"}
                >
                  Recientes →
                </button>
                
                {/* Weekend Toggle */}
                <label className="weekly-calendar-weekend-toggle">
                  <input
                    type="checkbox"
                    checked={showWeekends}
                    onChange={(e) => setShowWeekends(e.target.checked)}
                    className="weekly-calendar-checkbox"
                  />
                  Mostrar fines de semana
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div 
        ref={scrollContainerRef}
        className="weekly-calendar-content"
      >
        {!selectedPerson ? (
          // Empty State - No person selected
          <div className="weekly-calendar-empty-state">
            <div className="weekly-calendar-empty-icon">📋</div>
            <div className="weekly-calendar-empty-title">
              Selecciona una persona para ver sus entrenamientos
            </div>
            <p className="weekly-calendar-empty-description">
              Usa el buscador de arriba para encontrar y seleccionar una persona.
            </p>
          </div>
        ) : workoutLoading ? (
          // Loading State
          <div className="weekly-calendar-loading-state">
            <div className="weekly-calendar-loading-content">
              <div className="weekly-calendar-loading-icon">⏳</div>
              <div>Cargando entrenamientos...</div>
            </div>
          </div>
        ) : (
          // Calendar Content
          <div className="weekly-calendar-weeks-container">
            {threeWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className="weekly-calendar-week-container">
                {/* Week Header */}
                <div className="weekly-calendar-week-header">
                  Semana {week.weekNumber}: {formatWeekRange(week.weekStart)}
                </div>
                
                {/* Week Days Grid */}
                <div className={`weekly-calendar-week-grid ${showWeekends ? 'show-weekends' : 'hide-weekends'}`}>
                  {week.days.map((day, dayIndex) => {
                    const dayDateString = formatDateForDB(day);
                    const dayWorkouts = currentWorkoutData.filter(workout => 
                      workout.date === dayDateString
                    );
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`weekly-calendar-day ${isToday ? 'today' : ''} ${isPastDay ? 'past' : ''}`}
                        onContextMenu={(e) => onDayRightClick(e, dayDateString)}
                      >
                        {/* Day Header */}
                        <div className="weekly-calendar-day-header">
                          <div className={`weekly-calendar-day-weekday ${isToday ? 'today' : ''}`}>
                            {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                          </div>
                          <div className="weekly-calendar-day-number-container">
                            <button
                              onClick={() => {
                                onSelectedDateChange?.(dayDateString);
                                onAddWorkoutClick(dayDateString);
                              }}
                              className="weekly-calendar-add-button"
                              title="Agregar entrenamiento"
                            >
                              +
                            </button>
                            <div className={`weekly-calendar-day-number ${isToday ? 'today' : ''}`}>
                              {day.getDate()}
                            </div>
                          </div>
                        </div>

                        {/* Workouts */}
                        <div className="weekly-calendar-workouts">
                          {dayWorkouts.length === 0 ? (
                            <div className="weekly-calendar-no-workouts">
                              Sin entrenamientos
                            </div>
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragStart={handleDragStart}
                              onDragOver={handleDragOver}
                              onDragEnd={handleDragEnd}
                            >
                              {(() => {
                                const workoutGroups = groupWorkoutsByGroup(dayWorkouts, dayDateString, emptyGroups[dayDateString] || []);
                                return workoutGroups.map((group, groupIndex) => (
                                  <div key={`group-${group.groupNumber}-${dayDateString}`}>
                                    <DroppableGroup
                                      groupNumber={group.groupNumber}
                                      dayDateString={dayDateString}
                                    >
                                      <SortableContext
                                        items={group.workouts.map(w => w.id!)}
                                        strategy={verticalListSortingStrategy}
                                      >
                                        {group.workouts.map((workout, workoutIndex) => (
                                          <div key={workout.id || workoutIndex} className="weekly-calendar-workout-item">
                                            <SortableWorkoutItem
                                              workout={workout}
                                              onDayClick={(date) => {
                                                onSelectedDateChange?.(date);
                                                onDayClick(date);
                                              }}
                                              onDeleteWorkoutEntry={onDeleteWorkoutEntry}
                                            />
                                          </div>
                                        ))}
                                      </SortableContext>
                                    </DroppableGroup>
                                  </div>
                                ));
                              })()}

                              <DragOverlay>
                                {activeWorkout && (
                                  <SortableWorkoutItem
                                    workout={activeWorkout}
                                    onDayClick={() => {}}
                                    onDeleteWorkoutEntry={() => {}}
                                  />
                                )}
                              </DragOverlay>
                            </DndContext>
                          )}
                          
                          {/* New Group Button */}
                          {dayWorkouts.length > 0 && (
                            <div className="weekly-calendar-new-group-container">
                              <button
                                onClick={() => createNewGroupLocal(dayDateString)}
                                className="weekly-calendar-new-group-button"
                              >
                                + Nuevo Grupo
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 