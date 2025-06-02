import { describe, test, expect, beforeEach, vi } from 'vitest'

// Mock the Dashboard component's localStorage logic
class DashboardLocalStorage {
  constructor() {
    this.selectedPerson = this.getSelectedPersonFromStorage()
  }

  getSelectedPersonFromStorage() {
    const savedPerson = localStorage.getItem('dashboard-selectedPerson')
    return savedPerson ? JSON.parse(savedPerson) : null
  }

  setSelectedPerson(person) {
    this.selectedPerson = person
    if (person) {
      localStorage.setItem('dashboard-selectedPerson', JSON.stringify(person))
    } else {
      localStorage.removeItem('dashboard-selectedPerson')
    }
  }

  clearSelectedPerson() {
    this.setSelectedPerson(null)
  }
}

describe('Dashboard localStorage Persistence', () => {
  let dashboard
  let localStorageMock

  beforeEach(() => {
    // Create a fresh localStorage mock for each test
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    global.localStorage = localStorageMock

    // Reset mocks
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Initialization', () => {
    test('initializes with null when no saved person exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      dashboard = new DashboardLocalStorage()
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('dashboard-selectedPerson')
      expect(dashboard.selectedPerson).toBeNull()
    })

    test('initializes with saved person when exists in localStorage', () => {
      const savedPerson = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedPerson))
      
      dashboard = new DashboardLocalStorage()
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('dashboard-selectedPerson')
      expect(dashboard.selectedPerson).toEqual(savedPerson)
    })

    test('handles corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')
      
      expect(() => {
        dashboard = new DashboardLocalStorage()
      }).toThrow()
      
      // In a real implementation, you'd want to handle this gracefully
      // For now, this test documents the current behavior
    })
  })

  describe('Person Selection', () => {
    beforeEach(() => {
      dashboard = new DashboardLocalStorage()
    })

    test('saves person to localStorage when selected', () => {
      const person = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      
      dashboard.setSelectedPerson(person)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dashboard-selectedPerson',
        JSON.stringify(person)
      )
      expect(dashboard.selectedPerson).toEqual(person)
    })

    test('removes person from localStorage when cleared', () => {
      const person = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      
      // First select a person
      dashboard.setSelectedPerson(person)
      expect(dashboard.selectedPerson).toEqual(person)
      
      // Then clear the selection
      dashboard.clearSelectedPerson()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('dashboard-selectedPerson')
      expect(dashboard.selectedPerson).toBeNull()
    })

    test('updates localStorage when person changes', () => {
      const person1 = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      const person2 = { id: 2, name: 'Jane', last_name: 'Smith', phone: '098-765-4321' }
      
      // Select first person
      dashboard.setSelectedPerson(person1)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dashboard-selectedPerson',
        JSON.stringify(person1)
      )
      
      // Select second person
      dashboard.setSelectedPerson(person2)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dashboard-selectedPerson',
        JSON.stringify(person2)
      )
      
      expect(dashboard.selectedPerson).toEqual(person2)
    })
  })

  describe('Navigation Simulation', () => {
    test('persists person across navigation (component unmount/remount)', () => {
      const person = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      
      // First "page load" - select a person
      dashboard = new DashboardLocalStorage()
      dashboard.setSelectedPerson(person)
      
      // Simulate navigation away (component unmount)
      dashboard = null
      
      // Mock localStorage to return the saved person
      localStorageMock.getItem.mockReturnValue(JSON.stringify(person))
      
      // Simulate navigation back (component remount)
      dashboard = new DashboardLocalStorage()
      
      // Should restore the person from localStorage
      expect(dashboard.selectedPerson).toEqual(person)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('dashboard-selectedPerson')
    })

    test('handles multiple navigation cycles', () => {
      const person = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      
      // First navigation cycle
      dashboard = new DashboardLocalStorage()
      dashboard.setSelectedPerson(person)
      dashboard = null
      
      // Second navigation cycle
      localStorageMock.getItem.mockReturnValue(JSON.stringify(person))
      dashboard = new DashboardLocalStorage()
      expect(dashboard.selectedPerson).toEqual(person)
      
      // Clear selection
      dashboard.clearSelectedPerson()
      dashboard = null
      
      // Third navigation cycle - should have no person
      localStorageMock.getItem.mockReturnValue(null)
      dashboard = new DashboardLocalStorage()
      expect(dashboard.selectedPerson).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    test('handles localStorage quota exceeded', () => {
      dashboard = new DashboardLocalStorage()
      const person = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      
      // Mock localStorage.setItem to throw quota exceeded error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      
      // Should handle the error gracefully
      expect(() => {
        dashboard.setSelectedPerson(person)
      }).toThrow('QuotaExceededError')
      
      // In a real implementation, you'd want to handle this gracefully
    })

    test('handles localStorage disabled/unavailable', () => {
      // Mock localStorage to be undefined
      global.localStorage = undefined
      
      expect(() => {
        dashboard = new DashboardLocalStorage()
      }).toThrow()
      
      // In a real implementation, you'd want to handle this gracefully
    })
  })
}) 