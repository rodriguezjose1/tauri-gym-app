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
  updateExerciseOrder: "update_exercise_order"
};
export class WorkoutService {
  /**
   * Crea una nueva entrada de entrenamiento
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
   * Crea una sesión completa de entrenamiento
   */
  static async createWorkoutSession(workoutEntries: WorkoutEntry[]): Promise<void> {
    try {
      await invoke(requestNames.createWorkoutSession, { workoutEntries: workoutEntries });
    } catch (error) {
      console.error("Error creating workout session:", error);
      throw new Error(`Error al crear la sesión de entrenamiento: ${error}`);
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
      throw new Error(`Error al actualizar la entrada de entrenamiento: ${error}`);
    }
  }

  /**
   * Elimina una entrada de entrenamiento por ID
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
      throw new Error(`Error al reemplazar la sesión de entrenamiento: ${error}`);
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
} 