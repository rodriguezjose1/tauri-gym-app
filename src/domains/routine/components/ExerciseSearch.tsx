import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Input, Button, Select, Card, Title } from '../../../shared/components/base';
import { Exercise } from '../../../shared/types/dashboard';
import { ExerciseService } from '../../../services';
import { ROUTINE_UI_LABELS } from '../../../shared/constants';

interface ExerciseWithGroup extends Exercise {
  selectedGroup: number;
}

interface ExerciseSearchProps {
  isOpen: boolean;
  onAddExercise: (exercise: Exercise, groupNumber: number) => void;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 20;

export const ExerciseSearch: React.FC<ExerciseSearchProps> = ({
  isOpen,
  onAddExercise,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<ExerciseWithGroup[]>([]);
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load exercises with pagination
  const loadExercises = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setSearchLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const response = await ExerciseService.getExercisesPaginated(page, ITEMS_PER_PAGE);
      console.log('loadExercises response:', { page, response, append });
      
      if (response.exercises.length === 0 && page > 1) {
        setHasMore(false);
        return;
      }
      
      if (append) {
        setSearchResults(prev => [...prev, ...response.exercises]);
      } else {
        setSearchResults(response.exercises);
      }
      
      // Original hasMore logic: true if we got full page OR if there are more pages
      const newHasMore = response.exercises.length === ITEMS_PER_PAGE || page < response.total_pages;
      console.log('Setting hasMore:', { 
        exercisesLength: response.exercises.length, 
        page, 
        totalPages: response.total_pages, 
        itemsPerPage: ITEMS_PER_PAGE,
        newHasMore,
        gotFullPage: response.exercises.length === ITEMS_PER_PAGE,
        hasMorePages: page < response.total_pages,
        reason: response.exercises.length === ITEMS_PER_PAGE ? 'Got full page' : 
                (page < response.total_pages) ? 'More pages available' : 'No more pages'
      });
      setHasMore(newHasMore);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error loading exercises:", error);
    } finally {
      setSearchLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Search exercises with pagination
  const searchExercises = useCallback(async (query: string, page = 1, append = false) => {
    try {
      if (page === 1) {
        setSearchLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      if (query.trim() === "") {
        await loadExercises(page, append);
        return;
      }

      const response = await ExerciseService.searchExercisesPaginated(query, page, ITEMS_PER_PAGE);
      console.log('searchExercises response:', { query, page, response, append });
      
      if (response.exercises.length === 0 && page > 1) {
        setHasMore(false);
        return;
      }
      
      if (append) {
        setSearchResults(prev => [...prev, ...response.exercises]);
      } else {
        setSearchResults(response.exercises);
      }
      
      // Original hasMore logic: true if we got full page OR if there are more pages
      const newHasMore = response.exercises.length === ITEMS_PER_PAGE || page < response.total_pages;
      console.log('Setting hasMore (search):', { 
        exercisesLength: response.exercises.length, 
        page, 
        totalPages: response.total_pages, 
        itemsPerPage: ITEMS_PER_PAGE,
        newHasMore,
        gotFullPage: response.exercises.length === ITEMS_PER_PAGE,
        hasMorePages: page < response.total_pages,
        reason: response.exercises.length === ITEMS_PER_PAGE ? 'Got full page' : 
                (page < response.total_pages) ? 'More pages available' : 'No more pages'
      });
      setHasMore(newHasMore);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error searching exercises:", error);
    } finally {
      setSearchLoading(false);
      setIsLoadingMore(false);
    }
  }, [loadExercises]);

  // Handle search
  const handleSearch = () => {
    if (searchTerm.trim() !== "") {
      setIsSearchActive(true);
      searchExercises(searchTerm, 1, false);
    } else {
      setIsSearchActive(false);
      loadExercises(1, false);
    }
  };

  // Load more exercises automatically
  const loadMoreExercises = useCallback(() => {
    console.log('loadMoreExercises called:', { hasMore, searchLoading, isLoadingMore, currentPage });
    if (hasMore && !searchLoading && !isLoadingMore) {
      console.log('Loading more exercises, page:', currentPage + 1);
      if (isSearchActive) {
        searchExercises(searchTerm, currentPage + 1, true);
      } else {
        loadExercises(currentPage + 1, true);
      }
    } else {
      console.log('Not loading more:', { hasMore, searchLoading, isLoadingMore });
    }
  }, [hasMore, searchLoading, isLoadingMore, isSearchActive, searchTerm, currentPage, searchExercises, loadExercises]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!resultsRef.current) {
      console.log('No resultsRef.current');
      return;
    }
    
    const { scrollTop, scrollHeight, clientHeight } = resultsRef.current;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 20; // Reduced threshold to 20px
    
    console.log('Scroll event:', { 
      scrollTop, 
      scrollHeight, 
      clientHeight, 
      isNearBottom, 
      hasMore,
      isLoadingMore,
      scrollPercentage: Math.round((scrollTop / (scrollHeight - clientHeight)) * 100),
      distanceFromBottom: scrollHeight - (scrollTop + clientHeight),
      canLoadMore: hasMore && !isLoadingMore
    });
    
    if (isNearBottom && hasMore && !isLoadingMore) {
      console.log('Triggering load more from scroll');
      loadMoreExercises();
    }
  }, [loadMoreExercises, hasMore, isLoadingMore]);

  // Filter out already selected exercises
  const availableExercises = useMemo(() => {
    return searchResults.filter(exercise => 
      !selectedExercises.some(selected => selected.id === exercise.id)
    );
  }, [searchResults, selectedExercises]);

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
    setSearchResults([]);
    setIsSearchActive(false);
    setCurrentPage(1);
    onClose();
  };

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('ExerciseSearch modal opened, loading initial exercises');
      setSearchTerm('');
      setSelectedExercises([]);
      setSearchResults([]);
      setIsSearchActive(false);
      setCurrentPage(1);
      setHasMore(true); // Reset hasMore to true
      // Load initial exercises
      loadExercises(1, false);
      
      // Check container dimensions after a short delay
      setTimeout(() => {
        if (resultsRef.current) {
          const { scrollHeight, clientHeight } = resultsRef.current;
          console.log('Container dimensions:', { scrollHeight, clientHeight, hasScroll: scrollHeight > clientHeight });
        }
      }, 100);
    }
  }, [isOpen, loadExercises]);

  // Add scroll listener
  useEffect(() => {
    const resultsElement = resultsRef.current;
    if (resultsElement) {
      console.log('Adding scroll listener to:', resultsElement);
      resultsElement.addEventListener('scroll', handleScroll);
      return () => {
        console.log('Removing scroll listener');
        resultsElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

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
            <div className="exercise-search-search-button">
              <Button
                onClick={handleSearch}
                variant="primary"
                disabled={searchLoading}
              >
                🔍 Buscar
              </Button>
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
          <div className="exercise-search-results" ref={resultsRef}>
            {searchLoading ? (
              <div className="exercise-search-loading">
                <div className="exercise-search-spinner"></div>
                <p>Cargando ejercicios...</p>
              </div>
            ) : availableExercises.length === 0 ? (
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
                {availableExercises.map(exercise => (
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
                
                {/* Loading indicator at bottom */}
                {isLoadingMore && (
                  <div className="exercise-search-loading-more">
                    <div className="exercise-search-spinner"></div>
                    <p>Cargando más ejercicios...</p>
                  </div>
                )}
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