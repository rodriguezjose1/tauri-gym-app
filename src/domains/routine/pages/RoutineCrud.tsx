import React, { useState, useEffect, useCallback } from "react";
import { RoutineService, Routine, ExerciseService, Exercise } from "../../../services";
import { Button, Input, Title, Card, Modal } from "../../../shared/components/base";
import { ExerciseSearch } from "../components/ExerciseSearch";
import "../../../styles/RoutineCrud.css";

const ITEMS_PER_PAGE = 10;

export default function RoutineCrud() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [deletedRoutines, setDeletedRoutines] = useState<Routine[]>([]);
  const [deletedRoutinesCount, setDeletedRoutinesCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRoutines, setTotalRoutines] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    routineId: null as number | null,
    routineName: ""
  });
  const [restoreConfirm, setRestoreConfirm] = useState({
    show: false,
    routineId: null as number | null,
    routineName: ""
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Exercise management state
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedRoutineForExercises, setSelectedRoutineForExercises] = useState<Routine | null>(null);
  const [routineExercises, setRoutineExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState("");

  // Function to generate code from routine name
  const generateCodeFromName = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remove special characters, keep only letters, numbers, and spaces
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores
  };

  // Initial load - only run once
  useEffect(() => {
    if (!isInitialized) {
      loadRoutines();
      loadDeletedRoutinesCount();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'active') {
      loadRoutines();
    } else {
      loadDeletedRoutines();
    }
  }, [activeTab]);

  const loadDeletedRoutinesCount = async () => {
    try {
      const count = await RoutineService.countDeletedRoutines();
      setDeletedRoutinesCount(count);
    } catch (error) {
      console.error("Error loading deleted routines count:", error);
      setDeletedRoutinesCount(0);
    }
  };

  const handleTabChange = (tab: 'active' | 'deleted') => {
    setActiveTab(tab);
    setSearchTerm("");
    setIsSearchActive(false);
  };

  const loadRoutines = async () => {
    setLoading(true);
    try {
      const result = await RoutineService.listRoutines();
      setRoutines(result);
      setTotalRoutines(result.length);
    } catch (error) {
      console.error("Error loading routines:", error);
      setRoutines([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedRoutines = async () => {
    setLoading(true);
    try {
      const result = await RoutineService.getDeletedRoutines();
      setDeletedRoutines(result);
      setDeletedRoutinesCount(result.length);
    } catch (error) {
      console.error("Error loading deleted routines:", error);
      setDeletedRoutines([]);
      setDeletedRoutinesCount(0);
    } finally {
      setLoading(false);
    }
  };

  const searchRoutines = useCallback(async (query: string) => {
    try {
      setLoading(true);
      
      if (query.trim() === "") {
        await loadRoutines();
        return;
      }

      const response = await RoutineService.searchRoutines(query);
      setRoutines(response);
      setTotalRoutines(response.length);
    } catch (error) {
      console.error("Error searching routines:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;

    try {
      setLoading(true);
      
      if (editingRoutine) {
        // Actualizar rutina existente
        const updatedRoutine: Routine = {
          id: editingRoutine.id,
          name: form.name.trim(),
          code: form.code.trim()
        };
        
        await RoutineService.updateRoutine(editingRoutine.id!, form.name.trim(), form.code.trim());
        
        // Actualizar la lista local directamente
        setRoutines(prev => prev.map(r => 
          r.id === editingRoutine.id ? updatedRoutine : r
        ));
        
        setEditingRoutine(null);
      } else {
        // Crear nueva rutina
        const newRoutineId = await RoutineService.createRoutine(form.name.trim(), form.code.trim());
        
        const newRoutine: Routine = {
          id: newRoutineId,
          name: form.name.trim(),
          code: form.code.trim()
        };
        
        setRoutines(prev => [...prev, newRoutine]);
        setTotalRoutines(prev => prev + 1);
      }
      
      // Limpiar formulario y cerrar modal
      setForm({ name: "", code: "" });
      setShowFormModal(false);
      
    } catch (error) {
      console.error("Error saving routine:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (routine: Routine) => {
    setEditingRoutine(routine);
    setForm({
      name: routine.name,
      code: routine.code
    });
    setShowFormModal(true);
  };

  const handleCancelEdit = () => {
    setEditingRoutine(null);
    setForm({ name: "", code: "" });
    setShowFormModal(false);
  };

  const handleOpenCreateModal = () => {
    setEditingRoutine(null);
    setForm({ name: "", code: "" });
    setShowFormModal(true);
  };

  const handleDelete = (routine: Routine) => {
    setDeleteConfirm({
      show: true,
      routineId: routine.id || null,
      routineName: routine.name
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.routineId) return;

    try {
      setLoading(true);
      await RoutineService.deleteRoutine(deleteConfirm.routineId);
      setRoutines(prev => prev.filter(r => r.id !== deleteConfirm.routineId));
      setTotalRoutines(prev => prev - 1);
      setDeletedRoutinesCount(prev => prev + 1);
      setDeleteConfirm({ show: false, routineId: null, routineName: "" });
    } catch (error) {
      console.error("Error deleting routine:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (routine: Routine) => {
    setRestoreConfirm({
      show: true,
      routineId: routine.id || null,
      routineName: routine.name
    });
  };

  const confirmRestore = async () => {
    if (!restoreConfirm.routineId) return;

    try {
      setLoading(true);
      await RoutineService.restoreRoutine(restoreConfirm.routineId);
      setDeletedRoutines(prev => prev.filter(r => r.id !== restoreConfirm.routineId));
      setDeletedRoutinesCount(prev => prev - 1);
      setTotalRoutines(prev => prev + 1);
      setRestoreConfirm({ show: false, routineId: null, routineName: "" });
    } catch (error) {
      console.error("Error restoring routine:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = () => {
    if (searchTerm.trim() !== "") {
      setIsSearchActive(true);
      searchRoutines(searchTerm);
    } else {
      setIsSearchActive(false);
      loadRoutines();
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setIsSearchActive(false);
    loadRoutines();
  };

  // Exercise management functions
  const handleManageExercises = async (routine: Routine) => {
    setSelectedRoutineForExercises(routine);
    setShowExerciseModal(true);
    await loadRoutineExercises(routine.id!);
  };

  const loadRoutineExercises = async (routineId: number) => {
    setLoadingExercises(true);
    try {
      const exercises = await RoutineService.getRoutineExercises(routineId);
      setRoutineExercises(exercises);
    } catch (error) {
      console.error("Error loading routine exercises:", error);
      setRoutineExercises([]);
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleAddExercise = async (exercise: Exercise, groupNumber: number) => {
    if (!selectedRoutineForExercises) return;

    try {
      const nextOrderIndex = routineExercises.length;
      await RoutineService.addExerciseToRoutine(
        selectedRoutineForExercises.id!,
        exercise.id!,
        nextOrderIndex,
        undefined, // sets
        undefined, // reps
        undefined, // weight
        undefined, // notes
        groupNumber
      );
      
      // Reload exercises
      await loadRoutineExercises(selectedRoutineForExercises.id!);
    } catch (error) {
      console.error("Error adding exercise to routine:", error);
    }
  };

  const handleRemoveExercise = async (exerciseId: number) => {
    if (!selectedRoutineForExercises) return;

    try {
      await RoutineService.removeExerciseFromRoutine(
        selectedRoutineForExercises.id!,
        exerciseId
      );
      
      // Reload exercises
      await loadRoutineExercises(selectedRoutineForExercises.id!);
    } catch (error) {
      console.error("Error removing exercise from routine:", error);
    }
  };

  const handleCloseExerciseModal = () => {
    setShowExerciseModal(false);
    setSelectedRoutineForExercises(null);
    setRoutineExercises([]);
    setExerciseSearchTerm("");
    setSearchResults([]);
  };

  const handleSearchExercises = async () => {
    if (!exerciseSearchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await ExerciseService.searchExercisesPaginated(exerciseSearchTerm, 1, 20);
      setSearchResults(response.exercises);
    } catch (error) {
      console.error("Error searching exercises:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const displayedRoutines = routines;

  return (
    <div className="routine-crud-container">
      <div className="routine-crud-wrapper">
        {/* Routines List */}
        <Card variant="elevated" padding="lg">
          <div className="routine-card-content">
            <div className="routine-main-content">
              <div className="routine-list-header">
                <div className="routine-list-title-section">
                  <Title level={2} variant="default">
                    Gestión de Rutinas
                  </Title>
                  <p className="routine-list-description">
                    Administra las rutinas de entrenamiento disponibles en Quality GYM
                  </p>
                </div>
                
                {/* Tab System */}
                <div className="routine-tabs">
                  <button
                    className={`routine-tab ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => handleTabChange('active')}
                  >
                    Rutinas Activas ({totalRoutines})
                  </button>
                  <button
                    className={`routine-tab ${activeTab === 'deleted' ? 'active' : ''}`}
                    onClick={() => handleTabChange('deleted')}
                  >
                    Rutinas Eliminadas ({deletedRoutinesCount})
                  </button>
                </div>
                
                <div className="routine-list-actions">
                  <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="routine-search-form">
                    <Input
                      placeholder="Buscar rutinas..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      variant="primary"
                      leftIcon="🔍"
                      fullWidth
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading}
                      className="routine-search-button"
                    >
                      Buscar
                    </Button>
                    {searchTerm.trim() !== "" && (
                      <Button
                        type="button"
                        onClick={clearSearch}
                        variant="secondary"
                        size="sm"
                        className="routine-clear-search-button"
                      >
                        Limpiar
                      </Button>
                    )}
                  </form>
                </div>
                <div className="routine-list-create-action">
                  <Button
                    onClick={handleOpenCreateModal}
                    variant="primary"
                    size="md"
                  >
                    ➕ Nueva Rutina
                  </Button>
                </div>
              </div>

              <div className="routine-list-stats">
                <span className="routine-count">
                  {activeTab === 'active' 
                    ? (isSearchActive ? displayedRoutines.length : totalRoutines) 
                    : deletedRoutinesCount
                  } {(activeTab === 'active' 
                    ? (isSearchActive ? displayedRoutines.length : totalRoutines) 
                    : deletedRoutinesCount) === 1 ? 'rutina' : 'rutinas'} {activeTab === 'active' 
                    ? (isSearchActive ? 'encontradas' : 'total') 
                    : 'eliminadas'}
                </span>
              </div>
              
              {loading ? (
                <div className="routine-loading-state">
                  <div className="routine-loading-icon">⏳</div>
                  <p className="routine-loading-text">
                    {activeTab === 'active' ? 'Cargando rutinas...' : 'Cargando rutinas eliminadas...'}
                  </p>
                </div>
              ) : activeTab === 'active' ? (
                // Active routines content
                (isSearchActive ? displayedRoutines.length === 0 : routines.length === 0) ? (
                  <div className="routine-empty-state">
                    <div className="routine-empty-icon">
                      {isSearchActive ? '🔍' : '📋'}
                    </div>
                    <Title level={3} variant="secondary" align="center">
                      {isSearchActive ? 'No se encontraron rutinas' : 'No hay rutinas registradas'}
                    </Title>
                    <p className="routine-empty-description">
                      {isSearchActive 
                        ? `No hay rutinas que coincidan con "${searchTerm}"`
                        : 'Agrega tu primera rutina haciendo clic en "Nueva Rutina"'
                      }
                    </p>
                    {!isSearchActive && (
                      <Button
                        onClick={handleOpenCreateModal}
                        variant="primary"
                        size="md"
                      >
                        ➕ Crear Primera Rutina
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="routine-list-grid">
                    {displayedRoutines.map((routine) => (
                      <Card
                        key={routine.id}
                        variant="default"
                        padding="md"
                        className="routine-card"
                      >
                        <div className="routine-avatar">
                          {routine.name.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="routine-info">
                          <Title level={4} variant="default" className="routine-name">
                            {routine.name}
                          </Title>
                          <p className="routine-code">
                            🏷️ {routine.code}
                          </p>
                        </div>
                        
                        <div className="routine-actions">
                          <Button
                            onClick={() => handleManageExercises(routine)}
                            variant="primary"
                            size="sm"
                          >
                            🏋️ Ejercicios
                          </Button>
                          <Button
                            onClick={() => handleEdit(routine)}
                            variant="secondary"
                            size="sm"
                          >
                            ✏️ Editar
                          </Button>
                          <Button
                            onClick={() => handleDelete(routine)}
                            variant="danger"
                            size="sm"
                          >
                            🗑️ Eliminar
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )
              ) : (
                // Deleted routines content
                deletedRoutines.length === 0 ? (
                  <div className="routine-empty-state">
                    <div className="routine-empty-icon">🗑️</div>
                    <Title level={3} variant="secondary" align="center">
                      No hay rutinas eliminadas
                    </Title>
                    <p className="routine-empty-description">
                      Las rutinas eliminadas aparecerán aquí
                    </p>
                  </div>
                ) : (
                  <div className="routine-list-grid">
                    {deletedRoutines.map((routine) => (
                      <Card
                        key={routine.id}
                        variant="default"
                        padding="md"
                        className="routine-card deleted"
                      >
                        <div className="routine-avatar deleted">
                          {routine.name.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="routine-info">
                          <Title level={4} variant="default" className="routine-name">
                            {routine.name}
                          </Title>
                          <p className="routine-code">
                            🏷️ {routine.code}
                          </p>
                          <p className="routine-deleted-status">
                            🗑️ Eliminada
                          </p>
                        </div>
                        
                        <div className="routine-actions">
                          <Button
                            onClick={() => handleRestore(routine)}
                            variant="success"
                            size="sm"
                          >
                            🔄 Restaurar
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={handleCancelEdit}
        title={editingRoutine ? "Editar Rutina" : "Nueva Rutina"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="routine-form">
          <div className="routine-form-grid">
            <Input
              label="Nombre de la Rutina"
              placeholder="Ej: Rutina de Pecho y Tríceps"
              value={form.name}
              onChange={(e) => {
                const newName = e.target.value;
                setForm(prev => ({ 
                  ...prev, 
                  name: newName,
                  // Only auto-generate code if we're creating a new routine (not editing)
                  code: editingRoutine ? prev.code : generateCodeFromName(newName)
                }));
              }}
              variant="primary"
              fullWidth
              required
              disabled={loading}
            />
            
            <Input
              label="Código de la Rutina"
              placeholder="Ej: RUTINA_PECHO_TRICEPS"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              variant="primary"
              rightIcon="🏷️"
              fullWidth
              required
              disabled={loading}
              helperText={editingRoutine ? "Puedes editar el código manualmente" : "Se genera automáticamente desde el nombre"}
            />
          </div>

          <div className="routine-form-actions">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading || !form.name.trim() || !form.code.trim()}
            >
              {loading ? "Guardando..." : (editingRoutine ? "Actualizar Rutina" : "Crear Rutina")}
            </Button>
            
            <Button
              type="button"
              onClick={handleCancelEdit}
              variant="secondary"
              size="md"
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Exercise Management Modal */}
      <Modal
        isOpen={showExerciseModal}
        onClose={handleCloseExerciseModal}
        title={`Gestionar Ejercicios - ${selectedRoutineForExercises?.name || ''}`}
        size="lg"
      >
        <div className="routine-exercise-management">
          <div className="routine-exercise-header">
            <p className="routine-exercise-description">
              Agrega o elimina ejercicios de la rutina "{selectedRoutineForExercises?.name}"
            </p>
          </div>

          <div className="routine-exercise-content">
            <div className="routine-exercise-list">
              <h3>Ejercicios Actuales ({routineExercises.length})</h3>
              {loadingExercises ? (
                <div className="routine-exercise-loading">
                  <div className="routine-exercise-loading-icon">⏳</div>
                  <p>Cargando ejercicios...</p>
                </div>
              ) : routineExercises.length === 0 ? (
                <div className="routine-exercise-empty">
                  <p>No hay ejercicios en esta rutina</p>
                </div>
              ) : (
                <div className="routine-exercise-items">
                  {routineExercises.map((exercise, index) => (
                    <div key={exercise.id} className="routine-exercise-item">
                      <div className="routine-exercise-info">
                        <span className="routine-exercise-name">{exercise.exercise_name}</span>
                        {exercise.group_number && exercise.group_number > 1 && (
                          <span className="routine-exercise-group">Grupo {exercise.group_number}</span>
                        )}
                      </div>
                      <Button
                        onClick={() => handleRemoveExercise(exercise.exercise_id)}
                        variant="danger"
                        size="sm"
                      >
                        🗑️
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="routine-exercise-add">
              <h3>Agregar Ejercicios</h3>
              <div className="routine-exercise-search">
                <div className="routine-exercise-search-filters">
                  <Input
                    placeholder="Buscar ejercicios..."
                    value={exerciseSearchTerm}
                    onChange={(e) => setExerciseSearchTerm(e.target.value)}
                    variant="primary"
                    leftIcon="🔍"
                    fullWidth
                  />
                  <Button
                    onClick={handleSearchExercises}
                    variant="primary"
                    size="sm"
                  >
                    Buscar
                  </Button>
                </div>
                
                <div className="routine-exercise-search-results">
                  {searchLoading ? (
                    <div className="routine-exercise-loading">
                      <div className="routine-exercise-loading-icon">⏳</div>
                      <p>Cargando ejercicios...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="routine-exercise-empty">
                      <p>No se encontraron ejercicios</p>
                    </div>
                  ) : (
                    <div className="routine-exercise-search-list">
                      {searchResults.map((exercise) => (
                        <div key={exercise.id} className="routine-exercise-search-item">
                          <div className="routine-exercise-search-info">
                            <span className="routine-exercise-search-name">{exercise.name}</span>
                            <span className="routine-exercise-search-code">{exercise.code}</span>
                          </div>
                          <Button
                            onClick={() => handleAddExercise(exercise, 1)}
                            variant="primary"
                            size="sm"
                          >
                            ➕ Agregar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, routineId: null, routineName: "" })}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="delete-confirmation-content">
          <div className="delete-confirmation-icon">⚠️</div>
          <p className="delete-confirmation-text">
            ¿Estás seguro de que quieres eliminar la rutina <strong>{deleteConfirm.routineName}</strong>?
            <br />
            Esta acción no se puede deshacer.
          </p>
          <div className="delete-confirmation-actions">
            <Button
              onClick={() => setDeleteConfirm({ show: false, routineId: null, routineName: "" })}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              variant="danger"
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={restoreConfirm.show}
        onClose={() => setRestoreConfirm({ show: false, routineId: null, routineName: "" })}
        title="Confirmar Restauración"
        size="sm"
      >
        <div className="delete-confirmation-content">
          <div className="delete-confirmation-icon">🔄</div>
          <p className="delete-confirmation-text">
            ¿Estás seguro de que quieres restaurar la rutina <strong>{restoreConfirm.routineName}</strong>?
            <br />
            La rutina volverá a estar disponible para su uso.
          </p>
          <div className="delete-confirmation-actions">
            <Button
              onClick={() => setRestoreConfirm({ show: false, routineId: null, routineName: "" })}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmRestore}
              variant="success"
            >
              Restaurar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 