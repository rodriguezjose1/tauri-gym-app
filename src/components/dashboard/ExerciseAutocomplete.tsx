import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Exercise {
  id?: number;
  name: string;
  code: string;
}

interface ExerciseAutocompleteProps {
  exercises: Exercise[];
  value: number;
  onChange: (exerciseId: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ExerciseAutocomplete: React.FC<ExerciseAutocompleteProps> = ({
  exercises,
  value,
  onChange,
  placeholder = "Buscar ejercicio...",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);
  const pageSize = 10;

  // Debug: Log exercises prop
  useEffect(() => {
    console.log("ExerciseAutocomplete - exercises prop:", exercises.length, exercises);
  }, [exercises]);

  // Update display value when value prop changes
  useEffect(() => {
    console.log("ExerciseAutocomplete - value prop changed:", value);
    const selectedExercise = exercises.find(ex => ex.id === value);
    console.log("ExerciseAutocomplete - found selected exercise:", selectedExercise);
    if (selectedExercise) {
      const displayText = `${selectedExercise.name} (${selectedExercise.code})`;
      console.log("ExerciseAutocomplete - setting search term to:", displayText);
      setSearchTerm(displayText);
    } else if (value === 0) {
      console.log("ExerciseAutocomplete - clearing search term (value is 0)");
      setSearchTerm("");
    }
  }, [value, exercises]);

  // Search exercises with pagination
  const searchExercises = async (query: string, page: number = 1, reset: boolean = true) => {
    if (query.trim().length < 2) {
      setFilteredExercises([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      const result = await invoke("search_exercises_paginated", { 
        query: query.trim(), 
        page, 
        pageSize 
      });
      const newExercises = result as Exercise[];
      
      if (reset) {
        setFilteredExercises(newExercises);
      } else {
        setFilteredExercises(prev => [...prev, ...newExercises]);
      }
      
      setHasMore(newExercises.length === pageSize);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error searching exercises:", error);
      setFilteredExercises([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 2) {
        // Don't search if it's a selected exercise display
        const selectedExercise = exercises.find(ex => ex.id === value);
        const isSelectedDisplay = selectedExercise && 
          searchTerm === `${selectedExercise.name} (${selectedExercise.code})`;
        
        if (!isSelectedDisplay) {
          searchExercises(searchTerm, 1, true);
        }
      } else {
        setFilteredExercises([]);
        setHasMore(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, value, exercises]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // If the input is cleared, reset the selection
    if (newValue === "") {
      onChange(0);
      setFilteredExercises([]);
      setHasMore(false);
    }
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    console.log("Exercise selected:", exercise);
    isSelectingRef.current = true;
    
    const displayText = `${exercise.name} (${exercise.code})`;
    setSearchTerm(displayText);
    console.log("Calling onChange with exercise ID:", exercise.id);
    onChange(exercise.id!);
    setIsOpen(false);
    setFilteredExercises([]);
    
    // Reset the selecting flag after a short delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 300);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      // If there's a search term but no results, search again
      if (searchTerm.length >= 2 && filteredExercises.length === 0) {
        const selectedExercise = exercises.find(ex => ex.id === value);
        const isSelectedDisplay = selectedExercise && 
          searchTerm === `${selectedExercise.name} (${selectedExercise.code})`;
        
        if (!isSelectedDisplay) {
          searchExercises(searchTerm, 1, true);
        }
      }
    }
  };

  const handleInputBlur = () => {
    // Don't process blur if we're in the middle of selecting
    if (isSelectingRef.current) {
      return;
    }
    
    // Delay closing to allow for click on dropdown items
    setTimeout(() => {
      // Double check we're not selecting
      if (isSelectingRef.current) {
        return;
      }
      
      setIsOpen(false);
      // Only reset if no valid exercise is selected AND the search term doesn't match a selected exercise
      const selectedExercise = exercises.find(ex => ex.id === value);
      if (selectedExercise) {
        // Ensure the display shows the selected exercise
        const expectedDisplay = `${selectedExercise.name} (${selectedExercise.code})`;
        if (searchTerm !== expectedDisplay) {
          setSearchTerm(expectedDisplay);
        }
      } else if (searchTerm !== "" && value === 0) {
        // Only clear if we're sure no exercise is selected
        setSearchTerm("");
        onChange(0);
      }
    }, 200);
  };

  const loadMore = () => {
    if (!loading && hasMore && searchTerm.length >= 2) {
      searchExercises(searchTerm, currentPage + 1, false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Ensure proper display when clicking outside
        const selectedExercise = exercises.find(ex => ex.id === value);
        if (selectedExercise) {
          setSearchTerm(`${selectedExercise.name} (${selectedExercise.code})`);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [value, exercises]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
        Ejercicio *
      </label>
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '14px',
          backgroundColor: disabled ? '#f9fafb' : 'white',
          color: '#111827',
          cursor: disabled ? 'not-allowed' : 'text'
        }}
      />
      
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {exercises.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#ef4444', fontStyle: 'italic' }}>
              No hay ejercicios disponibles. Verifica la conexión con la base de datos.
            </div>
          ) : searchTerm.length < 2 ? (
            <div style={{ padding: '12px 16px', color: '#6b7280', fontStyle: 'italic' }}>
              Escribe al menos 2 caracteres para buscar
            </div>
          ) : loading && filteredExercises.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#6b7280', fontStyle: 'italic' }}>
              Buscando ejercicios...
            </div>
          ) : filteredExercises.length > 0 ? (
            <>
              {filteredExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  onMouseDown={() => {
                    // Set selecting flag before the click to prevent blur
                    isSelectingRef.current = true;
                  }}
                  onClick={() => handleExerciseSelect(exercise)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background-color 0.2s',
                    backgroundColor: exercise.id === value ? '#f0f9ff' : 'white'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = exercise.id === value ? '#f0f9ff' : 'white'}
                >
                  <div style={{ fontWeight: '500', color: '#111827' }}>
                    {exercise.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Código: {exercise.code}
                  </div>
                </div>
              ))}
              {hasMore && (
                <div 
                  onClick={loadMore}
                  style={{ 
                    padding: '12px 16px', 
                    color: '#2563eb', 
                    fontStyle: 'italic', 
                    cursor: 'pointer',
                    textAlign: 'center',
                    borderTop: '1px solid #f3f4f6'
                  }}
                >
                  {loading ? 'Cargando más...' : 'Cargar más ejercicios'}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '12px 16px', color: '#6b7280', fontStyle: 'italic' }}>
              No se encontraron ejercicios
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 