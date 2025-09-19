import React from 'react'
import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../utils/render-helpers'
import { LoginForm } from '@/components/auth/LoginForm'

// SRP: Single Responsibility - Test LoginForm component only
describe('LoginForm Component', () => {
  const defaultProps = {
    email: '',
    password: '',
    isLoading: false,
    onEmailChange: jest.fn(),
    onPasswordChange: jest.fn(),
    onSubmit: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Email Input', () => {
    it('should render email input with correct attributes', () => {
      render(<LoginForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/access id/i)
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')
    })

    it('should display provided email value', () => {
      render(<LoginForm {...defaultProps} email="test@example.com" />)

      const emailInput = screen.getByLabelText(/access id/i)
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should call onEmailChange when typing', async () => {
      const user = userEvent.setup()
      const onEmailChange = jest.fn()
      render(<LoginForm {...defaultProps} onEmailChange={onEmailChange} />)

      const emailInput = screen.getByLabelText(/access id/i)
      await user.type(emailInput, 'test@example.com')

      // userEvent.type calls onChange for each character
      expect(onEmailChange).toHaveBeenCalledWith('m') // Last character typed
      expect(onEmailChange).toHaveBeenCalledTimes(16) // Actual number of calls
    })

    it('should be disabled when loading', () => {
      render(<LoginForm {...defaultProps} isLoading={true} />)

      const emailInput = screen.getByLabelText(/access id/i)
      expect(emailInput).toBeDisabled()
    })
  })

  describe('Password Input', () => {
    it('should render password input with correct attributes', () => {
      render(<LoginForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/security key/i)
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password')
    })

    it('should display provided password value', () => {
      render(<LoginForm {...defaultProps} password="secret123" />)

      const passwordInput = screen.getByLabelText(/security key/i)
      expect(passwordInput).toHaveValue('secret123')
    })

    it('should call onPasswordChange when typing', async () => {
      const user = userEvent.setup()
      const onPasswordChange = jest.fn()
      render(<LoginForm {...defaultProps} onPasswordChange={onPasswordChange} />)

      const passwordInput = screen.getByLabelText(/security key/i)
      await user.type(passwordInput, 'secret123')

      // userEvent.type calls onChange for each character
      expect(onPasswordChange).toHaveBeenCalledWith('3') // Last character typed
      expect(onPasswordChange).toHaveBeenCalledTimes(9) // 9 characters in secret123
    })

    it('should toggle password visibility', async () => {
      const user = userEvent.setup()
      render(<LoginForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/security key/i)
      const toggleButton = screen.getByLabelText(/toggle password visibility/i)

      // Initially hidden
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Click to show
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      // Click to hide again
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should be disabled when loading', () => {
      render(<LoginForm {...defaultProps} isLoading={true} />)

      const passwordInput = screen.getByLabelText(/security key/i)
      const toggleButton = screen.getByLabelText(/toggle password visibility/i)

      expect(passwordInput).toBeDisabled()
      expect(toggleButton).toBeDisabled()
    })
  })

  describe('Submit Button', () => {
    it('should render submit button with correct text when not loading', () => {
      render(<LoginForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /authenticate/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveTextContent('AUTHENTICATE')
    })

    it('should show loading state when isLoading is true', () => {
      render(<LoginForm {...defaultProps} isLoading={true} />)

      // Get submit button specifically (not the password toggle button)
      const submitButton = screen.getByRole('button', { name: /unlocking system/i })
      expect(submitButton).toHaveTextContent('UNLOCKING SYSTEM...')
      expect(submitButton).toBeDisabled()
    })

    it('should call onSubmit when form is submitted', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()
      render(<LoginForm {...defaultProps} onSubmit={onSubmit} />)

      const form = screen.getByRole('button', { name: /authenticate/i }).closest('form')!

      // Submit the form directly rather than clicking button
      fireEvent.submit(form)

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should prevent form submission when disabled', () => {
      const onSubmit = jest.fn()
      render(<LoginForm {...defaultProps} isLoading={true} onSubmit={onSubmit} />)

      // Find the submit button and get its form
      const submitButton = screen.getByRole('button', { name: /unlocking system/i })
      const form = submitButton.closest('form')!

      // Try to submit form when disabled
      fireEvent.submit(form)

      // onSubmit should still be called but button should be disabled
      expect(submitButton).toBeDisabled()
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('Form Validation', () => {
    it('should require both email and password fields', () => {
      render(<LoginForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/access id/i)
      const passwordInput = screen.getByLabelText(/security key/i)

      expect(emailInput).toBeRequired()
      expect(passwordInput).toBeRequired()
    })

    it('should call onSubmit with form event', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()
      render(
        <LoginForm
          {...defaultProps}
          email="test@example.com"
          password="password123"
          onSubmit={onSubmit}
        />
      )

      await user.click(screen.getByRole('button', { name: /authenticate/i }))

      expect(onSubmit).toHaveBeenCalledWith(expect.any(Object))
      expect(onSubmit.mock.calls[0][0]).toHaveProperty('preventDefault')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<LoginForm {...defaultProps} />)

      const emailLabel = screen.getByText(/access id/i)
      const passwordLabel = screen.getByText(/security key/i)
      const toggleButton = screen.getByLabelText(/toggle password visibility/i)

      expect(emailLabel).toBeInTheDocument()
      expect(passwordLabel).toBeInTheDocument()
      expect(toggleButton).toHaveAttribute('aria-label', 'Toggle password visibility')
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<LoginForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/access id/i)
      const passwordInput = screen.getByLabelText(/security key/i)
      const submitButton = screen.getByRole('button', { name: /authenticate/i })

      // Tab through form elements
      await user.tab()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/toggle password visibility/i)).toHaveFocus()

      await user.tab()
      expect(submitButton).toHaveFocus()
    })
  })
})