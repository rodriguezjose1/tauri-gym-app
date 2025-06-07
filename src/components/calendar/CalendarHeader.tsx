import React from 'react';
import { Button } from '../base';

interface CalendarHeaderProps {
  dateRangeTitle: string;
  showWeekends: boolean;
  onToggleWeekends: () => void;
  onGoToNewerWeeks: () => void;
  onGoToOlderWeeks: () => void;
  onGoToCurrentWeeks: () => void;
  workoutLoading: boolean;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  dateRangeTitle,
  showWeekends,
  onToggleWeekends,
  onGoToNewerWeeks,
  onGoToOlderWeeks,
  onGoToCurrentWeeks,
  workoutLoading
}) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '16px',
      backgroundColor: 'var(--bg-tertiary)',
      borderRadius: '8px',
      border: '1px solid var(--border-light)'
    }}>
      {/* Navigation Controls */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button
          onClick={onGoToOlderWeeks}
          variant="secondary"
          size="sm"
          disabled={workoutLoading}
        >
          ← Anteriores
        </Button>
        
        <Button
          onClick={onGoToCurrentWeeks}
          variant="primary"
          size="sm"
          disabled={workoutLoading}
        >
          Hoy
        </Button>
        
        <Button
          onClick={onGoToNewerWeeks}
          variant="secondary"
          size="sm"
          disabled={workoutLoading}
        >
          Siguientes →
        </Button>
      </div>

      {/* Date Range Title */}
      <div style={{
        fontWeight: '600',
        color: 'var(--text-primary)',
        fontSize: '16px',
        textAlign: 'center',
        flex: 1
      }}>
        {dateRangeTitle}
      </div>

      {/* View Controls */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: 'var(--text-primary)',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={showWeekends}
            onChange={onToggleWeekends}
            style={{
              width: '16px',
              height: '16px',
              cursor: 'pointer'
            }}
          />
          Mostrar fines de semana
        </label>
      </div>
    </div>
  );
}; 