import { PersonService, Person } from "../../services";
import React, { useState, useEffect, useRef } from "react";
import { Input, Button } from "../base";
import '../../styles/PersonSearch.css';

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
    <div className="person-search-container">
      {/* Selected Person Display */}
      {selectedPerson && (
        <div className="person-search-selected">
          <div className="person-search-avatar">
            {selectedPerson.name.charAt(0)}{selectedPerson.last_name.charAt(0)}
          </div>
          <div className="person-search-info">
            <div className="person-search-name">
              {selectedPerson.name} {selectedPerson.last_name}
            </div>
            <div className="person-search-phone">
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
      <div ref={dropdownRef} className="person-search-input-container">
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
          <div className="person-search-dropdown">
            {searchTerm.length < 2 ? (
              <div className="person-search-message">
                Escribe al menos 2 caracteres...
              </div>
            ) : loading ? (
              <div className="person-search-message">
                <div className="person-search-loading">
                  <div className="person-search-loading-icon">⏳</div>
                  Buscando...
                </div>
              </div>
            ) : persons.length === 0 ? (
              <div className="person-search-message">
                No se encontraron personas
              </div>
            ) : (
              <>
                {persons.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => handlePersonSelect(person)}
                    className="person-search-item"
                  >
                    <div className="person-search-item-name">
                      {person.name} {person.last_name}
                    </div>
                    <div className="person-search-item-phone">
                      📞 {person.phone}
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <div
                    onClick={loadMorePersons}
                    className="person-search-load-more"
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