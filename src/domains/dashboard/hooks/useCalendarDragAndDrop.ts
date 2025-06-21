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
  const { showToast } = useToast();

  const handleDragStart = (event: DragStartEvent) => {
    console.log('🟢 DRAG START:', event.active.id);
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

    console.log('🟡 DRAG OVER:', { active: active.id, over: over.id });

    const activeWorkout = workouts.find(w => w.id === active.id);
    if (!activeWorkout) return;

    const overIdString = String(over.id);
    
    // Check if dropping over a group container
    if (overIdString.startsWith('group-')) {
      console.log('📦 Dropping over group container');
      return;
    }

    // Check if dropping over another workout
    const targetWorkout = workouts.find(w => w.id === over.id);
    if (!targetWorkout) return;

    // Validate move
    const isValid = activeWorkout.group_number === targetWorkout.group_number || 
                   activeWorkout.date === targetWorkout.date;
    
    console.log('✅ Move validation:', { 
      activeGroup: activeWorkout.group_number, 
      targetGroup: targetWorkout.group_number,
      activeDate: activeWorkout.date,
      targetDate: targetWorkout.date,
      isValid 
    });
    
    setIsValidMove(isValid);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('🔴 DRAG END:', event.active.id, '->', event.over?.id);
    
    const { active, over } = event;

    if (!over || active.id === over.id) {
      console.log('❌ No valid drop target');
      setIsDragging(false);
      setActiveWorkout(null);
      return;
    }

    const activeWorkout = workouts.find(w => w.id === active.id);
    if (!activeWorkout) {
      console.log('❌ Active workout not found');
      setIsDragging(false);
      setActiveWorkout(null);
      return;
    }

    const overIdString = String(over.id);
    
    if (overIdString.startsWith('group-')) {
      // Dropping over a group container
      const parts = overIdString.split('-');
      if (parts.length >= 3) {
        const targetGroupNumber = parseInt(parts[1]);
        const date = parts[2];
        
        console.log('📦 Moving to group:', { targetGroupNumber, date });
        
        // Update workout group
        onUpdateWorkout(activeWorkout.id!, {
          group_number: targetGroupNumber,
          order_index: 0
        });
      }
    } else {
      // Dropping over another workout
      const targetWorkout = workouts.find(w => w.id === over.id);
      if (!targetWorkout) {
        console.log('❌ Target workout not found');
        setIsDragging(false);
        setActiveWorkout(null);
        return;
      }

      if (activeWorkout.group_number === targetWorkout.group_number) {
        // Same group - reorder
        console.log('🔄 Reordering within same group');
        console.log('📊 Active workout:', { id: activeWorkout.id, group: activeWorkout.group_number, order: activeWorkout.order_index });
        console.log('📊 Target workout:', { id: targetWorkout.id, group: targetWorkout.group_number, order: targetWorkout.order_index });
        
        const groupWorkouts = workouts
          .filter(w => w.group_number === activeWorkout.group_number)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        console.log('📊 All workouts in group:', groupWorkouts.map(w => ({ id: w.id, order: w.order_index, name: w.exercise_name })));

        const oldIndex = groupWorkouts.findIndex(w => w.id === activeWorkout.id);
        const newIndex = groupWorkouts.findIndex(w => w.id === targetWorkout.id);

        console.log('📊 Reorder indices:', { oldIndex, newIndex, groupWorkoutsCount: groupWorkouts.length });

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          console.log('✅ Valid reorder - proceeding with arrayMove');
          const reorderedWorkouts = arrayMove(groupWorkouts, oldIndex, newIndex);
          
          console.log('📊 Reordered workouts:', reorderedWorkouts.map(w => ({ id: w.id, order: w.order_index, name: w.exercise_name })));
          
          // Include ALL workouts in the order updates, including the active one
          const orderUpdates = reorderedWorkouts
            .map((workout, index) => [workout.id!, index] as [number, number]);

          console.log('📝 Order updates (including active):', orderUpdates);
          
          if (orderUpdates.length > 0) {
            console.log('🚀 Calling onReorderWorkouts with:', orderUpdates);
            onReorderWorkouts(orderUpdates);
          } else {
            console.log('❌ No order updates to make');
          }
        } else {
          console.log('❌ Invalid reorder indices or no change needed:', { 
            oldIndex, 
            newIndex, 
            needsChange: oldIndex !== newIndex 
          });
        }
      } else {
        // Different group - change group
        console.log('🔄 Moving to different group');
        
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

        console.log('📝 Group order updates:', orderUpdates);
        
        if (orderUpdates.length > 0) {
          onReorderWorkouts(orderUpdates);
        }
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