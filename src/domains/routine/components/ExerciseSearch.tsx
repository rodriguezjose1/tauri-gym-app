import React, { useState, useEffect, useMemo } from 'react';
import { Input, Button, Select, Card, Title } from '../../../shared/components/base';
import { Exercise } from '../../../shared/types/dashboard';
import { ROUTINE_UI_LABELS } from '../../../shared/constants';

interface ExerciseWithGroup extends Exercise {
  selectedGroup: number;
}

interface ExerciseSearchProps {
  isOpen: boolean;
  exercises: Exercise[];
  loading: boolean;
  onAddExercise: (exercise: Exercise, groupNumber: number) => void;
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
  const [selectedExercises, setSelectedExercises] = useState<ExerciseWithGroup[]>([]);

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
        // Agregar ejercicio con grupo por defecto 1
        return [...prev, { ...exercise, selectedGroup: 1 }];
      }
    });
  };

  const handleRemoveSelected = (exerciseId: number) => {
    setSelectedExercises(prev => prev.filter(e => e.id !== exerciseId));
  };

  const handleGroupChange = (exerciseId: number, groupNumber: number) => {
    setSelectedExercises(prev => 
      prev.map(exercise => 
        exercise.id === exerciseId 
          ? { ...exercise, selectedGroup: groupNumber }
          : exercise
      )
    );
  };

  const handleAddSelectedExercises = () => {
    selectedExercises.forEach(exercise => {
      onAddExercise(exercise, exercise.selectedGroup);
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

  // Agrupar ejercicios seleccionados por grupo para mostrar estadísticas
  const groupedSelectedExercises = useMemo(() => {
    const grouped = selectedExercises.reduce((acc, exercise) => {
      const group = exercise.selectedGroup;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(exercise);
      return acc;
    }, {} as Record<number, ExerciseWithGroup[]>);

    return Object.entries(grouped)
      .map(([groupNumber, exercises]) => ({
        groupNumber: parseInt(groupNumber),
        exercises,
        count: exercises.length
      }))
      .sort((a, b) => a.groupNumber - b.groupNumber);
  }, [selectedExercises]);

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
          <div className="exercise-search-filters-row">
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
        </div>

        <div className="exercise-search-content">
          {/* Sección de ejercicios seleccionados */}
          {selectedExercises.length > 0 && (
            <div className="exercise-search-selected-section">
              <h4 className="exercise-search-section-title">
                Ejercicios seleccionados ({selectedExercises.length})
              </h4>
              <div className="exercise-search-selected-list">
                {selectedExercises.map(exercise => (
                  <Card 
                    key={exercise.id} 
                    variant="default" 
                    padding="sm" 
                    className="exercise-search-selected-item"
                  >
                    <div className="exercise-search-selected-avatar">
                      {exercise.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="exercise-search-selected-info">
                      <span className="exercise-search-selected-name">{exercise.name}</span>
                      {exercise.code && (
                        <span className="exercise-search-selected-code">Código: {exercise.code}</span>
                      )}
                    </div>
                    <div className="exercise-search-selected-controls">
                      <Select
                        value={exercise.selectedGroup.toString()}
                        onChange={(value) => handleGroupChange(exercise.id!, parseInt(value.toString()))}
                        options={[
                          { value: '1', label: 'Grupo 1' },
                          { value: '2', label: 'Grupo 2' },
                          { value: '3', label: 'Grupo 3' },
                          { value: '4', label: 'Grupo 4' },
                          { value: '5', label: 'Grupo 5' }
                        ]}
                        variant="primary"
                        size="sm"
                      />
                      <button
                        onClick={() => handleRemoveSelected(exercise.id!)}
                        className="exercise-search-remove-button"
                        title="Quitar ejercicio"
                      >
                        ✕
                      </button>
                    </div>
                  </Card>
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
                  <Card 
                    key={exercise.id} 
                    variant="default" 
                    padding="sm" 
                    className="exercise-search-item"
                    onClick={() => handleToggleExercise(exercise)}
                  >
                    <div className="exercise-search-item-avatar">
                      {exercise.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="exercise-search-item-info">
                      <h4 className="exercise-search-item-name">{exercise.name}</h4>
                      {exercise.code && (
                        <span className="exercise-search-item-category">
                          Código: {exercise.code}
                        </span>
                      )}
                    </div>
                    <div className="exercise-search-item-checkbox">
                      +
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="exercise-search-actions">
          <div className="exercise-search-selected-count">
            {selectedExercises.length > 0 ? (
              <div className="exercise-search-group-summary">
                <strong>{selectedExercises.length}</strong> ejercicios seleccionados:
                {groupedSelectedExercises.map(group => (
                  <span key={group.groupNumber} className="exercise-search-group-badge">
                    G{group.groupNumber}: {group.count}
                  </span>
                ))}
              </div>
            ) : (
              <span>Selecciona ejercicios para agregar</span>
            )}
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
              ✅ Agregar Ejercicios
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 