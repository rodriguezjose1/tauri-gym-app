import React from 'react';
import { Button } from '../../../shared/components/base';
import { Routine } from '../../../services';
import { ROUTINE_UI_LABELS } from '../../../shared/constants';

// Constantes locales para labels faltantes
const LOCAL_LABELS = {
  ROUTINES_TITLE: 'Rutinas',
  CREATE_ROUTINE_BUTTON: 'Nueva Rutina'
} as const;

interface RoutineListProps {
  routines: Routine[];
  selectedRoutineId: number | null;
  loading: boolean;
  onSelectRoutine: (routineId: number) => void;
  onDeleteRoutine: (routineId: number, routineName: string) => void;
  onCreateNew: () => void;
  hideCreateButton?: boolean;
}

export const RoutineList: React.FC<RoutineListProps> = ({
  routines,
  selectedRoutineId,
  loading,
  onSelectRoutine,
  onDeleteRoutine,
  onCreateNew,
  hideCreateButton = false
}) => {
  if (loading) {
    return (
      <div className="routine-manager-loading">
        <div className="routine-manager-spinner"></div>
        <span>Cargando rutinas...</span>
      </div>
    );
  }

  return (
    <div className="routine-manager-routines-list">
      {routines.length === 0 ? (
        <div className="routine-manager-empty">
          <p>No hay rutinas disponibles</p>
        </div>
      ) : (
        routines.map((routine) => (
          <div
            key={routine.id}
            className={`routine-manager-routine-item ${
              selectedRoutineId === routine.id ? 'selected' : ''
            }`}
            onClick={() => onSelectRoutine(routine.id!)}
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
            </div>
            <button
              className="routine-manager-routine-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRoutine(routine.id!, routine.name);
              }}
            >
              Eliminar
            </button>
          </div>
        ))
      )}
    </div>
  );
}; 