import { invoke } from "@tauri-apps/api/core";
import { Exercise } from "../types/dashboard";

export class ExerciseService {
  /**
   * Crea un nuevo ejercicio
   */
  static async createExercise(exercise: Exercise): Promise<void> {
    try {
      await invoke("create_exercise", { exercise });
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
      return await invoke("get_exercises") as Exercise[];
    } catch (error) {
      console.error("Error getting exercises:", error);
      throw new Error(`Error al obtener los ejercicios: ${error}`);
    }
  }

  /**
   * Obtiene ejercicios paginados
   */
  static async getExercisesPaginated(page: number, pageSize: number): Promise<Exercise[]> {
    try {
      return await invoke("get_exercises_paginated", { page, pageSize }) as Exercise[];
    } catch (error) {
      console.error("Error getting paginated exercises:", error);
      throw new Error(`Error al obtener los ejercicios paginados: ${error}`);
    }
  }

  /**
   * Busca ejercicios paginados por query
   */
  static async searchExercisesPaginated(query: string, page: number, pageSize: number): Promise<Exercise[]> {
    try {
      return await invoke("search_exercises_paginated", { query, page, pageSize }) as Exercise[];
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
      await invoke("update_exercise", { exercise });
    } catch (error) {
      console.error("Error updating exercise:", error);
      throw new Error(`Error al actualizar el ejercicio: ${error}`);
    }
  }

  /**
   * Elimina un ejercicio por ID
   */
  static async deleteExercise(id: number): Promise<void> {
    try {
      await invoke("delete_exercise", { id });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      throw new Error(`Error al eliminar el ejercicio: ${error}`);
    }
  }
} 