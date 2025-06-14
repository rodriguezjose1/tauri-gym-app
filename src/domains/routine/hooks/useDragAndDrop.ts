import { useState } from 'react';
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { RoutineExerciseWithDetails } from '../../../services';
import { arrayMove } from '@dnd-kit/sortable';
import { useToastNotifications } from '../../../shared/hooks/useToastNotifications';

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
  const { addNotification } = useToastNotifications();

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
    try {
      const { active, over } = event;
      
      if (!over || !active.id) {
        setIsDragging(false);
        setActiveExercise(null);
        return;
      }

      const activeExercise = exercises.find(ex => ex.id === active.id);
      if (!activeExercise) {
        setIsDragging(false);
        setActiveExercise(null);
        return;
      }

      const overId = over.id as string;
      const isOverGroup = overId.startsWith('routine-group-');
      
      if (isOverGroup) {
        const [_, groupNumber] = overId.split('-').map(Number);
        
        // Verificar si es el último ejercicio del grupo actual
        const currentGroupExercises = exercises.filter(ex => ex.group_number === activeExercise.group_number);
        if (currentGroupExercises.length === 1) {
          addNotification('No puedes mover el último ejercicio del grupo', 'warning');
          return;
        }

        // Actualizar el grupo del ejercicio
        await onUpdateExercise(activeExercise.id, {
          ...activeExercise,
          group_number: groupNumber
        });
      } else {
        // Reordenar ejercicios dentro del mismo grupo
        const overExercise = exercises.find(ex => ex.id === over.id);
        if (!overExercise || overExercise.group_number !== activeExercise.group_number) return;

        const oldIndex = exercises.findIndex(ex => ex.id === active.id);
        const newIndex = exercises.findIndex(ex => ex.id === over.id);

        if (oldIndex !== newIndex) {
          const reorderedExercises = arrayMove(exercises, oldIndex, newIndex);
          const orderUpdates: Array<[number, number]> = reorderedExercises
            .filter(exercise => exercise.id !== undefined)
            .map((exercise, index) => [
              exercise.id!,
              index
            ]);

          await onReorderExercises(orderUpdates);
        }
      }
    } catch (error) {
      console.error('Error in drag and drop:', error);
      addNotification('Error al mover el ejercicio', 'error');
    } finally {
      setIsDragging(false);
      setActiveExercise(null);
    }
  };

  return {
    isDragging,
    activeExercise,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
}; 