import { useState, useMemo } from 'react';
import { useConfig } from '../../../shared/contexts/ConfigContext';
import { WorkoutEntryWithDetails } from '../../../services';

interface UseWeeklyCalendarProps {
  selectedPerson: any;
  workoutData: WorkoutEntryWithDetails[];
  onWorkoutDataChange?: (data: WorkoutEntryWithDetails[]) => void;
  onGroupEmpty?: (date: string, groupNumber: number) => void;
}

export const useWeeklyCalendar = ({
  selectedPerson,
  workoutData,
  onWorkoutDataChange,
  onGroupEmpty
}: UseWeeklyCalendarProps) => {
  const { config } = useConfig();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, -1 = previous, +1 = next

  // Generate three weeks based on current offset
  const threeWeeks = useMemo(() => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
    
    // Apply week offset
    const baseWeekStart = new Date(currentWeekStart);
    baseWeekStart.setDate(currentWeekStart.getDate() + (weekOffset * 7));
    
    const weeks = [];
    // Generate weeks from 0 to -2 (current week backwards)
    for (let weekOffsetFromBase = 0; weekOffsetFromBase >= -2; weekOffsetFromBase--) {
      const weekStart = new Date(baseWeekStart);
      weekStart.setDate(baseWeekStart.getDate() + (weekOffsetFromBase * 7));
      
      const week = [];
      // Generate days from Sunday to Saturday (0 to 6, chronological order)
      for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + dayOffset);
        week.push(day);
      }
      weeks.push(week);
    }
    
    return weeks;
  }, [weekOffset]);

  // Get date range title
  const dateRangeTitle = useMemo(() => {
    if (threeWeeks.length === 0) return '';
    
    const firstWeek = threeWeeks[0];
    const lastWeek = threeWeeks[threeWeeks.length - 1];
    const startDate = firstWeek[0];
    const endDate = lastWeek[6];
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short'
      });
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }, [threeWeeks]);

  // Navigation functions
  const goToNewerWeeks = () => {
    setWeekOffset(prev => prev + 1);
  };

  const goToOlderWeeks = () => {
    setWeekOffset(prev => prev - 1);
  };

  const goToCurrentWeeks = () => {
    setWeekOffset(0);
  };

  // Format date for database
  const formatDateForDB = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return formatDateForDB(date) === formatDateForDB(today);
  };

  // Check if date is selected
  const isSelected = (date: Date): boolean => {
    return selectedDate === formatDateForDB(date);
  };

  // Group workouts by group number
  const groupWorkoutsByGroup = (workouts: WorkoutEntryWithDetails[], dayDateString: string, emptyGroups: number[] = []) => {
    const groups = new Map<number, WorkoutEntryWithDetails[]>();
    
    // Add workouts to their respective groups
    workouts.forEach(workout => {
      const groupNumber = workout.group_number || 1;
      if (!groups.has(groupNumber)) {
        groups.set(groupNumber, []);
      }
      groups.get(groupNumber)!.push(workout);
    });

    // Add empty groups
    emptyGroups.forEach(groupNumber => {
      if (!groups.has(groupNumber)) {
        groups.set(groupNumber, []);
      }
    });

    // Convert to array and sort
    const groupsArray = Array.from(groups.entries())
      .map(([groupNumber, workouts]) => ({
        groupNumber,
        workouts: workouts.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      }))
      .sort((a, b) => a.groupNumber - b.groupNumber);

    return groupsArray;
  };

  return {
    threeWeeks,
    dateRangeTitle,
    formatDateForDB,
    groupWorkoutsByGroup,
    isToday,
    isSelected,
    selectedDate,
    showWeekends: config.showWeekends, // Use global config
    goToNewerWeeks,
    goToOlderWeeks,
    goToCurrentWeeks,
    weekOffset
  };
}; 