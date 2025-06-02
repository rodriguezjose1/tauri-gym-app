export interface Person {
  id?: number;
  name: string;
  last_name: string;
  phone: string;
}

export interface Exercise {
  id?: number;
  name: string;
  code: string;
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
  order?: number;
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
  order?: number;
}

export interface WorkoutSessionForm {
  exercises: WorkoutEntryForm[];
} 