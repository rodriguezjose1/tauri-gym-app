import React from 'react';
import { RoutineManager } from '../components/complex';
import { getPageWrapperStyles, getContainerStyles } from '../config/layout';

const RoutinePage = () => {
  return (
    <div style={getPageWrapperStyles()}>
      <div style={getContainerStyles()}>
        <RoutineManager />
      </div>
    </div>
  );
};

export default RoutinePage; 