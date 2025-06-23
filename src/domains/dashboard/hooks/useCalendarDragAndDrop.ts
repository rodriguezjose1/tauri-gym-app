import { useState } from 'react';
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { WorkoutEntryWithDetails } from '../../../services';
import { arrayMove } from '@dnd-kit/sortable';
import { useToast } from '../../../shared/contexts/ToastContext';

interface UseCalendarDragAndDropProps {
  workouts: WorkoutEntryWithDetails[];
  onUpdateWorkout: (workoutId: number, updates: Partial<WorkoutEntryWithDetails>) => Promise<void>;
  onReorderWorkouts: (workoutOrders: Array<[number, number]>) => Promise<void>;
  onGroupEmpty: (date: string, groupNumber: number) => void;
}

export const useCalendarDragAndDrop = ({
  workouts,
  onUpdateWorkout,
  onReorderWorkouts,
  onGroupEmpty
}: UseCalendarDragAndDropProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutEntryWithDetails | null>(null);
  const [isValidMove, setIsValidMove] = useState(true);

  const handleDragStart = (event: DragStartEvent) => {
    const workout = workouts.find(w => w.id === event.active.id);
    if (workout) {
      setActiveWorkout(workout);
      setIsDragging(true);
      setIsValidMove(true);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const activeWorkout = workouts.find(w => w.id === active.id);
    if (!activeWorkout) return;

    const overIdString = String(over.id);
    
    // Check if dropping over a group container
    if (overIdString.startsWith('group-')) {
      const parts = overIdString.split('-');
      if (parts.length >= 3) {
        const targetGroupNumber = parseInt(parts[1]);
        
        // Si el grupo de destino es diferente al actual, actualizar inmediatamente
        if (activeWorkout.group_number !== targetGroupNumber) {
          onUpdateWorkout(activeWorkout.id!, {
            group_number: targetGroupNumber,
            order_index: 0
          });
        }
      }
      setIsValidMove(true);
      return;
    }

    // Check if dropping over another workout
    const targetWorkout = workouts.find(w => w.id === over.id);
    if (!targetWorkout) return;

    // Validate move
    const isValid = activeWorkout.group_number === targetWorkout.group_number || 
                   activeWorkout.date === targetWorkout.date;
    
    setIsValidMove(isValid);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setIsDragging(false);
      setActiveWorkout(null);
      return;
    }

    const activeWorkout = workouts.find(w => w.id === active.id);
    if (!activeWorkout) {
      setIsDragging(false);
      setActiveWorkout(null);
      return;
    }

    const overIdString = String(over.id);
    
    // Si el destino es un grupo, el cambio ya se hizo en handleDragOver
    if (overIdString.startsWith('group-')) {
      setIsDragging(false);
      setActiveWorkout(null);
      return;
    }

    // Dropping over another workout - reorder within same group
    const targetWorkout = workouts.find(w => w.id === over.id);
    if (!targetWorkout) {
      setIsDragging(false);
      setActiveWorkout(null);
      return;
    }

    if (activeWorkout.group_number === targetWorkout.group_number) {
      // Same group - reorder
      const groupWorkouts = workouts
        .filter(w => w.group_number === activeWorkout.group_number)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

      const oldIndex = groupWorkouts.findIndex(w => w.id === activeWorkout.id);
      const newIndex = groupWorkouts.findIndex(w => w.id === targetWorkout.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reorderedWorkouts = arrayMove(groupWorkouts, oldIndex, newIndex);
        
        // Include ALL workouts in the order updates, including the active one
        const orderUpdates = reorderedWorkouts
          .map((workout, index) => [workout.id!, index] as [number, number]);
        
        if (orderUpdates.length > 0) {
          onReorderWorkouts(orderUpdates);
        }
      }
    } else {
      // Different group - change group (this should have been handled in handleDragOver)
      const targetGroupWorkouts = workouts
        .filter(w => w.group_number === targetWorkout.group_number)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

      const targetIndex = targetGroupWorkouts.findIndex(w => w.id === targetWorkout.id);
      
      // Update the active workout with new group and order
      onUpdateWorkout(activeWorkout.id!, {
        group_number: targetWorkout.group_number,
        order_index: targetIndex
      });

      // Update orders for other workouts in the target group
      const orderUpdates = targetGroupWorkouts
        .filter(w => w.id !== activeWorkout.id)
        .map((workout, index) => [workout.id!, index >= targetIndex ? index + 1 : index] as [number, number]);
      
      if (orderUpdates.length > 0) {
        onReorderWorkouts(orderUpdates);
      }
    }

    setIsDragging(false);
    setActiveWorkout(null);
  };

  return {
    isDragging,
    activeWorkout,
    isValidMove,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
}; 