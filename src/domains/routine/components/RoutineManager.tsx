import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Title } from '../../../shared/components/base';
import { DeleteConfirmationModal } from "../../../shared/components/modals";
import ToastContainer from "../../../shared/components/notifications/ToastContainer";
import { useToast } from '../../../shared/contexts/ToastContext';
import { Exercise, RoutineExerciseWithDetails, Routine, RoutineForm as RoutineFormType } from '../../../shared/types/dashboard';
import '../../../styles/RoutineManager.css';
import { useRoutineData } from '../hooks/useRoutineData';
import { useRoutineExercises } from '../hooks/useRoutineExercises';
import { useRoutineUI } from '../hooks/useRoutineUI';
import { ExerciseSearch } from './ExerciseSearch';
import { RoutineExercise } from './RoutineExercise';
import { RoutineForm } from './RoutineForm';
import { RoutineList } from './RoutineList';
import { RoutineService } from '../services/routineService';

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
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [deletedRoutines, setDeletedRoutines] = useState<Routine[]>([]);
  const [deletedRoutinesCount, setDeletedRoutinesCount] = useState(0);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<{
    isOpen: boolean;
    routineId: number | null;
    routineName: string;
  }>({
    isOpen: false,
    routineId: null,
    routineName: ''
  });
  
  const routineData = useRoutineData();
  const routineExercises = useRoutineExercises({ routineId: routineData.selectedRoutineId });
  const routineUI = useRoutineUI();
  const { addNotification, notifications, removeNotification, clearAllNotifications } = useToast();
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    routineId: number | null;
    routineName: string;
  }>({
    isOpen: false,
    routineId: null,
    routineName: ''
  });

  // Clear any stale notifications when component mounts
  useEffect(() => {
    clearAllNotifications();
  }, [clearAllNotifications]);

  useEffect(() => {
    routineData.loadRoutines();
    loadDeletedRoutinesCount();
  }, []);

  useEffect(() => {
    if (routineData.selectedRoutineId) {
      routineExercises.loadExercises();
    }
  }, [routineData.selectedRoutineId, routineExercises.loadExercises]);

  const loadDeletedRoutinesCount = async () => {
    try {
      const count = await RoutineService.countDeletedRoutines();
      setDeletedRoutinesCount(count);
    } catch (error) {
      console.error("Error loading deleted routines count:", error);
      setDeletedRoutinesCount(0);
    }
  };

  const loadDeletedRoutines = async () => {
    try {
      const routines = await RoutineService.getDeletedRoutines();
      setDeletedRoutines(routines);
      setDeletedRoutinesCount(routines.length);
    } catch (error) {
      console.error("Error loading deleted routines:", error);
      setDeletedRoutines([]);
      setDeletedRoutinesCount(0);
    }
  };

  const handleTabChange = (tab: 'active' | 'deleted') => {
    setActiveTab(tab);
    setSearchTerm('');
    if (tab === 'deleted') {
      loadDeletedRoutines();
    } else {
      routineData.loadRoutines();
    }
  };

  const handleRestoreClick = (routineId: number, routineName: string) => {
    setRestoreConfirm({
      isOpen: true,
      routineId,
      routineName
    });
  };

  const handleRestoreConfirm = async () => {
    if (restoreConfirm.routineId) {
      try {
        await RoutineService.restoreRoutine(restoreConfirm.routineId);
        setDeletedRoutines(prev => prev.filter(r => r.id !== restoreConfirm.routineId));
        setDeletedRoutinesCount(prev => prev - 1);
        addNotification(
          `Rutina "${restoreConfirm.routineName}" restaurada correctamente`,
          'success'
        );
      } catch (error) {
        console.error("Error restoring routine:", error);
        addNotification(
          'Error al restaurar la rutina',
          'error'
        );
      }
    }
    setRestoreConfirm({
      isOpen: false,
      routineId: null,
      routineName: ''
    });
  };

  const handleRestoreCancel = () => {
    setRestoreConfirm({
      isOpen: false,
      routineId: null,
      routineName: ''
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      routineData.searchRoutines(searchTerm);
    } else {
      routineData.loadRoutines();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    routineData.loadRoutines();
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
        setDeletedRoutinesCount(prev => prev + 1);
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

  const handleEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
  };

  const handleEditSubmit = async (form: RoutineFormType) => {
    if (!editingRoutine) return false;
    
    const success = await routineData.updateRoutine(editingRoutine.id!, form);
    if (success) {
      setEditingRoutine(null);
    }
    return success;
  };

  const handleEditCancel = () => {
    setEditingRoutine(null);
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

  const handleExerciseUpdate = async (exerciseId: number, updates: Partial<RoutineExerciseWithDetails>) => {
    // Encontrar el ejercicio actual para obtener los valores por defecto
    const currentExercise = routineExercises.exercises.find(ex => ex.id === exerciseId);
    if (!currentExercise) {
      console.error('Exercise not found for update:', exerciseId);
      return;
    }

    // Extraer los valores actualizados o usar los valores actuales como fallback
    const orderIndex = currentExercise.order_index;
    const sets = updates.sets ?? currentExercise.sets;
    const reps = updates.reps ?? currentExercise.reps;
    const weight = updates.weight ?? currentExercise.weight;
    const notes = updates.notes ?? currentExercise.notes;
    const groupNumber = updates.group_number ?? currentExercise.group_number;

    // Llamar al método updateExercise con parámetros individuales
    await routineExercises.updateExercise(
      exerciseId,
      orderIndex,
      sets,
      reps,
      weight,
      notes,
      groupNumber
    );
  };

  return (
    <div className="routine-manager-container">
      <div className="routine-manager-wrapper">
        {/* Main Content Card */}
        <Card variant="elevated" padding="lg" className="routine-manager-content-card">
          <div className="routine-manager-card-content">
            <div className="routine-manager-main-content">
              {/* Header with title, search and create button */}
              <div className="routine-manager-header">
                <div className="routine-manager-title-section">
                  <Title level={2} variant="default">
                    Gestión de Rutinas
                  </Title>
                  <p className="routine-manager-description">
                    Administra las rutinas de entrenamiento y sus ejercicios
                  </p>
                </div>
                
                {/* Tab System */}
                <div className="routine-manager-tabs">
                  <button
                    className={`routine-manager-tab ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => handleTabChange('active')}
                  >
                    Rutinas Activas ({routineData.routines.length})
                  </button>
                  <button
                    className={`routine-manager-tab ${activeTab === 'deleted' ? 'active' : ''}`}
                    onClick={() => handleTabChange('deleted')}
                  >
                    Rutinas Eliminadas ({deletedRoutinesCount})
                  </button>
                </div>
                
                <div className="routine-manager-actions">
                  <form onSubmit={handleSearch} className="routine-manager-search-form">
                    <Input
                      placeholder="Buscar rutinas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      variant="primary"
                      leftIcon="🔍"
                      fullWidth
                    />
                    <div className="routine-manager-search-buttons">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={routineData.loading}
                        className="routine-manager-search-button"
                      >
                        Buscar
                      </Button>
                      {searchTerm && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleClearSearch}
                          disabled={routineData.loading}
                          className="routine-manager-clear-search-button"
                        >
                          Limpiar
                        </Button>
                      )}
                    </div>
                  </form>
                </div>
                <div className="routine-manager-create-action">
                  <Button
                    onClick={routineUI.openCreateForm}
                    variant="primary"
                    size="md"
                    disabled={routineData.loading}
                  >
                    ➕ Nueva Rutina
                  </Button>
                </div>
              </div>

              {/* Content Layout */}
              <div className="routine-manager-content">
                {/* Left Panel - Routines List */}
                <div className="routine-manager-left-panel">
                  {activeTab === 'active' ? (
                    <RoutineList
                      routines={routineData.routines}
                      selectedRoutineId={routineData.selectedRoutineId}
                      loading={routineData.loading}
                      onSelectRoutine={handleSelectRoutine}
                      onDeleteRoutine={handleDeleteClick}
                      onCreateNew={routineUI.openCreateForm}
                      hideCreateButton={true}
                    />
                  ) : (
                    <div className="routine-manager-deleted-routines">
                      {deletedRoutines.length === 0 ? (
                        <div className="routine-manager-empty-state">
                          <div className="routine-manager-empty-icon">🗑️</div>
                          <Title level={4} variant="secondary" align="center">
                            No hay rutinas eliminadas
                          </Title>
                          <p className="routine-manager-empty-description">
                            Las rutinas eliminadas aparecerán aquí
                          </p>
                        </div>
                      ) : (
                        <div className="routine-manager-routines-list">
                          {deletedRoutines.map((routine) => (
                            <div
                              key={routine.id}
                              className="routine-manager-routine-item deleted"
                            >
                              <div className="routine-manager-routine-info">
                                <div className="routine-manager-routine-name">
                                  {routine.name}
                                </div>
                                {routine.code && (
                                  <div className="routine-manager-routine-code">
                                    Código: {routine.code}
                                  </div>
                                )}
                                <div className="routine-manager-routine-deleted-status">
                                  🗑️ Eliminada
                                </div>
                              </div>
                              <button
                                className="routine-manager-routine-restore"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreClick(routine.id!, routine.name);
                                }}
                              >
                                🔄 Restaurar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Panel - Routine Details */}
                <div className="routine-manager-right-panel">
                  {activeTab === 'active' && routineData.selectedRoutine ? (
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
                        
                        <div className="routine-manager-routine-actions">
                          <Button
                            onClick={() => handleEditRoutine(routineData.selectedRoutine!)}
                            variant="secondary"
                            disabled={isButtonDisabled}
                            className="routine-manager-edit-routine-button"
                          >
                            ✏️ Editar
                          </Button>
                          <Button
                            onClick={routineUI.openExerciseSearch}
                            variant="primary"
                            disabled={isButtonDisabled}
                            className="routine-manager-add-exercise-button"
                          >
                            Agregar Ejercicio
                          </Button>
                        </div>
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
                                      onUpdate={handleExerciseUpdate}
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
                  ) : activeTab === 'deleted' ? (
                    <div className="routine-manager-no-routine">
                      <div className="routine-manager-no-routine-icon">🗑️</div>
                      <Title level={4} variant="secondary" align="center">
                        Gestión de Rutinas Eliminadas
                      </Title>
                      <p className="routine-manager-no-routine-description">
                        Selecciona una rutina eliminada de la lista para restaurarla
                      </p>
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

      {/* Edit Routine Modal */}
      <RoutineForm
        isOpen={!!editingRoutine}
        loading={routineData.loading}
        editingRoutine={editingRoutine}
        onSubmit={handleEditSubmit}
        onCancel={handleEditCancel}
      />

      <ExerciseSearch
        isOpen={routineUI.showExerciseSearch}
        onAddExercise={async (exercise: Exercise, groupNumber: number) => {
          const nextOrderIndex = routineExercises.exercises.length;
          await routineExercises.addExercise(
            exercise.id!,
            nextOrderIndex,
            undefined, // sets - no usado por el momento
            undefined, // reps - no usado por el momento
            undefined, // weight - no usado por el momento
            undefined, // notes - no usado por el momento
            groupNumber // group_number - selected group
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

      {/* Restore Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={restoreConfirm.isOpen}
        title="Restaurar Rutina"
        message={`¿Estás seguro de que deseas restaurar la rutina "${restoreConfirm.routineName}"? La rutina volverá a estar disponible para su uso.`}
        confirmText="Restaurar"
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
        isDeleting={false}
      />

      <ToastContainer 
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
    </div>
  );
}; 