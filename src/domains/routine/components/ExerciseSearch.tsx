import React, { useState, useEffect, useMemo } from 'react';
import { Input, Button } from '../../../shared/components/base';
import { Exercise } from '../../../shared/types/dashboard';
import { ROUTINE_UI_LABELS } from '../../../shared/constants';

interface ExerciseSearchProps {
  isOpen: boolean;
  exercises: Exercise[];
  loading: boolean;
  onAddExercise: (exercise: Exercise) => void;
  onClose: () => void;
}

export const ExerciseSearch: React.FC<ExerciseSearchProps> = ({
  isOpen,
  exercises,
  loading,
  onAddExercise,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);

  // Filtrar ejercicios basado en búsqueda
  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (exercise.code && exercise.code.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Excluir ejercicios ya seleccionados
      const isNotSelected = !selectedExercises.some(e => e.id === exercise.id);
      
      return matchesSearch && isNotSelected;
    });
  }, [exercises, searchTerm, selectedExercises]);

  const handleToggleExercise = (exercise: Exercise) => {
    setSelectedExercises(prev => {
      const isSelected = prev.some(e => e.id === exercise.id);
      if (isSelected) {
        return prev.filter(e => e.id !== exercise.id);
      } else {
        return [...prev, exercise];
      }
    });
  };

  const handleRemoveSelected = (exerciseId: number) => {
    setSelectedExercises(prev => prev.filter(e => e.id !== exerciseId));
  };

  const handleAddSelectedExercises = () => {
    selectedExercises.forEach(exercise => {
      onAddExercise(exercise);
    });
    setSelectedExercises([]);
    setSearchTerm('');
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedExercises([]);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedExercises([]);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="exercise-search-overlay">
      <div className="exercise-search-container">
        <div className="exercise-search-header">
          <h3 className="exercise-search-title">
            {ROUTINE_UI_LABELS.ADD_EXERCISE_TITLE}
          </h3>
          <button
            onClick={handleClose}
            className="exercise-search-close-button"
          >
            ✕
          </button>
        </div>

        <div className="exercise-search-filters">
          <div className="exercise-search-field">
            <Input
              label="Buscar ejercicio"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="primary"
              fullWidth
              placeholder="Buscar por nombre o código..."
            />
          </div>
        </div>

        <div className="exercise-search-content">
          {/* Sección de ejercicios seleccionados */}
          {selectedExercises.length > 0 && (
            <div className="exercise-search-selected-section">
              <h4 className="exercise-search-section-title">Ejercicios seleccionados</h4>
              <div className="exercise-search-selected-list">
                {selectedExercises.map(exercise => (
                  <div key={exercise.id} className="exercise-search-selected-item">
                    <div className="exercise-search-selected-info">
                      <span className="exercise-search-selected-name">{exercise.name}</span>
                      {exercise.code && (
                        <span className="exercise-search-selected-code">{exercise.code}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveSelected(exercise.id!)}
                      className="exercise-search-remove-button"
                      title="Quitar ejercicio"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección de resultados de búsqueda */}
          <div className="exercise-search-results">
            {loading ? (
              <div className="exercise-search-loading">
                <div className="exercise-search-spinner"></div>
                <p>Cargando ejercicios...</p>
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="exercise-search-empty">
                <p>No se encontraron ejercicios</p>
                {searchTerm && (
                  <p className="exercise-search-empty-hint">
                    Intenta con otros términos de búsqueda
                  </p>
                )}
              </div>
            ) : (
              <div className="exercise-search-list">
                {filteredExercises.map(exercise => (
                  <div 
                    key={exercise.id} 
                    className="exercise-search-item"
                    onClick={() => handleToggleExercise(exercise)}
                  >
                    <div className="exercise-search-item-info">
                      <h4 className="exercise-search-item-name">{exercise.name}</h4>
                      {exercise.code && (
                        <span className="exercise-search-item-category">
                          {exercise.code}
                        </span>
                      )}
                    </div>
                    <div className="exercise-search-item-checkbox">
                      +
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="exercise-search-actions">
          <div className="exercise-search-selected-count">
            {selectedExercises.length} ejercicios seleccionados
          </div>
          <div className="exercise-search-buttons">
            <Button
              onClick={handleClose}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddSelectedExercises}
              variant="primary"
              disabled={selectedExercises.length === 0}
            >
              Agregar Seleccionados
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 