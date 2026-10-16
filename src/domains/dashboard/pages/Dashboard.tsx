import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../../shared/components/base';
import { ManagementPageHeader } from '../../../shared/components/management';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { WorkoutModals } from '../../workout';

import { ConfirmationModal } from '../../../shared/components/modals/ConfirmationModal';
import { useDashboardController } from '../hooks/useDashboardController';
import { useConfig } from '../../../shared/contexts/ConfigContext';
import { PersonService } from '../../person/services/personService';
import '../../../styles/Dashboard.css';

export default function DashboardRefactored() {
  const [searchParams] = useSearchParams();
  const requestedPersonId = searchParams.get('personId');
  const { storageWarning } = useConfig();
  // Single controller hook that orchestrates everything
  const {
    data,
    modals,
    operations,
    handlers
  } = useDashboardController();
  const [personSearchFocusRequest, setPersonSearchFocusRequest] = useState(0);
  const [requestedPersonError, setRequestedPersonError] = useState(false);

  useEffect(() => {
    if (!requestedPersonId) return;
    const personId = Number(requestedPersonId);
    if (!Number.isInteger(personId) || personId < 1) {
      setRequestedPersonError(true);
      return;
    }
    let active = true;
    setRequestedPersonError(false);
    void PersonService.getPersonById(personId)
      .then(person => {
        if (!active) return;
        if (person) data.setSelectedPerson(person);
        else setRequestedPersonError(true);
      })
      .catch(() => { if (active) setRequestedPersonError(true); });
    return () => { active = false; };
  }, [requestedPersonId]);

  useEffect(() => {
    const focusPersonSearch = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'b') return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)) return;
      if (document.querySelector('.ui-modal-overlay')) return;
      event.preventDefault();
      setPersonSearchFocusRequest((request) => request + 1);
    };
    document.addEventListener('keydown', focusPersonSearch);
    return () => document.removeEventListener('keydown', focusPersonSearch);
  }, []);

  // Removed unnecessary exercise loading - ExerciseSearch handles its own paginated loading

  return (
    <div className="dashboard-container management-page-frame">
      <div className="dashboard-wrapper">
        {storageWarning && <p role="alert" className="dashboard-persistence-warning">{storageWarning}</p>}
        {requestedPersonError && <p role="alert" className="dashboard-persistence-warning">No se pudo seleccionar la persona solicitada.</p>}
        {data.error && (
          <p role="alert" className="dashboard-persistence-warning">
            No se pudieron cargar algunos datos del calendario. Intentá seleccionar la persona nuevamente.
          </p>
        )}
        {data.persistenceWarning && (
          <p role="alert" className="dashboard-persistence-warning">
            {data.persistenceWarning}
          </p>
        )}
        {/* Weekly Calendar Card */}
        <Card variant="elevated" padding="md" className="dashboard-calendar-card management-page-card">
          <div className="management-page-controls">
            <ManagementPageHeader title="Calendario Semanal" />
          </div>
          
          <WeeklyCalendar
            selectedPerson={data.selectedPerson}
            workoutData={data.workoutData}
            onWorkoutDataChange={data.setWorkoutData}
            onAddWorkoutClick={handlers.addWorkout}
            onDeleteWorkoutEntry={handlers.deleteWorkout}
            onEditWorkoutEntry={handlers.editWorkoutEntry}
            onDayClick={handlers.dayClick}
            onDayRightClick={handlers.dayRightClick}
            onSelectedDateChange={data.setSelectedDate}
            handlePersonSelect={data.handlePersonSelect}
            handleClearSelection={handlers.clearSelection}
            personSearchFocusRequest={personSearchFocusRequest}
          />
        </Card>
      </div>

      {/* Workout Modals */}
      <WorkoutModals
        showWorkoutModal={modals.workout.showWorkoutModal}
        workoutForm={modals.workout.workoutForm}
        savingWorkout={operations.workout.savingWorkout}
        onCloseWorkoutModal={handlers.closeWorkoutModal}
        onSaveWorkoutEntry={handlers.saveWorkoutEntry}
        onUpdateWorkoutForm={modals.workout.updateWorkoutForm}
        
        showEditModal={modals.workout.showEditModal}
        editForm={modals.workout.editForm}
        savingEdit={operations.workout.savingEdit}
        onCloseEditModal={modals.workout.closeEditModal}
        onSaveEditEntry={handlers.saveEditEntry}
        onUpdateEditForm={handlers.updateEditForm}
        
        showSessionModal={modals.session.showSessionModal}
        sessionForm={modals.session.sessionForm}
        savingSession={operations.workout.savingSession}
        onCloseSessionModal={handlers.closeSessionModal}
        onSaveWorkoutSession={handlers.saveWorkoutSession}
        onUpdateSessionExercise={modals.session.updateSessionExercise}
        onDeleteSessionExercise={modals.session.deleteExerciseFromSession}
        onAddExerciseToSession={modals.session.addExerciseToSession}
        onDeleteWorkoutEntry={handlers.deleteWorkout}
        
        routines={data.routines}
        onLoadRoutine={handlers.loadRoutine}
        loadingRoutine={handlers.loadingRoutine}
        
        selectedPerson={data.selectedPerson}
        selectedDate={data.selectedDate}
        workoutData={data.workoutData}
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

      {/* Settings Modal - Hidden for now but functionality maintained */}
      {/* 
      <SettingsModal
        isOpen={modals.settings.showSettingsModal}
        onClose={() => modals.settings.setShowSettingsModal(false)}
      />
      */}

    </div>
  );
}
