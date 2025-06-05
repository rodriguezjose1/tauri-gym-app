import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Input, Button } from "../ui";

interface Person {
  id?: number;
  name: string;
  last_name: string;
  phone: string;
}

interface PersonSearchProps {
  selectedPerson: Person | null;
  onPersonSelect: (person: Person) => void;
  onClearSelection: () => void;
}

export const PersonSearch: React.FC<PersonSearchProps> = ({
  selectedPerson,
  onPersonSelect,
  onClearSelection
}) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [personSearchLoading, setPersonSearchLoading] = useState(false);
  const [personCurrentPage, setPersonCurrentPage] = useState(1);
  const [personHasMore, setPersonHasMore] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const personPageSize = 10;

  const searchPersons = async (query: string, page: number = 1, reset: boolean = true) => {
    if (query.trim().length < 2) {
      setPersons([]);
      setPersonHasMore(false);
      return;
    }

    setPersonSearchLoading(true);
    try {
      const result = await invoke("search_persons_paginated", { 
        query: query.trim(), 
        page, 
        pageSize: personPageSize 
      });
      const newPersons = result as Person[];
      
      if (reset) {
        setPersons(newPersons);
      } else {
        setPersons(prev => [...prev, ...newPersons]);
      }
      
      setPersonHasMore(newPersons.length === personPageSize);
      setPersonCurrentPage(page);
    } catch (error) {
      console.error("Error searching persons:", error);
      setPersons([]);
      setPersonHasMore(false);
    } finally {
      setPersonSearchLoading(false);
    }
  };

  const loadMorePersons = () => {
    if (!personSearchLoading && personHasMore && searchTerm.length >= 2) {
      searchPersons(searchTerm, personCurrentPage + 1, false);
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
      setPersonHasMore(true);
      setPersonCurrentPage(1);
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
          placeholder={selectedPerson ? "🔍 Buscar otra persona..." : "🔍 Buscar persona para ver entrenamientos..."}
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
            ) : personSearchLoading ? (
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
                {personHasMore && (
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