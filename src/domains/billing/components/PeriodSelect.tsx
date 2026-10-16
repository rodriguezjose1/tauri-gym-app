import React, { useMemo, useState } from 'react';
import { Select } from '../../../shared/components/base';
import { currentPeriod, formatPeriod, periodOptions } from '../utils/periodOptions';

const EXPAND_VALUE = '__more_periods__';

interface PeriodSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  compactBack?: number;
  compactAhead?: number;
  expandedBack?: number;
  expandedAhead?: number;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function PeriodSelect({
  label = 'Período',
  value,
  onChange,
  compactBack = 3,
  compactAhead = 3,
  expandedBack = 24,
  expandedAhead = 12,
  disabled = false,
  fullWidth = false,
}: PeriodSelectProps) {
  const [expanded, setExpanded] = useState(false);
  const options = useMemo(() => {
    const visible = periodOptions(
      expanded ? expandedBack : compactBack,
      expanded ? expandedAhead : compactAhead,
    );
    if (value && !visible.some((option) => option.value === value)) {
      visible.push({
        value,
        label: `${formatPeriod(value)}${value === currentPeriod() ? ' — Actual' : ''}`,
      });
      visible.sort((left, right) => String(right.value).localeCompare(String(left.value)));
    }
    if (!expanded) visible.push({ value: EXPAND_VALUE, label: 'Ver más períodos…' });
    return visible;
  }, [compactAhead, compactBack, expanded, expandedAhead, expandedBack, value]);

  return (
    <Select
      label={label}
      value={value}
      options={options}
      onChange={(nextValue) => {
        if (nextValue === EXPAND_VALUE) {
          setExpanded(true);
          return;
        }
        onChange(String(nextValue));
      }}
      disabled={disabled}
      fullWidth={fullWidth}
      placeholder=""
    />
  );
}
