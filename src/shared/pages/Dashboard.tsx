import React from 'react';
import { WeeklyCalendar } from '../../components/calendar/WeeklyCalendar';
import { WorkoutModals } from '../../domains/workout';
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal';
import { ConfirmationModal } from '../../components/modals/ConfirmationModal';
import { SettingsModal } from '../../components/settings/SettingsModal';
import { LoadRoutineModal } from '../../domains/routine';
import ToastContainer from '../../components/notifications/ToastContainer';
import { useDashboardController } from '../../shared/hooks/useDashboardController';
import '../../styles/Dashboard.css';

export default function DashboardRefactored() {
  // Single controller hook that orchestrates everything
  const {
    data,
    notifications,
    removeNotification,
    modals,
    operations,
    handlers
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
            selectedPerson={data.selectedPerson}
            workoutData={data.workoutData}
            onWorkoutDataChange={data.setWorkoutData}
            onReorderExercises={handlers.reorderExercises}
            onAddWorkoutClick={handlers.addWorkout}
            onDeleteWorkoutEntry={handlers.deleteWorkout}
            onDayClick={handlers.dayClick}
            onDayRightClick={handlers.dayRightClick}
            onSelectedDateChange={data.setSelectedDate}
            handlePersonSelect={data.handlePersonSelect}
            handleClearSelection={handlers.clearSelection}
          />
        </div>
      </div>

      {/* Workout Modals */}
      <WorkoutModals
        showWorkoutModal={modals.workout.showWorkoutModal}
        workoutForm={modals.workout.workoutForm}
        savingWorkout={operations.workout.savingWorkout}
        onCloseWorkoutModal={handlers.closeWorkoutModal}
        onSaveWorkoutEntry={handlers.saveWorkoutEntry}
        onUpdateWorkoutForm={modals.workout.updateWorkoutForm}
        
        showSessionModal={modals.session.showSessionModal}
        sessionForm={modals.session.sessionForm}
        savingSession={operations.workout.savingSession}
        onCloseSessionModal={handlers.closeSessionModal}
        onSaveWorkoutSession={handlers.saveWorkoutSession}
        onUpdateSessionExercise={modals.session.updateSessionExercise}
        onDeleteSessionExercise={modals.session.deleteSessionExercise}
        onAddExerciseToSession={modals.session.addExerciseToSession}
        onDeleteWorkoutEntry={handlers.deleteWorkout}
        
        routines={data.routines}
        onLoadRoutine={handlers.loadRoutine}
        loadingRoutine={handlers.loadingRoutine}
        
        selectedPerson={data.selectedPerson}
        selectedDate={data.selectedDate}
        exercises={data.exercises}
        workoutData={data.workoutData}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={modals.delete.showDeleteModal}
        onCancel={handlers.cancelDelete}
        onConfirm={handlers.confirmDelete}
        isDeleting={operations.workout.deletingWorkout}
        title="Eliminar Ejercicio"
        message="¿Estás seguro de que deseas eliminar este ejercicio? Esta acción no se puede deshacer."
      />

      {/* Load Routine Modal */}
      <LoadRoutineModal
        isOpen={modals.routine.showLoadRoutineModal}
        onClose={() => {
          modals.routine.setShowLoadRoutineModal(false);
          modals.routine.setSelectedRoutineForLoad(null);
          modals.routine.setSelectedDateForRoutine("");
          modals.routine.setSelectedGroupForRoutine(1);
        }}
        selectedPerson={data.selectedPerson}
        routines={data.routines}
        selectedRoutineForLoad={modals.routine.selectedRoutineForLoad}
        selectedDateForRoutine={modals.routine.selectedDateForRoutine}
        selectedGroupForRoutine={modals.routine.selectedGroupForRoutine}
        onRoutineSelect={modals.routine.setSelectedRoutineForLoad}
        onDateChange={modals.routine.setSelectedDateForRoutine}
        onGroupChange={modals.routine.setSelectedGroupForRoutine}
        onApplyRoutine={handlers.applyRoutine}
        loadingApply={handlers.loadingApply}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modals.confirm.showConfirmModal}
        title={modals.confirm.confirmModalData.title}
        message={modals.confirm.confirmModalData.message}
        confirmText={modals.confirm.confirmModalData.confirmText}
        type={modals.confirm.confirmModalData.type}
        onConfirm={modals.confirm.confirmModalData.onConfirm}
        onCancel={() => modals.confirm.setShowConfirmModal(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={modals.settings.showSettingsModal}
        onClose={() => modals.settings.setShowSettingsModal(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
    </div>
  );
} 