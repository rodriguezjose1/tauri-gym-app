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
  const [isValidMove, setIsValidMove] = useState(true);
  const { addNotification } = useToastNotifications();

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const exercise = exercises.find(e => e.id === active.id);
    if (exercise) {
      setActiveExercise(exercise);
      setIsDragging(true);
      setIsValidMove(true);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeExercise = exercises.find(e => e.id === active.id);
    if (!activeExercise) return;

    // Contar ejercicios en el grupo actual
    const exercisesInCurrentGroup = exercises.filter(
      ex => ex.group_number === activeExercise.group_number
    );

    // Si es el último ejercicio del grupo, no permitir mover
    if (exercisesInCurrentGroup.length === 1) {
      setIsValidMove(false);
      addNotification('No puedes mover el último ejercicio del grupo', 'warning');
      return;
    }

    setIsValidMove(true);

    // Si el destino es un grupo
    const overId = String(over.id);
    if (overId.includes('routine-group-')) {
      const groupNumber = parseInt(overId.split('-')[2]);
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
        setIsValidMove(true);
        return;
      }

      const activeExercise = exercises.find(ex => ex.id === active.id);
      if (!activeExercise) {
        setIsDragging(false);
        setActiveExercise(null);
        setIsValidMove(true);
        return;
      }

      // Si el movimiento no es válido, no hacer nada
      if (!isValidMove) {
        return;
      }

      const overId = String(over.id);
      
      // Si el destino es un grupo
      if (overId.includes('routine-group-')) {
        const [_, __, groupNumber] = overId.split('-');
        const targetGroupNumber = parseInt(groupNumber);

        // Verificar si el grupo de destino es diferente al actual
        if (targetGroupNumber !== activeExercise.group_number) {
          await onUpdateExercise(activeExercise.id!, {
            ...activeExercise,
            group_number: targetGroupNumber
          });
        }
      } else {
        // Reordenar ejercicios dentro del mismo grupo
        const overExercise = exercises.find(ex => ex.id === over.id);
        if (!overExercise || overExercise.group_number !== activeExercise.group_number) return;

        // Filtrar ejercicios del mismo grupo y ordenarlos por order_index
        const groupExercises = exercises
          .filter(ex => ex.group_number === activeExercise.group_number)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        const oldIndex = groupExercises.findIndex(ex => ex.id === active.id);
        const newIndex = groupExercises.findIndex(ex => ex.id === over.id);

        if (oldIndex !== newIndex) {
          const reorderedExercises = arrayMove(groupExercises, oldIndex, newIndex);
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
      setIsValidMove(true);
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