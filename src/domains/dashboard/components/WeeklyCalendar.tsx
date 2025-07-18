import React, { useState, useEffect, useMemo } from "react";
import { PersonSearch } from "../../person";
import { WorkoutItem } from "../../workout";
import { useWeeklyCalendar } from "../hooks/useWeeklyCalendar";
import { WorkoutEntryWithDetails, RoutineService } from '../../../services';
import { Button } from "../../../shared/components/base";
import { useConfig } from "../../../shared/contexts/ConfigContext";
import "../../../styles/WeeklyCalendar.css";

// Simple Group Component for Regular Workouts
const WorkoutGroup: React.FC<{
  groupNumber: number;
  children: React.ReactNode;
}> = ({ groupNumber, children }) => {
  return (
    <div className="weekly-calendar-group">
      <div className="weekly-calendar-group-header">
        Grupo {groupNumber}
      </div>
      <div className="weekly-calendar-group-container">
        {children}
        {React.Children.count(children) === 0 && (
          <div className="weekly-calendar-group-empty">
            No hay ejercicios
          </div>
        )}
      </div>
    </div>
  );
};

// Lazy loading component for routine exercise count
const RoutineExerciseCount: React.FC<{ routineId: number; initialCount: number }> = ({ routineId, initialCount }) => {
  const [exerciseCount, setExerciseCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadExerciseCount = async () => {
    if (hasLoaded || isLoading) return;
    
    setIsLoading(true);
    try {
      const routineWithExercises = await RoutineService.getRoutineWithExercises(routineId);
      const count = routineWithExercises?.exercises?.length || 0;
      setExerciseCount(count);
      setHasLoaded(true);
    } catch (error) {
      console.error(`Error loading exercise count for routine ${routineId}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load exercise count when component mounts
  useEffect(() => {
    if (initialCount === 0) {
      loadExerciseCount();
    }
  }, [routineId, initialCount]);

  return (
    <span>
      {isLoading ? '...' : `${exerciseCount} ejercicios`}
    </span>
  );
};

interface WeeklyCalendarProps {
  selectedPerson: any;
  workoutData: WorkoutEntryWithDetails[];
  onWorkoutDataChange?: (data: WorkoutEntryWithDetails[]) => void;
  onAddWorkoutClick: (date: string) => void;
  onDeleteWorkoutEntry: (id: number) => void;
  onEditWorkoutEntry?: (workout: WorkoutEntryWithDetails) => void;
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
  onAddWorkoutClick,
  onDeleteWorkoutEntry,
  onEditWorkoutEntry,
  onDayClick,
  onDayRightClick,
  onSelectedDateChange,
  handlePersonSelect,
  handleClearSelection
}) => {
  const [emptyGroups, setEmptyGroups] = useState<{ [key: string]: number[] }>({});
  const currentWorkoutData = workoutData || [];
  const { config, updateConfig } = useConfig();

  const {
    threeWeeks,
    dateRangeTitle,
    formatDateForDB,
    groupWorkoutsByGroup,
    isToday,
    isSelected,
    selectedDate,
    showWeekends,
    goToNewerWeeks,
    goToOlderWeeks,
    goToCurrentWeeks,
    weekOffset
  } = useWeeklyCalendar({
    selectedPerson,
    workoutData: currentWorkoutData,
    onWorkoutDataChange,
    onGroupEmpty: (date: string, groupNumber: number) => {
      setEmptyGroups(prev => ({
        ...prev,
        [date]: [...(prev[date] || []), groupNumber]
      }));
    }
  });

  const handleDayClick = (date: string) => {
    onSelectedDateChange?.(date);
    onDayClick(date);
  };

  return (
    <div className="weekly-calendar">
      <div className="weekly-calendar-header">
        <div className="weekly-calendar-header-compact">
          {/* Person Selection, Date Range, and Navigation Row */}
          <div className="weekly-calendar-controls-row">
            <div className="weekly-calendar-person-section">
              <PersonSearch
                selectedPerson={selectedPerson}
                onPersonSelect={handlePersonSelect}
                onClearSelection={handleClearSelection}
              />
            </div>
            
            <div className="weekly-calendar-date-section">
              <div className="weekly-calendar-date-range">
                📅 {dateRangeTitle}
              </div>
            </div>
            
            <div className="weekly-calendar-navigation-section">
              <Button
                onClick={goToOlderWeeks}
                variant="secondary"
                size="sm"
                className="weekly-calendar-nav-button"
              >
                ← Anterior
              </Button>
              
              <Button
                onClick={goToCurrentWeeks}
                variant="primary"
                size="sm"
                className="weekly-calendar-current-button"
              >
                Hoy
              </Button>
              
              <Button
                onClick={goToNewerWeeks}
                variant="secondary"
                size="sm"
                className="weekly-calendar-nav-button"
              >
                Siguiente →
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="weekly-calendar-grid">
        {threeWeeks.map((week, weekIndex) => (
          <div key={weekIndex} className="weekly-calendar-week-container">
            <div className={`weekly-calendar-week ${!showWeekends ? 'hide-weekends' : ''}`}>
              {week.map((day, dayIndex) => {
                const dayDateString = formatDateForDB(day);
                const dayWorkouts = currentWorkoutData
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
                    className={`weekly-calendar-day ${isToday(day) ? 'today' : ''} ${isSelected(day) ? 'selected' : ''} ${isWeekend ? 'weekend' : ''}`}
                    onContextMenu={(e) => onDayRightClick(e, dayDateString)}
                  >
                    <div className="weekly-calendar-day-header">
                      <div className="weekly-calendar-day-info">
                        <div className="weekly-calendar-day-number">
                          {day.getDate()}
                        </div>
                        <div className="weekly-calendar-day-name">
                          {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                        </div>
                      </div>
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
                    </div>

                    <div className="weekly-calendar-workouts">
                      {dayWorkouts.length === 0 ? (
                        <div className="weekly-calendar-no-workouts">
                          Sin entrenamientos
                        </div>
                      ) : (
                        (() => {
                          const workoutGroups = groupWorkoutsByGroup(dayWorkouts, dayDateString, emptyGroups[dayDateString] || []);
                          return workoutGroups.map((group, groupIndex) => (
                            <div key={`group-${group.groupNumber}-${dayDateString}`}>
                              <WorkoutGroup groupNumber={group.groupNumber}>
                                {group.workouts.map((workout, workoutIndex) => (
                                  <div key={workout.id || workoutIndex} className="weekly-calendar-workout-item">
                                    <WorkoutItem
                                      workout={workout}
                                      onDayClick={handleDayClick}
                                      onDeleteWorkoutEntry={onDeleteWorkoutEntry}
                                      onEditWorkoutEntry={onEditWorkoutEntry}
                                    />
                                  </div>
                                ))}
                              </WorkoutGroup>
                            </div>
                          ));
                        })()
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 