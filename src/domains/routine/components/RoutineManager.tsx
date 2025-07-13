import React, { useState, useEffect, useMemo } from 'react';
import { Button, Input, Select, Card, Title } from '../../../shared/components/base';
import { DeleteConfirmationModal } from "../../../shared/components/modals";
import ToastContainer from "../../../shared/components/notifications/ToastContainer";
import { RoutineExercise } from './RoutineExercise';
import { RoutineList } from './RoutineList';
import { RoutineForm } from './RoutineForm';
import { ExerciseSearch } from './ExerciseSearch';
import { useRoutineData } from '../hooks/useRoutineData';
import { useRoutineExercises } from '../hooks/useRoutineExercises';
import { useRoutineUI } from '../hooks/useRoutineUI';
import { useToast } from '../../../shared/contexts/ToastContext';
import { useExercisesData } from '../../exercise/hooks/useExercisesData';
import { ROUTINE_UI_LABELS } from '../../../shared/constants';
import { Exercise } from '../../../shared/types/dashboard';
import { RoutineExerciseWithDetails } from '../../../services';
import '../../../styles/RoutineManager.css';

// Simple Group Component for Routine Exercises
const RoutineGroup: React.FC<{
  groupNumber: number;
  children: React.ReactNode;
}> = ({ groupNumber, children }) => {
  return (
    <div className="routine-manager-group">
      <div className="routine-manager-group-header">
        Grupo {groupNumber}
        </div>
      <div className="routine-manager-group-container">
        {children}
        {React.Children.count(children) === 0 && (
          <div className="routine-manager-group-empty">
            No hay ejercicios
          </div>
        )}
      </div>
    </div>
  );
};

export const RoutineManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [emptyGroups, setEmptyGroups] = useState<number[]>([]);
  
  const routineData = useRoutineData();
  const routineExercises = useRoutineExercises({ routineId: routineData.selectedRoutineId });
  const routineUI = useRoutineUI();
  const { exercises, exercisesLoading } = useExercisesData();
  const { addNotification, notifications, removeNotification } = useToast();
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    routineId: number | null;
    routineName: string;
  }>({
    isOpen: false,
    routineId: null,
    routineName: ''
  });

  useEffect(() => {
    routineData.loadRoutines();
  }, []);

  useEffect(() => {
    if (routineData.selectedRoutineId) {
      routineExercises.loadExercises();
    }
  }, [routineData.selectedRoutineId, routineExercises.loadExercises]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      routineData.searchRoutines(searchTerm);
    } else {
      routineData.loadRoutines();
    }
  };

  const handleSelectRoutine = (routineId: number) => {
    routineData.selectRoutine(routineId);
  };

  const handleDeleteClick = (routineId: number, routineName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      routineId,
      routineName
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation.routineId) {
      const success = await routineData.deleteRoutine(deleteConfirmation.routineId);
      if (success) {
        addNotification(
          `Rutina "${deleteConfirmation.routineName}" eliminada correctamente`,
          'success'
        );
      } else {
        addNotification(
          'Error al eliminar la rutina',
          'error'
        );
      }
    }
    setDeleteConfirmation({
      isOpen: false,
      routineId: null,
      routineName: ''
    });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({
      isOpen: false,
      routineId: null,
      routineName: ''
    });
  };

  const groupExercisesByGroup = (exercises: RoutineExerciseWithDetails[], emptyGroups: number[] = []) => {
    const grouped = exercises.reduce((acc, exercise) => {
      const group = exercise.group_number || 1;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(exercise);
      return acc;
    }, {} as Record<number, RoutineExerciseWithDetails[]>);

    // Add empty groups
    emptyGroups.forEach(groupNum => {
      if (!grouped[groupNum]) {
        grouped[groupNum] = [];
      }
    });

    return Object.entries(grouped)
      .map(([groupNumber, exercises]) => ({
        groupNumber: parseInt(groupNumber),
        exercises
      }))
      .sort((a, b) => a.groupNumber - b.groupNumber);
  };

  const exerciseGroups = useMemo(() => {
    return groupExercisesByGroup(routineExercises.exercises, emptyGroups);
  }, [routineExercises.exercises, emptyGroups]);

  const isButtonDisabled = routineData.loading || routineExercises.loading;

  return (
    <div className="routine-manager-container">
      <div className="routine-manager-wrapper">
        {/* Search Card */}
        <Card variant="elevated" padding="lg" className="routine-manager-search-card">
          <div className="routine-manager-search-header">
            <Title level={2} variant="default">
              Gestión de Rutinas
            </Title>
            <Button
              onClick={routineUI.openCreateForm}
              variant="primary"
              size="md"
              disabled={routineData.loading}
            >
              Nueva Rutina
            </Button>
          </div>
          
          <div className="routine-manager-search-container">
            <form onSubmit={handleSearch} className="routine-manager-search-form">
              <Input
                label="Buscar rutinas"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="primary"
                leftIcon="🔍"
                fullWidth
              />
              <Button
                type="submit"
                variant="primary"
                disabled={routineData.loading}
                className="routine-manager-search-button"
              >
                Buscar
              </Button>
            </form>
          </div>
        </Card>

        {/* Main Content Card */}
        <Card variant="elevated" padding="lg" className="routine-manager-content-card">
          <div className="routine-manager-content">
            {/* Left Panel - Routines List */}
            <div className="routine-manager-left-panel">
              <div className="routine-manager-list-header">
                <span className="routine-manager-count">
                  {routineData.routines.length} {routineData.routines.length === 1 ? 'rutina' : 'rutinas'}
                </span>
              </div>
              
              <RoutineList
                routines={routineData.routines}
                selectedRoutineId={routineData.selectedRoutineId}
                loading={routineData.loading}
                onSelectRoutine={handleSelectRoutine}
                onDeleteRoutine={handleDeleteClick}
                onCreateNew={routineUI.openCreateForm}
                hideCreateButton={true}
              />
            </div>

            {/* Right Panel - Routine Details */}
            <div className="routine-manager-right-panel">
              {routineData.selectedRoutine ? (
                <div className="routine-manager-routine-details">
                  <div className="routine-manager-routine-header">
                    <div className="routine-manager-routine-info">
                      <Title level={3} variant="default">
                        {routineData.selectedRoutine.name}
                      </Title>
                      {routineData.selectedRoutine.code && (
                        <p className="routine-manager-routine-subtitle">
                          Código: {routineData.selectedRoutine.code}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      onClick={routineUI.openExerciseSearch}
                      variant="primary"
                      disabled={isButtonDisabled}
                      className="routine-manager-add-exercise-button"
                    >
                      Agregar Ejercicio
                    </Button>
                  </div>

                  <div className="routine-manager-exercises-container">
                    {routineExercises.loading ? (
                      <div className="routine-manager-loading">
                        <div className="routine-manager-loading-icon">⏳</div>
                        <p className="routine-manager-loading-text">Cargando ejercicios...</p>
                      </div>
                    ) : exerciseGroups.length === 0 ? (
                      <div className="routine-manager-empty-state">
                        <div className="routine-manager-empty-icon">🏋️</div>
                        <Title level={4} variant="secondary" align="center">
                          No hay ejercicios en esta rutina
                        </Title>
                        <p className="routine-manager-empty-description">
                          Agrega ejercicios a esta rutina usando el botón "Agregar Ejercicio"
                        </p>
                      </div>
                    ) : (
                      <div className="routine-manager-groups">
                        {exerciseGroups.map((group, groupIndex) => (
                          <div key={`group-${group.groupNumber}`}>
                            <RoutineGroup groupNumber={group.groupNumber}>
                              {group.exercises.map((exercise, exerciseIndex) => (
                                <RoutineExercise
                                  key={exercise.id || exerciseIndex}
                                  exercise={exercise}
                                  onUpdate={routineExercises.updateExercise}
                                  onDelete={routineExercises.removeExercise}
                                />
                              ))}
                            </RoutineGroup>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="routine-manager-no-routine">
                  <div className="routine-manager-no-routine-icon">📋</div>
                  <Title level={4} variant="secondary" align="center">
                    Selecciona una rutina
                  </Title>
                  <p className="routine-manager-no-routine-description">
                    Elige una rutina de la lista para ver y editar sus ejercicios
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Modales */}
      <RoutineForm
        isOpen={routineUI.showCreateForm}
        loading={routineData.loading}
        onSubmit={async (form) => {
          const success = await routineData.createRoutine(form);
          if (success) {
            routineUI.closeCreateForm();
          }
          return success;
        }}
        onCancel={routineUI.closeCreateForm}
      />

      <ExerciseSearch
        isOpen={routineUI.showExerciseSearch}
        exercises={exercises}
        loading={exercisesLoading}
        onAddExercise={async (exercise: Exercise) => {
          const nextOrderIndex = routineExercises.exercises.length;
          await routineExercises.addExercise(
            exercise.id!,
            nextOrderIndex,
            undefined, // sets - no usado por el momento
            undefined, // reps - no usado por el momento
            undefined, // weight - no usado por el momento
            undefined, // notes - no usado por el momento
            1 // group_number - default group
          );
        }}
        onClose={routineUI.closeExerciseSearch}
      />

      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Eliminar Rutina"
        message={`¿Estás seguro de que deseas eliminar la rutina "${deleteConfirmation.routineName}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={routineData.loading}
      />

      <ToastContainer 
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
    </div>
  );
}; 