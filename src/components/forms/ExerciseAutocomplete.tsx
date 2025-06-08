import React, { useEffect, useRef, useState } from "react";
import { Exercise, ExerciseService } from "../../services";
import '../../styles/ExerciseAutocomplete.css';

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
    <div ref={dropdownRef} className="exercise-autocomplete-container">
      <label className="exercise-autocomplete-label">
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
        className="exercise-autocomplete-input"
      />
      
      {showDropdown && !disabled && (
        <div className="exercise-autocomplete-dropdown">
          {searchTerm.length < 2 ? (
            <div className="exercise-autocomplete-message">
              Escribe al menos 2 caracteres para buscar
            </div>
          ) : loading && exercises.length === 0 ? (
            <div className="exercise-autocomplete-message">
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
                  className="exercise-autocomplete-item"
                >
                  <div className="exercise-autocomplete-item-name">
                    {exercise.name}
                  </div>
                  <div className="exercise-autocomplete-item-code">
                    Código: {exercise.code}
                  </div>
                </div>
              ))}
              {hasMore && (
                <div 
                  onClick={loadMoreExercises}
                  className="exercise-autocomplete-load-more"
                >
                  {loading ? 'Cargando más...' : 'Cargar más ejercicios'}
                </div>
              )}
            </>
          ) : searchTerm.length >= 2 && !loading ? (
            <div className="exercise-autocomplete-message">
              No se encontraron ejercicios para "{searchTerm}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}; 