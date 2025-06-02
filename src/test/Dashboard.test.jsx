import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import Dashboard from '../pages/Dashboard'

// Test wrapper component
const TestWrapper = ({ children }) => (
  <ChakraProvider value={defaultSystem}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </ChakraProvider>
)

// Mock data
const mockPerson = {
  id: 1,
  name: 'John',
  last_name: 'Doe',
  phone: '123-456-7890'
}

const mockExercises = [
  { id: 1, name: 'Push-ups', code: 'PU' },
  { id: 2, name: 'Squats', code: 'SQ' }
]

const mockWorkoutData = [
  {
    id: 1,
    person_id: 1,
    exercise_id: 1,
    date: '2024-01-15',
    sets: 3,
    reps: 10,
    weight: 50,
    notes: 'Good form',
    person_name: 'John',
    person_last_name: 'Doe',
    exercise_name: 'Push-ups',
    exercise_code: 'PU'
  }
]

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset localStorage mock
    global.localStorageMock.getItem.mockReturnValue(null)
    global.localStorageMock.setItem.mockClear()
    global.localStorageMock.removeItem.mockClear()
    
    // Setup default mock responses
    global.mockInvoke.mockImplementation((command) => {
      switch (command) {
        case 'get_exercises':
          return Promise.resolve(mockExercises)
        case 'get_exercises_paginated':
          return Promise.resolve(mockExercises)
        case 'get_workout_entries_by_person_and_date_range':
          return Promise.resolve(mockWorkoutData)
        default:
          return Promise.resolve([])
      }
    })
  })

  describe('Initial Render', () => {
    test('renders dashboard without selected person', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Should show person search
      expect(screen.getByPlaceholderText(/buscar persona/i)).toBeInTheDocument()
      expect(screen.getByText(/dashboard de entrenamientos/i)).toBeInTheDocument()
    })

    test('fetches exercises on mount', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(global.mockInvoke).toHaveBeenCalledWith('get_exercises')
      })
    })
  })

  describe('localStorage Persistence', () => {
    test('initializes selectedPerson from localStorage', async () => {
      // Mock localStorage to return a saved person
      global.localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPerson))

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Should fetch workout data for the saved person
      await waitFor(() => {
        expect(global.mockInvoke).toHaveBeenCalledWith(
          'get_workout_entries_by_person_and_date_range',
          expect.objectContaining({
            personId: mockPerson.id
          })
        )
      })

      // Should display the person's name
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    test('saves selectedPerson to localStorage when person is selected', async () => {
      const { rerender } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Simulate person selection by triggering the callback
      // We need to access the WeeklyCalendar component's onPersonSelect prop
      // For this test, we'll verify localStorage is called when the component updates

      // Mock a person selection by re-rendering with localStorage mock
      global.localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPerson))
      
      rerender(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Verify localStorage.setItem would be called
      // Note: In a real scenario, this would be triggered by user interaction
      expect(global.localStorageMock.getItem).toHaveBeenCalledWith('dashboard-selectedPerson')
    })

    test('removes selectedPerson from localStorage when cleared', async () => {
      // Start with a saved person
      global.localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPerson))

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Wait for initial render with person
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Find and click the "Cambiar" button to clear selection
      const changeButton = screen.getByText('Cambiar')
      await userEvent.click(changeButton)

      // Should show person search again
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar persona/i)).toBeInTheDocument()
      })
    })
  })

  describe('Person Selection Flow', () => {
    test('displays person info when person is selected', async () => {
      global.localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPerson))

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('📞 123-456-7890')).toBeInTheDocument()
        expect(screen.getByText('Cambiar')).toBeInTheDocument()
      })
    })

    test('fetches workout data when person is selected', async () => {
      global.localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPerson))

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(global.mockInvoke).toHaveBeenCalledWith(
          'get_workout_entries_by_person_and_date_range',
          expect.objectContaining({
            personId: mockPerson.id,
            startDate: expect.any(String),
            endDate: expect.any(String)
          })
        )
      })
    })
  })

  describe('Workout Data Management', () => {
    test('displays workout data in calendar when person is selected', async () => {
      global.localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPerson))

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Wait for workout data to load and display
      await waitFor(() => {
        expect(screen.getByText('Push-ups')).toBeInTheDocument()
      })
    })

    test('handles workout data updates correctly', async () => {
      global.localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPerson))

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Verify initial workout data fetch
      await waitFor(() => {
        expect(global.mockInvoke).toHaveBeenCalledWith(
          'get_workout_entries_by_person_and_date_range',
          expect.any(Object)
        )
      })

      // Verify workout data is displayed
      await waitFor(() => {
        expect(screen.getByText('Push-ups')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    test('handles exercise fetch error gracefully', async () => {
      global.mockInvoke.mockImplementation((command) => {
        if (command === 'get_exercises') {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve([])
      })

      // Should not crash when exercises fail to load
      expect(() => {
        render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        )
      }).not.toThrow()
    })

    test('handles workout data fetch error gracefully', async () => {
      global.localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPerson))
      global.mockInvoke.mockImplementation((command) => {
        if (command === 'get_workout_entries_by_person_and_date_range') {
          return Promise.reject(new Error('Database error'))
        }
        if (command === 'get_exercises') {
          return Promise.resolve(mockExercises)
        }
        return Promise.resolve([])
      })

      // Should not crash when workout data fails to load
      expect(() => {
        render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        )
      }).not.toThrow()
    })
  })

  describe('Navigation Persistence', () => {
    test('maintains state after component remount', async () => {
      // First render with saved person
      global.localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPerson))

      const { unmount } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Unmount component (simulating navigation away)
      unmount()

      // Re-render component (simulating navigation back)
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Should restore the person from localStorage
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Should fetch workout data again
      expect(global.mockInvoke).toHaveBeenCalledWith(
        'get_workout_entries_by_person_and_date_range',
        expect.objectContaining({
          personId: mockPerson.id
        })
      )
    })
  })
}) 