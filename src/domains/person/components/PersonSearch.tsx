import { PersonService, Person } from "../../../services";
import React, { useState, useEffect, useRef } from "react";
import { Input, Button } from "../../../shared/components/base";
import '../../../styles/PersonSearch.css';

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
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 10;

  // Function to scroll selected item into view
  const scrollSelectedItemIntoView = () => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };

  // Effect to scroll when selectedIndex changes
  useEffect(() => {
    if (selectedIndex >= 0) {
      scrollSelectedItemIntoView();
    }
  }, [selectedIndex]);

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
        setSelectedIndex(-1);
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
    setShowSearchInput(false);
    setSelectedIndex(-1);
  };

  const handleClearSelection = () => {
    onClearSelection();
    setSearchTerm("");
    setPersons([]);
    setShowDropdown(false);
    setShowSearchInput(false);
    setSelectedIndex(-1);
  };

  const handleChangeUser = () => {
    setShowSearchInput(true);
    setSearchTerm("");
    setPersons([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
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
      setSelectedIndex(-1);
    }
  };

  const handleSearchFocus = () => {
    if (searchTerm.length >= 2) {
      setShowDropdown(true);
    }
  };

  const handleCancelSearch = () => {
    setShowSearchInput(false);
    setSearchTerm("");
    setPersons([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || persons.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < persons.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < persons.length) {
          handlePersonSelect(persons[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Show search input when no person is selected OR when user clicked "Cambiar"
  if (!selectedPerson || showSearchInput) {
    return (
      <div className="person-search-container">
        <div ref={dropdownRef} className="person-search-input-container">
          <div className="person-search-input-wrapper">
            <Input
              label=""
              placeholder={placeholder}
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onKeyDown={handleKeyDown}
              variant="primary"
              fullWidth
            />
            {selectedPerson && (
              <Button
                onClick={handleCancelSearch}
                variant="secondary"
                size="sm"
                className="person-search-cancel-btn"
              >
                Cancelar
              </Button>
            )}
          </div>
          
          {showDropdown && searchTerm && (
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
                  {persons.map((person, index) => (
                    <div
                      key={person.id}
                      onClick={() => handlePersonSelect(person)}
                      className={`person-search-item ${index === selectedIndex ? 'person-search-item-selected' : ''}`}
                      ref={index === selectedIndex ? selectedItemRef : null}
                    >
                      <div className="person-search-item-name">
                        {person.name} {person.last_name}
                      </div>
                      {person.phone && person.phone !== "0" && (
                        <div className="person-search-item-phone">
                          📞 {person.phone}
                        </div>
                      )}
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
  }

  // Show selected person when someone is selected
  return (
    <div className="person-search-container">
      <div className="person-search-selected">
        <div className="person-search-avatar">
          {selectedPerson.name.charAt(0)}{selectedPerson.last_name.charAt(0)}
        </div>
        <div className="person-search-info">
          <div className="person-search-name">
            {selectedPerson.name} {selectedPerson.last_name}
          </div>
          {selectedPerson.phone && selectedPerson.phone !== "0" && (
            <div className="person-search-phone">
              📞 {selectedPerson.phone}
            </div>
          )}
        </div>
        <Button
          onClick={handleChangeUser}
          variant="secondary"
          size="sm"
        >
          Cambiar
        </Button>
      </div>
    </div>
  );
}; 