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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filtrar ejercicios basado en búsqueda y categoría
  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (exercise.code && exercise.code.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || 
                             exercise.code?.toLowerCase() === selectedCategory.toLowerCase();
      
      return matchesSearch && matchesCategory;
    });
  }, [exercises, searchTerm, selectedCategory]);

  // Obtener categorías únicas basadas en códigos de ejercicios
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(exercises.map(ex => ex.code).filter(Boolean))];
    return uniqueCategories.sort();
  }, [exercises]);

  const handleAddExercise = (exercise: Exercise) => {
    onAddExercise(exercise);
    setSearchTerm('');
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedCategory('all');
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

          <div className="exercise-search-field">
            <label className="exercise-search-label">Categoría</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="exercise-search-select"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

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
                <div key={exercise.id} className="exercise-search-item">
                  <div className="exercise-search-item-info">
                    <h4 className="exercise-search-item-name">{exercise.name}</h4>
                    {exercise.code && (
                      <span className="exercise-search-item-category">
                        {exercise.code}
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={() => handleAddExercise(exercise)}
                    variant="primary"
                    size="sm"
                  >
                    Agregar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="exercise-search-actions">
          <Button
            onClick={handleClose}
            variant="secondary"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}; 