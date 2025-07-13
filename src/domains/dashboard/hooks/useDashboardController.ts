import { useState, useCallback, useEffect } from 'react';
import { useDashboardDataComposer } from './useDashboardDataComposer';
import { useWorkoutOperations } from '../../workout/hooks/useWorkoutOperations';
import { useToastNotifications } from '../../../shared/hooks/useToastNotifications';
import { useConfirmModal } from '../../../shared/hooks/useConfirmModal';
import { Person, WorkoutEntry, WorkoutEntryWithDetails, EditWorkoutEntryForm } from '../../../shared/types/dashboard';

// Atomic modal hooks
import { useWorkoutModal } from '../../../shared/hooks/useWorkoutModal';
import { useSessionModal } from '../../../shared/hooks/useSessionModal';
import { useDeleteModal } from '../../../shared/hooks/useDeleteModal';
import { useRoutineModal } from '../../../shared/hooks/useRoutineModal';
import { useSettingsModal } from '../../../shared/hooks/useSettingsModal';

// Atomic event hooks
import { useDayClick } from '../../../shared/hooks/useDayClick';
import { useAddWorkout } from '../../../shared/hooks/useAddWorkout';
import { useDayRightClick } from '../../../shared/hooks/useDayRightClick';
import { useSaveWorkoutEntry } from '../../workout/hooks/useSaveWorkoutEntry';
import { useSaveWorkoutSession } from '../../workout/hooks/useSaveWorkoutSession';
import { useSaveEditEntry } from '../../workout/hooks/useSaveEditEntry';
import { useLoadRoutine } from '../../routine/hooks/useLoadRoutine';
import { useApplyRoutineToDate } from '../../routine/hooks/useApplyRoutineToDate';
import { useDeleteEventHandlers } from '../../../shared/hooks/useDeleteEventHandlers';
import { useDashboardRoutineOperations } from './useDashboardRoutineOperations';

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

  const routineOps = useDashboardRoutineOperations({
    selectedPerson: dataLayer.selectedPerson,
    workoutData: dataLayer.workoutData,
    showToast
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

  const saveEditEntryHandler = useSaveEditEntry({
    editForm: workoutModal.editForm,
    updateWorkoutEntry: workoutOps.updateWorkoutEntry,
    closeEditModal: workoutModal.closeEditModal,
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
    closeDeleteModal: deleteModal.closeDeleteModal,
    workoutData: dataLayer.workoutData,
    showToast
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

  const handleEditWorkoutEntry = (workout: WorkoutEntryWithDetails) => {
    workoutModal.openEditModal(workout, dataLayer.workoutData);
  };

  const handleUpdateEditForm = (field: keyof EditWorkoutEntryForm, value: any) => {
    workoutModal.updateEditForm(field, value, showToast);
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
      saveEditEntry: saveEditEntryHandler.handleSaveEditEntry,
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
      editWorkoutEntry: handleEditWorkoutEntry,
      updateEditForm: handleUpdateEditForm
    }
  };
}; 