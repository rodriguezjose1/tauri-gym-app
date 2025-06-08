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
import { useDashboardController } from '../hooks/useDashboardController';
import '../styles/Dashboard.css';

export default function DashboardRefactored() {
  const {
    // Data
    selectedPerson,
    workoutData,
    exercises,
    routines,
    
    // Modal states
    showWorkoutModal,
    showSessionModal,
    showDeleteModal,
    showLoadRoutineModal,
    showConfirmModal,
    showSettingsModal,
    
    // Form states
    workoutForm,
    sessionForm,
    selectedDate,
    workoutToDelete,
    selectedRoutineForLoad,
    selectedDateForRoutine,
    selectedGroupForRoutine,
    confirmModalData,
    
    // Loading states
    savingWorkout,
    savingSession,
    deletingWorkout,
    loadingRoutine,
    
    // Event handlers
    handlePersonSelect,
    handleClearSelection,
    handleDayClick,
    handleAddWorkoutClick,
    handleDayRightClick,
    handleCloseWorkoutModal,
    handleCloseSessionModal,
    handleSaveWorkoutEntry,
    handleSaveWorkoutSession,
    handleDeleteWorkoutEntry,
    confirmDeleteWorkoutEntry,
    cancelDeleteWorkoutEntry,
    handleReorderExercises,
    handleLoadRoutine,
    handleShowLoadRoutineModal,
    handleLoadRoutineToDate,
    updateWorkoutForm,
    updateSessionExercise,
    addExerciseToSession,
    deleteSessionExercise,
    setSelectedRoutineForLoad,
    setSelectedDateForRoutine,
    setSelectedGroupForRoutine,
    setShowLoadRoutineModal,
    setShowConfirmModal,
    setShowSettingsModal,
    setWorkoutData,
    setSelectedDate,
    
    // Toast notifications
    notifications,
    removeNotification
  } = useDashboardController();

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
              disabled={loadingRoutine}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLoadRoutineToDate}
              variant="primary"
              disabled={!selectedRoutineForLoad || !selectedDateForRoutine || loadingRoutine}
              loading={loadingRoutine}
            >
              {loadingRoutine ? "Aplicando..." : "Aplicar Rutina"}
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