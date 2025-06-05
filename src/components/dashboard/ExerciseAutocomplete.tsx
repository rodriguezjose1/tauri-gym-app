import React, { useState, useEffect, useRef } from "react";
import { ExerciseService, Exercise } from "../../services";
import { Input } from "../ui";

interface ExerciseAutocompleteProps {
  onExerciseSelect: (exercise: Exercise | null) => void;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
}

export const ExerciseAutocomplete: React.FC<ExerciseAutocompleteProps> = ({
  onExerciseSelect,
  placeholder = "🔍 Buscar ejercicio...",
  value = "",
  disabled = false
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  const ITEMS_PER_PAGE = 10;

  const searchExercises = async (query: string, page: number = 1, reset: boolean = true) => {
    if (query.trim().length < 2) {
      setExercises([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      const data = await ExerciseService.searchExercisesPaginated(query, page, ITEMS_PER_PAGE);
      
      if (reset) {
        setExercises(data);
        setCurrentPage(1);
      } else {
        setExercises(prev => [...prev, ...data]);
        setCurrentPage(page);
      }
      
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error searching exercises:", error);
      setExercises([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreExercises = () => {
    if (!loading && hasMore && searchTerm.length >= 2) {
      searchExercises(searchTerm, currentPage + 1, false);
    }
  };

  // Search when searchTerm changes
  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 2) {
        searchExercises(searchTerm, 1, true);
      } else {
        setExercises([]);
        setHasMore(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setShowDropdown(true);
    
    // If the input is cleared, reset the selection
    if (newValue === "") {
      onExerciseSelect(null);
      setExercises([]);
      setHasMore(false);
    }
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    isSelectingRef.current = true;
    const displayText = `${exercise.name} (${exercise.code})`;
    setSearchTerm(displayText);
    console.log("Calling onExerciseSelect with exercise:", exercise);
    onExerciseSelect(exercise);
    setShowDropdown(false);
    setExercises([]);
    
    // Reset the selecting flag after a short delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 100);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setShowDropdown(true);
      // If there's a search term but no results, search again
      if (searchTerm.length >= 2 && exercises.length === 0) {
        searchExercises(searchTerm, 1, true);
      }
    }
  };

  const handleInputBlur = () => {
    // Delay hiding dropdown to allow for exercise selection
    setTimeout(() => {
      if (!isSelectingRef.current) {
        setShowDropdown(false);
        // Only reset if no valid exercise is selected
        if (searchTerm !== "" && !searchTerm.includes("(")) {
          // Only clear if we're sure no exercise is selected
          setSearchTerm("");
          onExerciseSelect(null);
        }
      }
    }, 200);
  };

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      
      {showDropdown && !disabled && (
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
          ) : loading && exercises.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#6b7280', fontStyle: 'italic' }}>
              Buscando ejercicios...
            </div>
          ) : exercises.length > 0 ? (
            <>
              {exercises.map((exercise) => (
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
                    backgroundColor: 'white'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
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
                  onClick={loadMoreExercises}
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