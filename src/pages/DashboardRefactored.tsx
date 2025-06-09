import React from 'react';
import { WeeklyCalendar } from '../components/calendar/WeeklyCalendar';
import { WorkoutModals } from '../components/complex/WorkoutModals';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { SettingsModal } from '../components/settings/SettingsModal';
import ToastContainer from '../components/notifications/ToastContainer';
import { Button } from '../components/base/Button';
import { Input } from '../components/base/Input';
import { Modal } from '../components/base/Modal';

// Individual hooks - Clean separation of concerns
import { useDashboardData } from '../hooks/useDashboardData';
import { useWorkoutOperations } from '../hooks/useWorkoutOperations';
import { useRoutineOperations } from '../hooks/useRoutineOperations';
import { useToastNotifications } from '../hooks/useToastNotifications';

// Atomic modal hooks by domain
import { useWorkoutModal } from '../hooks/modals/useWorkoutModal';
import { useSessionModal } from '../hooks/modals/useSessionModal';
import { useDeleteModal } from '../hooks/modals/useDeleteModal';
import { useRoutineModal } from '../hooks/modals/useRoutineModal';
import { useConfirmModal } from '../hooks/modals/useConfirmModal';
import { useSettingsModal } from '../hooks/modals/useSettingsModal';

// Atomic hooks by domain
import { useDayClick } from '../hooks/calendar/useDayClick';
import { useAddWorkout } from '../hooks/calendar/useAddWorkout';
import { useDayRightClick } from '../hooks/calendar/useDayRightClick';
import { useSaveWorkoutEntry } from '../hooks/workout/useSaveWorkoutEntry';
import { useSaveWorkoutSession } from '../hooks/workout/useSaveWorkoutSession';
import { useLoadRoutine } from '../hooks/routine/useLoadRoutine';
import { useApplyRoutineToDate } from '../hooks/routine/useApplyRoutineToDate';
import { useDeleteEventHandlers } from '../hooks/useDeleteEventHandlers';

import '../styles/Dashboard.css';

export default function DashboardRefactored() {
  // 1. Data Layer - Manages all data fetching and state
  const {
    selectedPerson,
    workoutData,
    exercises,
    routines,
    selectedDate,
    handlePersonSelect,
    refreshWorkoutData,
    setWorkoutData,
    setSelectedPerson,
    setSelectedDate
  } = useDashboardData();

  // 2. Atomic Modal Layers - Ultra-specific modal management
  const {
    showWorkoutModal,
    workoutForm,
    openWorkoutModal,
    closeWorkoutModal,
    updateWorkoutForm
  } = useWorkoutModal();

  const {
    showSessionModal,
    sessionForm,
    openSessionModal,
    closeSessionModal,
    updateSessionExercise,
    addExerciseToSession,
    deleteSessionExercise,
    loadRoutineToSessionForm
  } = useSessionModal();

  const {
    showDeleteModal,
    workoutToDelete,
    openDeleteModal,
    closeDeleteModal
  } = useDeleteModal();

  const {
    showLoadRoutineModal,
    selectedRoutineForLoad,
    selectedDateForRoutine,
    selectedGroupForRoutine,
    setSelectedRoutineForLoad,
    setSelectedDateForRoutine,
    setSelectedGroupForRoutine,
    setShowLoadRoutineModal
  } = useRoutineModal();

  const {
    showConfirmModal,
    confirmModalData,
    showConfirm,
    setShowConfirmModal
  } = useConfirmModal();

  const {
    showSettingsModal,
    setShowSettingsModal
  } = useSettingsModal();

  // 3. Notification Layer - Manages toast notifications
  const { notifications, addNotification, removeNotification } = useToastNotifications();

  // Helper function for notifications
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    addNotification(message, type);
  };

  // 4. Operations Layer - Manages workout CRUD operations
  const {
    saveWorkoutEntry,
    saveWorkoutSession,
    deleteWorkoutEntry,
    reorderExercises,
    savingWorkout,
    savingSession,
    deletingWorkout
  } = useWorkoutOperations({
    selectedPerson,
    workoutData,
    refreshWorkoutData,
    showToast
  });

  // 5. Routine Operations Layer - Manages routine operations
  const {
    loadRoutineToSession,
    applyRoutineToDate
  } = useRoutineOperations({
    selectedPerson,
    workoutData,
    refreshWorkoutData,
    showToast,
    showConfirm
  });

  // 6. Atomic Event Handlers - Ultra-specific functionality
  
  // Person management
  const handleClearSelection = () => {
    setSelectedPerson(null);
    setWorkoutData([]);
  };

  // Calendar atomic events
  const { handleDayClick } = useDayClick({
    selectedPerson,
    workoutData,
    setSelectedDate,
    openSessionModal,
    loadRoutineToSessionForm
  });

  const { handleAddWorkoutClick } = useAddWorkout({
    selectedPerson,
    setSelectedDate,
    openSessionModal,
    loadRoutineToSessionForm
  });

  const { handleDayRightClick } = useDayRightClick({
    selectedPerson,
    setSelectedDate,
    openWorkoutModal,
    updateWorkoutForm
  });

  // Workout atomic events
  const { handleSaveWorkoutEntry } = useSaveWorkoutEntry({
    selectedPerson,
    selectedDate,
    workoutForm,
    saveWorkoutEntry,
    closeWorkoutModal,
    setSelectedDate,
    showToast
  });

  const { handleSaveWorkoutSession } = useSaveWorkoutSession({
    selectedPerson,
    selectedDate,
    sessionForm,
    saveWorkoutSession,
    closeSessionModal,
    setSelectedDate,
    showToast
  });

  // Routine atomic events
  const { handleLoadRoutine, loadingRoutine } = useLoadRoutine({
    loadRoutineToSession,
    loadRoutineToSessionForm
  });

  const { handleLoadRoutineToDate, loadingApply } = useApplyRoutineToDate({
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
  });

  // Delete events (keeping the existing one as it's already focused)
  const {
    handleDeleteWorkoutEntry,
    confirmDeleteWorkoutEntry,
    cancelDeleteWorkoutEntry
  } = useDeleteEventHandlers({
    workoutToDelete,
    deleteWorkoutEntry,
    openDeleteModal,
    closeDeleteModal
  });

  // Modal close handlers (simple wrappers)
  const handleCloseWorkoutModal = () => {
    closeWorkoutModal();
    setSelectedDate("");
  };

  const handleCloseSessionModal = () => {
    closeSessionModal();
    setSelectedDate("");
  };

  // Reorder events (simple wrapper)
  const handleReorderExercises = async (exerciseOrders: Array<{ id: number; order: number }>) => {
    try {
      await reorderExercises(exerciseOrders);
    } catch (error) {
      console.error("Error reordering exercises:", error);
      showToast("Error al reordenar ejercicios", 'error');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            {/* Configuraciones button moved to navbar */}
          </div>
        </div>
        
        {/* Weekly Calendar with Embedded Person Search */}
        <div className="dashboard-calendar-container">
          <WeeklyCalendar
            selectedPerson={selectedPerson}
            workoutData={workoutData}
            onWorkoutDataChange={setWorkoutData}
            onReorderExercises={handleReorderExercises}
            onAddWorkoutClick={handleAddWorkoutClick}
            onDeleteWorkoutEntry={handleDeleteWorkoutEntry}
            onDayClick={handleDayClick}
            onDayRightClick={handleDayRightClick}
            onSelectedDateChange={setSelectedDate}
            handlePersonSelect={handlePersonSelect}
            handleClearSelection={handleClearSelection}
          />
        </div>
      </div>

      {/* Workout Modals */}
      <WorkoutModals
        showWorkoutModal={showWorkoutModal}
        workoutForm={workoutForm}
        savingWorkout={savingWorkout}
        onCloseWorkoutModal={handleCloseWorkoutModal}
        onSaveWorkoutEntry={handleSaveWorkoutEntry}
        onUpdateWorkoutForm={updateWorkoutForm}
        
        showSessionModal={showSessionModal}
        sessionForm={sessionForm}
        savingSession={savingSession}
        onCloseSessionModal={handleCloseSessionModal}
        onSaveWorkoutSession={handleSaveWorkoutSession}
        onUpdateSessionExercise={updateSessionExercise}
        onDeleteSessionExercise={deleteSessionExercise}
        onAddExerciseToSession={addExerciseToSession}
        onDeleteWorkoutEntry={handleDeleteWorkoutEntry}
        
        routines={routines}
        onLoadRoutine={handleLoadRoutine}
        loadingRoutine={loadingRoutine}
        
        selectedPerson={selectedPerson}
        selectedDate={selectedDate}
        exercises={exercises}
        workoutData={workoutData}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onCancel={cancelDeleteWorkoutEntry}
        onConfirm={confirmDeleteWorkoutEntry}
        isDeleting={deletingWorkout}
        title="Eliminar Ejercicio"
        message="¿Estás seguro de que deseas eliminar este ejercicio? Esta acción no se puede deshacer."
      />

      {/* Load Routine Modal */}
      <Modal
        isOpen={showLoadRoutineModal}
        onClose={() => {
          setShowLoadRoutineModal(false);
          setSelectedRoutineForLoad(null);
          setSelectedDateForRoutine("");
          setSelectedGroupForRoutine(1);
        }}
        title="Cargar Rutina a Fecha Específica"
        size="md"
      >
        <div className="load-routine-modal-content">
          {selectedPerson && (
            <div className="load-routine-person-info">
              <div className="load-routine-person-name">
                {selectedPerson.name} {selectedPerson.last_name}
              </div>
              <div className="load-routine-person-subtitle">
                Aplicar rutina a una fecha específica
              </div>
            </div>
          )}

          <div className="load-routine-form-grid">
            <div className="load-routine-form-group">
              <label className="load-routine-label">
                Seleccionar Rutina:
              </label>
              <select
                value={selectedRoutineForLoad || ''}
                onChange={(e) => setSelectedRoutineForLoad(e.target.value ? parseInt(e.target.value) : null)}
                className="load-routine-select"
              >
                <option value="">-- Seleccionar rutina --</option>
                {routines.map(routine => (
                  <option key={routine.id} value={routine.id}>
                    {routine.name} ({routine.exerciseCount} ejercicios)
                  </option>
                ))}
              </select>
            </div>

            <div className="load-routine-form-group">
              <label className="load-routine-label">
                Fecha:
              </label>
              <Input
                type="date"
                value={selectedDateForRoutine}
                onChange={(e) => setSelectedDateForRoutine(e.target.value)}
                variant="primary"
                fullWidth
              />
            </div>

            <div className="load-routine-form-group">
              <label className="load-routine-label">
                Grupo:
              </label>
              <select
                value={selectedGroupForRoutine}
                onChange={(e) => setSelectedGroupForRoutine(parseInt(e.target.value))}
                className="load-routine-select"
              >
                <option value={1}>Grupo 1</option>
                <option value={2}>Grupo 2</option>
                <option value={3}>Grupo 3</option>
                <option value={4}>Grupo 4</option>
                <option value={5}>Grupo 5</option>
              </select>
              <div className="load-routine-group-help">
                Todos los ejercicios de la rutina se asignarán a este grupo
              </div>
            </div>

            {selectedRoutineForLoad && selectedDateForRoutine && (
              <div className="load-routine-info-box">
                ℹ️ La rutina seleccionada se aplicará a la fecha {new Date(selectedDateForRoutine).toLocaleDateString('es-ES')} en el Grupo {selectedGroupForRoutine}. 
                Si ya existen ejercicios para esa fecha, serán reemplazados.
              </div>
            )}
          </div>

          <div className="load-routine-actions">
            <Button
              onClick={() => {
                setShowLoadRoutineModal(false);
                setSelectedRoutineForLoad(null);
                setSelectedDateForRoutine("");
                setSelectedGroupForRoutine(1);
              }}
              variant="secondary"
              disabled={loadingApply}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLoadRoutineToDate}
              variant="primary"
              disabled={!selectedRoutineForLoad || !selectedDateForRoutine || loadingApply}
              loading={loadingApply}
            >
              {loadingApply ? "Aplicando..." : "Aplicar Rutina"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title={confirmModalData.title}
        message={confirmModalData.message}
        confirmText={confirmModalData.confirmText}
        type={confirmModalData.type}
        onConfirm={confirmModalData.onConfirm}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
    </div>
  );
} 