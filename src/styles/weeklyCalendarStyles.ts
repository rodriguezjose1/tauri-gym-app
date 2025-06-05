import { CSSProperties } from 'react';

// Container styles
export const getCalendarContainerStyles = (): CSSProperties => ({
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  border: '1px solid #e5e7eb',
  overflow: 'hidden'
});

// Header styles
export const getHeaderStyles = (): CSSProperties => ({
  padding: '16px 20px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#f8fafc'
});

export const getHeaderLayoutStyles = (): CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
});

export const getTitleStyles = (): CSSProperties => ({
  fontWeight: '600',
  color: '#1f2937',
  fontSize: '16px',
  flex: '0 0 auto'
});

export const getPersonSearchContainerStyles = (): CSSProperties => ({
  position: 'relative',
  flex: '1',
  maxWidth: '400px'
});

// Selected person styles
export const getSelectedPersonContainerStyles = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 12px',
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  border: '1px solid #0ea5e9'
});

export const getPersonAvatarStyles = (): CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: '#2563eb',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '12px'
});

export const getPersonNameStyles = (): CSSProperties => ({
  fontWeight: '600',
  color: '#1f2937',
  fontSize: '14px'
});

export const getPersonPhoneStyles = (): CSSProperties => ({
  fontSize: '12px',
  color: '#6b7280'
});

// Navigation styles
export const getNavigationContainerStyles = (): CSSProperties => ({
  display: 'flex',
  gap: '8px',
  alignItems: 'center'
});

export const getNavigationButtonStyles = (disabled = false): CSSProperties => ({
  padding: '6px 12px',
  backgroundColor: disabled ? '#f9fafb' : '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  color: disabled ? '#9ca3af' : '#374151',
  fontSize: '14px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
});

export const getCurrentButtonStyles = (): CSSProperties => ({
  padding: '6px 12px',
  backgroundColor: '#2563eb',
  border: '1px solid #2563eb',
  borderRadius: '6px',
  color: 'white',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s'
});

export const getWeekendToggleStyles = (): CSSProperties => ({
  fontSize: '14px',
  color: '#374151',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  userSelect: 'none',
  marginLeft: '8px'
});

export const getCheckboxStyles = (): CSSProperties => ({
  width: '16px',
  height: '16px',
  cursor: 'pointer'
});

// Calendar content styles
export const getCalendarContentStyles = (): CSSProperties => ({
  padding: '16px',
  maxHeight: '70vh',
  overflowY: 'auto'
});

// Empty state styles
export const getEmptyStateStyles = (): CSSProperties => ({
  textAlign: 'center',
  padding: '60px 20px',
  color: '#6b7280'
});

export const getEmptyStateIconStyles = (): CSSProperties => ({
  fontSize: '48px',
  marginBottom: '16px'
});

export const getEmptyStateTitleStyles = (): CSSProperties => ({
  fontSize: '18px',
  fontWeight: '600',
  color: '#1f2937',
  marginBottom: '8px'
});

export const getEmptyStateDescriptionStyles = (): CSSProperties => ({
  fontSize: '16px',
  lineHeight: '1.5',
  margin: 0
});

// Loading state styles
export const getLoadingStateStyles = (): CSSProperties => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '300px',
  color: '#6b7280'
});

export const getLoadingContentStyles = (): CSSProperties => ({
  textAlign: 'center'
});

export const getLoadingIconStyles = (): CSSProperties => ({
  fontSize: '24px',
  marginBottom: '8px'
});

// Week styles
export const getWeeksContainerStyles = (): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
});

export const getWeekContainerStyles = (): CSSProperties => ({
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  overflow: 'hidden'
});

export const getWeekHeaderStyles = (): CSSProperties => ({
  padding: '12px 16px',
  backgroundColor: '#f8fafc',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: '600',
  fontSize: '14px',
  color: '#374151'
});

export const getWeekGridStyles = (showWeekends: boolean): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: showWeekends ? 'repeat(7, 1fr)' : 'repeat(5, 1fr)',
  gap: '1px',
  backgroundColor: '#e5e7eb',
  width: '100%'
});

// Day styles
export const getDayContainerStyles = (isToday: boolean, isPastDay: boolean): CSSProperties => ({
  backgroundColor: isToday ? '#eff6ff' : isPastDay ? '#f9fafb' : 'white',
  padding: '8px',
  minHeight: '120px',
  display: 'flex',
  flexDirection: 'column',
  border: isToday ? '2px solid #3b82f6' : 'none',
  overflow: 'hidden'
});

export const getDayHeaderStyles = (): CSSProperties => ({
  textAlign: 'center',
  marginBottom: '8px',
  paddingBottom: '6px',
  borderBottom: '1px solid #e5e7eb'
});

export const getDayWeekdayStyles = (isToday: boolean): CSSProperties => ({
  fontSize: '11px',
  fontWeight: '600',
  color: isToday ? '#3b82f6' : '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
});

export const getDayNumberStyles = (isToday: boolean): CSSProperties => ({
  fontSize: '16px',
  fontWeight: 'bold',
  color: isToday ? '#3b82f6' : '#1f2937'
});

// Workouts container styles
export const getWorkoutsContainerStyles = (): CSSProperties => ({
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
  color: '#9ca3af',
  fontSize: '11px',
  textAlign: 'center',
  minHeight: '60px'
});

// Add workout button styles
export const getAddWorkoutButtonContainerStyles = (): CSSProperties => ({
  marginTop: '8px'
});

export const getAddWorkoutButtonStyles = (): CSSProperties => ({
  width: '100%',
  padding: '4px 6px',
  backgroundColor: 'transparent',
  border: '1px dashed #9ca3af',
  borderRadius: '4px',
  color: '#6b7280',
  fontSize: '10px',
  cursor: 'pointer',
  transition: 'all 0.2s'
});

// Hover effects
export const getNavigationButtonHoverStyles = (): CSSProperties => ({
  backgroundColor: '#e5e7eb'
});

export const getCurrentButtonHoverStyles = (): CSSProperties => ({
  backgroundColor: '#1d4ed8'
});

export const getAddWorkoutButtonHoverStyles = (): CSSProperties => ({
  borderColor: '#3b82f6',
  color: '#3b82f6',
  backgroundColor: '#f0f9ff'
}); 