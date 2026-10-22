import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { PersonService, Person } from "../../../services";
import type { DeletedPerson, PersonDuplicateCandidate } from "../../../shared/types/dashboard";
import { formatDateTimeForDisplay } from "../../../shared/utils/dateUtils";
import { Button, Input, Title, Card, Modal, ErrorMessage, Pagination, SearchInput, Select } from "../../../shared/components/base";
import { ManagementPageHeader, ManagementToolbar } from "../../../shared/components/management";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import "../../../styles/PersonCrud.css";
import { BillingService, type PaymentStatus, type PaymentStatusCounts } from '../../billing/services/billingService';
import { PersonPaymentProfile } from '../../billing/components/PersonPaymentProfile';

const ITEMS_PER_PAGE = 10;
type PaymentStatusFilter = PaymentStatus | 'all';
const PAYMENT_STATUS_LABELS: Record<PaymentStatusFilter, string> = { all: 'Todas', overdue: 'Vencidos', pending: 'Pendientes', current: 'Al día', no_plan: 'Sin plan determinado' };
const isPaymentStatusFilter = (value: string | null): value is PaymentStatusFilter => Boolean(value && Object.prototype.hasOwnProperty.call(PAYMENT_STATUS_LABELS, value));

export default function PersonCrud() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [persons, setPersons] = useState<Person[]>([]);
  const [deletedPersons, setDeletedPersons] = useState<DeletedPerson[]>([]);
  const [deletedPersonsCount, setDeletedPersonsCount] = useState(0);
  const [deletedPage, setDeletedPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 300);
  const searchQuery = searchTerm.trim() ? debouncedSearch : '';
  const requestId = useRef(0);
  const countsRequestId = useRef(0);
  const [form, setForm] = useState({ name: "", last_name: "", phone: "" });
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  // Start in a loading state so the empty state is not painted before the
  // initial request (effects run after the first render).
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPersons, setTotalPersons] = useState(0);
  const [showFormModal, setShowFormModal] = useState(false);
  const [duplicateReview, setDuplicateReview] = useState<{
    person: Person;
    candidates: PersonDuplicateCandidate[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    personId: null as number | null,
    personName: ""
  });
  const [restoreConfirm, setRestoreConfirm] = useState({
    show: false,
    personId: null as number | null,
    personName: ""
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [paymentStatuses, setPaymentStatuses] = useState<Record<number, PaymentStatus>>({});
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>(() => {
    const value = new URLSearchParams(window.location.search).get('paymentStatus');
    return isPaymentStatusFilter(value) ? value : 'all';
  });
  const selectedPaymentPeriod = searchParams.get('period') || undefined;
  const [statusCounts, setStatusCounts] = useState<PaymentStatusCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState(false);
  const [profilePerson, setProfilePerson] = useState<Person | null>(null);
  const requestedPersonId = searchParams.get('personId');

  const loadStatusCounts = async () => {
    const id = ++countsRequestId.current;
    setCountsLoading(true);
    setCountsError(false);
    try {
      const counts = await BillingService.paymentStatusCounts();
      if (id === countsRequestId.current) setStatusCounts(counts);
    } catch (countError) {
      console.error('Error loading payment status counts:', countError);
      if (id === countsRequestId.current) { setStatusCounts(null); setCountsError(true); }
    } finally {
      if (id === countsRequestId.current) setCountsLoading(false);
    }
  };

  // Initial load - only run once
  useEffect(() => {
    if (!isInitialized) {
      loadDeletedPersonsCount();
      void loadStatusCounts();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Load the selected catalog after the shared debounce.
  useEffect(() => {
    if (activeTab === 'active') {
      if (requestedPersonId) void loadRequestedPerson(requestedPersonId);
      else void loadPersons(1, searchQuery);
    } else {
      void loadDeletedPersons(1, searchQuery);
    }
  }, [activeTab, searchQuery, paymentStatusFilter, selectedPaymentPeriod, requestedPersonId]);

  useEffect(() => {
    const requested = searchParams.get('paymentStatus');
    const nextFilter = isPaymentStatusFilter(requested) ? requested : 'all';
    setPaymentStatusFilter(nextFilter);
    if (requested) setActiveTab('active');
    setCurrentPage(1);
  }, [searchParams]);

  const closeProfile = () => {
    setProfilePerson(null);
  };

  const clearPersonFilter = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('personId');
    setSearchParams(nextParams, { replace: true });
  };

  const loadDeletedPersonsCount = async () => {
    try {
      const count = await PersonService.countDeletedPeople();
      setDeletedPersonsCount(count);
    } catch (error) {
      console.error("Error loading deleted persons count:", error);
      setError("No se pudo obtener la cantidad de personas eliminadas.");
    }
  };

  const handleTabChange = (tab: 'active' | 'deleted') => {
    if (tab === activeTab) return;
    setLoading(true);
    setActiveTab(tab);
    setSearchTerm("");
  };

  const handlePaymentStatusChange = (value: string | number) => {
    const nextFilter = isPaymentStatusFilter(String(value)) ? String(value) as PaymentStatusFilter : 'all';
    setPaymentStatusFilter(nextFilter);
    setCurrentPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (nextFilter === 'all') {
      nextParams.delete('paymentStatus');
      nextParams.delete('period');
    }
    else nextParams.set('paymentStatus', nextFilter);
    setSearchParams(nextParams, { replace: true });
  };

  const loadDeletedPersons = async (page = 1, query = searchQuery) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = query
        ? await PersonService.searchDeletedPeoplePaginated(query, page, ITEMS_PER_PAGE)
        : await PersonService.getDeletedPeoplePaginated(page, ITEMS_PER_PAGE);
      if (id !== requestId.current) return;
      setDeletedPersons(result.persons);
      setDeletedPersonsCount(result.total);
      setDeletedPage(result.page);
    } catch (error) {
      console.error("Error loading deleted persons:", error);
      setError("No se pudieron cargar las personas eliminadas.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  // Remove the debounced search effect - search will only work manually

  const loadPersons = async (page = 1, query = searchQuery) => {
    const id = ++requestId.current;
    try {
      setLoading(true);
      setError(null);
      const response = await BillingService.personsPaymentPage(query, paymentStatusFilter, page, ITEMS_PER_PAGE, selectedPaymentPeriod);
      if (id !== requestId.current) return;
      
      setPersons(response.persons);
      setPaymentStatuses(Object.fromEntries(response.persons.flatMap((person) => person.id ? [[person.id, person.payment_status] as const] : [])));
      
      setTotalPersons(response.total);
      setCurrentPage(response.page);
    } catch (error) {
      console.error("Error loading persons:", error);
      setError("No se pudieron cargar las personas.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const loadRequestedPerson = async (rawId: string) => {
    const id = ++requestId.current;
    const personId = Number(rawId);
    setLoading(true);
    setError(null);
    if (!Number.isInteger(personId) || personId < 1) {
      setPersons([]);
      setTotalPersons(0);
      setError('La persona solicitada no es válida.');
      setLoading(false);
      return;
    }
    try {
      const person = await PersonService.getPersonById(personId);
      if (id !== requestId.current) return;
      if (!person) {
        setPersons([]);
        setTotalPersons(0);
        setError('No se encontró la persona solicitada.');
        return;
      }
      const statuses = await BillingService.personStatuses([personId]);
      if (id !== requestId.current) return;
      setPersons([person]);
      setPaymentStatuses(Object.fromEntries(statuses.map(item => [item.person_id, item.status])));
      setTotalPersons(1);
      setCurrentPage(1);
      setActiveTab('active');
    } catch (loadError) {
      console.error('Error loading requested person:', loadError);
      if (id === requestId.current) setError('No se pudo cargar la persona solicitada.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const goToPage = (page: number) => {
    if (page > 0 && page !== currentPage) {
      loadPersons(page, searchQuery);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.last_name.trim()) return;

    try {
      setLoading(true);
      setError(null);
      
      if (editingPerson) {
        // Actualizar persona existente
        const updatedPerson: Person = {
          id: editingPerson.id,
          name: form.name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || "0"
        };
        
        await PersonService.updatePerson(updatedPerson);
        setEditingPerson(null);
      } else {
        // Crear nueva persona
        const newPerson: Person = {
          name: form.name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || "0"
        };
        
        const outcome = await PersonService.createPersonChecked(newPerson);
        if (!outcome.created) {
          setDuplicateReview({ person: newPerson, candidates: outcome.duplicates });
          return;
        }
      }
      await loadPersons(editingPerson ? currentPage : 1, searchQuery);
      
      // Limpiar formulario y cerrar modal
      setForm({ name: "", last_name: "", phone: "" });
      setShowFormModal(false);
      await loadStatusCounts();
      
    } catch (error) {
      console.error("Error saving person:", error);
      setError(editingPerson
        ? "No se pudo actualizar la persona. Los datos anteriores se conservaron."
        : "No se pudo crear la persona.");
    } finally {
      setLoading(false);
    }
  };

  const finishPersonCreation = async () => {
    await loadPersons(1, searchQuery);
    setForm({ name: "", last_name: "", phone: "" });
    setDuplicateReview(null);
    setShowFormModal(false);
    await loadStatusCounts();
  };

  const createDuplicateAnyway = async () => {
    if (!duplicateReview || loading) return;
    try {
      setLoading(true);
      setError(null);
      await PersonService.createPersonChecked(duplicateReview.person, true);
      await finishPersonCreation();
    } catch (createError) {
      console.error("Error creating confirmed duplicate:", createError);
      setError("No se pudo crear la persona.");
    } finally {
      setLoading(false);
    }
  };

  const reuseDuplicate = async (candidate: PersonDuplicateCandidate) => {
    const personId = candidate.person.id;
    if (!personId || loading) return;
    try {
      setLoading(true);
      setError(null);
      if (candidate.is_deleted) await PersonService.restorePerson(personId);
      setDuplicateReview(null);
      setShowFormModal(false);
      setForm({ name: "", last_name: "", phone: "" });
      setActiveTab('active');
      setSearchTerm("");
      const nextParams = new URLSearchParams();
      nextParams.set('personId', String(personId));
      setSearchParams(nextParams, { replace: true });
      await loadDeletedPersonsCount();
      await loadStatusCounts();
    } catch (reuseError) {
      console.error("Error reusing duplicate person:", reuseError);
      setError(candidate.is_deleted
        ? "No se pudo restaurar la persona existente."
        : "No se pudo abrir la persona existente.");
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
    setDuplicateReview(null);
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
      setError(null);
      await PersonService.deletePerson(deleteConfirm.personId);
      setPersons(prev => prev.filter(p => p.id !== deleteConfirm.personId));
      setTotalPersons(prev => prev - 1);
      setDeletedPersonsCount(prev => prev + 1);
      await loadStatusCounts();
      setDeleteConfirm({ show: false, personId: null, personName: "" });
    } catch (error) {
      console.error("Error deleting person:", error);
      setError("No se pudo eliminar la persona. La lista no fue modificada.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (person: Person) => {
    setRestoreConfirm({
      show: true,
      personId: person.id || null,
      personName: `${person.name} ${person.last_name}`
    });
  };

  const confirmRestore = async () => {
    if (!restoreConfirm.personId) return;

    try {
      setLoading(true);
      setError(null);
      await PersonService.restorePerson(restoreConfirm.personId);
      const remaining = Math.max(deletedPersonsCount - 1, 0);
      const targetPage = Math.min(deletedPage, Math.max(Math.ceil(remaining / ITEMS_PER_PAGE), 1));
      await loadDeletedPersons(targetPage);
      setTotalPersons(prev => prev + 1);
      await loadStatusCounts();
      setRestoreConfirm({ show: false, personId: null, personName: "" });
    } catch (error) {
      console.error("Error restoring person:", error);
      setError("No se pudo restaurar la persona. La lista no fue modificada.");
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  // No need for filteredPersons anymore since we're using backend search
  const displayedPersons = persons;

  return (
    <div className="person-crud-container management-page-frame">
      <div className="person-crud-wrapper">
        {/* Persons List */}
        <Card variant="elevated" padding="md" className="management-page-card">
          <div className="person-card-content">
            <div className="person-main-content">
              <div className="management-page-controls management-page-controls--sticky">
                <ManagementPageHeader
                  title="Gestión de Personas"
                  action={<Button onClick={handleOpenCreateModal} variant="primary" size="md">Nueva Persona</Button>}
                />
                <ManagementToolbar
                  tabs={<div className="management-tabs">
                  <button
                    className={`management-tab ${activeTab === 'active' ? 'active' : ''}`}
                    aria-pressed={activeTab === 'active'}
                    onClick={() => handleTabChange('active')}
                  >
                    Personas Activas ({statusCounts?.all ?? totalPersons})
                  </button>
                  <button
                    className={`management-tab ${activeTab === 'deleted' ? 'active' : ''}`}
                    aria-pressed={activeTab === 'deleted'}
                    onClick={() => handleTabChange('deleted')}
                  >
                    Personas Eliminadas ({deletedPersonsCount})
                  </button>
                  </div>}
                  filter={activeTab === 'active' ? <div className={`person-payment-filter ${paymentStatusFilter !== 'all' ? 'active' : ''}`}>
                    <Select
                      options={(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatusFilter[]).map((status) => ({
                        value: status,
                        label: `${PAYMENT_STATUS_LABELS[status]}${statusCounts ? ` (${statusCounts[status]})` : countsLoading ? ' (…)' : ''}`,
                      }))}
                      value={paymentStatusFilter}
                      onChange={handlePaymentStatusChange}
                      placeholder="Estado de pago"
                      size="sm"
                      disabled={countsLoading}
                    />
                    {countsError && <span className="person-payment-filter-error" title="No se pudieron cargar los conteos">!</span>}
                  </div> : undefined}
                  search={<SearchInput
                      ariaLabel="Buscar personas"
                      placeholder="Buscar personas..."
                      value={searchTerm}
                      onChange={setSearchTerm}
                      onClear={clearSearch}
                  />}
                />
              </div>

              {error && (
                <div role="alert">
                  <ErrorMessage message={error} onDismiss={() => setError(null)} />
                </div>
              )}

              {requestedPersonId && activeTab === 'active' && (
                <div className="person-direct-filter">
                  <span>Mostrando únicamente la persona seleccionada.</span>
                  <Button variant="secondary" size="sm" onClick={clearPersonFilter}>Ver todas las personas</Button>
                </div>
              )}

              {loading ? (
                <div className="person-loading-state">
                  <div className="person-loading-icon">⏳</div>
                  <p className="person-loading-text">
                    {activeTab === 'active' ? 'Cargando personas...' : 'Cargando personas eliminadas...'}
                  </p>
                </div>
              ) : activeTab === 'active' ? (
                // Active people content
                persons.length === 0 ? (
                  <div className="person-empty-state">
                    <div className="person-empty-icon">
                      {searchQuery || paymentStatusFilter !== 'all' ? '🔍' : '👥'}
                    </div>
                    <Title level={3} variant="secondary" align="center">
                      {searchQuery || paymentStatusFilter !== 'all' ? 'No se encontraron personas' : 'No hay personas registradas'}
                    </Title>
                    <p className="person-empty-description">
                      {searchQuery || paymentStatusFilter !== 'all'
                        ? `No hay personas que coincidan con los filtros seleccionados${searchQuery ? ` y "${searchQuery}"` : ''}`
                        : 'Agrega tu primera persona haciendo clic en "Nueva Persona"'
                      }
                    </p>
                    {!searchQuery && paymentStatusFilter === 'all' && (
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
                          <span className={`person-payment-status ${paymentStatuses[person.id!] ?? 'no_plan'}`}>
                            {{ overdue: 'Vencido', pending: 'Pendiente', current: 'Al día', no_plan: 'Sin plan determinado' }[paymentStatuses[person.id!] ?? 'no_plan']}
                          </span>
                        </div>
                        
                        <div className="person-actions">
                          <Button onClick={() => setProfilePerson(person)} variant="primary" size="sm">Pagos</Button>
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
                )
              ) : (
                // Deleted people content
                deletedPersons.length === 0 ? (
                  <div className="person-empty-state">
                    <div className="person-empty-icon">🗑️</div>
                    <Title level={3} variant="secondary" align="center">
                      No hay personas eliminadas
                    </Title>
                    <p className="person-empty-description">
                      Las personas eliminadas aparecerán aquí
                    </p>
                  </div>
                ) : (
                  <div className="person-list-grid">
                    {deletedPersons.map((person) => (
                      <Card
                        key={person.id}
                        variant="default"
                        padding="md"
                        className="person-card deleted"
                      >
                        <div className="person-avatar deleted">
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="person-info">
                          <Title level={4} variant="default" className="person-name">
                            {person.name} {person.last_name}
                          </Title>
                          {person.phone && person.phone !== "0" && (
                            <p className="person-phone">Tel: {person.phone}</p>
                          )}
                          <p className="person-deleted-status">
                            Eliminada el {formatDateTimeForDisplay(person.deleted_at)}
                          </p>
                        </div>
                        
                        <div className="person-actions">
                          <Button
                            onClick={() => handleRestore(person)}
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
              <Pagination className="person-pagination" total={totalPersons} page={currentPage} totalPages={Math.ceil(totalPersons / ITEMS_PER_PAGE)} singularLabel="persona" pluralLabel="personas" loading={loading} onPageChange={goToPage} />
            ) : (
              <Pagination className="person-pagination" total={deletedPersonsCount} page={deletedPage} totalPages={Math.ceil(deletedPersonsCount / ITEMS_PER_PAGE)} singularLabel="persona eliminada" pluralLabel="personas eliminadas" loading={loading} onPageChange={(page) => loadDeletedPersons(page, searchQuery)} />
            )}
          </div>
        </Card>
      </div>

      {/* Form Modal */}
      {profilePerson && (
        <PersonPaymentProfile
          person={profilePerson}
          onClose={closeProfile}
          onChanged={() => { void loadPersons(currentPage, searchQuery); void loadStatusCounts(); }}
        />
      )}

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

      <Modal
        isOpen={Boolean(duplicateReview)}
        onClose={() => !loading && setDuplicateReview(null)}
        title="Posible persona duplicada"
        size="md"
        closeOnOverlayClick={!loading}
        closeOnEscape={!loading}
        className="person-duplicate-dialog"
      >
        {duplicateReview && (
          <div className="person-duplicate-review">
            <p>
              Encontramos {duplicateReview.candidates.length === 1 ? 'una persona con datos similares' : 'personas con datos similares'}.
              Revisá las coincidencias antes de crear un registro nuevo.
            </p>
            <div className="person-duplicate-list">
              {duplicateReview.candidates.map((candidate) => (
                <div className="person-duplicate-item" key={candidate.person.id}>
                  <div>
                    <strong>{candidate.person.name} {candidate.person.last_name}</strong>
                    {candidate.person.phone && candidate.person.phone !== '0' && <span>Tel: {candidate.person.phone}</span>}
                    <small>
                      {candidate.is_deleted ? 'Persona eliminada' : 'Persona activa'}
                      {' · '}
                      {candidate.same_name && candidate.same_phone
                        ? 'coinciden nombre y teléfono'
                        : candidate.same_phone
                          ? 'coincide el teléfono'
                          : candidate.same_name
                            ? 'coincide el nombre completo'
                            : 'nombre y apellido similares'}
                    </small>
                  </div>
                  <Button
                    type="button"
                    variant={candidate.is_deleted ? 'success' : 'primary'}
                    size="sm"
                    disabled={loading}
                    onClick={() => void reuseDuplicate(candidate)}
                  >
                    {candidate.is_deleted ? 'Restaurar y usar' : 'Usar existente'}
                  </Button>
                </div>
              ))}
            </div>
            <div className="person-duplicate-actions">
              <Button type="button" variant="secondary" disabled={loading} onClick={() => setDuplicateReview(null)}>
                Volver
              </Button>
              <Button type="button" variant="danger" disabled={loading} onClick={() => void createDuplicateAnyway()}>
                {loading ? 'Creando…' : 'Crear de todas formas'}
              </Button>
            </div>
          </div>
        )}
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

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={restoreConfirm.show}
        onClose={() => setRestoreConfirm({ show: false, personId: null, personName: "" })}
        title="Confirmar Restauración"
        size="sm"
      >
        <div className="delete-confirmation-content">
          <div className="delete-confirmation-icon">🔄</div>
          <p className="delete-confirmation-text">
            ¿Estás seguro de que quieres restaurar a <strong>{restoreConfirm.personName}</strong>?
            <br />
            La persona volverá a estar disponible para su uso.
          </p>
          <div className="delete-confirmation-actions">
            <Button
              onClick={() => setRestoreConfirm({ show: false, personId: null, personName: "" })}
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
