import React, { useState } from "react";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PersonSearch } from "../forms/PersonSearch";
import { SortableWorkoutItem } from "../lists/SortableWorkoutItem";
import { useWeeklyCalendar } from "../../hooks/useWeeklyCalendar";
import * as styles from "../../styles/weeklyCalendarStyles";

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
  } = useWeeklyCalendar({
    selectedPerson,
    workoutData,
    onWorkoutDataChange,
    onReorderExercises,
  });

  const threeWeeks = generateThreeWeeks();

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