import React, { useState, useEffect } from "react";
import { PersonService, Person } from "../../../services";
import { Button, Input, Title, Card, Modal } from "../../../shared/components/base";
import "../../../styles/PersonCrud.css";

const ITEMS_PER_PAGE = 10;

export default function PersonCrud() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ name: "", last_name: "", phone: "" });
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPersons, setTotalPersons] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    personId: null as number | null,
    personName: ""
  });

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        loadPersons(),
        loadAllPersons()
      ]);
    };

    initializeData();
  }, []);

  const loadPersons = async (page = 1, append = false) => {
    try {
      setLoading(true);
      const response = await PersonService.getPersonsPaginatedResponse(page, ITEMS_PER_PAGE);
      
      if (response.persons.length === 0 && page > 1) {
        setHasMore(false);
        setLoading(false);
        return;
      }
      
      if (append) {
        setPersons(prev => [...prev, ...response.persons]);
      } else {
        setPersons(response.persons);
      }
      
      setCurrentPage(page);
      setTotalPersons(response.total);
      setHasMore(page < response.total_pages);
    } catch (error) {
      console.error("Error loading persons:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllPersons = async () => {
    try {
      const data = await PersonService.getPersons();
      setAllPersons(data);
    } catch (error) {
      console.error("Error loading all persons:", error);
    }
  };

  const loadMorePersons = () => {
    if (hasMore && !loading) {
      loadPersons(currentPage + 1, true);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && !loading) {
      loadPersons(page, false);
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
        await loadAllPersons();
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
      
      // Recargar datos después de eliminar
      await loadPersons();
      await loadAllPersons();
      
      setDeleteConfirm({ show: false, personId: null, personName: "" });
    } catch (error) {
      console.error("Error deleting person:", error);
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

  // Filtrar personas basado en el término de búsqueda
  const filteredPersons = searchTerm.trim() !== "" 
    ? allPersons.filter(person => {
        const searchLower = searchTerm.toLowerCase();
        return (
          person.name.toLowerCase().includes(searchLower) ||
          person.last_name.toLowerCase().includes(searchLower) ||
          (person.phone && person.phone.toLowerCase().includes(searchLower))
        );
      })
    : persons;

  return (
    <div className="person-crud-container">
      <div className="person-crud-wrapper">
        {/* Person Form */}
        <Card variant="elevated" padding="lg">
          <Title level={2} variant="default">
            {editingPerson ? "Editar Persona" : "Agregar Nueva Persona"}
          </Title>
          
          <form onSubmit={handleSubmit} className="person-form">
            <div className="person-form-grid">
              <Input
                label="Nombre"
                placeholder="Ej: Juan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                variant="primary"
                fullWidth
                required
              />
              
              <Input
                label="Apellido"
                placeholder="Ej: Pérez"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                variant="primary"
                fullWidth
                required
              />
              
              <Input
                label="Teléfono"
                placeholder="Ej: +1 234 567 8900"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                variant="primary"
                rightIcon="📞"
                fullWidth
              />
            </div>

            <div className="person-form-actions">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
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
            <div className="person-list-stats">
              <span className="person-count">
                {searchTerm.trim() !== "" ? filteredPersons.length : totalPersons} {(searchTerm.trim() !== "" ? filteredPersons.length : totalPersons) === 1 ? 'persona' : 'personas'} {searchTerm.trim() !== "" ? 'encontrada' : 'total'}
              </span>
              {searchTerm.trim() === "" && (
                <span className="person-page-info">
                  Página {currentPage}
                </span>
              )}
            </div>
          </div>

          {/* Search Field */}
          <div className="person-search-container">
            <Input
              label="Buscar personas"
              placeholder="Buscar por nombre, apellido o teléfono..."
              value={searchTerm}
              onChange={handleSearchChange}
              variant="primary"
              leftIcon="🔍"
              fullWidth
            />
            {searchTerm.trim() !== "" && (
              <p className="person-search-results">
                Mostrando resultados para: "{searchTerm}"
              </p>
            )}
          </div>
          
          {loading ? (
            <div className="person-loading-state">
              <div className="person-loading-icon">⏳</div>
              <p className="person-loading-text">Cargando personas...</p>
            </div>
          ) : (searchTerm.trim() !== "" ? filteredPersons.length === 0 : persons.length === 0) ? (
            <div className="person-empty-state">
              <div className="person-empty-icon">
                {searchTerm.trim() !== "" ? '🔍' : '👥'}
              </div>
              <Title level={3} variant="secondary" align="center">
                {searchTerm.trim() !== "" ? 'No se encontraron personas' : 'No hay personas registradas'}
              </Title>
              <p className="person-empty-description">
                {searchTerm.trim() !== "" 
                  ? `No hay personas que coincidan con "${searchTerm}"`
                  : 'Agrega tu primera persona usando el formulario de arriba'
                }
              </p>
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

          {/* Pagination Controls */}
          {!loading && persons.length > 0 && searchTerm.trim() === "" && (
            <div className="person-pagination">
              <Button
                onClick={() => goToPage(currentPage - 1)}
                variant="secondary"
                size="sm"
                disabled={currentPage === 1 || loading}
              >
                ← Anterior
              </Button>
              
              <span className="person-page-indicator">
                Página {currentPage} {totalPersons > 0 && `de ${Math.ceil(totalPersons / ITEMS_PER_PAGE)}`}
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
