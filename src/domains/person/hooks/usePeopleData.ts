import { useState, useEffect, useCallback, SetStateAction } from 'react';
import { Person } from '../../../shared/types/dashboard';
import { PersonService } from '../../../services';
import { DASHBOARD_UI_LABELS } from "../../../shared/constants";

function isStoredPerson(value: unknown): value is Person {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const person = value as Record<string, unknown>;
  return typeof person.id === 'number' && Number.isSafeInteger(person.id) && person.id > 0
    && typeof person.name === 'string' && person.name.trim().length > 0
    && typeof person.last_name === 'string' && person.last_name.trim().length > 0
    && typeof person.phone === 'string';
}

function restoreSelection(): { person: Person | null; shouldPersist: boolean; warning: string | null } {
  let saved: string | null;
  try {
    saved = sessionStorage.getItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY);
  } catch {
    return { person: null, shouldPersist: false, warning: 'No se pudo recuperar la selección guardada. Podés seleccionar una persona para continuar.' };
  }
  if (saved === null) return { person: null, shouldPersist: false, warning: null };
  try {
    const person: unknown = JSON.parse(saved);
    if (isStoredPerson(person)) return { person, shouldPersist: false, warning: null };
  } catch {
    // Invalid JSON is discarded by the persistence effect, not during render.
  }
  return { person: null, shouldPersist: true, warning: null };
}

export const usePeopleData = () => {
  const [selection, setSelection] = useState(restoreSelection);
  const selectedPerson = selection.person;
  const [persistenceWarning, setPersistenceWarning] = useState(selection.warning);
  const setSelectedPerson = useCallback((next: SetStateAction<Person | null>) => {
    setSelection(previous => ({
      person: typeof next === 'function' ? next(previous.person) : next,
      shouldPersist: true,
      warning: null,
    }));
  }, []);
  
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load people
  const loadPeople = async () => {
    setPeopleLoading(true);
    setError(null);
    try {
      const result = await PersonService.getPersonsPaginated(1, 100);
      setPeople(result);
    } catch (error) {
      console.error('Error loading people:', error);
      setError('Error loading people');
    } finally {
      setPeopleLoading(false);
    }
  };

  // Handle person selection
  const handlePersonSelect = (person: Person | null) => {
    setSelectedPerson(person);
  };

  // Initialize data on mount
  useEffect(() => {
    loadPeople();
  }, []);

  // Save selected person to session storage when it changes
  useEffect(() => {
    // Do not overwrite unreadable storage on mount or rewrite a valid restoration.
    if (!selection.shouldPersist) return;
    try {
      if (selection.person) {
        sessionStorage.setItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY, JSON.stringify(selection.person));
      } else {
        sessionStorage.removeItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY);
      }
      setPersistenceWarning(null);
    } catch {
      setPersistenceWarning(selection.person
        ? 'La persona sigue seleccionada, pero no se pudo guardar la selección. Al volver a abrir el calendario podría no conservarse.'
        : 'La selección se limpió en esta pantalla, pero no se pudo borrar la selección guardada. Al volver a abrir el calendario podría reaparecer.');
    }
  }, [selection]);

  return {
    // Data
    people,
    selectedPerson,
    
    // Loading states
    peopleLoading,
    error,
    persistenceWarning,
    
    // Actions
    loadPeople,
    handlePersonSelect,
    setSelectedPerson,
    setPeople
  };
};
