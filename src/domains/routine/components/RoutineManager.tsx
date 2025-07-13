import React, { useState, useEffect, useMemo } from 'react';
import { Button, Input, Select } from '../../../shared/components/base';
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

  // Group exercises by group number
  const groupExercisesByGroup = (exercises: RoutineExerciseWithDetails[], emptyGroups: number[] = []) => {
    const groups = new Map<number, RoutineExerciseWithDetails[]>();
    
    // Add exercises to their respective groups
    exercises.forEach(exercise => {
      const groupNumber = exercise.group_number || 1;
      if (!groups.has(groupNumber)) {
        groups.set(groupNumber, []);
      }
      groups.get(groupNumber)!.push(exercise);
    });

    // Add empty groups
    emptyGroups.forEach(groupNumber => {
      if (!groups.has(groupNumber)) {
        groups.set(groupNumber, []);
      }
    });

    // Convert to array and sort
    const groupsArray = Array.from(groups.entries())
      .map(([groupNumber, exercises]) => ({
        groupNumber,
        exercises: exercises.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      }))
      .sort((a, b) => a.groupNumber - b.groupNumber);

    return groupsArray;
  };

  // Memoize the grouped exercises to avoid recalculating on every render
  const exerciseGroups = useMemo(() => {
    return groupExercisesByGroup(routineExercises.exercises, emptyGroups);
  }, [routineExercises.exercises, emptyGroups]);

  const isButtonDisabled = !routineData.selectedRoutineId || routineData.loading || exercisesLoading;

  return (
    <div className="routine-manager">
      <div className="routine-manager-header">
        <h2 className="routine-manager-title">Gestor de Rutinas</h2>
        
        <div className="routine-manager-search">
          <form onSubmit={handleSearch} className="routine-manager-search-form">
            <Input
              type="text"
              placeholder="Buscar rutinas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="primary"
              className="routine-manager-search-input"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={routineData.loading}
            >
              Buscar
            </Button>
          </form>
        </div>
      </div>

      <div className="routine-manager-content">
        <div className="routine-manager-left-panel">
          <RoutineList
            routines={routineData.routines}
            selectedRoutineId={routineData.selectedRoutineId}
            loading={routineData.loading}
            onSelectRoutine={handleSelectRoutine}
            onDeleteRoutine={handleDeleteClick}
            onCreateNew={routineUI.openCreateForm}
          />
          </div>

          <div className="routine-manager-right-panel">
          {routineData.selectedRoutine ? (
            <div className="routine-manager-routine-details">
                <div className="routine-manager-routine-header">
                <div className="routine-manager-routine-info">
                  <h3 className="routine-manager-routine-title">
                    {routineData.selectedRoutine.name}
                  </h3>
                  {routineData.selectedRoutine.code && (
                    <span className="routine-manager-routine-subtitle">
                      Código: {routineData.selectedRoutine.code}
                    </span>
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

                <div className="routine-manager-exercises">
                  {routineExercises.loading ? (
                    <div className="routine-manager-loading">
                      <div className="routine-manager-spinner"></div>
                      <span>Cargando ejercicios...</span>
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
              <p>Selecciona una rutina para ver sus detalles</p>
          </div>
        )}
                </div>
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