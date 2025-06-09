import { useDashboardDataComposer } from '../datahook/useDashboardDataComposer';
import { useWorkoutOperations } from '../useWorkoutOperations';
import { useRoutineOperations } from '../useRoutineOperations';
import { useToastNotifications } from '../useToastNotifications';

// Atomic modal hooks
import { useWorkoutModal } from '../modals/useWorkoutModal';
import { useSessionModal } from '../modals/useSessionModal';
import { useDeleteModal } from '../modals/useDeleteModal';
import { useRoutineModal } from '../modals/useRoutineModal';
import { useConfirmModal } from '../modals/useConfirmModal';
import { useSettingsModal } from '../modals/useSettingsModal';

// Atomic event hooks
import { useDayClick } from '../calendar/useDayClick';
import { useAddWorkout } from '../calendar/useAddWorkout';
import { useDayRightClick } from '../calendar/useDayRightClick';
import { useSaveWorkoutEntry } from '../workout/useSaveWorkoutEntry';
import { useSaveWorkoutSession } from '../workout/useSaveWorkoutSession';
import { useLoadRoutine } from '../routine/useLoadRoutine';
import { useApplyRoutineToDate } from '../routine/useApplyRoutineToDate';
import { useDeleteEventHandlers } from '../useDeleteEventHandlers';

export const useDashboardController = () => {
  // 1. Data Layer
  const dataLayer = useDashboardDataComposer();

  // 2. Notification Layer
  const notificationLayer = useToastNotifications();
  
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    notificationLayer.addNotification(message, type);
  };

  // 3. Modal Layers
  const workoutModal = useWorkoutModal();
  const sessionModal = useSessionModal();
  const deleteModal = useDeleteModal();
  const routineModal = useRoutineModal();
  const confirmModal = useConfirmModal();
  const settingsModal = useSettingsModal();

  // 4. Operations Layer
  const workoutOps = useWorkoutOperations({
    selectedPerson: dataLayer.selectedPerson,
    workoutData: dataLayer.workoutData,
    refreshWorkoutData: dataLayer.refreshWorkoutData,
    showToast
  });

  const routineOps = useRoutineOperations({
    selectedPerson: dataLayer.selectedPerson,
    workoutData: dataLayer.workoutData,
    refreshWorkoutData: dataLayer.refreshWorkoutData,
    showToast,
    showConfirm: confirmModal.showConfirm
  });

  // 5. Event Handlers Layer
  const dayClickHandler = useDayClick({
    selectedPerson: dataLayer.selectedPerson,
    workoutData: dataLayer.workoutData,
    setSelectedDate: dataLayer.setSelectedDate,
    openSessionModal: sessionModal.openSessionModal,
    loadRoutineToSessionForm: sessionModal.loadRoutineToSessionForm
  });

  const addWorkoutHandler = useAddWorkout({
    selectedPerson: dataLayer.selectedPerson,
    setSelectedDate: dataLayer.setSelectedDate,
    openSessionModal: sessionModal.openSessionModal,
    loadRoutineToSessionForm: sessionModal.loadRoutineToSessionForm
  });

  const dayRightClickHandler = useDayRightClick({
    selectedPerson: dataLayer.selectedPerson,
    setSelectedDate: dataLayer.setSelectedDate,
    openWorkoutModal: workoutModal.openWorkoutModal,
    updateWorkoutForm: workoutModal.updateWorkoutForm
  });

  const saveWorkoutEntryHandler = useSaveWorkoutEntry({
    selectedPerson: dataLayer.selectedPerson,
    selectedDate: dataLayer.selectedDate,
    workoutForm: workoutModal.workoutForm,
    saveWorkoutEntry: workoutOps.saveWorkoutEntry,
    closeWorkoutModal: workoutModal.closeWorkoutModal,
    setSelectedDate: dataLayer.setSelectedDate,
    showToast
  });

  const saveWorkoutSessionHandler = useSaveWorkoutSession({
    selectedPerson: dataLayer.selectedPerson,
    selectedDate: dataLayer.selectedDate,
    sessionForm: sessionModal.sessionForm,
    saveWorkoutSession: workoutOps.saveWorkoutSession,
    closeSessionModal: sessionModal.closeSessionModal,
    setSelectedDate: dataLayer.setSelectedDate,
    showToast
  });

  const loadRoutineHandler = useLoadRoutine({
    loadRoutineToSession: routineOps.loadRoutineToSession,
    loadRoutineToSessionForm: sessionModal.loadRoutineToSessionForm
  });

  const applyRoutineHandler = useApplyRoutineToDate({
    selectedRoutineForLoad: routineModal.selectedRoutineForLoad,
    selectedDateForRoutine: routineModal.selectedDateForRoutine,
    selectedGroupForRoutine: routineModal.selectedGroupForRoutine,
    applyRoutineToDate: routineOps.applyRoutineToDate,
    setShowLoadRoutineModal: routineModal.setShowLoadRoutineModal,
    setSelectedRoutineForLoad: routineModal.setSelectedRoutineForLoad,
    setSelectedDateForRoutine: routineModal.setSelectedDateForRoutine,
    setSelectedGroupForRoutine: routineModal.setSelectedGroupForRoutine,
    showConfirm: confirmModal.showConfirm,
    showToast
  });

  const deleteHandlers = useDeleteEventHandlers({
    workoutToDelete: deleteModal.workoutToDelete,
    deleteWorkoutEntry: workoutOps.deleteWorkoutEntry,
    openDeleteModal: deleteModal.openDeleteModal,
    closeDeleteModal: deleteModal.closeDeleteModal
  });

  // 6. Enhanced Handlers
  const handleClearSelection = () => {
    dataLayer.setSelectedPerson(null);
    dataLayer.setWorkoutData([]);
  };

  const handleCloseWorkoutModal = () => {
    workoutModal.closeWorkoutModal();
    dataLayer.setSelectedDate("");
  };

  const handleCloseSessionModal = () => {
    sessionModal.closeSessionModal();
    dataLayer.setSelectedDate("");
  };

  const handleReorderExercises = async (exerciseOrders: Array<{ id: number; order: number }>) => {
    try {
      await workoutOps.reorderExercises(exerciseOrders);
    } catch (error) {
      console.error("Error reordering exercises:", error);
      showToast("Error al reordenar ejercicios", 'error');
    }
  };

  return {
    // Data
    data: dataLayer,
    
    // Notifications
    notifications: notificationLayer.notifications,
    removeNotification: notificationLayer.removeNotification,
    showToast,
    
    // Modals
    modals: {
      workout: workoutModal,
      session: sessionModal,
      delete: deleteModal,
      routine: routineModal,
      confirm: confirmModal,
      settings: settingsModal
    },
    
    // Operations
    operations: {
      workout: workoutOps,
      routine: routineOps
    },
    
    // Event Handlers
    handlers: {
      dayClick: dayClickHandler.handleDayClick,
      addWorkout: addWorkoutHandler.handleAddWorkoutClick,
      dayRightClick: dayRightClickHandler.handleDayRightClick,
      saveWorkoutEntry: saveWorkoutEntryHandler.handleSaveWorkoutEntry,
      saveWorkoutSession: saveWorkoutSessionHandler.handleSaveWorkoutSession,
      loadRoutine: loadRoutineHandler.handleLoadRoutine,
      loadingRoutine: loadRoutineHandler.loadingRoutine,
      applyRoutine: applyRoutineHandler.handleLoadRoutineToDate,
      loadingApply: applyRoutineHandler.loadingApply,
      deleteWorkout: deleteHandlers.handleDeleteWorkoutEntry,
      confirmDelete: deleteHandlers.confirmDeleteWorkoutEntry,
      cancelDelete: deleteHandlers.cancelDeleteWorkoutEntry,
      clearSelection: handleClearSelection,
      closeWorkoutModal: handleCloseWorkoutModal,
      closeSessionModal: handleCloseSessionModal,
      reorderExercises: handleReorderExercises
    }
  };
}; 