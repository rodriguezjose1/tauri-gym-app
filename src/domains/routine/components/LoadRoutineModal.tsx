import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../../../shared/components/base';
import { Person, RoutineOption } from '../../../shared/types/dashboard';
import { RoutineService } from '../../../services';
import '../../../styles/LoadRoutineModal.css';

interface LoadRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPerson: Person | null;
  routines: RoutineOption[];
  selectedRoutineForLoad: number | null;
  selectedDateForRoutine: string;
  selectedGroupForRoutine: number;
  onRoutineSelect: (routineId: number | null) => void;
  onDateChange: (date: string) => void;
  onGroupChange: (group: number) => void;
  onApplyRoutine: () => void;
  loadingApply: boolean;
}

export const LoadRoutineModal: React.FC<LoadRoutineModalProps> = ({
  isOpen,
  onClose,
  selectedPerson,
  routines,
  selectedRoutineForLoad,
  selectedDateForRoutine,
  selectedGroupForRoutine,
  onRoutineSelect,
  onDateChange,
  onGroupChange,
  onApplyRoutine,
  loadingApply
}) => {
  const [routineExerciseCounts, setRoutineExerciseCounts] = useState<{ [key: number]: number }>({});
  const [loadingCounts, setLoadingCounts] = useState<{ [key: number]: boolean }>({});

  // Load exercise count for a routine
  const loadRoutineExerciseCount = async (routineId: number) => {
    if (routineExerciseCounts[routineId] !== undefined || loadingCounts[routineId]) {
      return;
    }

    setLoadingCounts(prev => ({ ...prev, [routineId]: true }));
    try {
      const routineWithExercises = await RoutineService.getRoutineWithExercises(routineId);
      const count = routineWithExercises?.exercises?.length || 0;
      setRoutineExerciseCounts(prev => ({ ...prev, [routineId]: count }));
    } catch (error) {
      console.error(`Error loading exercise count for routine ${routineId}:`, error);
      setRoutineExerciseCounts(prev => ({ ...prev, [routineId]: 0 }));
    } finally {
      setLoadingCounts(prev => ({ ...prev, [routineId]: false }));
    }
  };

  // Load exercise counts for all routines when modal opens
  useEffect(() => {
    if (isOpen && routines.length > 0) {
      routines.forEach(routine => {
        if (routine.exerciseCount === 0) {
          loadRoutineExerciseCount(routine.id);
        }
      });
    }
  }, [isOpen, routines]);

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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
              onChange={(e) => onRoutineSelect(e.target.value ? parseInt(e.target.value) : null)}
              className="load-routine-select"
            >
              <option value="">-- Seleccionar rutina --</option>
              {routines.map(routine => {
                const count = routineExerciseCounts[routine.id];
                const isLoading = loadingCounts[routine.id];
                const displayCount = count !== undefined ? count : (isLoading ? '...' : '0');
                
                return (
                  <option key={routine.id} value={routine.id}>
                    {routine.name} ({displayCount} ejercicios)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="load-routine-form-group">
            <label className="load-routine-label">
              Fecha:
            </label>
            <Input
              type="date"
              value={selectedDateForRoutine}
              onChange={(e) => onDateChange(e.target.value)}
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
              onChange={(e) => onGroupChange(parseInt(e.target.value))}
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
            onClick={handleClose}
            variant="secondary"
            disabled={loadingApply}
          >
            Cancelar
          </Button>
          <Button
            onClick={onApplyRoutine}
            variant="primary"
            disabled={!selectedRoutineForLoad || !selectedDateForRoutine || loadingApply}
            loading={loadingApply}
          >
            {loadingApply ? "Aplicando..." : "Aplicar Rutina"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}; 