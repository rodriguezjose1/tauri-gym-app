import { PersonService, Person } from "../../services";
import React, { useState, useEffect, useRef } from "react";
import { Input, Button } from "../base";

interface PersonSearchProps {
  selectedPerson: Person | null;
  onPersonSelect: (person: Person) => void;
  onClearSelection: () => void;
  placeholder?: string;
}

export const PersonSearch: React.FC<PersonSearchProps> = ({
  selectedPerson,
  onPersonSelect,
  onClearSelection,
  placeholder = "🔍 Buscar persona..."
}) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 10;

  const searchPersons = async (query: string, page: number = 1, reset: boolean = true) => {
    if (query.trim().length < 2) {
      setPersons([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      const data = await PersonService.searchPersonsPaginated(query, page, ITEMS_PER_PAGE);
      
      if (reset) {
        setPersons(data);
        setCurrentPage(1);
      } else {
        setPersons(prev => [...prev, ...data]);
        setCurrentPage(page);
      }
      
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error searching persons:", error);
      setPersons([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePersons = () => {
    if (!loading && hasMore && searchTerm.length >= 2) {
      searchPersons(searchTerm, currentPage + 1, false);
    }
  };

  const handlePersonSelect = (person: Person) => {
    onPersonSelect(person);
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    onClearSelection();
    setSearchTerm("");
    setPersons([]);
    setShowDropdown(false);
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length >= 2) {
      setShowDropdown(true);
      await searchPersons(value);
    } else {
      setShowDropdown(false);
      setPersons([]);
      setHasMore(true);
      setCurrentPage(1);
    }
  };

  const handleSearchFocus = () => {
    if (!selectedPerson && searchTerm.length >= 2) {
      setShowDropdown(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Selected Person Display */}
      {selectedPerson && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '8px 12px',
          backgroundColor: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #0ea5e9',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '12px'
          }}>
            {selectedPerson.name.charAt(0)}{selectedPerson.last_name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
              {selectedPerson.name} {selectedPerson.last_name}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              📞 {selectedPerson.phone}
            </div>
          </div>
          <Button
            onClick={handleClearSelection}
            variant="secondary"
            size="sm"
          >
            Cambiar
          </Button>
        </div>
      )}

      {/* Search Input - Always Present */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <Input
          label=""
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={handleSearchFocus}
          variant="primary"
          fullWidth
        />
        
        {showDropdown && searchTerm && !selectedPerson && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {searchTerm.length < 2 ? (
              <div style={{ padding: '12px 16px', color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                Escribe al menos 2 caracteres...
              </div>
            ) : loading ? (
              <div style={{ padding: '12px 16px', color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '16px' }}>⏳</div>
                  Buscando...
                </div>
              </div>
            ) : persons.length === 0 ? (
              <div style={{ padding: '12px 16px', color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                No se encontraron personas
              </div>
            ) : (
              <>
                {persons.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => handlePersonSelect(person)}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                      {person.name} {person.last_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      📞 {person.phone}
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <div
                    onClick={loadMorePersons}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      color: '#3b82f6',
                      fontWeight: '500',
                      borderTop: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    Cargar más...
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 