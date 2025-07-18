import React, { useState, useEffect, useCallback } from "react";
import { PersonService, Person } from "../../../services";
import { Button, Input, Title, Card, Modal } from "../../../shared/components/base";
import "../../../styles/PersonCrud.css";

const ITEMS_PER_PAGE = 10;

export default function PersonCrud() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [form, setForm] = useState({ name: "", last_name: "", phone: "" });
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPersons, setTotalPersons] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    personId: null as number | null,
    personName: ""
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initial load - only run once
  useEffect(() => {
    if (!isInitialized) {
      loadPersons();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Remove the debounced search effect - search will only work manually

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
      
      setTotalPersons(response.total);
      setHasMore(response.persons.length === ITEMS_PER_PAGE);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error loading persons:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchPersons = useCallback(async (query: string, page = 1, append = false) => {
    try {
      setLoading(true);
      
      if (query.trim() === "") {
        // Si no hay query, cargar personas normales
        await loadPersons(page, append);
        return;
      }

      const response = await PersonService.searchPersonsPaginatedResponse(query, page, ITEMS_PER_PAGE);
      
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
      
      setTotalPersons(response.total);
      setHasMore(response.persons.length === ITEMS_PER_PAGE);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error searching persons:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMorePersons = () => {
    if (hasMore && !loading) {
      if (isSearchActive) {
        searchPersons(searchTerm, currentPage + 1, true);
      } else {
        loadPersons(currentPage + 1, true);
      }
    }
  };

  const goToPage = (page: number) => {
    if (page > 0 && page !== currentPage) {
      if (isSearchActive) {
        searchPersons(searchTerm, page);
      } else {
        loadPersons(page);
      }
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
          phone: form.phone.trim() || "0"
        };
        
        await PersonService.updatePerson(updatedPerson);
        
        // Actualizar la lista local directamente
        setPersons(prev => prev.map(p => 
          p.id === editingPerson.id ? updatedPerson : p
        ));
        
        setEditingPerson(null);
      } else {
        // Crear nueva persona
        const newPerson: Person = {
          name: form.name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || "0"
        };
        
        await PersonService.createPerson(newPerson);
        
        // Solo recargar si estamos en modo búsqueda
        if (isSearchActive) {
          await searchPersons(searchTerm);
        } else {
          // Para la primera página, solo incrementar el total sin recargar
          setTotalPersons(prev => prev + 1);
          // Si estamos en la primera página y hay espacio, agregar al inicio
          if (currentPage === 1 && persons.length < ITEMS_PER_PAGE) {
            // Simular que la nueva persona se agregó al inicio
            setPersons(prev => [newPerson, ...prev]);
          }
        }
      }
      
      // Limpiar formulario y cerrar modal
      setForm({ name: "", last_name: "", phone: "" });
      setShowFormModal(false);
      
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
      phone: person.phone === "0" ? "" : person.phone
    });
    setShowFormModal(true);
  };

  const handleCancelEdit = () => {
    setEditingPerson(null);
    setForm({ name: "", last_name: "", phone: "" });
    setShowFormModal(false);
  };

  const handleOpenCreateModal = () => {
    setEditingPerson(null);
    setForm({ name: "", last_name: "", phone: "" });
    setShowFormModal(true);
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = () => {
    if (searchTerm.trim() !== "") {
      setIsSearchActive(true);
      searchPersons(searchTerm);
    } else {
      setIsSearchActive(false);
      loadPersons();
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setIsSearchActive(false);
    loadPersons(); // Reload default list when clearing
  };

  // No need for filteredPersons anymore since we're using backend search
  const displayedPersons = persons;

  return (
    <div className="person-crud-container">
      <div className="person-crud-wrapper">
        {/* Persons List */}
        <Card variant="elevated" padding="lg">
          <div className="person-card-content">
            <div className="person-main-content">
              <div className="person-list-header">
                <div className="person-list-title-section">
                  <Title level={2} variant="default">
                    Gestión de Personas
                  </Title>
                  <p className="person-list-description">
                    Administra las personas que participan en los entrenamientos de Quality GYM
                  </p>
                </div>
                <div className="person-list-actions">
                  <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="person-search-form">
                    <Input
                      placeholder="Buscar personas..."
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
                      className="person-search-button"
                    >
                      Buscar
                    </Button>
                    {searchTerm.trim() !== "" && (
                      <Button
                        type="button"
                        onClick={clearSearch}
                        variant="secondary"
                        size="sm"
                        className="person-clear-search-button"
                      >
                        Limpiar
                      </Button>
                    )}
                  </form>
                </div>
                <div className="person-list-create-action">
                  <Button
                    onClick={handleOpenCreateModal}
                    variant="primary"
                    size="md"
                  >
                    ➕ Nueva Persona
                  </Button>
                </div>
              </div>

              <div className="person-list-stats">
                <span className="person-count">
                  {isSearchActive ? displayedPersons.length : totalPersons} {(isSearchActive ? displayedPersons.length : totalPersons) === 1 ? 'persona' : 'personas'} {isSearchActive ? 'encontradas' : 'total'}
                </span>
                {!isSearchActive && (
                  <span className="person-page-info">
                    Página {currentPage}
                  </span>
                )}
              </div>
              
              {loading ? (
                <div className="person-loading-state">
                  <div className="person-loading-icon">⏳</div>
                  <p className="person-loading-text">Cargando personas...</p>
                </div>
              ) : (isSearchActive ? displayedPersons.length === 0 : persons.length === 0) ? (
                <div className="person-empty-state">
                  <div className="person-empty-icon">
                    {isSearchActive ? '🔍' : '👥'}
                  </div>
                  <Title level={3} variant="secondary" align="center">
                    {isSearchActive ? 'No se encontraron personas' : 'No hay personas registradas'}
                  </Title>
                  <p className="person-empty-description">
                    {isSearchActive 
                      ? `No hay personas que coincidan con "${searchTerm}"`
                      : 'Agrega tu primera persona haciendo clic en "Nueva Persona"'
                    }
                  </p>
                  {!isSearchActive && (
                    <Button
                      onClick={handleOpenCreateModal}
                      variant="primary"
                      size="md"
                    >
                      ➕ Crear Primera Persona
                    </Button>
                  )}
                </div>
              ) : (
                <div className="person-list-grid">
                  {displayedPersons.map((person) => (
                    <Card
                      key={person.id}
                      variant="default"
                      padding="md"
                      className="person-card"
                    >
                      <div className="person-avatar">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="person-info">
                        <Title level={4} variant="default" className="person-name">
                          {person.name} {person.last_name}
                        </Title>
                        {person.phone && person.phone !== "0" && (
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
            </div>

            {/* Pagination Controls - Always visible at bottom */}
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
          </div>
        </Card>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={handleCancelEdit}
        title={editingPerson ? "Editar Persona" : "Nueva Persona"}
        size="md"
      >
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
              disabled={loading}
            />
            
            <Input
              label="Apellido"
              placeholder="Ej: Pérez"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              variant="primary"
              fullWidth
              required
              disabled={loading}
            />
            
            <Input
              label="Teléfono"
              placeholder="Ej: +1 234 567 8900"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              variant="primary"
              rightIcon="📞"
              fullWidth
              disabled={loading}
            />
          </div>

          <div className="person-form-actions">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading || !form.name.trim() || !form.last_name.trim()}
            >
              {loading ? "Guardando..." : (editingPerson ? "Actualizar Persona" : "Crear Persona")}
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
