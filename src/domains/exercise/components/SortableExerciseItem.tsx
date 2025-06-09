import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { Exercise, WorkoutEntryForm } from '../../../shared/types/dashboard';
import '../../../styles/SortableExerciseItem.css';

interface SortableExerciseItemProps {
  id: string;
  exercise: WorkoutEntryForm;
  index: number;
  exercises: Exercise[];
  onUpdateExercise: (index: number, field: keyof WorkoutEntryForm, value: any) => void;
  onDeleteExercise: (index: number) => void;
}

export const SortableExerciseItem: React.FC<SortableExerciseItemProps> = ({
  id,
  exercise,
  index,
  exercises,
  onUpdateExercise,
  onDeleteExercise,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="sortable-exercise-item"
      {...attributes}
    >
      <div className={`sortable-exercise-item-content ${isDragging ? 'dragging' : ''}`}>
        {/* Drag Handle and Exercise Header */}
        <div className="sortable-exercise-item-header">
          <div
            {...listeners}
            className="sortable-exercise-item-drag-handle"
            title="Arrastra para reordenar"
          >
            ⋮⋮
          </div>
          <div className="sortable-exercise-item-title">
            Ejercicio {index + 1}
          </div>
          <button
            onClick={() => onDeleteExercise(index)}
            className="sortable-exercise-item-delete-btn"
            title="Eliminar ejercicio"
          >
            ×
          </button>
        </div>

        {/* Exercise Form Fields */}
        <div className="sortable-exercise-item-form">
          {/* Exercise Selection */}
          <div className="sortable-exercise-item-field">
            <label className="sortable-exercise-item-label">
              Ejercicio *
            </label>
            <ExerciseAutocomplete
              onExerciseSelect={(selectedExercise: Exercise | null) => {
                if (selectedExercise) {
                  onUpdateExercise(index, 'exercise_id', selectedExercise.id || 0);
                }
              }}
            />
          </div>

          {/* Sets, Reps, Weight */}
          <div className="sortable-exercise-item-grid">
            <div className="sortable-exercise-item-field">
              <label className="sortable-exercise-item-label">
                Series
              </label>
              <input
                type="number"
                min="1"
                value={exercise.sets}
                onChange={(e) => onUpdateExercise(index, 'sets', parseInt(e.target.value) || 1)}
                className="sortable-exercise-item-input"
              />
            </div>
            <div className="sortable-exercise-item-field">
              <label className="sortable-exercise-item-label">
                Reps
              </label>
              <input
                type="number"
                min="1"
                value={exercise.reps}
                onChange={(e) => onUpdateExercise(index, 'reps', parseInt(e.target.value) || 1)}
                className="sortable-exercise-item-input"
              />
            </div>
            <div className="sortable-exercise-item-field">
              <label className="sortable-exercise-item-label">
                Peso (kg)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={exercise.weight}
                onChange={(e) => onUpdateExercise(index, 'weight', parseFloat(e.target.value) || 0)}
                className="sortable-exercise-item-input"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="sortable-exercise-item-field">
            <label className="sortable-exercise-item-label">
              Notas
            </label>
            <textarea
              value={exercise.notes}
              onChange={(e) => onUpdateExercise(index, 'notes', e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
              className="sortable-exercise-item-textarea"
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 