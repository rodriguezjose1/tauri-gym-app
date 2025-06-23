import React, { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Input, Button } from '../../../shared/components/base';
import { DeleteConfirmationModal } from "../../../shared/components/modals";
import ToastContainer from "../../../shared/components/notifications/ToastContainer";
import { SortableRoutineExercise } from './SortableRoutineExercise';
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
import { useDragAndDrop } from '../hooks/useDragAndDrop';

// Droppable Group Component for Routine Exercises
const DroppableRoutineGroup: React.FC<{
  groupNumber: number;
  routineId: number;
  children: React.ReactNode;
}> = ({ groupNumber, routineId, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `routine-group-${groupNumber}-${routineId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`routine-manager-droppable-group ${isOver ? 'is-over' : ''}`}
    >
      <div className="routine-manager-group-header">
        Grupo {groupNumber}
        </div>
      <div className="routine-manager-group-container">
        {children}
        {React.Children.count(children) === 0 && (
          <div className="routine-manager-group-empty">
            Arrastra ejercicios aquí
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to group exercises by group_number
const groupExercisesByGroup = (exercises: RoutineExerciseWithDetails[], emptyGroups: number[] = []) => {
  // Ordenar ejercicios por group_number y order_index antes de agrupar
  const sortedExercises = [...exercises].sort((a, b) => {
    const groupA = a.group_number || 1;
    const groupB = b.group_number || 1;
    if (groupA !== groupB) {
      return groupA - groupB;
    }
    return (a.order_index || 0) - (b.order_index || 0);
  });
  
  const groups = sortedExercises.reduce((acc, exercise) => {
    const groupNumber = exercise.group_number || 1;
    if (!acc[groupNumber]) {
      acc[groupNumber] = [];
    }
    acc[groupNumber].push(exercise);
    return acc;
  }, {} as Record<number, RoutineExerciseWithDetails[]>);
  
  // Add empty groups
  emptyGroups.forEach(groupNumber => {
    if (!groups[groupNumber]) {
      groups[groupNumber] = [];
    }
  });
  
  // Sort groups by group number and return as array
  const result = Object.keys(groups)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(groupNumber => ({
      groupNumber: parseInt(groupNumber),
      exercises: groups[parseInt(groupNumber)]
    }));
    
  return result;
};

export const RoutineManager: React.FC = () => {
  // Hooks específicos
  const routineData = useRoutineData();
  const routineExercises = useRoutineExercises({ routineId: routineData.selectedRoutineId });
  const routineUI = useRoutineUI();
  const { notifications, removeNotification, addNotification } = useToast();
  const { exercises, exercisesLoading, loadExercises } = useExercisesData();

  // Estados locales para UI específica
  const [searchTerm, setSearchTerm] = React.useState('');
  const [emptyGroups, setEmptyGroups] = React.useState<number[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState<{
    isOpen: boolean;
    routineId: number | null;
    routineName: string;
  }>({
    isOpen: false,
    routineId: null,
    routineName: ''
  });
  const [isExerciseSearchOpen, setIsExerciseSearchOpen] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    routineData.loadRoutines();
    loadExercises();
  }, []);

  // Cargar ejercicios cuando se selecciona una rutina
  useEffect(() => {
    if (routineData.selectedRoutineId) {
      routineExercises.loadExercises();
    }
  }, [routineData.selectedRoutineId]);

  // Limpiar grupos vacíos cuando cambian los ejercicios
  useEffect(() => {
    if (routineExercises.exercises) {
      const usedGroups = new Set(routineExercises.exercises.map(e => e.group_number || 1));
      const stillEmptyGroups = emptyGroups.filter(groupNum => !usedGroups.has(groupNum));
      
      if (stillEmptyGroups.length !== emptyGroups.length) {
        setEmptyGroups(stillEmptyGroups);
      }
    }
  }, [routineExercises.exercises, emptyGroups]);

  // Configuración de sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Manejar búsqueda de rutinas
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      routineData.searchRoutines(searchTerm.trim());
    }
  };

  // Manejar selección de rutina
  const handleSelectRoutine = (routineId: number) => {
    routineData.selectRoutine(routineId);
  };

  // Manejar confirmación de eliminación
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
        addNotification('Rutina eliminada exitosamente', 'success');
      } else {
        addNotification('Error al eliminar la rutina', 'error');
      }
      setDeleteConfirmation({
        isOpen: false,
        routineId: null,
        routineName: ''
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({
      isOpen: false,
      routineId: null,
      routineName: ''
    });
  };

  // Crear nuevo grupo
  const createNewGroup = () => {
    if (!routineExercises.exercises) return;
    
    // Encontrar el número de grupo más alto
    const maxGroupNumber = Math.max(...routineExercises.exercises.map(e => e.group_number || 1), 0);
    const newGroupNumber = maxGroupNumber + 1;
    
    // Agregar el nuevo grupo vacío al estado
    setEmptyGroups(prev => [...prev, newGroupNumber]);
  };

  // Eliminar grupo vacío
  const handleRemoveEmptyGroup = (groupNumber: number) => {
    setEmptyGroups(prev => prev.filter(g => g !== groupNumber));
  };

  // Manejar grupo vacío
  const handleGroupEmpty = (groupNumber: number) => {
    addNotification(`El grupo ${groupNumber} está vacío. Puedes arrastrar ejercicios aquí.`, 'info');
  };

  // Hook para drag and drop
  const { 
    isDragging, 
    activeExercise, 
    handleDragStart, 
    handleDragOver, 
    handleDragEnd 
  } = useDragAndDrop({
    exercises: routineExercises.exercises,
    onUpdateExercise: routineExercises.updateExercise,
    onReorderExercises: routineExercises.reorderExercises,
    onGroupEmpty: handleGroupEmpty
  });

  return (
    <div className="routine-manager">
        <div className="routine-manager-header">
        <h2 className="routine-manager-title">
          Gestor de Rutinas
        </h2>
        
        <div className="routine-manager-actions">
          <form onSubmit={handleSearch} className="routine-manager-search">
              <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={ROUTINE_UI_LABELS.SEARCH_PLACEHOLDER}
                variant="primary"
              />
            <Button type="submit" variant="primary">
              Buscar
            </Button>
          </form>
          
              <Button
            onClick={routineUI.openCreateForm}
                variant="primary"
            disabled={routineData.loading}
              >
            Nueva Rutina
              </Button>
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
                  disabled={routineData.loading || routineExercises.loading}
                    className="routine-manager-add-exercise-button"
                  >
                  Agregar Ejercicio
                  </Button>
                </div>

              <div className="routine-manager__exercises">
                {exercisesLoading ? (
                  <div className="routine-manager__loading">
                    Cargando ejercicios...
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                  >
                    <div className="routine-manager__groups">
                      {(() => {
                        const exerciseGroups = groupExercisesByGroup(routineExercises.exercises, emptyGroups);
                        return exerciseGroups.map((group) => (
                          <DroppableRoutineGroup
                            key={`group-${group.groupNumber}-${routineData.selectedRoutineId}`}
                            groupNumber={group.groupNumber}
                            routineId={routineData.selectedRoutineId!}
                    >
                      <SortableContext
                              items={group.exercises.map(ex => ex.id!)}
                        strategy={verticalListSortingStrategy}
                      >
                              {group.exercises.map((exercise) => (
                                  <SortableRoutineExercise
                                    key={exercise.id}
                                    exercise={exercise}
                                  onUpdate={(updates) => {
                                    const updatedExercise = {
                                      ...exercise,
                                      ...updates,
                                      exercise_id: exercise.exercise_id,
                                      routine_id: routineData.selectedRoutineId!,
                                      sets: exercise.sets,
                                      reps: exercise.reps,
                                      weight: exercise.weight,
                                      notes: exercise.notes
                                    };
                                    routineExercises.updateExercise(exercise.id!, updatedExercise);
                                  }}
                                  onRemove={() => routineExercises.removeExercise(exercise.id!)}
                                  />
                                ))}
                            </SortableContext>
                          </DroppableRoutineGroup>
                          ));
                        })()}
                    </div>

                    <DragOverlay>
                      {activeExercise && (
                        <SortableRoutineExercise
                          exercise={activeExercise}
                          onUpdate={() => {}}
                          onRemove={() => {}}
                        />
                      )}
                    </DragOverlay>
                    </DndContext>
                  )}

                {/* Botón para crear nuevo grupo */}
                <div className="routine-manager-new-group-container">
                  <button
                    onClick={createNewGroup}
                    className="routine-manager-new-group-button"
                  >
                    + Crear Nuevo Grupo
                  </button>
                </div>
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
            1  // group_number por defecto
          );
          routineUI.closeExerciseSearch();
        }}
        onClose={routineUI.closeExerciseSearch}
      />

        <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
          title="Eliminar Rutina"
        message={`¿Estás seguro de que quieres eliminar la rutina "${deleteConfirmation.routineName}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        />

        <ToastContainer
          notifications={notifications}
          onRemoveNotification={removeNotification}
        />
    </div>
  );
}; 