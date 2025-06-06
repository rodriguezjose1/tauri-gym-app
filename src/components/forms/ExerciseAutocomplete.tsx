import React, { useEffect, useRef, useState } from "react";
import { Exercise, ExerciseService } from "../../services";

interface ExerciseAutocompleteProps {
  onExerciseSelect: (exercise: Exercise | null) => void;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  selectedExercise?: Exercise | null;
}

export const ExerciseAutocomplete: React.FC<ExerciseAutocompleteProps> = ({
  onExerciseSelect,
  placeholder = "🔍 Buscar ejercicio...",
  value = "",
  disabled = false,
  selectedExercise = null
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  const ITEMS_PER_PAGE = 10;

  // Simple effect to update display when selectedExercise changes
  useEffect(() => {
    if (selectedExercise) {
      const displayText = `${selectedExercise.name} (${selectedExercise.code})`;
      setSearchTerm(displayText);
      setShowDropdown(false);
      setExercises([]);
    } else {
      setSearchTerm("");
      setExercises([]);
    }
  }, [selectedExercise]);

  const searchExercises = async (query: string, page: number = 1, reset: boolean = true) => {
    if (query.trim().length < 2) {
      setExercises([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      const response = await ExerciseService.searchExercisesPaginated(query, page, ITEMS_PER_PAGE);
      
      if (reset) {
        setExercises(response.exercises);
        setCurrentPage(1);
      } else {
        setExercises(prev => [...prev, ...response.exercises]);
        setCurrentPage(page);
      }
      
      setHasMore(page < response.total_pages);
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

  // Debounced search effect - only search when typing, not when selecting
  useEffect(() => {
    if (isSelectingRef.current) {
      return;
    }

    // Don't search if this looks like a selected exercise
    if (searchTerm.includes("(") && searchTerm.includes(")")) {
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
    
    // If user clears the input, clear the selection
    if (newValue === "") {
      setSearchTerm("");
      setExercises([]);
      setHasMore(false);
      setShowDropdown(false);
      onExerciseSelect(null);
      return;
    }
    
    // If we had a selected exercise and user is typing something new, clear selection
    if (selectedExercise && !newValue.includes(selectedExercise.name)) {
      onExerciseSelect(null);
    }
    
    setSearchTerm(newValue);
    setShowDropdown(true);
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    console.log("Exercise selected:", exercise);
    isSelectingRef.current = true;
    
    // Call the parent callback immediately
    onExerciseSelect(exercise);
    
    // Update local state
    const displayText = `${exercise.name} (${exercise.code})`;
    setSearchTerm(displayText);
    setShowDropdown(false);
    setExercises([]);
    
    // Reset the selecting flag after a short delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 100);
  };

  const handleInputFocus = () => {
    if (!disabled && !selectedExercise) {
      setShowDropdown(true);
      // Only search if we don't have a selected exercise and there's a search term
      if (searchTerm.length >= 2 && !searchTerm.includes("(")) {
        searchExercises(searchTerm, 1, true);
      }
    }
  };

  const handleInputBlur = () => {
    // Delay hiding dropdown to allow for exercise selection
    setTimeout(() => {
      if (!isSelectingRef.current) {
        setShowDropdown(false);
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
          {searchTerm.length < 2 ? (
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
          ) : searchTerm.length >= 2 && !loading ? (
            <div style={{ padding: '12px 16px', color: '#6b7280', fontStyle: 'italic' }}>
              No se encontraron ejercicios para "{searchTerm}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}; 