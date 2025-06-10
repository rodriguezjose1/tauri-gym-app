import { useState, useCallback } from 'react';

interface UseRoutineUIReturn {
  showCreateForm: boolean;
  showExerciseSearch: boolean;
  
  openCreateForm: () => void;
  closeCreateForm: () => void;
  openExerciseSearch: () => void;
  closeExerciseSearch: () => void;
  toggleCreateForm: () => void;
  toggleExerciseSearch: () => void;
}

export const useRoutineUI = (): UseRoutineUIReturn => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);

  const openCreateForm = useCallback(() => setShowCreateForm(true), []);
  const closeCreateForm = useCallback(() => setShowCreateForm(false), []);
  const openExerciseSearch = useCallback(() => setShowExerciseSearch(true), []);
  const closeExerciseSearch = useCallback(() => setShowExerciseSearch(false), []);
  
  const toggleCreateForm = useCallback(() => setShowCreateForm(prev => !prev), []);
  const toggleExerciseSearch = useCallback(() => setShowExerciseSearch(prev => !prev), []);

  return {
    showCreateForm,
    showExerciseSearch,
    openCreateForm,
    closeCreateForm,
    openExerciseSearch,
    closeExerciseSearch,
    toggleCreateForm,
    toggleExerciseSearch
  };
}; 