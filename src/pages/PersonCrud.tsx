import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Input, Title, Card, Modal } from "../components/ui";
import { getPageWrapperStyles, getContainerStyles } from "../config/layout";

interface Person {
  id: number;
  name: string;
  email: string;
}

export default function PersonCrud() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [form, setForm] = useState({ name: "", email: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    personId: null as number | null,
    personName: ""
  });

  useEffect(() => {
    loadPersons();
  }, []);

  const loadPersons = async () => {
    try {
      setLoading(true);
      const result = await invoke<Person[]>("get_persons");
      setPersons(result);
    } catch (error) {
      console.error("Error loading persons:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    try {
      setLoading(true);
      if (editingId) {
        await invoke("update_person", {
          id: editingId,
          name: form.name.trim(),
          email: form.email.trim(),
        });
      } else {
        await invoke("create_person", {
          name: form.name.trim(),
          email: form.email.trim(),
        });
      }
      
      setForm({ name: "", email: "" });
      setEditingId(null);
      await loadPersons();
    } catch (error) {
      console.error("Error saving person:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (person: Person) => {
    setForm({ name: person.name, email: person.email });
    setEditingId(person.id);
  };

  const handleCancel = () => {
    setForm({ name: "", email: "" });
    setEditingId(null);
  };

  const showDeleteConfirm = (person: Person) => {
    setDeleteConfirm({
      show: true,
      personId: person.id,
      personName: person.name
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
        setLoading(true);
        await invoke("delete_person", { id: deleteConfirm.personId });
        await loadPersons();
        hideDeleteConfirm();
      } catch (error) {
        console.error("Error deleting person:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={getPageWrapperStyles()}>
      <div style={getContainerStyles()}>
        {/* Form */}
        <Card variant="elevated" padding="lg" style={{ marginBottom: '32px' }}>
          <Title level={2} variant="default" style={{ marginBottom: '24px' }}>
            {editingId ? "Editar Persona" : "Agregar Nueva Persona"}
          </Title>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <Input
                label="Nombre Completo"
                placeholder="Ej: Juan Pérez"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                variant="success"
                fullWidth
              />
              
              <Input
                label="Correo Electrónico"
                placeholder="Ej: juan@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                variant="success"
                rightIcon="📧"
                fullWidth
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                type="submit"
                variant="success"
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
            <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
              {persons.length} {persons.length === 1 ? 'persona' : 'personas'} registrada{persons.length === 1 ? '' : 's'}
            </span>
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
              {persons.map((person) => (
                <Card
                  key={person.id}
                  variant={editingId === person.id ? "outlined" : "default"}
                  padding="md"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    border: editingId === person.id ? '2px solid #059669' : undefined
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
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <Title level={4} variant="default" style={{ marginBottom: '4px' }}>
                      {person.name}
                    </Title>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>
                      📧 {person.email}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      onClick={() => handleEdit(person)}
                      variant="secondary"
                      size="sm"
                    >
                      ✏️ Editar
                    </Button>
                    <Button
                      onClick={() => showDeleteConfirm(person)}
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
