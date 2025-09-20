import React, { createContext, useContext, useState } from 'react';

interface MockAuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: jest.Mock;
  logout: jest.Mock;
  loading: boolean;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(
  undefined
);

export const useAuth = () => {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within MockAuthProvider');
  }
  return context;
};

interface MockAuthProviderProps {
  children: React.ReactNode;
  mockValues?: Partial<MockAuthContextType>;
}

export const MockAuthProvider: React.FC<MockAuthProviderProps> = ({
  children,
  mockValues = {},
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    mockValues.isAuthenticated || false
  );
  const [user, setUser] = useState(mockValues.user || null);

  const mockLogin = jest
    .fn()
    .mockImplementation(async (email: string, password: string) => {
      // Simulate different scenarios based on email
      if (email === 'test@example.com' && password === 'validpassword') {
        setIsAuthenticated(true);
        setUser({ email, name: 'Test User' });
        return { success: true };
      } else if (email === 'network@error.com') {
        throw new Error('Network error');
      } else {
        return { success: false, error: 'Invalid credentials' };
      }
    });

  const mockLogout = jest.fn().mockImplementation(() => {
    setIsAuthenticated(false);
    setUser(null);
  });

  const value = {
    isAuthenticated,
    user,
    login: mockValues.login || mockLogin,
    logout: mockValues.logout || mockLogout,
    loading: mockValues.loading || false,
  };

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
};
