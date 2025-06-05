import React from 'react';
import { RoutineManager } from '../components/complex';
import { getDashboardWrapperStyles, getContainerStyles } from '../config/layout';
import { Title } from '../components/base';

const RoutinePage = () => {
  return (
    <div style={getDashboardWrapperStyles()}>
      <div style={getContainerStyles()}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          height: 'calc(100vh - 100px)'
        }}>
          <RoutineManager />
        </div>
      </div>
    </div>
  );
};

export default RoutinePage; 