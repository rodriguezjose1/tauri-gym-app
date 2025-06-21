import { useState } from 'react';
import { WorkoutEntryForm } from '../../types/dashboard';

export const useWorkoutModal = () => {
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutForm, setWorkoutForm] = useState<WorkoutEntryForm>({
    exercise_id: 0,
    sets: 1,
    reps: 1,
    weight: 0,
    notes: "",
    order_index: 0,
    group_number: 1
  });

  const openWorkoutModal = (date: string) => {
    setWorkoutForm({
      exercise_id: 0,
      sets: 1,
      reps: 1,
      weight: 0,
      notes: "",
      order_index: 0,
      group_number: 1
    });
    setShowWorkoutModal(true);
  };

  const closeWorkoutModal = () => {
    setShowWorkoutModal(false);
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

  const updateWorkoutForm = (field: keyof WorkoutEntryForm, value: any) => {
    setWorkoutForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return {
    showWorkoutModal,
    workoutForm,
    openWorkoutModal,
    closeWorkoutModal,
    updateWorkoutForm
  };
}; 