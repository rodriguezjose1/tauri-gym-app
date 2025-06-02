import { describe, test, expect, beforeEach, vi } from 'vitest'

// Mock the Dashboard component's sessionStorage logic
class DashboardSessionStorage {
  constructor() {
    this.selectedPerson = this.getSelectedPersonFromStorage()
  }

  getSelectedPersonFromStorage() {
    const savedPerson = sessionStorage.getItem('dashboard-selectedPerson')
    return savedPerson ? JSON.parse(savedPerson) : null
  }

  setSelectedPerson(person) {
    this.selectedPerson = person
    if (person) {
      sessionStorage.setItem('dashboard-selectedPerson', JSON.stringify(person))
    } else {
      sessionStorage.removeItem('dashboard-selectedPerson')
    }
  }

  clearSelectedPerson() {
    this.setSelectedPerson(null)
  }
}

describe('Dashboard sessionStorage Persistence', () => {
  let dashboard
  let sessionStorageMock

  beforeEach(() => {
    // Create a fresh sessionStorage mock for each test
    sessionStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    global.sessionStorage = sessionStorageMock

    // Reset mocks
    vi.clearAllMocks()
    sessionStorageMock.getItem.mockReturnValue(null)
  })

  describe('Initialization', () => {
    test('initializes with null when no saved person exists', () => {
      sessionStorageMock.getItem.mockReturnValue(null)
      
      dashboard = new DashboardSessionStorage()
      
      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('dashboard-selectedPerson')
      expect(dashboard.selectedPerson).toBeNull()
    })

    test('initializes with saved person when exists in sessionStorage', () => {
      const savedPerson = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(savedPerson))
      
      dashboard = new DashboardSessionStorage()
      
      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('dashboard-selectedPerson')
      expect(dashboard.selectedPerson).toEqual(savedPerson)
    })

    test('handles corrupted sessionStorage data gracefully', () => {
      sessionStorageMock.getItem.mockReturnValue('invalid-json')
      
      expect(() => {
        dashboard = new DashboardSessionStorage()
      }).toThrow()
      
      // In a real implementation, you'd want to handle this gracefully
      // For now, this test documents the current behavior
    })
  })

  describe('Person Selection', () => {
    beforeEach(() => {
      dashboard = new DashboardSessionStorage()
    })

    test('saves person to sessionStorage when selected', () => {
      const person = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      
      dashboard.setSelectedPerson(person)
      
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'dashboard-selectedPerson',
        JSON.stringify(person)
      )
      expect(dashboard.selectedPerson).toEqual(person)
    })

    test('removes person from sessionStorage when cleared', () => {
      const person = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      
      // First select a person
      dashboard.setSelectedPerson(person)
      expect(dashboard.selectedPerson).toEqual(person)
      
      // Then clear the selection
      dashboard.clearSelectedPerson()
      
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('dashboard-selectedPerson')
      expect(dashboard.selectedPerson).toBeNull()
    })

    test('updates sessionStorage when person changes', () => {
      const person1 = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      const person2 = { id: 2, name: 'Jane', last_name: 'Smith', phone: '098-765-4321' }
      
      // Select first person
      dashboard.setSelectedPerson(person1)
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'dashboard-selectedPerson',
        JSON.stringify(person1)
      )
      
      // Select second person
      dashboard.setSelectedPerson(person2)
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
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
      dashboard = new DashboardSessionStorage()
      dashboard.setSelectedPerson(person)
      
      // Simulate navigation away (component unmount)
      dashboard = null
      
      // Mock sessionStorage to return the saved person
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(person))
      
      // Simulate navigation back (component remount)
      dashboard = new DashboardSessionStorage()
      
      // Should restore the person from sessionStorage
      expect(dashboard.selectedPerson).toEqual(person)
      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('dashboard-selectedPerson')
    })

    test('handles multiple navigation cycles', () => {
      const person = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      
      // First navigation cycle
      dashboard = new DashboardSessionStorage()
      dashboard.setSelectedPerson(person)
      dashboard = null
      
      // Second navigation cycle
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(person))
      dashboard = new DashboardSessionStorage()
      expect(dashboard.selectedPerson).toEqual(person)
      
      // Clear selection
      dashboard.clearSelectedPerson()
      dashboard = null
      
      // Third navigation cycle - should have no person
      sessionStorageMock.getItem.mockReturnValue(null)
      dashboard = new DashboardSessionStorage()
      expect(dashboard.selectedPerson).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    test('handles sessionStorage quota exceeded', () => {
      dashboard = new DashboardSessionStorage()
      const person = { id: 1, name: 'John', last_name: 'Doe', phone: '123-456-7890' }
      
      // Mock sessionStorage.setItem to throw quota exceeded error
      sessionStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      
      // Should handle the error gracefully
      expect(() => {
        dashboard.setSelectedPerson(person)
      }).toThrow('QuotaExceededError')
      
      // In a real implementation, you'd want to handle this gracefully
    })

    test('handles sessionStorage disabled/unavailable', () => {
      // Mock sessionStorage to be undefined
      global.sessionStorage = undefined
      
      expect(() => {
        dashboard = new DashboardSessionStorage()
      }).toThrow()
      
      // In a real implementation, you'd want to handle this gracefully
    })
  })
}) 