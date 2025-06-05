// Export all services for easy importing
export { PersonService } from './personService';
export { ExerciseService } from './exerciseService';
export { WorkoutService } from './workoutService';
export { RoutineService } from './routineService';

// Re-export types for convenience
export type {
  Person,
  Exercise,
  WorkoutEntry,
  WorkoutEntryWithDetails,
  WorkoutEntryForm,
  WorkoutSessionForm,
  Routine,
  RoutineWithExercises,
  RoutineExerciseWithDetails,
  RoutineOption
} from '../types/dashboard'; 