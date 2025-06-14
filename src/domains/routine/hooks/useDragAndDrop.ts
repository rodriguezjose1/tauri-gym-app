import { useState } from 'react';
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { RoutineExerciseWithDetails } from '../../../services';

interface UseDragAndDropProps {
  exercises: RoutineExerciseWithDetails[];
  onUpdateExercise: (exerciseId: number, updates: Partial<RoutineExerciseWithDetails>) => Promise<void>;
  onReorderExercises: (exerciseOrders: Array<[number, number]>) => Promise<void>;
  onGroupEmpty: (groupNumber: number) => void;
}

export const useDragAndDrop = ({
  exercises,
  onUpdateExercise,
  onReorderExercises,
  onGroupEmpty
}: UseDragAndDropProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeExercise, setActiveExercise] = useState<RoutineExerciseWithDetails | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const exercise = exercises.find(e => e.id === active.id);
    if (exercise) {
      setActiveExercise(exercise);
      setIsDragging(true);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeExercise = exercises.find(e => e.id === active.id);
    if (!activeExercise) return;

    // Si el destino es un grupo
    if (over.id.toString().startsWith('routine-group-')) {
      const groupNumber = parseInt(over.id.toString().split('-')[2]);
      if (activeExercise.group_number !== groupNumber) {
        onUpdateExercise(activeExercise.id!, { group_number: groupNumber });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setIsDragging(false);
      setActiveExercise(null);
      return;
    }

    const activeExercise = exercises.find(e => e.id === active.id);
    if (!activeExercise) {
      setIsDragging(false);
      setActiveExercise(null);
      return;
    }

    // Si el destino es un grupo
    if (over.id.toString().startsWith('routine-group-')) {
      const groupNumber = parseInt(over.id.toString().split('-')[2]);
      const oldGroupNumber = activeExercise.group_number;
      
      if (activeExercise.group_number !== groupNumber) {
        await onUpdateExercise(activeExercise.id!, { group_number: groupNumber });
        
        // Verificar si el grupo anterior quedó vacío
        const oldGroupExercises = exercises.filter(e => e.group_number === oldGroupNumber);
        if (oldGroupExercises.length === 1) { // Solo quedaba este ejercicio
          onGroupEmpty(oldGroupNumber);
        }
      }
    }

    setIsDragging(false);
    setActiveExercise(null);
  };

  return {
    isDragging,
    activeExercise,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
}; 