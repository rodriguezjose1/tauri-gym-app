// Routine Domain Exports
export * from './components';
export * from './hooks';
export * from './services';
export * from './pages';

// Componentes principales
export { RoutineManager } from './components/RoutineManager';

// Componentes especializados
export { SortableRoutineExercise } from './components/SortableRoutineExercise';
export { RoutineList } from './components/RoutineList';
export { RoutineForm } from './components/RoutineForm';
export { ExerciseSearch } from './components/ExerciseSearch';

// Hooks personalizados específicos
export { useRoutineData } from './hooks/useRoutineData';
export { useRoutineExercises } from './hooks/useRoutineExercises';
export { useRoutineUI } from './hooks/useRoutineUI'; 