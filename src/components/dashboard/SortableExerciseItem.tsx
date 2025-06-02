import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { Exercise, WorkoutEntryForm } from '../../types/dashboard';

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
      <div style={{
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '12px',
        boxShadow: isDragging ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Drag Handle and Exercise Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <div
            {...listeners}
            style={{
              cursor: 'grab',
              padding: '4px 8px',
              marginRight: '12px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#6b7280',
              userSelect: 'none',
            }}
            title="Arrastra para reordenar"
          >
            ⋮⋮
          </div>
          <div style={{ flex: 1, fontWeight: '500', color: '#374151' }}>
            Ejercicio {index + 1}
          </div>
          <button
            onClick={() => onDeleteExercise(index)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px',
              borderRadius: '4px',
            }}
            title="Eliminar ejercicio"
          >
            ×
          </button>
        </div>

        {/* Exercise Form Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {/* Exercise Selection */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Ejercicio *
            </label>
            <ExerciseAutocomplete
              exercises={exercises}
              value={exercise.exercise_id}
              onChange={(exerciseId: number) => onUpdateExercise(index, 'exercise_id', exerciseId)}
            />
          </div>

          {/* Sets, Reps, Weight */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Series
              </label>
              <input
                type="number"
                min="1"
                value={exercise.sets}
                onChange={(e) => onUpdateExercise(index, 'sets', parseInt(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Reps
              </label>
              <input
                type="number"
                min="1"
                value={exercise.reps}
                onChange={(e) => onUpdateExercise(index, 'reps', parseInt(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Peso (kg)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={exercise.weight}
                onChange={(e) => onUpdateExercise(index, 'weight', parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Notas
            </label>
            <textarea
              value={exercise.notes}
              onChange={(e) => onUpdateExercise(index, 'notes', e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 