import React, { useState, useEffect } from "react";
import { PersonService, Person } from "../../../services";
import { Button, Input, Title, Card, Modal } from "../../../shared/components/base";
import "../../../styles/PersonCrud.css";

export default function PersonCrud() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ name: "", last_name: "", phone: "" });
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
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
      const data = await PersonService.getPersons();
      setPersons(data);
    } catch (error) {
      console.error("Error loading persons:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.last_name.trim()) return;

    try {
      setLoading(true);
      
      if (editingPerson) {
        // Actualizar persona existente
        const updatedPerson: Person = {
          id: editingPerson.id,
          name: form.name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim()
        };
        
        await PersonService.updatePerson(updatedPerson);
        
        // Actualizar la lista local
        setPersons(prev => prev.map(p => 
          p.id === editingPerson.id ? updatedPerson : p
        ));
        
        setEditingPerson(null);
      } else {
        // Crear nueva persona
        const newPerson: Person = {
          name: form.name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim()
        };
        
        await PersonService.createPerson(newPerson);
        
        // Recargar la lista para obtener el ID asignado
        await loadPersons();
      }
      
      // Limpiar formulario
      setForm({ name: "", last_name: "", phone: "" });
      
    } catch (error) {
      console.error("Error saving person:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (person: Person) => {
    setEditingPerson(person);
    setForm({
      name: person.name,
      last_name: person.last_name,
      phone: person.phone || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingPerson(null);
    setForm({ name: "", last_name: "", phone: "" });
  };

  const handleDelete = (person: Person) => {
    setDeleteConfirm({
      show: true,
      personId: person.id || null,
      personName: `${person.name} ${person.last_name}`
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.personId) return;

    try {
      setLoading(true);
      await PersonService.deletePerson(deleteConfirm.personId);
      setPersons(prev => prev.filter(p => p.id !== deleteConfirm.personId));
      setDeleteConfirm({ show: false, personId: null, personName: "" });
    } catch (error) {
      console.error("Error deleting person:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar personas basado en el término de búsqueda
  const filteredPersons = persons.filter(person => {
    const searchLower = searchTerm.toLowerCase();
    return (
      person.name.toLowerCase().includes(searchLower) ||
      person.last_name.toLowerCase().includes(searchLower) ||
      (person.phone && person.phone.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="person-crud-container">
      <div className="person-crud-wrapper">
        {/* Form */}
        <Card variant="elevated" padding="lg" className="person-form-card">
          <Title level={2} variant="default" className="person-form-title">
            {editingPerson ? "Editar Persona" : "Agregar Nueva Persona"}
          </Title>
          
          <form onSubmit={handleSubmit}>
            <div className="person-form-grid">
              <Input
                label="Nombre Completo"
                placeholder="Ej: Juan Pérez"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                variant="success"
                fullWidth
              />
              
              <Input
                label="Apellido"
                placeholder="Ej: Pérez"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                variant="success"
                fullWidth
              />

              <Input
                label="Teléfono"
                placeholder="Ej: 555-1234"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                variant="success"
                rightIcon="📞"
                fullWidth
              />
            </div>

            <div className="person-form-actions">
              <Button
                type="submit"
                variant="success"
                size="md"
              >
                {editingPerson ? "Actualizar Persona" : "Agregar Persona"}
              </Button>
              
              {editingPerson && (
                <Button
                  type="button"
                  onClick={handleCancelEdit}
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
          <div className="person-list-header">
            <Title level={2} variant="default">
              Lista de Personas
            </Title>
            <span className="person-count">
              {filteredPersons.length} de {persons.length} {persons.length === 1 ? 'persona' : 'personas'}
            </span>
          </div>

          {/* Search Bar */}
          <div className="person-search-container">
            <Input
              label="Buscar personas"
              placeholder="Buscar por nombre, apellido o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="primary"
              leftIcon="🔍"
              fullWidth
            />
          </div>
          
          {loading ? (
            <div className="person-loading-state">
              <div className="person-loading-icon">⏳</div>
              <p className="person-loading-text">Cargando personas...</p>
            </div>
          ) : filteredPersons.length === 0 ? (
            <div className="person-empty-state">
              <div className="person-empty-icon">
                {searchTerm ? '🔍' : '👥'}
              </div>
              <Title level={3} variant="secondary" align="center">
                {searchTerm ? 'No se encontraron personas' : 'No hay personas registradas'}
              </Title>
              <p className="person-empty-description">
                {searchTerm 
                  ? `No hay personas que coincidan con "${searchTerm}"`
                  : 'Agrega tu primera persona usando el formulario de arriba'
                }
              </p>
              {searchTerm && (
                <Button
                  onClick={() => setSearchTerm("")}
                  variant="secondary"
                  size="sm"
                  className="person-clear-search-button"
                >
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          ) : (
            <div className="person-list-grid">
              {filteredPersons.map((person) => (
                <Card
                  key={person.id}
                  variant={editingPerson?.id === person.id ? "outlined" : "default"}
                  padding="md"
                  className={`person-card ${editingPerson?.id === person.id ? 'editing' : ''}`}
                >
                  <div className="person-avatar">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="person-info">
                    <Title level={4} variant="default" className="person-name">
                      {person.name} {person.last_name}
                    </Title>
                    {person.phone && (
                      <p className="person-phone">Tel: {person.phone}</p>
                    )}
                  </div>
                  
                  <div className="person-actions">
                    <Button
                      onClick={() => handleEdit(person)}
                      variant="secondary"
                      size="sm"
                    >
                      ✏️ Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(person)}
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
        onClose={() => setDeleteConfirm({ show: false, personId: null, personName: "" })}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="delete-confirmation-content">
          <div className="delete-confirmation-icon">⚠️</div>
          <p className="delete-confirmation-text">
            ¿Estás seguro de que quieres eliminar a <strong>{deleteConfirm.personName}</strong>?
            <br />
            Esta acción no se puede deshacer.
          </p>
          <div className="delete-confirmation-actions">
            <Button
              onClick={() => setDeleteConfirm({ show: false, personId: null, personName: "" })}
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
