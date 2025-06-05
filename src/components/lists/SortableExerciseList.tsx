import React from 'react';
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
import { SortableExerciseItem } from './SortableExerciseItem';
import { Exercise, WorkoutEntryForm } from '../../types/dashboard';

interface SortableExerciseListProps {
  exercises: Exercise[];
  formExercises: WorkoutEntryForm[];
  onUpdateExercise: (index: number, field: keyof WorkoutEntryForm, value: any) => void;
  onDeleteExercise: (index: number) => void;
  onReorderExercises: (newOrder: WorkoutEntryForm[]) => void;
}

export const SortableExerciseList: React.FC<SortableExerciseListProps> = ({
  exercises,
  formExercises,
  onUpdateExercise,
  onDeleteExercise,
  onReorderExercises,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = formExercises.findIndex((_, index) => `exercise-${index}` === active.id);
      const newIndex = formExercises.findIndex((_, index) => `exercise-${index}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(formExercises, oldIndex, newIndex);
        // Update order values
        const updatedOrder = newOrder.map((exercise, index) => ({
          ...exercise,
          order: index,
        }));
        onReorderExercises(updatedOrder);
      }
    }
  };

  const items = formExercises.map((_, index) => `exercise-${index}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div style={{ marginBottom: '20px' }}>
          {formExercises.map((exercise, index) => (
            <SortableExerciseItem
              key={`exercise-${index}`}
              id={`exercise-${index}`}
              exercise={exercise}
              index={index}
              exercises={exercises}
              onUpdateExercise={onUpdateExercise}
              onDeleteExercise={onDeleteExercise}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}; 