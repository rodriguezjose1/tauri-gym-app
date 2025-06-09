import { useState } from 'react';

export const useRoutineModal = () => {
  const [showLoadRoutineModal, setShowLoadRoutineModal] = useState(false);
  const [selectedRoutineForLoad, setSelectedRoutineForLoad] = useState<number | null>(null);
  const [selectedDateForRoutine, setSelectedDateForRoutine] = useState<string>("");
  const [selectedGroupForRoutine, setSelectedGroupForRoutine] = useState<number>(1);

  const openLoadRoutineModal = (date?: string) => {
    setSelectedDateForRoutine(date || "");
    setShowLoadRoutineModal(true);
  };

  const closeLoadRoutineModal = () => {
    setShowLoadRoutineModal(false);
    setSelectedRoutineForLoad(null);
    setSelectedDateForRoutine("");
    setSelectedGroupForRoutine(1);
  };

  return {
    showLoadRoutineModal,
    selectedRoutineForLoad,
    selectedDateForRoutine,
    selectedGroupForRoutine,
    openLoadRoutineModal,
    closeLoadRoutineModal,
    setSelectedRoutineForLoad,
    setSelectedDateForRoutine,
    setSelectedGroupForRoutine,
    setShowLoadRoutineModal
  };
}; 