import React, { useState, useEffect, useMemo } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PersonSearch } from "../forms/PersonSearch";
import { SortableWorkoutItem } from "../lists/SortableWorkoutItem";
import { useWeeklyCalendar } from "../../hooks/useWeeklyCalendar";
import * as styles from "../../styles/weeklyCalendarStyles";
import { WorkoutEntryWithDetails } from '../../services';

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
      style={{
        marginBottom: '8px',
        padding: '6px',
        border: '1px dashed #cbd5e1',
        borderRadius: '6px',
        backgroundColor: isOver ? '#e0f2fe' : '#f8fafc',
        position: 'relative',
        transition: 'background-color 0.2s ease',
        minHeight: '40px'
      }}
    >
      <div style={{
        fontSize: '10px',
        color: '#64748b',
        fontWeight: '500',
        marginBottom: '4px',
        textAlign: 'center'
      }}>
        Grupo {groupNumber}
      </div>
      {children}
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
  console.log("=== GROUPING WORKOUTS ===");
  console.log("Input workouts:", workouts.map(w => ({ id: w.id, exercise_name: w.exercise_name, group_number: w.group_number })));
  
  const groups = workouts.reduce((acc, workout) => {
    const groupNumber = workout.group_number || 1;
    console.log(`Workout ${workout.id} (${workout.exercise_name}) -> Group ${groupNumber}`);
    if (!acc[groupNumber]) {
      acc[groupNumber] = [];
    }
    acc[groupNumber].push(workout);
    return acc;
  }, {} as Record<number, WorkoutEntryWithDetails[]>);
  
  // Add empty groups
  emptyGroups.forEach(groupNumber => {
    if (!groups[groupNumber]) {
      groups[groupNumber] = [];
    }
  });
  
  console.log("Groups created:", Object.keys(groups).map(key => ({ group: key, count: groups[parseInt(key)].length })));
  
  // Sort groups by group number and return as array
  const result = Object.keys(groups)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(groupNumber => ({
      groupNumber: parseInt(groupNumber),
      workouts: groups[parseInt(groupNumber)]
    }));
    
  console.log("Final grouped result:", result.map(g => ({ groupNumber: g.groupNumber, workoutCount: g.workouts.length })));
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
    handleDragEnd,
    generateThreeWeeks,
    formatDateForDB,
    formatWeekRange,
    getDateRangeTitle,
    goToNewerWeeks,
    goToOlderWeeks,
    goToCurrentWeeks,
    createNewGroup,
  } = useWeeklyCalendar({
    selectedPerson,
    workoutData,
    onWorkoutDataChange,
    onReorderExercises,
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

  if (workoutLoading) {
    return (
      <div style={styles.getCalendarContainerStyles()}>
        <div style={styles.getHeaderStyles()}>
          <div style={styles.getTitleStyles()}>
            📅 Últimas 3 Semanas de Entrenamientos
          </div>
        </div>
        <div style={styles.getLoadingStateStyles()}>
          <div style={styles.getLoadingContentStyles()}>
            <div style={styles.getLoadingIconStyles()}>⏳</div>
            <div>Cargando entrenamientos...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.getCalendarContainerStyles()}>
      {/* Header with Person Search and Navigation */}
      <div style={styles.getHeaderStyles()}>
        {!selectedPerson ? (
          // Person Search Section - Consistent Layout
          <div style={styles.getHeaderLayoutStyles()}>
            <div style={styles.getTitleStyles()}>
              📅 Dashboard de Entrenamientos
            </div>
            
            <div style={styles.getPersonSearchContainerStyles()}>
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
          <div style={styles.getHeaderLayoutStyles()}>
            {/* Title - Always on the left */}
            <div style={styles.getTitleStyles()}>
              {getDateRangeTitle()}
            </div>
            
            {/* Selected Person Info and Navigation - Always on the right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Selected Person Info */}
              <div style={styles.getSelectedPersonContainerStyles()}>
                <div style={styles.getPersonAvatarStyles()}>
                  {selectedPerson.name.charAt(0)}{selectedPerson.last_name.charAt(0)}
                </div>
                <div>
                  <div style={styles.getPersonNameStyles()}>
                    {selectedPerson.name} {selectedPerson.last_name}
                  </div>
                  <div style={styles.getPersonPhoneStyles()}>
                    📞 {selectedPerson.phone}
                  </div>
                </div>
                <button
                  onClick={handleClearSelection}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cambiar
                </button>
              </div>
              
              {/* Navigation Controls */}
              <div style={styles.getNavigationContainerStyles()}>
                <button
                  onClick={goToOlderWeeks}
                  style={styles.getNavigationButtonStyles()}
                  onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.getNavigationButtonHoverStyles())}
                  onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.getNavigationButtonStyles())}
                  title="Ver semanas anteriores"
                >
                  ← Anteriores
                </button>
                
                {weekOffset > 0 && (
                  <button
                    onClick={goToCurrentWeeks}
                    style={styles.getCurrentButtonStyles()}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.getCurrentButtonHoverStyles())}
                    onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.getCurrentButtonStyles())}
                    title="Volver a las últimas 3 semanas"
                  >
                    Actuales
                  </button>
                )}
                
                <button
                  onClick={goToNewerWeeks}
                  disabled={weekOffset === 0}
                  style={styles.getNavigationButtonStyles(weekOffset === 0)}
                  onMouseEnter={(e) => {
                    if (weekOffset > 0) {
                      Object.assign(e.currentTarget.style, styles.getNavigationButtonHoverStyles());
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (weekOffset > 0) {
                      Object.assign(e.currentTarget.style, styles.getNavigationButtonStyles());
                    }
                  }}
                  title={weekOffset === 0 ? "Ya estás en las semanas más recientes" : "Ver semanas más recientes"}
                >
                  Recientes →
                </button>
                
                {/* Weekend Toggle */}
                <label style={styles.getWeekendToggleStyles()}>
                  <input
                    type="checkbox"
                    checked={showWeekends}
                    onChange={(e) => setShowWeekends(e.target.checked)}
                    style={styles.getCheckboxStyles()}
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
        style={styles.getCalendarContentStyles()}
      >
        {!selectedPerson ? (
          // Empty State - No person selected
          <div style={styles.getEmptyStateStyles()}>
            <div style={styles.getEmptyStateIconStyles()}>📋</div>
            <div style={styles.getEmptyStateTitleStyles()}>
              Selecciona una persona para ver sus entrenamientos
            </div>
            <p style={styles.getEmptyStateDescriptionStyles()}>
              Usa el buscador de arriba para encontrar y seleccionar una persona.
            </p>
          </div>
        ) : workoutLoading ? (
          // Loading State
          <div style={styles.getLoadingStateStyles()}>
            <div style={styles.getLoadingContentStyles()}>
              <div style={styles.getLoadingIconStyles()}>⏳</div>
              <div>Cargando entrenamientos...</div>
            </div>
          </div>
        ) : (
          // Calendar Content
          <div style={styles.getWeeksContainerStyles()}>
            {threeWeeks.map((week, weekIndex) => (
              <div key={weekIndex} style={styles.getWeekContainerStyles()}>
                {/* Week Header */}
                <div style={styles.getWeekHeaderStyles()}>
                  Semana {week.weekNumber}: {formatWeekRange(week.weekStart)}
                </div>
                
                {/* Week Days Grid */}
                <div style={styles.getWeekGridStyles(showWeekends)}>
                  {week.days.map((day, dayIndex) => {
                    const dayDateString = formatDateForDB(day);
                    const dayWorkouts = currentWorkoutData.filter(workout => 
                      workout.date === dayDateString
                    );
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));
                    
                    console.log(`Day ${dayDateString}: found ${dayWorkouts.length} workouts`);
                    
                    return (
                      <div
                        key={dayIndex}
                        style={styles.getDayContainerStyles(isToday, isPastDay)}
                        onContextMenu={(e) => onDayRightClick(e, dayDateString)}
                      >
                        {/* Day Header */}
                        <div style={styles.getDayHeaderStyles()}>
                          <div style={styles.getDayWeekdayStyles(isToday)}>
                            {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                          </div>
                          <div style={styles.getDayNumberStyles(isToday)}>
                            {day.getDate()}
                          </div>
                        </div>

                        {/* Workouts */}
                        <div style={styles.getWorkoutsContainerStyles()}>
                          {dayWorkouts.length === 0 ? (
                            <div style={styles.getNoWorkoutsStyles()}>
                              Sin entrenamientos
                            </div>
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(event) => handleDragEnd(event, currentWorkoutData)}
                            >
                              <SortableContext
                                items={dayWorkouts.map(w => w.id!)}
                                strategy={verticalListSortingStrategy}
                              >
                                {(() => {
                                  const workoutGroups = groupWorkoutsByGroup(dayWorkouts, dayDateString, emptyGroups[dayDateString] || []);
                                  console.log(`Day ${dayDateString}: ${workoutGroups.length} groups found`);
                                  return workoutGroups.map((group, groupIndex) => (
                                    <DroppableGroup
                                      key={`group-${group.groupNumber}-${dayDateString}`}
                                      groupNumber={group.groupNumber}
                                      dayDateString={dayDateString}
                                    >
                                      {group.workouts.map((workout, workoutIndex) => (
                                        <div key={workout.id || workoutIndex} style={{ marginBottom: '4px' }}>
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
                                      {group.workouts.length === 0 && (
                                        <div style={{
                                          color: '#9ca3af',
                                          fontSize: '10px',
                                          fontStyle: 'italic',
                                          textAlign: 'center',
                                          padding: '8px'
                                        }}>
                                          Arrastra ejercicios aquí
                                        </div>
                                      )}
                                    </DroppableGroup>
                                  ));
                                })()}
                              </SortableContext>
                            </DndContext>
                          )}
                          
                          {/* New Group Button */}
                          {dayWorkouts.length > 0 && (
                            <div style={{ marginTop: '8px', textAlign: 'center' }}>
                              <button
                                onClick={() => createNewGroupLocal(dayDateString)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#e0f2fe',
                                  border: '1px dashed #0891b2',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  color: '#0891b2',
                                  cursor: 'pointer',
                                  fontWeight: '500'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#bae6fd';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#e0f2fe';
                                }}
                              >
                                + Nuevo Grupo
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Add Workout Button */}
                        <div style={styles.getAddWorkoutButtonContainerStyles()}>
                          <button
                            onClick={() => {
                              onSelectedDateChange?.(dayDateString);
                              onAddWorkoutClick(dayDateString);
                            }}
                            style={styles.getAddWorkoutButtonStyles()}
                            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.getAddWorkoutButtonHoverStyles())}
                            onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.getAddWorkoutButtonStyles())}
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
        )}
      </div>
    </div>
  );
}; 