import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Input, Title, Card, Modal } from "../components/ui";
import { getPageWrapperStyles, getContainerStyles } from "../config/layout";

interface Exercise {
  id: number;
  name: string;
  code: string;
}

export default function ExerciseCrud() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState({ name: "", code: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalExercises, setTotalExercises] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    exerciseId: null as number | null,
    exerciseName: ""
  });

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadExercises();
    loadAllExercises();
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
      const result = await invoke<{
        exercises: Exercise[];
        total: number;
        has_more: boolean;
      }>("get_exercises_paginated", {
        page,
        limit: ITEMS_PER_PAGE,
      });

      if (append) {
        setExercises(prev => [...prev, ...result.exercises]);
      } else {
        setExercises(result.exercises);
      }
      
      setTotalExercises(result.total);
      setHasMore(result.has_more);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error loading exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllExercises = async () => {
    try {
      const result = await invoke<Exercise[]>("get_all_exercises");
      setAllExercises(result);
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
      if (editingId) {
        await invoke("update_exercise", {
          id: editingId,
          name: form.name.trim(),
          code: form.code.trim(),
        });
      } else {
        await invoke("create_exercise", {
          name: form.name.trim(),
          code: form.code.trim(),
        });
      }
      
      setForm({ name: "", code: "" });
      setEditingId(null);
      await loadExercises(1);
      await loadAllExercises();
    } catch (error) {
      console.error("Error saving exercise:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setForm({ name: exercise.name, code: exercise.code });
    setEditingId(exercise.id);
  };

  const handleCancel = () => {
    setForm({ name: "", code: "" });
    setEditingId(null);
  };

  const showDeleteConfirm = (exercise: Exercise) => {
    setDeleteConfirm({
      show: true,
      exerciseId: exercise.id,
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
        setLoading(true);
        await invoke("delete_exercise", { id: deleteConfirm.exerciseId });
        await loadExercises(1);
        await loadAllExercises();
        hideDeleteConfirm();
      } catch (error) {
        console.error("Error deleting exercise:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div style={getPageWrapperStyles()}>
      <div style={getContainerStyles()}>
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
                {searchTerm.trim() !== "" ? filteredExercises.length : totalExercises} {(searchTerm.trim() !== "" ? filteredExercises.length : totalExercises) === 1 ? 'ejercicio' : 'ejercicios'} {searchTerm.trim() !== "" ? 'encontrado' : 'total'}
              </span>
              {searchTerm.trim() === "" && (
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  Página {currentPage}
                </span>
              )}
            </div>
          </div>

          {/* Search Field */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ position: 'relative', maxWidth: '400px' }}>
              <Input
                placeholder="🔍 Buscar ejercicios por nombre o código..."
                value={searchTerm}
                onChange={handleSearchChange}
                variant="success"
                fullWidth
              />
              {searchTerm.trim() !== "" && (
                <button
                  onClick={clearSearch}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
            {searchTerm.trim() !== "" && (
              <p style={{ 
                fontSize: '14px', 
                color: '#059669', 
                margin: '8px 0 0 0',
                fontWeight: '500'
              }}>
                Mostrando resultados para: "{searchTerm}"
              </p>
            )}
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <p style={{ color: '#6b7280', margin: 0 }}>Cargando ejercicios...</p>
            </div>
          ) : (searchTerm.trim() !== "" ? filteredExercises.length === 0 : exercises.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {searchTerm.trim() !== "" ? '🔍' : '🏋️'}
              </div>
              <Title level={3} variant="secondary" align="center">
                {searchTerm.trim() !== "" ? 'No se encontraron ejercicios' : 'No hay ejercicios registrados'}
              </Title>
              <p style={{ color: '#6b7280', margin: '8px 0 0 0' }}>
                {searchTerm.trim() !== "" 
                  ? `No hay ejercicios que coincidan con "${searchTerm}"`
                  : 'Agrega tu primer ejercicio usando el formulario de arriba'
                }
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredExercises.map((exercise) => (
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
          {!loading && exercises.length > 0 && searchTerm.trim() === "" && (
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