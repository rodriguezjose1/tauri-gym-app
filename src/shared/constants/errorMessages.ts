// Error messages for RoutineManager component
export const ROUTINE_ERROR_MESSAGES = {
  // Form validation errors
  REQUIRED_FIELDS: "Por favor completa todos los campos",
  
  // Routine creation errors
  DUPLICATE_CODE: (code: string) => `El código "${code}" ya existe. Por favor usa un código diferente.`,
  CREATE_ROUTINE_FAILED: (error: string) => `Error al crear la rutina: ${error}`,
  UPDATE_ROUTINE_FAILED: (error: string) => `Error al actualizar la rutina: ${error}`,
  
  // Routine operations errors
  DELETE_ROUTINE_FAILED: (error: string) => `Error al eliminar la rutina: ${error}`,
  UPDATE_EXERCISE_FAILED: (error: string) => {
    // Check if it's a group validation error and make it more user-friendly
    if (error.includes('⚠️ No puedes saltar grupos')) {
      return error; // Use the backend message directly as it's already user-friendly
    }
    // For other errors, show a simpler message
    return `Error: ${error}`;
  },
  REMOVE_EXERCISE_FAILED: (error: string) => `Error al eliminar ejercicio: ${error}`,
  ADD_EXERCISE_FAILED: (error: string) => {
    // Check if it's a group validation error and make it more user-friendly
    if (error.includes('⚠️ No puedes saltar grupos')) {
      return error; // Use the backend message directly as it's already user-friendly
    }
    return `Error: ${error}`;
  },
  EXERCISE_ALREADY_IN_ROUTINE: "Este ejercicio ya está en la rutina",
  
  // Data loading errors
  LOAD_ROUTINES_FAILED: "Error al cargar las rutinas",
  SEARCH_ROUTINES_FAILED: "Error al buscar rutinas",
  LOAD_ROUTINE_EXERCISES_FAILED: "Error al cargar los ejercicios de la rutina",
  LOAD_EXERCISES_FAILED: "Error al cargar los ejercicios",
  REORDER_EXERCISES_FAILED: "Error al reordenar los ejercicios",
  
  // Loading states
  LOADING_ROUTINES: "Cargando rutinas...",
  NO_ROUTINES_AVAILABLE: "No hay rutinas disponibles",
  NO_EXERCISES_IN_ROUTINE: "Esta rutina no tiene ejercicios aún.",
  SELECT_ROUTINE_PROMPT: "Selecciona una rutina para ver sus detalles",
  
  // Action prompts
  ADD_EXERCISE_PROMPT: "Haz clic en \"Agregar Ejercicio\" para comenzar.",
  
  // Database constraint errors
  UNIQUE_CONSTRAINT_FAILED: 'UNIQUE constraint failed: routines.code'
} as const;

// UI Labels and text constants
export const ROUTINE_UI_LABELS = {
  // Buttons
  CREATE_BUTTON: "Crear",
  CREATING_BUTTON: "Creando...",
  CANCEL_BUTTON: "Cancelar",
  ADD_BUTTON: "Agregar",
  SAVE_BUTTON: "Guardar",
  EDIT_BUTTON: "Editar",
  DELETE_BUTTON: "Eliminar",
  
  // Modal titles
  NEW_ROUTINE_TITLE: "Nueva Rutina",
  ADD_EXERCISE_TITLE: "Agregar Ejercicio",
  DELETE_ROUTINE_TITLE: "Eliminar Rutina",
  
  // Form labels
  NAME_LABEL: "Nombre",
  CODE_LABEL: "Código",
  NOTES_LABEL: "Notas",
  SETS_LABEL: "Series",
  REPS_LABEL: "Reps",
  WEIGHT_LABEL: "Peso (kg)",
  GROUP_LABEL: "Grupo:",
  
  // Placeholders
  SEARCH_PLACEHOLDER: "🔍 Buscar rutinas...",
  EXERCISE_SEARCH_PLACEHOLDER: "Buscar ejercicio...",
  CODE_PLACEHOLDER: "Ej: PUSH, PULL, LEGS...",
  
  // Group descriptions
  GROUP_DESCRIPTION: "Los ejercicios del mismo grupo se mostrarán juntos en el calendario",
  
  // Success messages
  ROUTINE_CREATED_SUCCESS: "Rutina creada exitosamente",
  ROUTINE_DELETED_SUCCESS: "Rutina eliminada exitosamente",
  EXERCISE_ADDED_SUCCESS: "Ejercicio agregado exitosamente",
  EXERCISE_UPDATED_SUCCESS: "Ejercicio actualizado exitosamente",
  EXERCISE_REMOVED_SUCCESS: "Ejercicio eliminado exitosamente",
  EXERCISES_REORDERED_SUCCESS: "Ejercicios reordenados exitosamente",
  
  // Tooltips
  EDIT_TOOLTIP: "Editar ejercicio",
  REMOVE_TOOLTIP: "Eliminar ejercicio",
  DELETE_TOOLTIP: "Eliminar ejercicio",
  CLOSE_ERROR_TOOLTIP: "Cerrar mensaje de error"
} as const;

// Error messages for Dashboard component
export const DASHBOARD_ERROR_MESSAGES = {
  // Form validation errors
  REQUIRED_FIELDS: "Por favor, completa todos los campos requeridos",
  PERSON_AND_DATE_REQUIRED: "Por favor, selecciona una persona y fecha",
  PERSON_REQUIRED: "Por favor, selecciona una persona primero.",
  EXERCISE_REQUIRED: "Por favor, selecciona un ejercicio",
  DATE_REQUIRED: "Por favor, selecciona una fecha",
  EXERCISES_REQUIRED: "Por favor, agrega al menos un ejercicio",
  INVALID_WORKOUT_ENTRY: "Los datos del ejercicio no son válidos",
  INVALID_WORKOUT_SESSION: "Los datos de la sesión no son válidos",
  NO_VALID_EXERCISES: "No hay ejercicios válidos en la sesión",
  INVALID_ROUTINE_LOAD: "Por favor, selecciona una rutina y fecha válidas",
  
  // Data fetching errors
  FETCH_EXERCISES_FAILED: "Error fetching all exercises:",
  FETCH_EXERCISES_PAGINATION_FAILED: "Error fetching exercises with pagination:",
  FETCH_ROUTINES_FAILED: "Error fetching routines:",
  FETCH_ROUTINE_EXERCISES_FAILED: (routineId: number) => `Error fetching exercises for routine ${routineId}:`,
  FETCH_WORKOUT_DATA_FAILED: "Error fetching workout data:",
  INITIALIZE_DATA_FAILED: "Error initializing data:",
  
  // Workout operations errors
  SAVE_WORKOUT_ENTRY_FAILED: "Error al guardar la entrada de entrenamiento",
  SAVE_SESSION_FAILED: "Error al guardar la sesión de entrenamiento",
  SAVE_WORKOUT_SESSION_FAILED: "Error al guardar la sesión de entrenamiento",
  DELETE_WORKOUT_FAILED: "Error al eliminar el ejercicio",
  DELETE_WORKOUT_ENTRY_FAILED: "Error al eliminar el ejercicio",
  REORDER_EXERCISES_FAILED: "Error al reordenar ejercicios",
  CLEAR_EXERCISES_FAILED: "Error al eliminar los ejercicios",
  
  // Routine operations errors
  LOAD_ROUTINE_FAILED: "Error al cargar la rutina. Por favor, inténtalo de nuevo.",
  APPLY_ROUTINE_FAILED: "Error al aplicar la rutina. Por favor, inténtalo de nuevo.",
  APPLY_ROUTINE_TO_DATE_FAILED: "Error al aplicar la rutina a la fecha. Por favor, inténtalo de nuevo.",
  
  // Console error messages
  CONSOLE_SAVE_WORKOUT_ENTRY: "Error saving workout entry:",
  CONSOLE_SAVE_WORKOUT_SESSION: "Error saving workout session:",
  CONSOLE_DELETE_WORKOUT: "Error deleting workout entry:",
  CONSOLE_REORDER_EXERCISES: "Error reordering exercises:",
  CONSOLE_CLEAR_EXERCISES: "Error clearing exercises:",
  CONSOLE_LOAD_ROUTINE: "Error loading routine:",
  CONSOLE_APPLY_ROUTINE: "Error applying routine:"
} as const;

// Success messages for Dashboard component
export const DASHBOARD_SUCCESS_MESSAGES = {
  WORKOUT_ENTRY_SAVED: "Entrada de entrenamiento agregada correctamente",
  SESSION_SAVED: "Sesión de entrenamiento guardada correctamente",
  WORKOUT_SESSION_SAVED: "Sesión de entrenamiento guardada correctamente",
  WORKOUT_DELETED: "Ejercicio eliminado correctamente",
  WORKOUT_ENTRY_DELETED: "Ejercicio eliminado correctamente",
  EXERCISES_CLEARED: "Todos los ejercicios han sido eliminados correctamente",
  ROUTINE_LOADED: (routineName: string, exerciseCount: number, groupNumber: number) => 
    `Rutina "${routineName}" cargada con ${exerciseCount} ejercicios en el Grupo ${groupNumber}.`,
  ROUTINE_APPLIED: (routineName: string, exerciseCount: number, groupNumber: number) => 
    `Rutina "${routineName}" aplicada exitosamente con ${exerciseCount} ejercicios en el Grupo ${groupNumber}.`,
  ROUTINE_APPLIED_TO_DATE: "Rutina aplicada exitosamente a la fecha seleccionada"
} as const;

// Warning messages for Dashboard component
export const DASHBOARD_WARNING_MESSAGES = {
  NO_VALID_EXERCISES: "No hay ejercicios válidos seleccionados. ¿Quieres eliminar todos los entrenamientos de esta fecha?",
  EXISTING_EXERCISES_FOR_DATE: "Ya existen ejercicios para esta fecha. ¿Quieres continuar?",
  ROUTINE_NO_EXERCISES: "La rutina seleccionada no tiene ejercicios.",
  REPLACE_EXISTING_EXERCISES: "Ya existen ejercicios para esta fecha. ¿Quieres reemplazarlos con la rutina seleccionada?"
} as const;

// UI Labels for Dashboard component
export const DASHBOARD_UI_LABELS = {
  // Modal titles
  DELETE_EXERCISE_TITLE: "Eliminar Ejercicio",
  LOAD_ROUTINE_TITLE: "Cargar Rutina a Fecha Específica",
  ERROR_TITLE: "Error",
  SUCCESS_TITLE: "Éxito",
  WARNING_TITLE: "Advertencia",
  
  // Buttons
  CLEAR_SELECTION_BUTTON: "Limpiar Selección",
  ROUTINE_MANAGER_BUTTON: "Gestor de Rutinas",
  
  // Session storage keys
  SELECTED_PERSON_KEY: "dashboard-selectedPerson"
} as const; 