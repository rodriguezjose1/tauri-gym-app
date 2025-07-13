import React from 'react';
import { Exercise } from '../../../shared/types/dashboard';
import { ExerciseItem } from './ExerciseItem';

interface ExerciseListProps {
  exercises: Exercise[];
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exerciseId: number) => void;
}

export const ExerciseList: React.FC<ExerciseListProps> = ({
  exercises,
  onEdit,
  onDelete
}) => {
  return (
    <div className="exercise-list">
      {exercises.map((exercise) => (
        <ExerciseItem
          key={exercise.id}
          exercise={exercise}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}; 