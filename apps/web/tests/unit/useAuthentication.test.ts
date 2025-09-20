import { renderHook, act } from '@testing-library/react';
import { useAuthentication } from '@/hooks/useAuthentication';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/context/AuthContext');
jest.mock('sonner');

// SRP: Single Responsibility - Test useAuthentication hook only
describe('useAuthentication Hook', () => {
  const mockLogin = jest.fn();
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
    });
    (toast as jest.Mocked<typeof toast>).success = mockToast.success;
    (toast as jest.Mocked<typeof toast>).error = mockToast.error;
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useAuthentication());

      expect(result.current.email).toBe('');
      expect(result.current.password).toBe('');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isUnlocking).toBe(false);
      expect(result.current.unlockProgress).toBe(0);
    });

    it('should provide setter functions', () => {
      const { result } = renderHook(() => useAuthentication());

      expect(typeof result.current.setEmail).toBe('function');
      expect(typeof result.current.setPassword).toBe('function');
      expect(typeof result.current.handleLogin).toBe('function');
    });
  });

  describe('State Management', () => {
    it('should update email when setEmail is called', () => {
      const { result } = renderHook(() => useAuthentication());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      expect(result.current.email).toBe('test@example.com');
    });

    it('should update password when setPassword is called', () => {
      const { result } = renderHook(() => useAuthentication());

      act(() => {
        result.current.setPassword('password123');
      });

      expect(result.current.password).toBe('password123');
    });
  });

  describe('Login Handling - Success', () => {
    beforeEach(() => {
      mockLogin.mockResolvedValue({ success: true });
    });

    it('should set loading states during login', async () => {
      const { result } = renderHook(() => useAuthentication());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
      });

      const mockEvent = { preventDefault: jest.fn() } as any;

      await act(async () => {
        await result.current.handleLogin(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should start unlock animation on successful login', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAuthentication());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('password123');
      });

      const mockEvent = { preventDefault: jest.fn() } as any;

      await act(async () => {
        await result.current.handleLogin(mockEvent);
      });

      expect(result.current.isUnlocking).toBe(true);
      expect(result.current.unlockProgress).toBe(0);

      // Simulate progress animation
      act(() => {
        jest.advanceTimersByTime(100); // 2 intervals of 50ms
      });

      expect(result.current.unlockProgress).toBeGreaterThan(0);

      jest.useRealTimers();
    });
  });

  describe('Login Handling - Failure', () => {
    beforeEach(() => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });
    });

    it('should handle login failure', async () => {
      const { result } = renderHook(() => useAuthentication());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setPassword('wrongpassword');
      });

      const mockEvent = { preventDefault: jest.fn() } as any;

      await act(async () => {
        await result.current.handleLogin(mockEvent);
      });

      expect(result.current.isUnlocking).toBe(false);
      expect(result.current.unlockProgress).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Invalid credentials');
    });

    it('should handle login error without message', async () => {
      mockLogin.mockResolvedValue({ success: false });
      const { result } = renderHook(() => useAuthentication());

      const mockEvent = { preventDefault: jest.fn() } as any;

      await act(async () => {
        await result.current.handleLogin(mockEvent);
      });

      expect(mockToast.error).toHaveBeenCalledWith('Authentication failed');
    });
  });

  describe('Login Handling - Exception', () => {
    beforeEach(() => {
      mockLogin.mockRejectedValue(new Error('Network error'));
    });

    it('should handle login exception', async () => {
      const { result } = renderHook(() => useAuthentication());

      const mockEvent = { preventDefault: jest.fn() } as any;

      await act(async () => {
        await result.current.handleLogin(mockEvent);
      });

      expect(result.current.isUnlocking).toBe(false);
      expect(result.current.unlockProgress).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith(
        'System error. Please try again.'
      );
    });
  });

  describe('Form Event Handling', () => {
    it('should prevent default form submission', async () => {
      const { result } = renderHook(() => useAuthentication());
      const mockEvent = { preventDefault: jest.fn() } as any;

      mockLogin.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.handleLogin(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should call login with current email and password', async () => {
      const { result } = renderHook(() => useAuthentication());

      act(() => {
        result.current.setEmail('user@test.com');
        result.current.setPassword('secret');
      });

      const mockEvent = { preventDefault: jest.fn() } as any;
      mockLogin.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.handleLogin(mockEvent);
      });

      expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'secret');
    });
  });
});
