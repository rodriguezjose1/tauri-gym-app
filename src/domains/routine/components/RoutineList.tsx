import React from 'react';
import { Routine } from '../../../services';

interface RoutineListProps {
  routines: Routine[];
  selectedRoutineId: number | null;
  loading: boolean;
  onSelectRoutine: (routineId: number) => void;
  onDeleteRoutine: (routineId: number, routineName: string) => void;
}

export const RoutineList: React.FC<RoutineListProps> = ({
  routines,
  selectedRoutineId,
  loading,
  onSelectRoutine,
  onDeleteRoutine,
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
            role="button"
            tabIndex={0}
            aria-label={`Seleccionar rutina ${routine.name}`}
            aria-pressed={selectedRoutineId === routine.id}
            className={`routine-manager-routine-item ${
              selectedRoutineId === routine.id ? 'selected' : ''
            }`}
            onClick={() => onSelectRoutine(routine.id!)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectRoutine(routine.id!);
              }
            }}
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
              type="button"
              aria-label={`Eliminar rutina ${routine.name}`}
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
