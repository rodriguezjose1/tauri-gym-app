import React, { useState, useEffect, useRef } from "react";
import { ExerciseService, Exercise } from "../../../services";
import type { DeletedExercise } from "../../../shared/types/dashboard";
import { formatDateTimeForDisplay } from "../../../shared/utils/dateUtils";
import { Button, Input, Title, Card, Modal, Pagination, SearchInput } from "../../../shared/components/base";
import { ManagementPageHeader, ManagementToolbar } from "../../../shared/components/management";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import "../../../styles/ExerciseCrud.css";
import { useToast } from '../../../shared/contexts/ToastContext';

const ITEMS_PER_PAGE = 10;

export default function ExerciseCrud() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [deletedExercises, setDeletedExercises] = useState<DeletedExercise[]>([]);
  const [deletedExercisesCount, setDeletedExercisesCount] = useState(0);
  const [deletedPage, setDeletedPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 300);
  const searchQuery = searchTerm.trim() ? debouncedSearch : '';
  const requestId = useRef(0);
  const [form, setForm] = useState({ name: "", code: "" });
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  // Avoid rendering the empty state during the frame before the first effect
  // starts loading the catalog.
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalExercises, setTotalExercises] = useState(0);
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

  const { addNotification } = useToast();

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
      loadDeletedExercisesCount();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Load the selected catalog after the shared debounce.
  useEffect(() => {
    if (activeTab === 'active') {
      void loadExercises(1, searchQuery);
    } else {
      void loadDeletedExercises(1, searchQuery);
    }
  }, [activeTab, searchQuery]);

  const loadDeletedExercisesCount = async () => {
    try {
      const count = await ExerciseService.countDeletedExercises();
      setDeletedExercisesCount(count);
    } catch (error) {
      console.error("Error loading deleted exercises count:", error);
      addNotification('No se pudo obtener la cantidad de ejercicios eliminados.', 'error', 5000);
    }
  };

  const handleTabChange = (tab: 'active' | 'deleted') => {
    if (tab === activeTab) return;
    setLoading(true);
    setActiveTab(tab);
    setSearchTerm("");
  };

  // Reemplazo loadExercises para aceptar page y append
  const loadExercises = async (page = 1, query = searchQuery) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = query ? await ExerciseService.searchExercisesPaginated(query, page, ITEMS_PER_PAGE) : await ExerciseService.getExercisesPaginated(page, ITEMS_PER_PAGE);
      if (id !== requestId.current) return;
      setExercises(result.exercises);
      setCurrentPage(result.page);
      setTotalExercises(result.total);
    } catch (error) {
      console.error("Error loading exercises:", error);
      addNotification('No se pudieron cargar los ejercicios.', 'error', 5000);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const loadDeletedExercises = async (page = 1, query = searchQuery) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = query ? await ExerciseService.searchDeletedExercisesPaginated(query, page, ITEMS_PER_PAGE) : await ExerciseService.getDeletedExercisesPaginated(page, ITEMS_PER_PAGE);
      if (id !== requestId.current) return;
      setDeletedExercises(result.exercises);
      setDeletedExercisesCount(result.total);
      setDeletedPage(result.page);
    } catch (error) {
      console.error("Error loading deleted exercises:", error);
      addNotification('No se pudieron cargar los ejercicios eliminados.', 'error', 5000);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  // Modifico goToPage para usar la nueva función
  const goToPage = (page: number) => {
    if (page >= 1 && !loading) {
      loadExercises(page, searchQuery);
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
        if (searchQuery) {
          await loadExercises(1, searchQuery);
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
      const remaining = Math.max(deletedExercisesCount - 1, 0);
      const targetPage = Math.min(deletedPage, Math.max(Math.ceil(remaining / ITEMS_PER_PAGE), 1));
      await loadDeletedExercises(targetPage, searchQuery);
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

  const clearSearch = () => {
    setSearchTerm("");
  };

  // No need for filteredExercises anymore since we're using backend search
  const displayedExercises = exercises;

  return (
    <div className="exercise-crud-container management-page-frame">
      <div className="exercise-crud-wrapper">
        {/* Exercises List */}
        <Card variant="elevated" padding="md" className="management-page-card">
          <div className="exercise-card-content">
            <div className="exercise-main-content">
              <div className="management-page-controls management-page-controls--sticky">
                <ManagementPageHeader
                  title="Gestión de Ejercicios"
                  action={<Button onClick={handleOpenCreateModal} variant="primary" size="md">➕ Nuevo Ejercicio</Button>}
                />
                <ManagementToolbar
                  tabs={<div className="management-tabs">
                  <button
                    className={`management-tab ${activeTab === 'active' ? 'active' : ''}`}
                    aria-pressed={activeTab === 'active'}
                    onClick={() => handleTabChange('active')}
                  >
                    Ejercicios Activos ({totalExercises})
                  </button>
                  <button
                    className={`management-tab ${activeTab === 'deleted' ? 'active' : ''}`}
                    aria-pressed={activeTab === 'deleted'}
                    onClick={() => handleTabChange('deleted')}
                  >
                    Ejercicios Eliminados ({deletedExercisesCount})
                  </button>
                  </div>}
                  search={<SearchInput
                      ariaLabel="Buscar ejercicios"
                      placeholder="Buscar ejercicios..."
                      value={searchTerm}
                      onChange={setSearchTerm}
                      onClear={clearSearch}
                  />}
                />
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
                exercises.length === 0 ? (
                  <div className="exercise-empty-state">
                    <div className="exercise-empty-icon">
                      {searchQuery ? '🔍' : '🏋️'}
                    </div>
                    <Title level={3} variant="secondary" align="center">
                      {searchQuery ? 'No se encontraron ejercicios' : 'No hay ejercicios registrados'}
                    </Title>
                    <p className="exercise-empty-description">
                      {searchQuery
                        ? `No hay ejercicios que coincidan con "${searchQuery}"`
                        : 'Agrega tu primer ejercicio haciendo clic en "Nuevo Ejercicio"'
                      }
                    </p>
                    {!searchQuery && (
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
                            Eliminado el {formatDateTimeForDisplay(exercise.deleted_at)}
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
            {activeTab === 'active' ? (
              <Pagination className="exercise-pagination" total={totalExercises} page={currentPage} totalPages={Math.ceil(totalExercises / ITEMS_PER_PAGE)} singularLabel="ejercicio" pluralLabel="ejercicios" loading={loading} onPageChange={goToPage} />
            ) : (
              <Pagination className="exercise-pagination" total={deletedExercisesCount} page={deletedPage} totalPages={Math.ceil(deletedExercisesCount / ITEMS_PER_PAGE)} singularLabel="ejercicio eliminado" pluralLabel="ejercicios eliminados" loading={loading} onPageChange={(page) => loadDeletedExercises(page, searchQuery)} />
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
