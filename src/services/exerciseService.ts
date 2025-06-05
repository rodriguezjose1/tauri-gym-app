import { invoke } from "@tauri-apps/api/core";
import { Exercise, PaginatedExerciseResponse } from "../types/dashboard";

const requestNames = {
  createExercise: "create_exercise",
  getExercises: "get_exercises",
  getExercisesPaginated: "get_exercises_paginated",
  searchExercisesPaginated: "search_exercises_paginated",
  updateExercise: "update_exercise",
  deleteExercise: "delete_exercise"
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
} 