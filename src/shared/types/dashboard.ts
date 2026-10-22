export interface Person {
  id?: number;
  name: string;
  last_name: string;
  phone: string;
}

export interface DeletedPerson extends Person {
  deleted_at: string;
}

export interface PersonDuplicateCandidate {
  person: Person;
  is_deleted: boolean;
  same_name: boolean;
  same_phone: boolean;
  similar_name: boolean;
}

export interface CreatePersonOutcome {
  created: boolean;
  duplicates: PersonDuplicateCandidate[];
}

export interface Exercise {
  id?: number;
  name: string;
  code: string;
}

export interface DeletedExercise extends Exercise {
  deleted_at: string;
}

export interface WorkoutEntry {
  id?: number;
  person_id: number;
  exercise_id: number;
  date: string;
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
  order_index?: number;
  group_number?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkoutEntryWithDetails extends WorkoutEntry {
  person_name: string;
  person_last_name: string;
  exercise_name: string;
  exercise_code: string;
}

export interface DayData {
  date: string;
  dayName: string;
  dayNumber: number;
  exercises: WorkoutEntryWithDetails[];
}

export interface WeekData {
  weekNumber: number;
  startDate: string;
  endDate: string;
  days: DayData[];
}

export interface WorkoutEntryForm {
  exercise_id: number;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
  order_index?: number;
  group_number?: number;
}

export interface EditWorkoutEntryForm extends WorkoutEntryForm {
  id?: number;
  date: string;
  person_id: number;
}

export interface WorkoutSessionForm {
  exercises: WorkoutEntryForm[];
}

// Routine types
export interface Routine {
  id?: number;
  name: string;
  code: string;
  created_at?: string;
  updated_at?: string;
}

export interface RoutineExercise {
  id?: number;
  routine_id: number;
  exercise_id: number;
  order_index: number;
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
  group_number?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RoutineExerciseWithDetails extends RoutineExercise {
  exercise_name: string;
  exercise_code: string;
}

export interface RoutineWithExercises extends Routine {
  exercises: RoutineExerciseWithDetails[];
}

export interface RoutineForm {
  name: string;
  code: string;
}

export interface RoutineExerciseForm {
  exercise_id: number;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
  group_number?: number;
}

// Routine selection for workouts
export interface RoutineOption {
  id: number;
  name: string;
  code: string;
  exerciseCount: number;
}

export interface PaginatedExerciseResponse {
  exercises: Exercise[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedPersonResponse {
  persons: Person[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedDeletedPersonResponse extends Omit<PaginatedPersonResponse, 'persons'> {
  persons: DeletedPerson[];
}

export interface PaginatedDeletedExerciseResponse extends Omit<PaginatedExerciseResponse, 'exercises'> {
  exercises: DeletedExercise[];
}

export interface PaginatedRoutineResponse {
  routines: Routine[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
