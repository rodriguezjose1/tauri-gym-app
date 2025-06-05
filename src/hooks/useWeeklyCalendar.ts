import { useState, useRef, useEffect } from "react";
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { WorkoutService, Person, WorkoutEntryWithDetails } from "../services";

interface UseWeeklyCalendarProps {
  selectedPerson?: Person | null;
  workoutData?: WorkoutEntryWithDetails[];
  onWorkoutDataChange?: (workoutData: WorkoutEntryWithDetails[]) => void;
  onReorderExercises: (exerciseOrders: Array<{ id: number; order: number }>) => void;
}

export const useWeeklyCalendar = ({
  selectedPerson,
  workoutData,
  onWorkoutDataChange,
  onReorderExercises,
}: UseWeeklyCalendarProps) => {
  // Workout data state
  const [workoutDataState, setWorkoutDataState] = useState<WorkoutEntryWithDetails[]>([]);
  const [workoutLoading, setWorkoutLoading] = useState(false);

  // Calendar state
  const [weekOffset, setWeekOffset] = useState(0);
  const [showWeekends, setShowWeekends] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollPosition = useRef<number>(0);
  const isReordering = useRef<boolean>(false);

  // Helper function to format date as YYYY-MM-DD to match database format
  const formatDateForDB = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Workout data functions
  const fetchWorkoutData = async (personId: number, startDate?: string, endDate?: string) => {
    setWorkoutLoading(true);
    try {
      // Calculate default date range if not provided
      let actualStartDate = startDate;
      let actualEndDate = endDate;
      
      if (!actualStartDate || !actualEndDate) {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - (weekOffset * 21) - 20); // 3 weeks * 7 days = 21
        actualStartDate = formatDateForDB(start);
        
        const end = new Date(today);
        end.setDate(today.getDate() - (weekOffset * 21));
        actualEndDate = formatDateForDB(end);
      }
      
      const data = await WorkoutService.getWorkoutEntriesByPersonAndDateRange(
        personId,
        actualStartDate,
        actualEndDate
      );
      
      if (onWorkoutDataChange) {
        onWorkoutDataChange(data);
      }
      
      return data;
    } catch (error) {
      console.error("Error fetching workout data:", error);
      return [];
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

  // Drag and drop handler
  const handleDragEnd = (event: DragEndEvent, currentWorkoutData: WorkoutEntryWithDetails[]) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Find the date for the dragged items
    const activeWorkout = currentWorkoutData.find(w => w.id === active.id);
    if (!activeWorkout) return;

    const dayDateString = formatDateForDB(new Date(activeWorkout.date));
    const dayWorkouts = currentWorkoutData
      .filter(workout => formatDateForDB(new Date(workout.date)) === dayDateString)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

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

  // Navigation functions
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

  // Effects
  // Restore scroll position when workoutData changes after reordering
  useEffect(() => {
    restoreScrollPosition();
  }, [workoutDataState]);

  // Sync internal workout data state with prop data from parent
  useEffect(() => {
    if (workoutData) {
      setWorkoutDataState(workoutData);
    }
  }, [workoutData]);

  // Sync search term when selectedPerson prop changes
  useEffect(() => {
    if (selectedPerson) {
      setWorkoutDataState(workoutData || []);
    } else {
      setWorkoutDataState([]);
    }
  }, [selectedPerson, workoutData]);

  // Use the most current workout data (prop takes precedence over internal state)
  const currentWorkoutData = workoutData || workoutDataState;

  return {
    // State
    workoutLoading,
    weekOffset,
    showWeekends,
    setShowWeekends,
    scrollContainerRef,
    currentWorkoutData,
    
    // Functions
    fetchWorkoutData,
    fetchDataForOffset,
    handleDragEnd,
    generateThreeWeeks,
    formatDateForDB,
    formatWeekRange,
    getDateRangeTitle,
    goToNewerWeeks,
    goToOlderWeeks,
    goToCurrentWeeks,
  };
}; 