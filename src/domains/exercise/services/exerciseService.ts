import { invoke } from "@tauri-apps/api/core";
import { Exercise, PaginatedExerciseResponse } from "../../../shared/types/dashboard";

const requestNames = {
  createExercise: "create_exercise",
  getExercises: "get_exercises",
  getExercisesPaginated: "get_exercises_paginated",
  searchExercisesPaginated: "search_exercises_paginated",
  updateExercise: "update_exercise",
  deleteExercise: "delete_exercise",
  restoreExercise: "restore_exercise",
  getDeletedExercises: "get_deleted_exercises",
  countDeletedExercises: "count_deleted_exercises"
};

export class ExerciseService {
  /**
   * Crea un nuevo ejercicio
   */
  static async createExercise(exercise: Exercise): Promise<void> {
    try {
      await invoke(requestNames.createExercise, { exercise });
    } catch (error) {
      console.error("Error creating exercise:", error);
      
      // Check if it's a unique constraint error for code
      if (typeof error === 'string' && error.includes('UNIQUE constraint failed: exercise.code')) {
        throw new Error('⚠️ Ya existe un ejercicio con ese código. Por favor, usa un código diferente.');
      }
      
      throw new Error(`Error al crear el ejercicio: ${error}`);
    }
  }

  /**
   * Obtiene todos los ejercicios
   */
  static async getExercises(): Promise<Exercise[]> {
    try {
      return await invoke(requestNames.getExercises) as Exercise[];
    } catch (error) {
      console.error("Error getting exercises:", error);
      throw new Error(`Error al obtener los ejercicios: ${error}`);
    }
  }

  /**
   * Obtiene ejercicios paginados
   */
  static async getExercisesPaginated(page: number, pageSize: number): Promise<PaginatedExerciseResponse> {
    try {
      return await invoke(requestNames.getExercisesPaginated, { page, pageSize }) as PaginatedExerciseResponse;
    } catch (error) {
      console.error("Error getting paginated exercises:", error);
      throw new Error(`Error al obtener los ejercicios paginados: ${error}`);
    }
  }

  /**
   * Busca ejercicios paginados por query
   */
  static async searchExercisesPaginated(query: string, page: number, pageSize: number): Promise<PaginatedExerciseResponse> {
    try {
      return await invoke(requestNames.searchExercisesPaginated, { query, page, pageSize }) as PaginatedExerciseResponse;
    } catch (error) {
      console.error("Error searching paginated exercises:", error);
      throw new Error(`Error al buscar ejercicios paginados: ${error}`);
    }
  }

  /**
   * Actualiza un ejercicio existente
   */
  static async updateExercise(exercise: Exercise): Promise<void> {
    try {
      await invoke(requestNames.updateExercise, { exercise });
    } catch (error) {
      console.error("Error updating exercise:", error);
      throw new Error(`Error al actualizar el ejercicio: ${error}`);
    }
  }

  /**
   * Elimina un ejercicio
   */
  static async deleteExercise(id: number): Promise<void> {
    try {
      await invoke(requestNames.deleteExercise, { id });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      throw new Error(`Error al eliminar el ejercicio: ${error}`);
    }
  }

  /**
   * Restaura un ejercicio eliminado lógicamente
   */
  static async restoreExercise(id: number): Promise<void> {
    try {
      await invoke(requestNames.restoreExercise, { id });
    } catch (error) {
      console.error("Error restoring exercise:", error);
      throw new Error(`Error al restaurar el ejercicio: ${error}`);
    }
  }

  /**
   * Obtiene todos los ejercicios eliminados lógicamente
   */
  static async getDeletedExercises(): Promise<Exercise[]> {
    try {
      return await invoke(requestNames.getDeletedExercises);
    } catch (error) {
      console.error("Error getting deleted exercises:", error);
      throw new Error(`Error al obtener ejercicios eliminados: ${error}`);
    }
  }

  /**
   * Cuenta el número de ejercicios eliminados lógicamente
   */
  static async countDeletedExercises(): Promise<number> {
    try {
      return await invoke(requestNames.countDeletedExercises);
    } catch (error) {
      console.error("Error counting deleted exercises:", error);
      throw new Error(`Error al contar ejercicios eliminados: ${error}`);
    }
  }
} 