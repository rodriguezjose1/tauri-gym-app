import { invoke } from "@tauri-apps/api/core";
import { WorkoutEntry, WorkoutEntryWithDetails } from "../../../shared/types/dashboard";

const requestNames = {
  createWorkoutEntry: "create_workout_entry",
  createWorkoutSession: "create_workout_session",
  getWorkoutEntriesByPersonAndDateRange: "get_workout_entries_by_person_and_date_range",
  getWorkoutEntriesByPerson: "get_workout_entries_by_person",
  getAllWorkoutEntries: "get_all_workout_entries",
  updateWorkoutEntry: "update_workout_entry",
  deleteWorkoutEntry: "delete_workout_entry",
  replaceWorkoutSession: "replace_workout_session",
  replaceWorkoutSessionGranular: "replace_workout_session_granular",
  updateExerciseOrder: "update_exercise_order",
  createBatch: "create_batch",
  renumberWorkoutGroups: "renumber_workout_groups"
};
export class WorkoutService {
  /**
   * Crea una entrada de entrenamiento individual
   */
  static async createWorkoutEntry(workoutEntry: WorkoutEntry): Promise<void> {
    try {
      await invoke(requestNames.createWorkoutEntry, { workoutEntry: workoutEntry });
    } catch (error) {
      console.error("Error creating workout entry:", error);
      throw new Error(`Error al crear la entrada de entrenamiento: ${error}`);
    }
  }

  /**
   * Obtiene entradas de entrenamiento por persona y rango de fechas
   */
  static async getWorkoutEntriesByPersonAndDateRange(
    personId: number,
    startDate: string,
    endDate: string
  ): Promise<WorkoutEntryWithDetails[]> {
    try {
      return await invoke(requestNames.getWorkoutEntriesByPersonAndDateRange, {
        personId: personId,
        startDate: startDate,
        endDate: endDate
      }) as WorkoutEntryWithDetails[];
    } catch (error) {
      console.error("Error getting workout entries by person and date range:", error);
      throw new Error(`Error al obtener las entradas de entrenamiento: ${error}`);
    }
  }

  /**
   * Obtiene todas las entradas de entrenamiento de una persona
   */
  static async getWorkoutEntriesByPerson(personId: number): Promise<WorkoutEntryWithDetails[]> {
    try {
      return await invoke(requestNames.getWorkoutEntriesByPerson, { personId: personId }) as WorkoutEntryWithDetails[];
    } catch (error) {
      console.error("Error getting workout entries by person:", error);
      throw new Error(`Error al obtener las entradas de entrenamiento de la persona: ${error}`);
    }
  }

  /**
   * Obtiene todas las entradas de entrenamiento
   */
  static async getAllWorkoutEntries(): Promise<WorkoutEntryWithDetails[]> {
    try {
      return await invoke(requestNames.getAllWorkoutEntries) as WorkoutEntryWithDetails[];
    } catch (error) {
      console.error("Error getting all workout entries:", error);
      throw new Error(`Error al obtener todas las entradas de entrenamiento: ${error}`);
    }
  }

  /**
   * Actualiza una entrada de entrenamiento
   */
  static async updateWorkoutEntry(workoutEntry: WorkoutEntry): Promise<void> {
    try {
      await invoke(requestNames.updateWorkoutEntry, { workoutEntry: workoutEntry });
    } catch (error) {
      console.error("Error updating workout entry:", error);
      // Use the backend error message directly
      throw error;
    }
  }

  /**
   * Elimina una entrada de entrenamiento por ID y renumera grupos automáticamente
   */
  static async deleteWorkoutEntry(id: number): Promise<void> {
    try {
      await invoke(requestNames.deleteWorkoutEntry, { id });
    } catch (error) {
      console.error("Error deleting workout entry:", error);
      throw new Error(`Error al eliminar la entrada de entrenamiento: ${error}`);
    }
  }

  /**
   * Renumera los grupos de ejercicios para una persona y fecha específica
   * para mantener numeración consecutiva (1, 2, 3, 4...)
   */
  static async renumberWorkoutGroups(personId: number, date: string): Promise<void> {
    try {
      await invoke(requestNames.renumberWorkoutGroups, { 
        personId, 
        date 
      });
    } catch (error) {
      console.error("Error renumbering workout groups:", error);
      throw new Error(`Error al renumerar grupos: ${error}`);
    }
  }

  /**
   * Reemplaza una sesión completa de entrenamiento
   */
  static async replaceWorkoutSession(
    personId: number,
    date: string,
    workoutEntries: WorkoutEntry[]
  ): Promise<void> {
    try {
      await invoke(requestNames.replaceWorkoutSession, { personId: personId, date, workoutEntries: workoutEntries });
    } catch (error) {
      console.error("Error replacing workout session:", error);
      // Use the backend error message directly
      throw error;
    }
  }

  /**
   * Reemplaza una sesión de entrenamiento de forma granular
   */
  static async replaceWorkoutSessionGranular(
    idsToDelete: number[],
    workoutEntriesToInsert: WorkoutEntry[]
  ): Promise<void> {
    try {
      await invoke(requestNames.replaceWorkoutSessionGranular, {
        idsToDelete: idsToDelete,
        workoutEntriesToInsert: workoutEntriesToInsert
      });
    } catch (error) {
      console.error("Error replacing workout session granular:", error);
      throw new Error(`Error al reemplazar la sesión de entrenamiento: ${error}`);
    }
  }

  /**
   * Actualiza el orden de los ejercicios
   */
  static async updateExerciseOrder(exerciseOrders: Array<[number, number]>): Promise<void> {
    try {
      await invoke(requestNames.updateExerciseOrder, { exerciseOrders: exerciseOrders });
    } catch (error) {
      console.error("Error updating exercise order:", error);
      throw new Error(`Error al actualizar el orden de los ejercicios: ${error}`);
    }
  }

  /**
   * Reordena ejercicios (alias para updateExerciseOrder para compatibilidad)
   */
  static async reorderExercises(exerciseOrders: Array<{ id: number; order: number }>): Promise<void> {
    try {
      // Convertir el formato de entrada al formato esperado por updateExerciseOrder
      const formattedOrders: Array<[number, number]> = exerciseOrders.map(item => [item.id, item.order]);
      await this.updateExerciseOrder(formattedOrders);
    } catch (error) {
      console.error("Error reordering exercises:", error);
      throw new Error(`Error al reordenar los ejercicios: ${error}`);
    }
  }

  /**
   * Guarda una sesión de entrenamiento (merge con ejercicios existentes)
   */
  static async saveWorkoutSessionMerge(
    personId: number,
    date: string,
    exercises: Array<{
      exercise_id: number;
      sets: number;
      reps: number;
      weight: number;
      notes: string;
      order_index?: number;
      group_number?: number;
    }>
  ): Promise<void> {
    try {
      // Primero obtener los ejercicios existentes
      const existingWorkouts = await this.getWorkoutEntriesByPersonAndDateRange(
        personId,
        date,
        date
      );

      // Crear un mapa de ejercicios existentes por exercise_id para búsqueda rápida
      const existingExerciseMap = new Map<number, WorkoutEntryWithDetails>();
      existingWorkouts.forEach(workout => {
        existingExerciseMap.set(workout.exercise_id, workout);
      });

      // Calcular el siguiente order_index y group_number para ejercicios nuevos
      const maxOrderIndex = Math.max(...existingWorkouts.map(w => w.order_index || 0), -1);
      const maxGroupNumber = Math.max(...existingWorkouts.map(w => w.group_number || 1), 0);

      // Separar ejercicios a actualizar y ejercicios nuevos
      const exercisesToUpdate: WorkoutEntry[] = [];
      const exercisesToInsert: WorkoutEntry[] = [];

      exercises.forEach((exercise, index) => {
        const existingExercise = existingExerciseMap.get(exercise.exercise_id);
        
        if (existingExercise) {
          // Ejercicio ya existe, preparar para actualización
          exercisesToUpdate.push({
            id: existingExercise.id,
            person_id: personId,
            exercise_id: exercise.exercise_id,
            date: date,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            notes: exercise.notes,
            order_index: exercise.order_index !== undefined ? exercise.order_index : existingExercise.order_index,
            group_number: exercise.group_number || existingExercise.group_number
          });
        } else {
          // Ejercicio nuevo, preparar para inserción
          exercisesToInsert.push({
            person_id: personId,
            exercise_id: exercise.exercise_id,
            date: date,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            notes: exercise.notes,
            order_index: exercise.order_index !== undefined ? exercise.order_index : maxOrderIndex + 1 + index,
            group_number: exercise.group_number || maxGroupNumber + 1
          });
        }
      });

      // Actualizar ejercicios existentes
      for (const exercise of exercisesToUpdate) {
        await this.updateWorkoutEntry(exercise);
      }

      // Insertar ejercicios nuevos
      if (exercisesToInsert.length > 0) {
        await invoke(requestNames.createBatch, { workoutEntries: exercisesToInsert });
      }

    } catch (error) {
      console.error("Error saving workout session (merge):", error);
      // Use the backend error message directly
      throw error;
    }
  }
} 