// Export all services for easy importing
export { PersonService } from '../domains/person/services/personService';
export { ExerciseService } from '../domains/exercise/services/exerciseService';
export { WorkoutService } from '../domains/workout/services/workoutService';
export { RoutineService } from '../domains/routine/services/routineService';

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
} from '../shared/types/dashboard'; 