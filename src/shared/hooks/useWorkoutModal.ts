import { useState } from 'react';
import { WorkoutEntryForm, EditWorkoutEntryForm, WorkoutEntryWithDetails } from '../types/dashboard';

export const useWorkoutModal = () => {
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [workoutData, setWorkoutData] = useState<WorkoutEntryWithDetails[]>([]);
  
  const [workoutForm, setWorkoutForm] = useState<WorkoutEntryForm>({
    exercise_id: 0,
    sets: 1,
    reps: 1,
    weight: 0,
    notes: "",
    order_index: 0,
    group_number: 1
  });

  const [editForm, setEditForm] = useState<EditWorkoutEntryForm>({
    id: 0,
    person_id: 0,
    date: "",
    exercise_id: 0,
    sets: 1,
    reps: 1,
    weight: 0,
    notes: "",
    order_index: 0,
    group_number: 1
  });

  // Function to validate if moving an exercise to another group is allowed
  const validateGroupChange = (
    currentExerciseId: number,
    currentGroupNumber: number,
    newGroupNumber: number,
    date: string
  ): { isValid: boolean; message?: string } => {
    // If not changing groups, allow it
    if (currentGroupNumber === newGroupNumber) {
      return { isValid: true };
    }

    // Get exercises for the same date
    const dayExercises = workoutData.filter(entry => entry.date === date);
    
    // Get exercises in the current group (excluding the one being moved)
    const currentGroupExercises = dayExercises.filter(entry => 
      entry.group_number === currentGroupNumber && entry.id !== currentExerciseId
    );

    // If there are other exercises in the current group, allow the move
    if (currentGroupExercises.length > 0) {
      return { isValid: true };
    }

    // If this is the last exercise in the group, don't allow moving it
    return { 
      isValid: false, 
      message: `No puedes mover el último ejercicio del Grupo ${currentGroupNumber}. El grupo desaparecería. Agrega otro ejercicio al grupo primero o elimina este ejercicio.`
    };
  };

  const openWorkoutModal = () => {
    setShowWorkoutModal(true);
  };

  const closeWorkoutModal = () => {
    setShowWorkoutModal(false);
    // Reset form
    setWorkoutForm({
      exercise_id: 0,
      sets: 1,
      reps: 1,
      weight: 0,
      notes: "",
      order_index: 0,
      group_number: 1
    });
  };

  const openEditModal = (workoutDataEntry: any, allWorkoutData: WorkoutEntryWithDetails[] = []) => {
    // Store workout data for validation
    setWorkoutData(allWorkoutData);
    
    setEditForm({
      id: workoutDataEntry.id,
      person_id: workoutDataEntry.person_id,
      date: workoutDataEntry.date,
      exercise_id: workoutDataEntry.exercise_id,
      sets: workoutDataEntry.sets || 1,
      reps: workoutDataEntry.reps || 1,
      weight: workoutDataEntry.weight || 0,
      notes: workoutDataEntry.notes || "",
      order_index: workoutDataEntry.order_index || 0,
      group_number: workoutDataEntry.group_number || 1
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setWorkoutData([]);
    // Reset form
    setEditForm({
      id: 0,
      person_id: 0,
      date: "",
      exercise_id: 0,
      sets: 1,
      reps: 1,
      weight: 0,
      notes: "",
      order_index: 0,
      group_number: 1
    });
  };

  const updateWorkoutForm = (field: keyof WorkoutEntryForm, value: any) => {
    setWorkoutForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateEditForm = (field: keyof EditWorkoutEntryForm, value: any, showToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void) => {
    // Special validation for group_number changes
    if (field === 'group_number' && editForm.id && editForm.date) {
      const validation = validateGroupChange(
        editForm.id,
        editForm.group_number || 1,
        value,
        editForm.date
      );

      if (!validation.isValid) {
        if (showToast && validation.message) {
          showToast(validation.message, 'warning');
        }
        return; // Don't update if validation fails
      }
    }

    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return {
    // Create workout modal
    showWorkoutModal,
    workoutForm,
    openWorkoutModal,
    closeWorkoutModal,
    updateWorkoutForm,
    
    // Edit workout modal
    showEditModal,
    editForm,
    openEditModal,
    closeEditModal,
    updateEditForm,
    
    // Validation
    validateGroupChange
  };
}; 