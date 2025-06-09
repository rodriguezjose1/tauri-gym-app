import { useState, useEffect } from 'react';
import { Person } from '../../../shared/types/dashboard';
import { PersonService } from '../../../services';
import { DASHBOARD_UI_LABELS } from "../../../shared/constants";

export const usePeopleData = () => {
  // Initialize selectedPerson from sessionStorage
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(() => {
    const savedPerson = sessionStorage.getItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY);
    return savedPerson ? JSON.parse(savedPerson) : null;
  });
  
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
    if (selectedPerson) {
      sessionStorage.setItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY, JSON.stringify(selectedPerson));
    } else {
      sessionStorage.removeItem(DASHBOARD_UI_LABELS.SELECTED_PERSON_KEY);
    }
  }, [selectedPerson]);

  return {
    // Data
    people,
    selectedPerson,
    
    // Loading states
    peopleLoading,
    error,
    
    // Actions
    loadPeople,
    handlePersonSelect,
    setSelectedPerson,
    setPeople
  };
}; 