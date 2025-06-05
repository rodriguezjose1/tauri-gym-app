import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Input, Title, Card, Modal } from "../components/ui";
import { getPageWrapperStyles, getContainerStyles } from "../config/layout";

interface Exercise {
  id?: number;
  name: string;
  code: string;
}

export default function ExerciseCrud() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState<Exercise>({ name: "", code: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalExercises, setTotalExercises] = useState(0);
  const pageSize = 10;
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; exerciseId: number | null; exerciseName: string }>({
    show: false,
    exerciseId: null,
    exerciseName: ""
  });

  const fetchExercises = async (page: number = 1, reset: boolean = true) => {
    setLoading(true);
    try {
      const result = await invoke("get_exercises_paginated", { page, pageSize });
      const newExercises = result as Exercise[];
      
      if (reset) {
        setExercises(newExercises);
        setCurrentPage(1);
      } else {
        setExercises(prev => [...prev, ...newExercises]);
      }
      
      setHasMore(newExercises.length === pageSize);
      setCurrentPage(page);
      
      // Get total count for display (fetch first page to estimate)
      if (page === 1) {
        const allExercises = await invoke("get_exercises");
        setTotalExercises((allExercises as Exercise[]).length);
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreExercises = async () => {
    if (!loading && hasMore) {
      await fetchExercises(currentPage + 1, false);
    }
  };

  const goToPage = async (page: number) => {
    if (page >= 1 && !loading) {
      await fetchExercises(page, true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      alert("Por favor, completa todos los campos");
      return;
    }

    try {
      if (editingId) {
        await invoke("update_exercise", { exercise: { ...form, id: editingId } });
        alert("Ejercicio actualizado correctamente");
      } else {
        await invoke("create_exercise", { exercise: form });
        alert("Ejercicio agregado correctamente");
      }
      setForm({ name: "", code: "" });
      setEditingId(null);
      fetchExercises();
    } catch (error) {
      console.error("Error saving exercise:", error);
      alert("Error al guardar el ejercicio");
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setForm({ name: exercise.name, code: exercise.code });
    setEditingId(exercise.id!);
  };

  const handleCancel = () => {
    setForm({ name: "", code: "" });
    setEditingId(null);
  };

  const showDeleteConfirm = (exercise: Exercise) => {
    setDeleteConfirm({
      show: true,
      exerciseId: exercise.id!,
      exerciseName: exercise.name
    });
  };

  const hideDeleteConfirm = () => {
    setDeleteConfirm({
      show: false,
      exerciseId: null,
      exerciseName: ""
    });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.exerciseId) {
      try {
        await invoke("delete_exercise", { id: deleteConfirm.exerciseId });
        alert("Ejercicio eliminado correctamente");
        fetchExercises();
        hideDeleteConfirm();
      } catch (error) {
        console.error("Error deleting exercise:", error);
        alert("Error al eliminar el ejercicio");
      }
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  return (
    <div style={getPageWrapperStyles()}>
      <div style={getContainerStyles()}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <Title level={1} variant="success" align="center">
            Gestión de Ejercicios
          </Title>
          <Title level={3} variant="secondary" align="center" weight="normal">
            Administra tu biblioteca de ejercicios de forma sencilla y eficiente
          </Title>
        </div>

        {/* Form */}
        <Card variant="elevated" padding="lg" style={{ marginBottom: '32px' }}>
          <Title level={2} variant="default" style={{ marginBottom: '24px' }}>
            {editingId ? "Editar Ejercicio" : "Agregar Nuevo Ejercicio"}
          </Title>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <Input
                label="Nombre del Ejercicio"
                placeholder="Ej: Press de banca"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                variant="success"
                fullWidth
              />
              
              <Input
                label="Código del Ejercicio"
                placeholder="Ej: PRESS_BANCA"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                variant="success"
                rightIcon="🏷️"
                fullWidth
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                type="submit"
                variant="success"
                size="md"
              >
                {editingId ? "Actualizar Ejercicio" : "Agregar Ejercicio"}
              </Button>
              
              {editingId && (
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="secondary"
                  size="md"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Exercises List */}
        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <Title level={2} variant="default">
              Lista de Ejercicios
            </Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                {totalExercises} {totalExercises === 1 ? 'ejercicio' : 'ejercicios'} total
              </span>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Página {currentPage}
              </span>
            </div>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <p style={{ color: '#6b7280', margin: 0 }}>Cargando ejercicios...</p>
            </div>
          ) : exercises.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏋️</div>
              <Title level={3} variant="secondary" align="center">
                No hay ejercicios registrados
              </Title>
              <p style={{ color: '#6b7280', margin: '8px 0 0 0' }}>
                Agrega tu primer ejercicio usando el formulario de arriba
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {exercises.map((exercise) => (
                <Card
                  key={exercise.id}
                  variant={editingId === exercise.id ? "outlined" : "default"}
                  padding="md"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    border: editingId === exercise.id ? '2px solid #059669' : undefined
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#059669',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {exercise.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <Title level={4} variant="default" style={{ marginBottom: '4px' }}>
                      {exercise.name}
                    </Title>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>
                      🏷️ {exercise.code}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      onClick={() => handleEdit(exercise)}
                      variant="secondary"
                      size="sm"
                    >
                      ✏️ Editar
                    </Button>
                    <Button
                      onClick={() => showDeleteConfirm(exercise)}
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

          {/* Pagination Controls */}
          {!loading && exercises.length > 0 && (
            <div style={{ 
              marginTop: '24px', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <Button
                onClick={() => goToPage(currentPage - 1)}
                variant="secondary"
                size="sm"
                disabled={currentPage === 1 || loading}
              >
                ← Anterior
              </Button>
              
              <span style={{ 
                padding: '8px 16px', 
                backgroundColor: '#f3f4f6', 
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Página {currentPage}
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
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.show}
        onClose={hideDeleteConfirm}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <p style={{ marginBottom: '24px', color: '#374151' }}>
            ¿Estás seguro de que quieres eliminar el ejercicio <strong>{deleteConfirm.exerciseName}</strong>?
            <br />
            Esta acción no se puede deshacer.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button
              onClick={hideDeleteConfirm}
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