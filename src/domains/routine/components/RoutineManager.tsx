import React, { useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
import { useToastNotifications } from '../../../shared/hooks/useToastNotifications';
import { useExercisesData } from '../../exercise/hooks/useExercisesData';
import { ROUTINE_UI_LABELS } from '../../../shared/constants';
import { Exercise } from '../../../shared/types/dashboard';
import '../../../styles/RoutineManager.css';

export const RoutineManager: React.FC = () => {
  // Hooks específicos
  const routineData = useRoutineData();
  const routineExercises = useRoutineExercises({ routineId: routineData.selectedRoutineId });
  const routineUI = useRoutineUI();
  const { notifications, removeNotification } = useToastNotifications();
  const { exercises, exercisesLoading, loadExercises } = useExercisesData();

  // Estados locales para UI específica
  const [searchTerm, setSearchTerm] = React.useState('');
  const [deleteConfirmation, setDeleteConfirmation] = React.useState<{
    isOpen: boolean;
    routineId: number | null;
    routineName: string;
  }>({
    isOpen: false,
    routineId: null,
    routineName: ''
  });

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
      await routineData.deleteRoutine(deleteConfirmation.routineId);
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

  // Manejar reordenamiento de ejercicios
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && routineExercises.exercises) {
      const oldIndex = routineExercises.exercises.findIndex(ex => ex.id === active.id);
      const newIndex = routineExercises.exercises.findIndex(ex => ex.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(routineExercises.exercises, oldIndex, newIndex);
        const exerciseOrders: Array<[number, number]> = newOrder.map((ex, index) => [ex.id!, index]);
        
        routineExercises.reorderExercises(exerciseOrders);
      }
    }
  };

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

              <div className="routine-manager-exercises-container">
                {routineExercises.exercises && routineExercises.exercises.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={routineExercises.exercises.map(ex => ex.id!)}
                      strategy={verticalListSortingStrategy}
                    >
                      {routineExercises.exercises.map((exercise) => (
                        <SortableRoutineExercise
                          key={exercise.id}
                          exercise={exercise}
                          onUpdate={(updates) => routineExercises.updateExercise(
                            exercise.id!,
                            routineData.selectedRoutineId!,
                            exercise.exercise_id!,
                            exercise.order_index || 0,
                            updates.sets,
                            updates.reps,
                            updates.weight,
                            updates.notes,
                            updates.group_number
                          )}
                          onRemove={() => routineExercises.removeExercise(exercise.id!)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="routine-manager-no-exercises">
                    <p>Esta rutina no tiene ejercicios aún.</p>
                    <p>Haz clic en "Agregar Ejercicio" para comenzar.</p>
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
            1, // sets por defecto
            1, // reps por defecto
            0, // weight por defecto
            '', // notes por defecto
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