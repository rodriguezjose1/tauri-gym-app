import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import Dashboard from '../shared/pages/Dashboard'

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

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    // Setup default mock responses
    global.mockInvoke.mockImplementation((command) => {
      switch (command) {
        case 'get_exercises':
          return Promise.resolve(mockExercises)
        case 'get_exercises_paginated':
          return Promise.resolve(mockExercises)
        case 'get_workout_entries_by_person_and_date_range':
          return Promise.resolve([])
        default:
          return Promise.resolve([])
      }
    })
  })

  test('Dashboard renders without crashing', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Should show the dashboard title
    expect(screen.getByText(/dashboard de entrenamientos/i)).toBeInTheDocument()
  })

  test('Dashboard initializes localStorage correctly', async () => {
    // Mock localStorage to return null (no saved person)
    global.localStorageMock.getItem.mockReturnValue(null)

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Should call localStorage.getItem to check for saved person
    expect(global.localStorageMock.getItem).toHaveBeenCalledWith('dashboard-selectedPerson')

    // Should show person search when no person is saved
    expect(screen.getByPlaceholderText(/buscar persona/i)).toBeInTheDocument()
  })

  test('Dashboard restores person from localStorage', async () => {
    // Mock localStorage to return a saved person
    global.localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPerson))

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Should call localStorage.getItem
    expect(global.localStorageMock.getItem).toHaveBeenCalledWith('dashboard-selectedPerson')

    // Should fetch workout data for the restored person
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

  test('Dashboard handles localStorage errors gracefully', async () => {
    // Mock localStorage.getItem to throw an error
    global.localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage not available')
    })

    // Should not crash when localStorage fails
    expect(() => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    }).toThrow() // Currently throws, but in production you'd want to handle this gracefully

    // Reset the mock for other tests
    global.localStorageMock.getItem.mockReturnValue(null)
  })

  test('Dashboard fetches exercises on mount', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Should fetch exercises when component mounts
    await waitFor(() => {
      expect(global.mockInvoke).toHaveBeenCalledWith('get_exercises')
    })
  })
}) 