import React from 'react';
import { RoutineManager } from '../components/dashboard';
import { getDashboardWrapperStyles, getContainerStyles } from '../config/layout';

const RoutinePage = () => {
  return (
    <div style={getDashboardWrapperStyles()}>
      <div style={getContainerStyles()}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span>🏋️</span>
          Gestión de Rutinas
        </h1>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          height: 'calc(100vh - 140px)'
        }}>
          <RoutineManager />
        </div>
      </div>
    </div>
  );
};

export default RoutinePage; 