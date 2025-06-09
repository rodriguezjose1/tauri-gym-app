import { useState } from 'react';
import { WorkoutEntryWithDetails, Person } from '../../types/dashboard';
import { WorkoutService } from '../../services/workoutService';

interface UseWorkoutDataProps {
  selectedPerson: Person | null;
}

export const useWorkoutData = ({ selectedPerson }: UseWorkoutDataProps) => {
  const [workoutData, setWorkoutData] = useState<WorkoutEntryWithDetails[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load workout entries
  const loadWorkoutEntries = async (personId?: number, startDate?: string, endDate?: string) => {
    const targetPersonId = personId || selectedPerson?.id;
    
    if (!targetPersonId) return;

    setWorkoutLoading(true);
    setError(null);
    try {
      console.log("Fetching workout data for personId:", targetPersonId, "startDate:", startDate, "endDate:", endDate);
      
      let result;
      if (startDate && endDate) {
        // Use date range command when dates are provided
        result = await WorkoutService.getWorkoutEntriesByPersonAndDateRange(targetPersonId, startDate, endDate);
      } else {
        // Fallback to get all entries for the person
        result = await WorkoutService.getWorkoutEntriesByPerson(targetPersonId);
      }
      
      console.log("Workout data result:", result);
      console.log("Result type:", typeof result);
      console.log("Result length:", Array.isArray(result) ? result.length : "Not an array");
      
      setWorkoutData(result as WorkoutEntryWithDetails[]);
    } catch (error) {
      console.error('Error loading workout entries:', error);
      console.error("Full error details:", error);
      
      // Try fallback if the date range command failed
      if (startDate && endDate) {
        try {
          console.log("Trying fallback to get_workout_entries_by_person");
          const fallbackResult = await WorkoutService.getWorkoutEntriesByPerson(targetPersonId);
          console.log("Fallback result:", fallbackResult);
          setWorkoutData(fallbackResult as WorkoutEntryWithDetails[]);
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
        }
      }
      setError('Error loading workout entries');
      setWorkoutData([]);
    } finally {
      setWorkoutLoading(false);
    }
  };

  // Refresh workout data
  const refreshWorkoutData = async () => {
    if (selectedPerson?.id) {
      await loadWorkoutEntries(selectedPerson.id);
    }
  };

  // Get workout entries for a specific date
  const getWorkoutEntriesForDate = (date: string): WorkoutEntryWithDetails[] => {
    return workoutData.filter(entry => {
      const entryDate = new Date(entry.date).toISOString().split('T')[0];
      return entryDate === date;
    });
  };

  // Handle date selection
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  return {
    // Data
    workoutData,
    selectedDate,
    
    // Loading states
    workoutLoading,
    error,
    
    // Actions
    loadWorkoutEntries,
    refreshWorkoutData,
    handleDateSelect,
    setWorkoutData,
    setSelectedDate,
    
    // Utilities
    getWorkoutEntriesForDate
  };
}; 