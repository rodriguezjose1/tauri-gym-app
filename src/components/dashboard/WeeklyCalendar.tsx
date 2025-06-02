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
import { invoke } from "@tauri-apps/api/core";
import { Input, Button } from "../ui";

interface Person {
  id?: number;
  name: string;
  last_name: string;
  phone: string;
}

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
  onDayClick: (date: string) => void;
  onDayRightClick: (e: React.MouseEvent, date: string) => void;
  onAddWorkoutClick: (date: string) => void;
  onDeleteWorkoutEntry: (id: number) => void;
  onReorderExercises: (exerciseOrders: Array<{ id: number; order: number }>) => void;
  onPersonSelect?: (person: Person | null) => void;
  onWorkoutDataChange?: (workoutData: WorkoutEntryWithDetails[]) => void;
  onSelectedDateChange?: (date: string) => void;
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
  onDayClick,
  onDayRightClick,
  onAddWorkoutClick,
  onDeleteWorkoutEntry,
  onReorderExercises,
  onPersonSelect,
  onWorkoutDataChange,
  onSelectedDateChange,
}) => {
  // Person search state
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [personSearchLoading, setPersonSearchLoading] = useState(false);
  const [personCurrentPage, setPersonCurrentPage] = useState(1);
  const [personHasMore, setPersonHasMore] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const personPageSize = 10;

  // Workout data state
  const [workoutData, setWorkoutData] = useState<WorkoutEntryWithDetails[]>([]);
  const [workoutLoading, setWorkoutLoading] = useState(false);

  // Calendar state
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current 3 weeks, 3 = next 3 weeks back, etc.
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

  // Person search functions
  const searchPersons = async (query: string, page: number = 1, reset: boolean = true) => {
    if (query.trim().length < 2) {
      setPersons([]);
      setPersonHasMore(false);
      return;
    }

    setPersonSearchLoading(true);
    try {
      const result = await invoke("search_persons_paginated", { 
        query: query.trim(), 
        page, 
        pageSize: personPageSize 
      });
      const newPersons = result as Person[];
      
      if (reset) {
        setPersons(newPersons);
      } else {
        setPersons(prev => [...prev, ...newPersons]);
      }
      
      setPersonHasMore(newPersons.length === personPageSize);
      setPersonCurrentPage(page);
    } catch (error) {
      console.error("Error searching persons:", error);
      setPersons([]);
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
    setSelectedPerson(person);
    setSearchTerm(`${person.name} ${person.last_name}`);
    setShowDropdown(false);
    fetchWorkoutData(person.id!);
    onPersonSelect?.(person);
  };

  const handleClearSelection = () => {
    setSelectedPerson(null);
    setSearchTerm("");
    setPersons([]);
    setShowDropdown(false);
    setWorkoutData([]);
    onPersonSelect?.(null);
    onWorkoutDataChange?.([]);
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length >= 2) {
      setShowDropdown(true);
      await searchPersons(value);
    } else {
      setShowDropdown(false);
      setPersons([]);
      setPersonHasMore(true);
      setPersonCurrentPage(1);
    }
  };

  // Workout data functions
  const fetchWorkoutData = async (personId: number, startDate?: string, endDate?: string) => {
    setWorkoutLoading(true);
    try {
      let actualStartDate: string;
      let actualEndDate: string;

      if (startDate && endDate) {
        actualStartDate = startDate;
        actualEndDate = endDate;
      } else {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 20); // Last 3 weeks
        actualStartDate = start.toISOString().split('T')[0];
        actualEndDate = today.toISOString().split('T')[0];
      }
      
      const result = await invoke("get_workout_entries_by_person_and_date_range", {
        personId,
        startDate: actualStartDate,
        endDate: actualEndDate
      });

      const workoutEntries = result as WorkoutEntryWithDetails[];
      setWorkoutData(workoutEntries);
      onWorkoutDataChange?.(workoutEntries);
    } catch (error) {
      console.error("Error fetching workout data:", error);
    } finally {
      setWorkoutLoading(false);
    }
  };

  const fetchDataForOffset = async (offset: number) => {
    if (!selectedPerson) return;
    
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
    
    await fetchWorkoutData(selectedPerson.id!, startDate, endDate);
  };

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

  // Handle clicks outside dropdown
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
      {/* Header with Person Search and Navigation */}
      <div style={{ 
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f8fafc'
      }}>
        {!selectedPerson ? (
          // Person Search Section
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
          // Selected Person and Navigation Section
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Selected Person Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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

              <div style={{ 
                fontWeight: '600',
                color: '#1f2937',
                fontSize: '16px'
              }}>
                {getDateRangeTitle()}
              </div>
            </div>
            
            {/* Navigation and Weekend Toggle */}
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
          // Calendar Content
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
        )}
      </div>
    </div>
  );
}; 