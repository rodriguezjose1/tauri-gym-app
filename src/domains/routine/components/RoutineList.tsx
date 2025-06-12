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
}

export const RoutineList: React.FC<RoutineListProps> = ({
  routines,
  selectedRoutineId,
  loading,
  onSelectRoutine,
  onDeleteRoutine,
  onCreateNew
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
      <div className="routine-manager-search-section">
        <h3 className="routine-manager-title">
          {LOCAL_LABELS.ROUTINES_TITLE}
        </h3>
        <Button
          onClick={onCreateNew}
          variant="primary"
          size="sm"
          className="routine-manager-new-routine-button"
        >
          {LOCAL_LABELS.CREATE_ROUTINE_BUTTON}
        </Button>
      </div>

      {routines.length === 0 ? (
        <div className="routine-manager-empty">
          <div className="routine-manager-empty-icon">📋</div>
          <p className="routine-manager-empty-message">
            No hay rutinas disponibles
          </p>
          <p className="routine-manager-empty-submessage">
            Crea tu primera rutina para comenzar
          </p>
        </div>
      ) : (
        <div className="routine-manager-routines-list">
          {routines.map((routine) => (
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
              
              <div className="routine-manager-routine-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRoutine(routine.id!, routine.name);
                  }}
                  className="routine-manager-routine-delete"
                  title={ROUTINE_UI_LABELS.DELETE_TOOLTIP}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 