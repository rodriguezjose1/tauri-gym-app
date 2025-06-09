import React from 'react';
import { Modal } from '../base/Modal';
import { Button } from '../base/Button';
import { Input } from '../base/Input';
import { Person, RoutineOption } from '../../types/dashboard';

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