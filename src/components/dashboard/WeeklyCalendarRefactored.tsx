import React, { useState, useRef, useEffect } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { PersonService, WorkoutService, Person, WorkoutEntryWithDetails } from "../../services";
import { Input, Button } from "../ui";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";

interface WeeklyCalendarProps {
  onDayClick: (date: string) => void;
  onDayRightClick: (e: React.MouseEvent, date: string) => void;
  onAddWorkoutClick: (date: string) => void;
  onDeleteWorkoutEntry: (id: number) => void;
  onReorderExercises: (exerciseOrders: Array<{ id: number; order: number }>) => void;
  onPersonSelect?: (person: Person | null) => void;
  onWorkoutDataChange?: (workoutData: WorkoutEntryWithDetails[]) => void;
  onSelectedDateChange?: (date: string) => void;
  workoutData?: WorkoutEntryWithDetails[];
  selectedPerson?: Person | null;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  onDayClick,
  onDayRightClick,
  onAddWorkoutClick,
  onDeleteWorkoutEntry,
  onReorderExercises,
  onPersonSelect,
  onWorkoutDataChange,
  onSelectedDateChange,
  workoutData,
  selectedPerson,
}) => {
  // Person search state
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [personSearchLoading, setPersonSearchLoading] = useState(false);
  const [personCurrentPage, setPersonCurrentPage] = useState(1);
  const [personHasMore, setPersonHasMore] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const personPageSize = 10;

  // Workout data state
  const [workoutDataState, setWorkoutDataState] = useState<WorkoutEntryWithDetails[]>([]);
  const [workoutLoading, setWorkoutLoading] = useState(false);

  // Calendar state
  const [weekOffset, setWeekOffset] = useState(0);
  const [showWeekends, setShowWeekends] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollPosition = useRef<number>(0);
  const isReordering = useRef<boolean>(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Use external workout data if provided, otherwise use internal state
  const currentWorkoutData = workoutData || workoutDataState;

  // Person search functions
  const searchPersons = async (query: string, page: number = 1, reset: boolean = true) => {
    try {
      setPersonSearchLoading(true);
      const data = await PersonService.searchPersonsPaginated(query, page, personPageSize);
      
      if (reset) {
        setPersons(data);
        setPersonCurrentPage(1);
      } else {
        setPersons(prev => [...prev, ...data]);
      }
      
      setPersonHasMore(data.length === personPageSize);
      setPersonCurrentPage(page);
    } catch (error) {
      console.error("Error searching persons:", error);
      if (reset) {
        setPersons([]);
      }
      setPersonHasMore(false);
    } finally {
      setPersonSearchLoading(false);
    }
  };

  const loadMorePersons = () => {
    if (!personSearchLoading && personHasMore && searchTerm.length >= 2) {
      searchPersons(searchTerm, personCurrentPage + 1, false);
    }
  };

  const handlePersonSelect = (person: Person) => {
    if (onPersonSelect) {
      onPersonSelect(person);
    }
    setShowDropdown(false);
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    if (onPersonSelect) {
      onPersonSelect(null);
    }
    setSearchTerm("");
    setPersons([]);
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length >= 2) {
      await searchPersons(value);
    } else {
      setPersons([]);
      setPersonHasMore(true);
    }
  };

  // Fetch workout data
  const fetchWorkoutData = async (personId: number, startDate?: string, endDate?: string) => {
    try {
      setWorkoutLoading(true);
      
      if (!startDate || !endDate) {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 14); // 2 weeks back
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(today);
        end.setDate(today.getDate() + 14); // 2 weeks forward
        end.setHours(23, 59, 59, 999);
        
        startDate = start.toISOString().split('T')[0];
        endDate = end.toISOString().split('T')[0];
      }

      const data = await WorkoutService.getWorkoutEntriesByPersonAndDateRange(
        personId,
        startDate,
        endDate
      );

      if (!workoutData) {
        setWorkoutDataState(data);
      }
      
      if (onWorkoutDataChange) {
        onWorkoutDataChange(data);
      }
    } catch (error) {
      console.error("Error fetching workout data:", error);
    } finally {
      setWorkoutLoading(false);
    }
  };

  const fetchDataForOffset = async (offset: number) => {
    if (!selectedPerson?.id) return;

    const today = new Date();
    
    // Calculate date range for the offset
    const oldestWeekStart = new Date(today);
    const totalWeeksBack = (offset * 3) + 2;
    oldestWeekStart.setDate(today.getDate() - (totalWeeksBack * 7));
    
    const newestWeekEnd = new Date(today);
    const totalWeeksForward = Math.max(0, (offset * 3) - 3) + 7;
    newestWeekEnd.setDate(today.getDate() + (totalWeeksForward * 7));

    const startDate = oldestWeekStart.toISOString().split('T')[0];
    const endDate = newestWeekEnd.toISOString().split('T')[0];

    await fetchWorkoutData(selectedPerson.id, startDate, endDate);
  };

  // Calendar navigation functions
  const saveScrollPosition = () => {
    if (scrollContainerRef.current) {
      savedScrollPosition.current = scrollContainerRef.current.scrollTop;
    }
  };

  const restoreScrollPosition = () => {
    if (scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedScrollPosition.current;
        }
      }, 50);
    }
  };

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    isReordering.current = true;
    const activeWorkout = currentWorkoutData.find(w => w.id === active.id);
    if (!activeWorkout) return;

    const dayDateString = formatDateForDB(new Date(activeWorkout.date));
    
    // Get workouts for this specific day
    const dayWorkouts = currentWorkoutData.filter(workout =>
      workout.date === dayDateString
    );
    
    const oldIndex = dayWorkouts.findIndex(w => w.id === active.id);
    const newIndex = dayWorkouts.findIndex(w => w.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedWorkouts = arrayMove(dayWorkouts, oldIndex, newIndex);
      
      // Create exercise orders for the backend
      const exerciseOrders = reorderedWorkouts.map((workout, index) => ({
        id: workout.id!,
        order: index
      }));

      onReorderExercises(exerciseOrders);
    }

    setTimeout(() => {
      isReordering.current = false;
    }, 100);
  };

  // Date utility functions
  const generateThreeWeeks = () => {
    const today = new Date();
    const weeks: Date[][] = [];

    for (let i = 0; i < 3; i++) {
      const weekStart = new Date(today);
      const totalWeeksBack = (weekOffset * 3) + i;
      weekStart.setDate(today.getDate() - (totalWeeksBack * 7));
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const weekDays = Array.from({ length: 7 }, (_, dayIndex) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + dayIndex);
        return day;
      });

      const filteredDays = showWeekends ? weekDays : weekDays.filter(day => {
        const dayOfWeek = day.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6;
      });

      weeks.push(filteredDays);
    }

    return weeks;
  };

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
    const threeWeeks = generateThreeWeeks();
    const firstWeek = threeWeeks[0];
    const lastWeek = threeWeeks[threeWeeks.length - 1];
    
    if (firstWeek.length > 0 && lastWeek.length > 0) {
      const startDate = firstWeek[0];
      const endDate = lastWeek[lastWeek.length - 1];
      return formatWeekRange(startDate).split(' - ')[0] + ' - ' + formatWeekRange(endDate).split(' - ')[1];
    }
    return '';
  };

  const goToNewerWeeks = async () => {
    if (weekOffset > 0) {
      saveScrollPosition();
      setWeekOffset(prev => prev - 1);
      await fetchDataForOffset(weekOffset - 1);
      restoreScrollPosition();
    }
  };

  const goToOlderWeeks = async () => {
    saveScrollPosition();
    setWeekOffset(prev => prev + 1);
    await fetchDataForOffset(weekOffset + 1);
    restoreScrollPosition();
  };

  const goToCurrentWeeks = async () => {
    saveScrollPosition();
    setWeekOffset(0);
    await fetchDataForOffset(0);
    restoreScrollPosition();
  };

  // Effects
  useEffect(() => {
    if (selectedPerson?.id) {
      fetchDataForOffset(weekOffset);
    }
  }, [selectedPerson?.id]);

  const threeWeeks = generateThreeWeeks();

  return (
    <div style={{ 
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Header with Person Search and Navigation */}
      <div style={{ 
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f8fafc'
      }}>
        {!selectedPerson ? (
          // Person Search Section - Consistent Layout
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ 
              fontWeight: '600',
              color: '#1f2937',
              fontSize: '16px',
              flex: '0 0 auto'
            }}>
              📅 Dashboard de Entrenamientos
            </div>
            
            <div ref={dropdownRef} style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
              <Input
                label=""
                placeholder="🔍 Buscar persona para ver entrenamientos..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                variant="primary"
                fullWidth
              />
              
              {showDropdown && searchTerm && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {searchTerm.length < 2 ? (
                    <div style={{ padding: '12px 16px', color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                      Escribe al menos 2 caracteres...
                    </div>
                  ) : personSearchLoading ? (
                    <div style={{ padding: '12px 16px', color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '16px' }}>⏳</div>
                        Buscando...
                      </div>
                    </div>
                  ) : persons.length === 0 ? (
                    <div style={{ padding: '12px 16px', color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                      No se encontraron personas
                    </div>
                  ) : (
                    <>
                      {persons.map((person) => (
                        <div
                          key={person.id}
                          onClick={() => handlePersonSelect(person)}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <div style={{ fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                            {person.name} {person.last_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            📞 {person.phone}
                          </div>
                        </div>
                      ))}
                      {personHasMore && (
                        <div
                          onClick={loadMorePersons}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            color: '#3b82f6',
                            fontWeight: '500',
                            borderTop: '1px solid #f3f4f6',
                            transition: 'background-color 0.2s',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          Cargar más...
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Selected Person and Navigation Section - Consistent Layout
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Title - Always on the left */}
            <div style={{ 
              fontWeight: '600',
              color: '#1f2937',
              fontSize: '16px',
              flex: '0 0 auto'
            }}>
              {getDateRangeTitle()}
            </div>
            
            {/* Selected Person Info and Navigation - Always on the right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Selected Person Info */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                padding: '8px 12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #0ea5e9'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}>
                  {selectedPerson.name.charAt(0)}{selectedPerson.last_name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
                    {selectedPerson.name} {selectedPerson.last_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    📞 {selectedPerson.phone}
                  </div>
                </div>
                <Button
                  onClick={handleClearSelection}
                  variant="secondary"
                  size="sm"
                >
                  Cambiar
                </Button>
              </div>
              
              {/* Navigation Controls */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={goToOlderWeeks}
                  disabled={workoutLoading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: workoutLoading ? '#f9fafb' : '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    color: workoutLoading ? '#9ca3af' : '#374151',
                    fontSize: '14px',
                    cursor: workoutLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (!workoutLoading) {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!workoutLoading) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  title="Ver semanas anteriores"
                >
                  ← Anteriores
                </button>
                
                {weekOffset > 0 && (
                  <button
                    onClick={goToCurrentWeeks}
                    disabled={workoutLoading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: workoutLoading ? '#93c5fd' : '#2563eb',
                      border: '1px solid #2563eb',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '14px',
                      cursor: workoutLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!workoutLoading) {
                        e.currentTarget.style.backgroundColor = '#1d4ed8';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!workoutLoading) {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }
                    }}
                    title="Volver a las últimas 3 semanas"
                  >
                    Hoy
                  </button>
                )}
                
                <button
                  onClick={goToNewerWeeks}
                  disabled={weekOffset === 0 || workoutLoading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: (weekOffset === 0 || workoutLoading) ? '#f9fafb' : '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    color: (weekOffset === 0 || workoutLoading) ? '#9ca3af' : '#374151',
                    fontSize: '14px',
                    cursor: (weekOffset === 0 || workoutLoading) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (weekOffset > 0 && !workoutLoading) {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (weekOffset > 0 && !workoutLoading) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  title={weekOffset === 0 ? "Ya estás en las semanas más recientes" : "Ver semanas más recientes"}
                >
                  Siguientes →
                </button>

                {/* Weekend Toggle */}
                <label style={{ 
                  fontSize: '14px', 
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginLeft: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={showWeekends}
                    onChange={(e) => setShowWeekends(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
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
        style={{ 
          padding: '16px',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}
      >
        {!selectedPerson ? (
          // Empty State - No person selected
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
              Selecciona una persona para ver sus entrenamientos
            </div>
            <p style={{ 
              fontSize: '16px', 
              lineHeight: '1.5',
              margin: 0
            }}>
              Usa el buscador de arriba para encontrar y seleccionar una persona.
            </p>
          </div>
        ) : workoutLoading ? (
          // Loading State
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
        ) : (
          // Calendar Content using the refactored CalendarGrid
          <CalendarGrid
            threeWeeks={threeWeeks}
            workoutData={currentWorkoutData}
            onDayClick={onDayClick}
            onDayRightClick={onDayRightClick}
            onAddWorkoutClick={onAddWorkoutClick}
            onDeleteWorkoutEntry={onDeleteWorkoutEntry}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            showWeekends={showWeekends}
            onSelectedDateChange={onSelectedDateChange}
          />
        )}
      </div>
    </div>
  );
}; 