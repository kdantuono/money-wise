// SRP: Single responsibility - Auth-related test data

export const mockUser = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockLoginCredentials = {
  email: 'test@example.com',
  password: 'testpassword123',
}

export const mockRegisterData = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'testpassword123',
}

export const mockAuthResponse = {
  success: {
    success: true,
    user: mockUser,
    token: 'mock-jwt-token',
  },
  failure: {
    success: false,
    error: 'Invalid credentials',
  },
  userExists: {
    success: false,
    error: 'User already exists',
  },
}