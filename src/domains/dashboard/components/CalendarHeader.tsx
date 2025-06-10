import React from 'react';
import { Button } from '../../../shared/components/base';
import '../../../styles/CalendarHeader.css';

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
    <div className="calendar-header">
      {/* Navigation Controls */}
      <div className="calendar-header-navigation">
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
      <div className="calendar-header-title">
        {dateRangeTitle}
      </div>

      {/* View Controls */}
      <div className="calendar-header-controls">
        <label className="calendar-header-weekend-toggle">
          <input
            type="checkbox"
            checked={showWeekends}
            onChange={onToggleWeekends}
            className="calendar-header-checkbox"
          />
          Mostrar fines de semana
        </label>
      </div>
    </div>
  );
}; 