import React, { useState, useEffect } from "react";
import { ExerciseService } from "../services";
import { Exercise } from "../../../shared/types/dashboard";
import { Button, Input, Title, Card, Modal } from "../../../shared/components/base";
import "../../../styles/ExerciseCrud.css";

export default function ExerciseCrud() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState({ name: "", code: "" });
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalExercises, setTotalExercises] = useState(0);
  const [showFormModal, setShowFormModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    exerciseId: null as number | null,
    exerciseName: ""
  });

  const ITEMS_PER_PAGE = 10;

  // Function to generate code from exercise name
  const generateCodeFromName = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remove special characters, keep only letters, numbers, and spaces
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores
  };

  useEffect(() => {
    // Cargar primero todos los ejercicios para obtener el total
    // y luego cargar la primera página
    const initializeData = async () => {
      await loadAllExercises();
      await loadExercises();
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredExercises(exercises);
    } else {
      const filtered = allExercises.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredExercises(filtered);
    }
  }, [searchTerm, exercises, allExercises]);

  const loadExercises = async (page = 1, append = false) => {
    try {
      setLoading(true);
      const response = await ExerciseService.getExercisesPaginated(page, ITEMS_PER_PAGE);
      
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
      console.error("Error loading exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllExercises = async () => {
    try {
      const data = await ExerciseService.getExercises();
      setAllExercises(data);
      // No necesitamos establecer totalExercises aquí ya que se establece en loadExercises
    } catch (error) {
      console.error("Error loading all exercises:", error);
    }
  };

  const loadMoreExercises = () => {
    if (hasMore && !loading) {
      loadExercises(currentPage + 1, true);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && !loading) {
      loadExercises(page, false);
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
        
        // Actualizar la lista local
        setExercises(prev => prev.map(e => 
          e.id === editingExercise.id ? updatedExercise : e
        ));
        
        // Actualizar también allExercises para la búsqueda
        setAllExercises(prev => prev.map(e => 
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
        
        // Recargar la lista para obtener el ID asignado
        await loadExercises();
        await loadAllExercises();
      }
      
      // Limpiar formulario y cerrar modal
      setForm({ name: "", code: "" });
      setShowFormModal(false);
      
    } catch (error) {
      console.error("Error saving exercise:", error);
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
      setDeleteConfirm({ show: false, exerciseId: null, exerciseName: "" });
    } catch (error) {
      console.error("Error deleting exercise:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="exercise-crud-container">
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
                    Administra los ejercicios disponibles para tus rutinas y entrenamientos
                  </p>
                </div>
                <div className="exercise-list-actions">
                  <Button
                    onClick={handleOpenCreateModal}
                    variant="success"
                    size="md"
                  >
                    ➕ Nuevo Ejercicio
                  </Button>
                </div>
              </div>

              <div className="exercise-list-stats">
                <span className="exercise-count">
                  {searchTerm.trim() !== "" ? filteredExercises.length : totalExercises} {(searchTerm.trim() !== "" ? filteredExercises.length : totalExercises) === 1 ? 'ejercicio' : 'ejercicios'} {searchTerm.trim() !== "" ? 'encontrado' : 'total'}
                </span>
                {searchTerm.trim() === "" && (
                  <span className="exercise-page-info">
                    Página {currentPage}
                  </span>
                )}
              </div>

              {/* Search Field */}
              <div className="exercise-crud-search-container">
                <Input
                  label="Buscar ejercicios"
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  variant="primary"
                  leftIcon="🔍"
                  fullWidth
                />
                {searchTerm.trim() !== "" && (
                  <p className="exercise-crud-search-results">
                    Mostrando resultados para: "{searchTerm}"
                  </p>
                )}
              </div>
              
              {loading ? (
                <div className="exercise-loading-state">
                  <div className="exercise-loading-icon">⏳</div>
                  <p className="exercise-loading-text">Cargando ejercicios...</p>
                </div>
              ) : (searchTerm.trim() !== "" ? filteredExercises.length === 0 : exercises.length === 0) ? (
                <div className="exercise-empty-state">
                  <div className="exercise-empty-icon">
                    {searchTerm.trim() !== "" ? '🔍' : '🏋️'}
                  </div>
                  <Title level={3} variant="secondary" align="center">
                    {searchTerm.trim() !== "" ? 'No se encontraron ejercicios' : 'No hay ejercicios registrados'}
                  </Title>
                  <p className="exercise-empty-description">
                    {searchTerm.trim() !== "" 
                      ? `No hay ejercicios que coincidan con "${searchTerm}"`
                      : 'Agrega tu primer ejercicio haciendo clic en "Nuevo Ejercicio"'
                    }
                  </p>
                  {searchTerm.trim() === "" && (
                    <Button
                      onClick={handleOpenCreateModal}
                      variant="success"
                      size="md"
                    >
                      ➕ Crear Primer Ejercicio
                    </Button>
                  )}
                </div>
              ) : (
                <div className="exercise-list-grid">
                  {filteredExercises.map((exercise) => (
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
              )}
            </div>

            {/* Pagination Controls - Always visible at bottom */}
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
              variant="success"
              fullWidth
              required
              disabled={loading}
            />
            
            <Input
              label="Código del Ejercicio"
              placeholder="Ej: PRESS_BANCA"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              variant="success"
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
              variant="success"
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
    </div>
  );
} 