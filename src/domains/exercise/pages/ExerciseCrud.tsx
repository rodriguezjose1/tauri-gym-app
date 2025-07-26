import React, { useState, useEffect, useCallback } from "react";
import { ExerciseService, Exercise } from "../../../services";
import { Button, Input, Title, Card, Modal } from "../../../shared/components/base";
import ToastContainer from "../../../shared/components/notifications/ToastContainer";
import "../../../styles/ExerciseCrud.css";
import { useToast } from '../../../shared/contexts/ToastContext';

const ITEMS_PER_PAGE = 10;

export default function ExerciseCrud() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [deletedExercises, setDeletedExercises] = useState<Exercise[]>([]);
  const [deletedExercisesCount, setDeletedExercisesCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalExercises, setTotalExercises] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    exerciseId: null as number | null,
    exerciseName: ""
  });
  const [restoreConfirm, setRestoreConfirm] = useState({
    show: false,
    exerciseId: null as number | null,
    exerciseName: ""
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const { addNotification, notifications, removeNotification } = useToast();

  // Function to generate code from exercise name
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
      loadExercises();
      loadDeletedExercisesCount();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'active') {
      loadExercises();
    } else {
      loadDeletedExercises();
    }
  }, [activeTab]);

  const loadDeletedExercisesCount = async () => {
    try {
      const count = await ExerciseService.countDeletedExercises();
      setDeletedExercisesCount(count);
    } catch (error) {
      console.error("Error loading deleted exercises count:", error);
      setDeletedExercisesCount(0);
    }
  };

  const handleTabChange = (tab: 'active' | 'deleted') => {
    setActiveTab(tab);
    setSearchTerm("");
    setIsSearchActive(false);
  };

  // Reemplazo loadExercises para aceptar page y append
  const loadExercises = async (page = 1, append = false) => {
    setLoading(true);
    try {
      const result = await ExerciseService.getExercisesPaginated(page, ITEMS_PER_PAGE);
      if (append) {
        setExercises(prev => [...prev, ...result.exercises]);
      } else {
        setExercises(result.exercises);
      }
      setCurrentPage(page);
      setTotalExercises(result.total);
      setHasMore(page < result.total_pages);
    } catch (error) {
      console.error("Error loading exercises:", error);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedExercises = async () => {
    setLoading(true);
    try {
      const result = await ExerciseService.getDeletedExercises();
      setDeletedExercises(result);
      setDeletedExercisesCount(result.length);
    } catch (error) {
      console.error("Error loading deleted exercises:", error);
      setDeletedExercises([]);
      setDeletedExercisesCount(0);
    } finally {
      setLoading(false);
    }
  };

  const searchExercises = useCallback(async (query: string, page = 1, append = false) => {
    try {
      setLoading(true);
      
      if (query.trim() === "") {
        // Si no hay query, cargar ejercicios normales
        await loadExercises();
        return;
      }

      const response = await ExerciseService.searchExercisesPaginated(query, page, ITEMS_PER_PAGE);
      
      if (response.exercises.length === 0 && page > 1) {
        setHasMore(false);
        setLoading(false);
        return;
      }
      
      if (append) {
        setExercises(prev => [...prev, ...response.exercises]);
      } else {
        setExercises(response.exercises);
      }
      
      setCurrentPage(page);
      setTotalExercises(response.total);
      setHasMore(page < response.total_pages);
    } catch (error) {
      console.error("Error searching exercises:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Modifico loadMoreExercises para usar la nueva función
  const loadMoreExercises = () => {
    if (hasMore && !loading) {
      if (isSearchActive) {
        searchExercises(searchTerm, currentPage + 1, true);
      } else {
        loadExercises(currentPage + 1, true);
      }
    }
  };

  // Modifico goToPage para usar la nueva función
  const goToPage = (page: number) => {
    if (page >= 1 && !loading) {
      if (isSearchActive) {
        searchExercises(searchTerm, page, false);
      } else {
        loadExercises(page, false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;

    try {
      setLoading(true);
      
      if (editingExercise) {
        // Actualizar ejercicio existente
        const updatedExercise: Exercise = {
          id: editingExercise.id,
          name: form.name.trim(),
          code: form.code.trim()
        };
        
        await ExerciseService.updateExercise(updatedExercise);
        
        // Actualizar la lista local directamente
        setExercises(prev => prev.map(e => 
          e.id === editingExercise.id ? updatedExercise : e
        ));
        
        setEditingExercise(null);
      } else {
        // Crear nuevo ejercicio
        const newExercise: Exercise = {
          name: form.name.trim(),
          code: form.code.trim()
        };
        
        await ExerciseService.createExercise(newExercise);
        
        // Solo recargar si estamos en modo búsqueda
        if (isSearchActive) {
          await searchExercises(searchTerm);
        } else {
          // Para la primera página, solo incrementar el total sin recargar
          setTotalExercises(prev => prev + 1);
          // Si estamos en la primera página y hay espacio, agregar al inicio
          if (currentPage === 1 && exercises.length < ITEMS_PER_PAGE) {
            // Simular que el nuevo ejercicio se agregó al inicio
            setExercises(prev => [newExercise, ...prev]);
          }
        }
      }
      
      // Limpiar formulario y cerrar modal
      setForm({ name: "", code: "" });
      setShowFormModal(false);
      
    } catch (error) {
      console.error("Error saving exercise:", error);
      
      // Extract error message
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = 'Error al guardar el ejercicio';
      }
      
      // Check if it's a unique constraint error for code
      if (errorMessage.includes('⚠️ Ya existe un ejercicio con ese código')) {
        addNotification(errorMessage, 'error', 10000);
      } else {
        addNotification('Error al guardar el ejercicio. Inténtalo de nuevo.', 'error', 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setForm({
      name: exercise.name,
      code: exercise.code
    });
    setShowFormModal(true);
  };

  const handleCancelEdit = () => {
    setEditingExercise(null);
    setForm({ name: "", code: "" });
    setShowFormModal(false);
  };

  const handleOpenCreateModal = () => {
    setEditingExercise(null);
    setForm({ name: "", code: "" });
    setShowFormModal(true);
  };

  const handleDelete = (exercise: Exercise) => {
    setDeleteConfirm({
      show: true,
      exerciseId: exercise.id || null,
      exerciseName: exercise.name
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.exerciseId) return;

    try {
      setLoading(true);
      await ExerciseService.deleteExercise(deleteConfirm.exerciseId);
      setExercises(prev => prev.filter(e => e.id !== deleteConfirm.exerciseId));
      setTotalExercises(prev => prev - 1);
      setDeletedExercisesCount(prev => prev + 1);
      setDeleteConfirm({ show: false, exerciseId: null, exerciseName: "" });
      addNotification(`Ejercicio "${deleteConfirm.exerciseName}" eliminado.`, 'success', 5000);
    } catch (error) {
      console.error("Error deleting exercise:", error);
      addNotification(`Error al eliminar el ejercicio "${deleteConfirm.exerciseName}". Inténtalo de nuevo.`, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (exercise: Exercise) => {
    setRestoreConfirm({
      show: true,
      exerciseId: exercise.id || null,
      exerciseName: exercise.name
    });
  };

  const confirmRestore = async () => {
    if (!restoreConfirm.exerciseId) return;

    try {
      setLoading(true);
      await ExerciseService.restoreExercise(restoreConfirm.exerciseId);
      setDeletedExercises(prev => prev.filter(e => e.id !== restoreConfirm.exerciseId));
      setDeletedExercisesCount(prev => prev - 1);
      setTotalExercises(prev => prev + 1);
      setRestoreConfirm({ show: false, exerciseId: null, exerciseName: "" });
      addNotification(`Ejercicio "${restoreConfirm.exerciseName}" restaurado.`, 'success', 5000);
    } catch (error) {
      console.error("Error restoring exercise:", error);
      addNotification(`Error al restaurar el ejercicio "${restoreConfirm.exerciseName}". Inténtalo de nuevo.`, 'error', 5000);
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
      searchExercises(searchTerm);
    } else {
      setIsSearchActive(false);
      loadExercises();
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setIsSearchActive(false);
    loadExercises(); // Reload default list when clearing
  };

  // No need for filteredExercises anymore since we're using backend search
  const displayedExercises = exercises;

  return (
    <div className="exercise-crud-container">
      <ToastContainer 
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
      <div className="exercise-crud-wrapper">
        {/* Exercises List */}
        <Card variant="elevated" padding="lg">
          <div className="exercise-card-content">
            <div className="exercise-main-content">
              <div className="exercise-list-header">
                <div className="exercise-list-title-section">
                  <Title level={2} variant="default">
                    Gestión de Ejercicios
                  </Title>
                  <p className="exercise-list-description">
                    Administra los ejercicios disponibles para tus rutinas y entrenamientos en Quality GYM
                  </p>
                </div>
                
                {/* Tab System */}
                <div className="exercise-tabs">
                  <button
                    className={`exercise-tab ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => handleTabChange('active')}
                  >
                    Ejercicios Activos ({totalExercises})
                  </button>
                  <button
                    className={`exercise-tab ${activeTab === 'deleted' ? 'active' : ''}`}
                    onClick={() => handleTabChange('deleted')}
                  >
                    Ejercicios Eliminados ({deletedExercisesCount})
                  </button>
                </div>
                
                <div className="exercise-list-actions">
                  <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="exercise-search-form">
                    <Input
                      placeholder="Buscar ejercicios..."
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
                      className="exercise-search-button"
                    >
                      Buscar
                    </Button>
                    {searchTerm.trim() !== "" && (
                      <Button
                        type="button"
                        onClick={clearSearch}
                        variant="secondary"
                        size="sm"
                        className="exercise-clear-search-button"
                      >
                        Limpiar
                      </Button>
                    )}
                  </form>
                </div>
                <div className="exercise-list-create-action">
                  <Button
                    onClick={handleOpenCreateModal}
                    variant="primary"
                    size="md"
                  >
                    ➕ Nuevo Ejercicio
                  </Button>
                </div>
              </div>

              <div className="exercise-list-stats">
                <span className="exercise-count">
                  {activeTab === 'active' 
                    ? (isSearchActive ? displayedExercises.length : totalExercises) 
                    : deletedExercisesCount
                  } {(activeTab === 'active' 
                    ? (isSearchActive ? displayedExercises.length : totalExercises) 
                    : deletedExercisesCount) === 1 ? 'ejercicio' : 'ejercicios'} {activeTab === 'active' 
                    ? (isSearchActive ? 'encontrados' : 'total') 
                    : 'eliminados'}
                </span>
                {activeTab === 'active' && !isSearchActive && (
                  <span className="exercise-page-info">
                    Página {currentPage}
                  </span>
                )}
              </div>
              
              {loading ? (
                <div className="exercise-loading-state">
                  <div className="exercise-loading-icon">⏳</div>
                  <p className="exercise-loading-text">
                    {activeTab === 'active' ? 'Cargando ejercicios...' : 'Cargando ejercicios eliminados...'}
                  </p>
                </div>
              ) : activeTab === 'active' ? (
                // Active exercises content
                (isSearchActive ? displayedExercises.length === 0 : exercises.length === 0) ? (
                  <div className="exercise-empty-state">
                    <div className="exercise-empty-icon">
                      {isSearchActive ? '🔍' : '🏋️'}
                    </div>
                    <Title level={3} variant="secondary" align="center">
                      {isSearchActive ? 'No se encontraron ejercicios' : 'No hay ejercicios registrados'}
                    </Title>
                    <p className="exercise-empty-description">
                      {isSearchActive 
                        ? `No hay ejercicios que coincidan con "${searchTerm}"`
                        : 'Agrega tu primer ejercicio haciendo clic en "Nuevo Ejercicio"'
                      }
                    </p>
                    {!isSearchActive && (
                      <Button
                        onClick={handleOpenCreateModal}
                        variant="primary"
                        size="md"
                      >
                        ➕ Crear Primer Ejercicio
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="exercise-list-grid">
                    {displayedExercises.map((exercise) => (
                      <Card
                        key={exercise.id}
                        variant="default"
                        padding="md"
                        className="exercise-card"
                      >
                        <div className="exercise-avatar">
                          {exercise.name.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="exercise-info">
                          <Title level={4} variant="default" className="exercise-name">
                            {exercise.name}
                          </Title>
                          <p className="exercise-code">
                            🏷️ {exercise.code}
                          </p>
                        </div>
                        
                        <div className="exercise-actions">
                          <Button
                            onClick={() => handleEdit(exercise)}
                            variant="secondary"
                            size="sm"
                          >
                            ✏️ Editar
                          </Button>
                          <Button
                            onClick={() => handleDelete(exercise)}
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
                // Deleted exercises content
                deletedExercises.length === 0 ? (
                  <div className="exercise-empty-state">
                    <div className="exercise-empty-icon">🗑️</div>
                    <Title level={3} variant="secondary" align="center">
                      No hay ejercicios eliminados
                    </Title>
                    <p className="exercise-empty-description">
                      Los ejercicios eliminados aparecerán aquí
                    </p>
                  </div>
                ) : (
                  <div className="exercise-list-grid">
                    {deletedExercises.map((exercise) => (
                      <Card
                        key={exercise.id}
                        variant="default"
                        padding="md"
                        className="exercise-card deleted"
                      >
                        <div className="exercise-avatar deleted">
                          {exercise.name.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="exercise-info">
                          <Title level={4} variant="default" className="exercise-name">
                            {exercise.name}
                          </Title>
                          <p className="exercise-code">
                            🏷️ {exercise.code}
                          </p>
                          <p className="exercise-deleted-status">
                            🗑️ Eliminado
                          </p>
                        </div>
                        
                        <div className="exercise-actions">
                          <Button
                            onClick={() => handleRestore(exercise)}
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

            {/* Pagination Controls - Always visible at bottom */}
            {activeTab === 'active' && (
              <div className="exercise-pagination">
                <Button
                  onClick={() => goToPage(currentPage - 1)}
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1 || loading}
                >
                  ← Anterior
                </Button>
                
                <span className="exercise-page-indicator">
                  Página {currentPage} {totalExercises > 0 && `de ${Math.ceil(totalExercises / ITEMS_PER_PAGE)}`}
                </span>
                
                <Button
                  onClick={() => goToPage(currentPage + 1)}
                  variant="secondary"
                  size="sm"
                  disabled={!hasMore || loading}
                >
                  Siguiente →
                </Button>
                
                {hasMore && (
                  <Button
                    onClick={loadMoreExercises}
                    variant="success"
                    size="sm"
                    disabled={loading}
                  >
                    {loading ? "Cargando..." : "Cargar más"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={handleCancelEdit}
        title={editingExercise ? "Editar Ejercicio" : "Nuevo Ejercicio"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="exercise-form">
          <div className="exercise-form-grid">
            <Input
              label="Nombre del Ejercicio"
              placeholder="Ej: Press de banca"
              value={form.name}
              onChange={(e) => {
                const newName = e.target.value;
                setForm(prev => ({ 
                  ...prev, 
                  name: newName,
                  // Only auto-generate code if we're creating a new exercise (not editing)
                  code: editingExercise ? prev.code : generateCodeFromName(newName)
                }));
              }}
              variant="primary"
              fullWidth
              required
              disabled={loading}
            />
            
            <Input
              label="Código del Ejercicio"
              placeholder="Ej: PRESS_BANCA"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              variant="primary"
              rightIcon="🏷️"
              fullWidth
              required
              disabled={loading}
              helperText={editingExercise ? "Puedes editar el código manualmente" : "Se genera automáticamente desde el nombre"}
            />
          </div>

          <div className="exercise-form-actions">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading || !form.name.trim() || !form.code.trim()}
            >
              {loading ? "Guardando..." : (editingExercise ? "Actualizar Ejercicio" : "Crear Ejercicio")}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, exerciseId: null, exerciseName: "" })}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="delete-confirmation-content">
          <div className="delete-confirmation-icon">⚠️</div>
          <p className="delete-confirmation-text">
            ¿Estás seguro de que quieres eliminar el ejercicio <strong>{deleteConfirm.exerciseName}</strong>?
            <br />
            Esta acción no se puede deshacer.
          </p>
          <div className="delete-confirmation-actions">
            <Button
              onClick={() => setDeleteConfirm({ show: false, exerciseId: null, exerciseName: "" })}
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
        onClose={() => setRestoreConfirm({ show: false, exerciseId: null, exerciseName: "" })}
        title="Confirmar Restauración"
        size="sm"
      >
        <div className="delete-confirmation-content">
          <div className="delete-confirmation-icon">🔄</div>
          <p className="delete-confirmation-text">
            ¿Estás seguro de que quieres restaurar el ejercicio <strong>{restoreConfirm.exerciseName}</strong>?
            <br />
            El ejercicio volverá a estar disponible para su uso.
          </p>
          <div className="delete-confirmation-actions">
            <Button
              onClick={() => setRestoreConfirm({ show: false, exerciseId: null, exerciseName: "" })}
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