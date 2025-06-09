import { invoke } from "@tauri-apps/api/core";
import { 
  Routine, 
  RoutineWithExercises, 
  RoutineExerciseWithDetails,
  RoutineOption 
} from "../../../shared/types/dashboard";

const requestNames = {
  createRoutine: "create_routine",
  getRoutineById: "get_routine_by_id",
  getRoutineWithExercises: "get_routine_with_exercises",
  updateRoutine: "update_routine",
  deleteRoutine: "delete_routine",
  listRoutines: "list_routines",
  listRoutinesPaginated: "list_routines_paginated",
  searchRoutines: "search_routines",
  searchRoutinesPaginated: "search_routines_paginated",
  addExerciseToRoutine: "add_exercise_to_routine",
  updateRoutineExercise: "update_routine_exercise",
  removeExerciseFromRoutine: "remove_exercise_from_routine",
  getRoutineExercises: "get_routine_exercises",
  reorderRoutineExercises: "reorder_routine_exercises",
  getRoutineOptions: "get_routine_options"
};

export class RoutineService {
  /**
   * Crea una nueva rutina
   */
  static async createRoutine(name: string, code: string): Promise<number> {
    try {
      return await invoke(requestNames.createRoutine, { name, code }) as number;
    } catch (error) {
      console.error("Error creating routine:", error);
      throw new Error(`Error al crear la rutina: ${error}`);
    }
  }

  /**
   * Obtiene una rutina por ID
   */
  static async getRoutineById(id: number): Promise<Routine | null> {
    try {
      return await invoke(requestNames.getRoutineById, { id }) as Routine | null;
    } catch (error) {
      console.error("Error getting routine by id:", error);
      throw new Error(`Error al obtener la rutina: ${error}`);
    }
  }

  /**
   * Obtiene una rutina con sus ejercicios
   */
  static async getRoutineWithExercises(id: number): Promise<RoutineWithExercises | null> {
    try {
      return await invoke(requestNames.getRoutineWithExercises, { id }) as RoutineWithExercises | null;
    } catch (error) {
      console.error("Error getting routine with exercises:", error);
      throw new Error(`Error al obtener la rutina con ejercicios: ${error}`);
    }
  }

  /**
   * Actualiza una rutina
   */
  static async updateRoutine(id: number, name: string, code: string): Promise<void> {
    try {
      await invoke(requestNames.updateRoutine, { id, name, code });
    } catch (error) {
      console.error("Error updating routine:", error);
      throw new Error(`Error al actualizar la rutina: ${error}`);
    }
  }

  /**
   * Elimina una rutina
   */
  static async deleteRoutine(id: number): Promise<void> {
    try {
      await invoke(requestNames.deleteRoutine, { id });
    } catch (error) {
      console.error("Error deleting routine:", error);
      throw new Error(`Error al eliminar la rutina: ${error}`);
    }
  }

  /**
   * Lista todas las rutinas
   */
  static async listRoutines(): Promise<Routine[]> {
    try {
      return await invoke(requestNames.listRoutines) as Routine[];
    } catch (error) {
      console.error("Error listing routines:", error);
      throw new Error(`Error al listar las rutinas: ${error}`);
    }
  }

  /**
   * Lista rutinas paginadas
   */
  static async listRoutinesPaginated(page: number, pageSize: number): Promise<Routine[]> {
    try {
      return await invoke(requestNames.listRoutinesPaginated, { page, pageSize }) as Routine[];
    } catch (error) {
      console.error("Error listing paginated routines:", error);
      throw new Error(`Error al listar las rutinas paginadas: ${error}`);
    }
  }

  /**
   * Busca rutinas por query
   */
  static async searchRoutines(query: string): Promise<Routine[]> {
    try {
      return await invoke(requestNames.searchRoutines, { query }) as Routine[];
    } catch (error) {
      console.error("Error searching routines:", error);
      throw new Error(`Error al buscar rutinas: ${error}`);
    }
  }

  /**
   * Busca rutinas paginadas por query
   */
  static async searchRoutinesPaginated(query: string, page: number, pageSize: number): Promise<Routine[]> {
    try {
      return await invoke(requestNames.searchRoutinesPaginated, { query, page, pageSize }) as Routine[];
    } catch (error) {
      console.error("Error searching paginated routines:", error);
      throw new Error(`Error al buscar rutinas paginadas: ${error}`);
    }
  }

  /**
   * Agrega un ejercicio a una rutina
   */
  static async addExerciseToRoutine(
    routineId: number,
    exerciseId: number,
    orderIndex: number,
    sets?: number,
    reps?: number,
    weight?: number,
    notes?: string,
    groupNumber?: number
  ): Promise<void> {
    try {
      await invoke(requestNames.addExerciseToRoutine, {
        routineId,
        exerciseId,
        orderIndex,
        sets,
        reps,
        weight,
        notes,
        groupNumber,
      });
    } catch (error) {
      console.error("Error adding exercise to routine:", error);
      throw new Error(`Error al agregar ejercicio a la rutina: ${error}`);
    }
  }

  /**
   * Actualiza un ejercicio de rutina
   */
  static async updateRoutineExercise(
    id: number,
    routineId: number,
    exerciseId: number,
    orderIndex: number,
    sets?: number,
    reps?: number,
    weight?: number,
    notes?: string,
    groupNumber?: number
  ): Promise<void> {
    try {
      await invoke(requestNames.updateRoutineExercise, {
        id,
        routineId,
        exerciseId,
        orderIndex,
        sets,
        reps,
        weight,
        notes,
        groupNumber,
      });
    } catch (error) {
      console.error("Error updating routine exercise:", error);
      throw new Error(`Error al actualizar ejercicio de rutina: ${error}`);
    }
  }

  /**
   * Remueve un ejercicio de una rutina
   */
  static async removeExerciseFromRoutine(routineId: number, exerciseId: number): Promise<void> {
    try {
      await invoke(requestNames.removeExerciseFromRoutine, { routineId, exerciseId });
    } catch (error) {
      console.error("Error removing exercise from routine:", error);
      throw new Error(`Error al remover ejercicio de la rutina: ${error}`);
    }
  }

  /**
   * Obtiene los ejercicios de una rutina
   */
  static async getRoutineExercises(routineId: number): Promise<RoutineExerciseWithDetails[]> {
    try {
      return await invoke(requestNames.getRoutineExercises, { routineId }) as RoutineExerciseWithDetails[];
    } catch (error) {
      console.error("Error getting routine exercises:", error);
      throw new Error(`Error al obtener ejercicios de la rutina: ${error}`);
    }
  }

  /**
   * Reordena los ejercicios de una rutina
   */
  static async reorderRoutineExercises(
    routineId: number,
    exerciseOrders: Array<[number, number]>
  ): Promise<void> {
    try {
      await invoke(requestNames.reorderRoutineExercises, { routineId, exerciseOrders });
    } catch (error) {
      console.error("Error reordering routine exercises:", error);
      throw new Error(`Error al reordenar ejercicios de la rutina: ${error}`);
    }
  }

  /**
   * Obtiene rutinas como opciones para selección (con conteo de ejercicios)
   */
  static async getRoutineOptions(): Promise<RoutineOption[]> {
    try {
      const routines = await this.listRoutines();
      const routineOptions: RoutineOption[] = [];

      for (const routine of routines) {
        if (routine.id) {
          const routineWithExercises = await this.getRoutineWithExercises(routine.id);
          routineOptions.push({
            id: routine.id,
            name: routine.name,
            code: routine.code,
            exerciseCount: routineWithExercises?.exercises.length || 0
          });
        }
      }

      return routineOptions;
    } catch (error) {
      console.error("Error getting routine options:", error);
      throw new Error(`Error al obtener opciones de rutinas: ${error}`);
    }
  }
} 