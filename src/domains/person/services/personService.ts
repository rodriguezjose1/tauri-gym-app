import { invoke } from "@tauri-apps/api/core";
import { Person } from "../../../shared/types/dashboard";

const requestNames = {
  createPerson: "create_person",
  getPersons: "get_persons",
  getPersonsPaginated: "get_persons_paginated",
  searchPersonsPaginated: "search_persons_paginated",
  searchPersons: "search_persons",
  updatePerson: "update_person",
  deletePerson: "delete_person",
};

export class PersonService {
  /**
   * Crea una nueva persona
   */
  static async createPerson(person: Person): Promise<void> {
    try {
      await invoke(requestNames.createPerson, { person });
    } catch (error) {
      console.error("Error creating person:", error);
      throw new Error(`Error al crear la persona: ${error}`);
    }
  }

  /**
   * Obtiene todas las personas
   */
  static async getPersons(): Promise<Person[]> {
    try {
      return await invoke(requestNames.getPersons) as Person[];
    } catch (error) {
      console.error("Error getting persons:", error);
      throw new Error(`Error al obtener las personas: ${error}`);
    }
  }

  /**
   * Obtiene personas paginadas
   */
  static async getPersonsPaginated(page: number, pageSize: number): Promise<Person[]> {
    try {
      return await invoke(requestNames.getPersonsPaginated, { page, pageSize }) as Person[];
    } catch (error) {
      console.error("Error getting paginated persons:", error);
      throw new Error(`Error al obtener las personas paginadas: ${error}`);
    }
  }

  /**
   * Busca personas por query
   */
  static async searchPersons(query: string): Promise<Person[]> {
    try {
      return await invoke(requestNames.searchPersons, { query }) as Person[];
    } catch (error) {
      console.error("Error searching persons:", error);
      throw new Error(`Error al buscar personas: ${error}`);
    }
  }

  /**
   * Busca personas paginadas por query
   */
  static async searchPersonsPaginated(query: string, page: number, pageSize: number): Promise<Person[]> {
    try {
      return await invoke(requestNames.searchPersonsPaginated, { query, page, pageSize }) as Person[];
    } catch (error) {
      console.error("Error searching paginated persons:", error);
      throw new Error(`Error al buscar personas paginadas: ${error}`);
    }
  }

  /**
   * Actualiza una persona existente
   */
  static async updatePerson(person: Person): Promise<void> {
    try {
      await invoke(requestNames.updatePerson, { person });
    } catch (error) {
      console.error("Error updating person:", error);
      throw new Error(`Error al actualizar la persona: ${error}`);
    }
  }

  /**
   * Elimina una persona por ID
   */
  static async deletePerson(id: number): Promise<void> {
    try {
      await invoke(requestNames.deletePerson, { id });
    } catch (error) {
      console.error("Error deleting person:", error);
      throw new Error(`Error al eliminar la persona: ${error}`);
    }
  }
} 