import '@testing-library/jest-dom'

// Mock Tauri APIs
const { mockInvoke, mockMessage, mockConfirm } = vi.hoisted(() => ({
  mockInvoke: vi.fn(), mockMessage: vi.fn(), mockConfirm: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  message: mockMessage,
  confirm: mockConfirm
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  Object.values(localStorageMock).forEach(mock => mock.mockReset())
  mockInvoke.mockReset()
  mockMessage.mockReset()
  mockConfirm.mockReset()
  sessionStorage.clear()
  localStorageMock.getItem.mockReturnValue(null)
})

// Export mocks for use in tests
global.mockInvoke = mockInvoke
global.mockMessage = mockMessage
global.mockConfirm = mockConfirm
global.localStorageMock = localStorageMock
