import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Input, Title, Card, Modal } from "../components/ui";

interface Person {
  id?: number;
  name: string;
  last_name: string;
  phone: string;
}

export default function PersonCrud() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [form, setForm] = useState<Person>({ name: "", last_name: "", phone: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPersons, setTotalPersons] = useState(0);
  const pageSize = 10;
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; personId: number | null; personName: string }>({
    show: false,
    personId: null,
    personName: ""
  });

  const fetchPersons = async (page: number = 1, reset: boolean = true) => {
    setLoading(true);
    try {
      const result = await invoke("get_persons_paginated", { page, pageSize });
      const newPersons = result as Person[];
      
      if (reset) {
        setPersons(newPersons);
        setCurrentPage(1);
      } else {
        setPersons(prev => [...prev, ...newPersons]);
      }
      
      setHasMore(newPersons.length === pageSize);
      setCurrentPage(page);
      
      // Get total count for display (fetch first page to estimate)
      if (page === 1) {
        const allPersons = await invoke("get_persons");
        setTotalPersons((allPersons as Person[]).length);
      }
    } catch (error) {
      console.error("Error fetching persons:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePersons = async () => {
    if (!loading && hasMore) {
      await fetchPersons(currentPage + 1, false);
    }
  };

  const goToPage = async (page: number) => {
    if (page >= 1 && !loading) {
      await fetchPersons(page, true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.last_name.trim() || !form.phone.trim()) {
      alert("Por favor, completa todos los campos");
      return;
    }

    try {
      if (editingId) {
        await invoke("update_person", { person: { ...form, id: editingId } });
        alert("Persona actualizada correctamente");
      } else {
        await invoke("create_person", { person: form });
        alert("Persona agregada correctamente");
      }
      setForm({ name: "", last_name: "", phone: "" });
      setEditingId(null);
      fetchPersons();
    } catch (error) {
      console.error("Error saving person:", error);
      alert("Error al guardar la persona");
    }
  };

  const handleEdit = (p: Person) => {
    setForm({ name: p.name, last_name: p.last_name, phone: p.phone });
    setEditingId(p.id!);
  };

  const handleCancel = () => {
    setForm({ name: "", last_name: "", phone: "" });
    setEditingId(null);
  };

  const showDeleteConfirm = (person: Person) => {
    setDeleteConfirm({
      show: true,
      personId: person.id!,
      personName: `${person.name} ${person.last_name}`
    });
  };

  const hideDeleteConfirm = () => {
    setDeleteConfirm({
      show: false,
      personId: null,
      personName: ""
    });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.personId) {
      try {
        await invoke("delete_person", { id: deleteConfirm.personId });
        alert("Persona eliminada correctamente");
        fetchPersons();
        hideDeleteConfirm();
      } catch (error) {
        console.error("Error deleting person:", error);
        alert("Error al eliminar la persona");
      }
    }
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', width: '100%', padding: '32px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <Title level={1} variant="primary" align="center">
            Gestión de Personas
          </Title>
          <Title level={3} variant="secondary" align="center" weight="normal">
            Administra tu lista de contactos de forma sencilla y eficiente
          </Title>
        </div>

        {/* Form */}
        <Card variant="elevated" padding="lg" style={{ marginBottom: '32px' }}>
          <Title level={2} variant="default" style={{ marginBottom: '24px' }}>
            {editingId ? "Editar Persona" : "Agregar Nueva Persona"}
          </Title>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <Input
                label="Nombre"
                placeholder="Ingresa el nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                variant="primary"
                fullWidth
              />
              
              <Input
                label="Apellido"
                placeholder="Ingresa el apellido"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                variant="primary"
                fullWidth
              />
              
              <Input
                label="Teléfono"
                placeholder="Ingresa el teléfono"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                variant="primary"
                rightIcon="📞"
                fullWidth
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                type="submit"
                variant="primary"
                size="md"
              >
                {editingId ? "Actualizar Persona" : "Agregar Persona"}
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

        {/* Persons List */}
        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <Title level={2} variant="default">
              Lista de Personas
            </Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                {totalPersons} {totalPersons === 1 ? 'persona' : 'personas'} total
              </span>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Página {currentPage}
              </span>
            </div>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <p style={{ color: '#6b7280', margin: 0 }}>Cargando personas...</p>
            </div>
          ) : persons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>👥</div>
              <Title level={3} variant="secondary" align="center">
                No hay personas registradas
              </Title>
              <p style={{ color: '#6b7280', margin: '8px 0 0 0' }}>
                Agrega tu primera persona usando el formulario de arriba
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {persons.map((p) => (
                <Card
                  key={p.id}
                  variant={editingId === p.id ? "outlined" : "default"}
                  padding="md"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    border: editingId === p.id ? '2px solid #2563eb' : undefined
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {p.name.charAt(0)}{p.last_name.charAt(0)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <Title level={4} variant="default" style={{ marginBottom: '4px' }}>
                      {p.name} {p.last_name}
                    </Title>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>
                      📞 {p.phone}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      onClick={() => handleEdit(p)}
                      variant="secondary"
                      size="sm"
                    >
                      ✏️ Editar
                    </Button>
                    <Button
                      onClick={() => showDeleteConfirm(p)}
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
          {!loading && persons.length > 0 && (
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
                  onClick={loadMorePersons}
                  variant="primary"
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
            ¿Estás seguro de que quieres eliminar a <strong>{deleteConfirm.personName}</strong>?
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
