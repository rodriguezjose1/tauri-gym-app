import { CSSProperties } from 'react';

// Container styles
export const getCalendarContainerStyles = (): CSSProperties => ({
  backgroundColor: 'var(--bg-primary)',
  borderRadius: '12px',
  boxShadow: '0 1px 3px var(--shadow-light)',
  border: '1px solid var(--border-light)',
  overflow: 'hidden'
});

// Header styles
export const getHeaderStyles = (): CSSProperties => ({
  padding: '16px 20px',
  borderBottom: '1px solid var(--border-light)',
  backgroundColor: 'var(--bg-secondary)'
});

export const getHeaderContentStyles = (): CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '16px'
});

export const getTitleStyles = (): CSSProperties => ({
  fontWeight: '600',
  color: 'var(--text-primary)',
  fontSize: '16px',
  flex: '0 0 auto'
});

export const getNavigationContainerStyles = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
});

// Selected person styles
export const getSelectedPersonContainerStyles = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 12px',
  backgroundColor: 'var(--bg-tertiary)',
  borderRadius: '8px',
  border: '1px solid var(--accent-primary)'
});

export const getPersonAvatarStyles = (): CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: 'var(--accent-primary)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '12px'
});

export const getPersonInfoStyles = (): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px'
});

export const getPersonNameStyles = (): CSSProperties => ({
  fontWeight: '600',
  fontSize: '14px',
  color: 'var(--text-primary)'
});

export const getPersonEmailStyles = (): CSSProperties => ({
  fontSize: '12px',
  color: 'var(--text-secondary)'
});

export const getNavigationButtonStyles = (disabled = false): CSSProperties => ({
  padding: '6px 12px',
  backgroundColor: disabled ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
  fontSize: '14px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
});

export const getCurrentButtonStyles = (): CSSProperties => ({
  padding: '6px 12px',
  backgroundColor: 'var(--accent-primary)',
  border: '1px solid var(--accent-primary)',
  borderRadius: '6px',
  color: 'white',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s'
});

export const getPersonSearchContainerStyles = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flex: '1 1 auto',
  minWidth: '300px'
});

export const getClearButtonStyles = (): CSSProperties => ({
  padding: '6px 12px',
  backgroundColor: 'transparent',
  border: '1px solid var(--error-color)',
  borderRadius: '6px',
  color: 'var(--error-color)',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s'
});

// Empty state styles
export const getEmptyStateStyles = (): CSSProperties => ({
  textAlign: 'center',
  padding: '60px 20px',
  color: 'var(--text-muted)'
});

export const getEmptyStateIconStyles = (): CSSProperties => ({
  fontSize: '48px',
  marginBottom: '16px'
});

export const getEmptyStateTitleStyles = (): CSSProperties => ({
  fontSize: '18px',
  fontWeight: '600',
  color: 'var(--text-primary)',
  marginBottom: '8px'
});

export const getEmptyStateDescriptionStyles = (): CSSProperties => ({
  fontSize: '14px',
  color: 'var(--text-secondary)',
  lineHeight: '1.5'
});

// Loading state styles
export const getLoadingStateStyles = (): CSSProperties => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '300px',
  color: 'var(--text-muted)'
});

export const getLoadingSpinnerStyles = (): CSSProperties => ({
  width: '32px',
  height: '32px',
  border: '3px solid var(--border-light)',
  borderTop: '3px solid var(--accent-primary)',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  marginRight: '12px'
});

export const getLoadingTextStyles = (): CSSProperties => ({
  fontSize: '14px',
  color: 'var(--text-secondary)'
});

export const getWeekHeaderStyles = (): CSSProperties => ({
  padding: '12px 16px',
  backgroundColor: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-light)',
  fontWeight: '600',
  fontSize: '14px',
  color: 'var(--text-primary)'
});

export const getWeekGridStyles = (showWeekends = true): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: showWeekends ? 'repeat(7, 1fr)' : 'repeat(5, 1fr)'
});

// Day styles
export const getDayContainerStyles = (isToday: boolean, isPastDay: boolean): CSSProperties => ({
  backgroundColor: isToday ? 'var(--bg-tertiary)' : isPastDay ? 'var(--bg-secondary)' : 'var(--bg-primary)',
  padding: '8px',
  minHeight: '120px',
  display: 'flex',
  flexDirection: 'column',
  border: isToday ? '2px solid var(--accent-primary)' : 'none',
  overflow: 'hidden'
});

export const getDayHeaderStyles = (): CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px'
});

export const getDayWeekdayStyles = (isToday: boolean): CSSProperties => ({
  fontSize: '11px',
  fontWeight: '600',
  color: isToday ? 'var(--accent-primary)' : 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
});

export const getDayNumberStyles = (isToday: boolean): CSSProperties => ({
  fontSize: '16px',
  fontWeight: 'bold',
  color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)'
});

export const getDayContentStyles = (): CSSProperties => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
});

export const getNoWorkoutsStyles = (): CSSProperties => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-muted)',
  fontSize: '11px',
  textAlign: 'center',
  minHeight: '60px'
});

export const getAddWorkoutButtonStyles = (): CSSProperties => ({
  padding: '4px 8px',
  backgroundColor: 'transparent',
  border: '1px dashed var(--border-color)',
  borderRadius: '4px',
  color: 'var(--text-muted)',
  fontSize: '11px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textAlign: 'center'
});

// Hover styles
export const getNavigationButtonHoverStyles = (): CSSProperties => ({
  backgroundColor: 'var(--hover-bg)'
});

export const getCurrentButtonHoverStyles = (): CSSProperties => ({
  backgroundColor: 'var(--accent-secondary)'
});

export const getAddWorkoutButtonHoverStyles = (): CSSProperties => ({
  borderColor: 'var(--accent-primary)',
  color: 'var(--accent-primary)',
  backgroundColor: 'var(--bg-tertiary)'
});

export const getClearButtonHoverStyles = (): CSSProperties => ({
  backgroundColor: 'var(--error-color)',
  color: 'white'
});

// Missing functions that need to be added
export const getLoadingContentStyles = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  color: 'var(--text-secondary)'
});

export const getLoadingIconStyles = (): CSSProperties => ({
  fontSize: '24px',
  marginRight: '8px'
});

export const getHeaderLayoutStyles = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap'
});

export const getPersonPhoneStyles = (): CSSProperties => ({
  fontSize: '12px',
  color: 'var(--text-muted)',
  fontStyle: 'italic'
});

export const getWeekendToggleStyles = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  color: 'var(--text-primary)',
  cursor: 'pointer'
});

export const getCheckboxStyles = (): CSSProperties => ({
  marginRight: '8px',
  cursor: 'pointer'
});

export const getCalendarContentStyles = (): CSSProperties => ({
  flex: 1,
  overflow: 'auto'
});

export const getWeeksContainerStyles = (): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column'
});

export const getWeekContainerStyles = (): CSSProperties => ({
  borderBottom: '1px solid var(--border-light)'
});

export const getWorkoutsContainerStyles = (): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  marginTop: '8px'
});

export const getAddWorkoutButtonContainerStyles = (): CSSProperties => ({
  marginTop: '8px',
  display: 'flex',
  justifyContent: 'center'
}); 