import { useState } from 'react';
import { DASHBOARD_SUCCESS_MESSAGES } from '../../../constants/errorMessages';

interface UseApplyRoutineToDateProps {
  selectedRoutineForLoad: number | null;
  selectedDateForRoutine: string;
  selectedGroupForRoutine: number;
  applyRoutineToDate: (routineId: number, selectedDate: string, groupNumber?: number) => Promise<boolean>;
  setShowLoadRoutineModal: (show: boolean) => void;
  setSelectedRoutineForLoad: (id: number | null) => void;
  setSelectedDateForRoutine: (date: string) => void;
  setSelectedGroupForRoutine: (group: number) => void;
  showConfirm: (message: string, options?: any) => Promise<boolean>;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useApplyRoutineToDate = ({
  selectedRoutineForLoad,
  selectedDateForRoutine,
  selectedGroupForRoutine,
  applyRoutineToDate,
  setShowLoadRoutineModal,
  setSelectedRoutineForLoad,
  setSelectedDateForRoutine,
  setSelectedGroupForRoutine,
  showConfirm,
  showToast
}: UseApplyRoutineToDateProps) => {
  const [loadingApply, setLoadingApply] = useState(false);

  const handleLoadRoutineToDate = async () => {
    if (!selectedRoutineForLoad || !selectedDateForRoutine) {
      showToast("Por favor selecciona una rutina y una fecha", 'error');
      return;
    }

    const confirmed = await showConfirm(
      `¿Estás seguro de que quieres aplicar esta rutina al ${new Date(selectedDateForRoutine).toLocaleDateString('es-ES')}? Si ya existen ejercicios para esa fecha, serán reemplazados.`,
      {
        title: 'Confirmar aplicación de rutina',
        confirmText: 'Aplicar Rutina',
        type: 'warning'
      }
    );
    
    if (confirmed) {
      setLoadingApply(true);
      try {
        await applyRoutineToDate(selectedRoutineForLoad, selectedDateForRoutine, selectedGroupForRoutine);
        setShowLoadRoutineModal(false);
        setSelectedRoutineForLoad(null);
        setSelectedDateForRoutine("");
        setSelectedGroupForRoutine(1);
        showToast(DASHBOARD_SUCCESS_MESSAGES.ROUTINE_APPLIED("Rutina", 0, selectedGroupForRoutine), 'success');
      } catch (error) {
        console.error("Error applying routine:", error);
        showToast("Error al aplicar la rutina", 'error');
      } finally {
        setLoadingApply(false);
      }
    }
  };

  return { 
    handleLoadRoutineToDate,
    loadingApply 
  };
}; 