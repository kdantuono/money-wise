import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../utils/render-helpers'
import { FuturisticLoginWall } from '@/components/FuturisticLoginWall'
import { mockLoginCredentials, mockAuthResponse } from '../__fixtures__/auth-fixtures'

// TDD: Test-driven development approach
// KISS: Keep tests simple and focused
// SRP: Each test has a single responsibility

describe('FuturisticLoginWall - Input Field Interactions', () => {
  const mockChildren = <div data-testid="protected-content">Dashboard</div>

  // RED → GREEN → REFACTOR cycle applied

  describe('Email Input Field', () => {
    it('should be clickable and allow typing', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<FuturisticLoginWall>{mockChildren}</FuturisticLoginWall>)

      // Act
      const emailInput = screen.getByLabelText(/access id/i)
      await user.click(emailInput)
      await user.type(emailInput, mockLoginCredentials.email)

      // Assert
      expect(emailInput).toHaveValue(mockLoginCredentials.email)
      expect(emailInput).toHaveFocus()
    })

    it('should display placeholder text', () => {
      // Arrange & Act
      render(<FuturisticLoginWall>{mockChildren}</FuturisticLoginWall>)

      // Assert
      const emailInput = screen.getByPlaceholderText(/enter your email/i)
      expect(emailInput).toBeInTheDocument()
    })

    it('should have correct accessibility attributes', () => {
      // Arrange & Act
      render(<FuturisticLoginWall>{mockChildren}</FuturisticLoginWall>)

      // Assert
      const emailInput = screen.getByLabelText(/access id/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
    })
  })

  describe('Password Input Field', () => {
    it('should be clickable and allow typing', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<FuturisticLoginWall>{mockChildren}</FuturisticLoginWall>)

      // Act
      const passwordInput = screen.getByLabelText(/security key/i)
      await user.click(passwordInput)
      await user.type(passwordInput, mockLoginCredentials.password)

      // Assert
      expect(passwordInput).toHaveValue(mockLoginCredentials.password)
      expect(passwordInput).toHaveFocus()
    })

    it('should hide password by default', () => {
      // Arrange & Act
      render(<FuturisticLoginWall>{mockChildren}</FuturisticLoginWall>)

      // Assert
      const passwordInput = screen.getByLabelText(/security key/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should toggle password visibility when eye button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<FuturisticLoginWall>{mockChildren}</FuturisticLoginWall>)

      // Act
      const passwordInput = screen.getByLabelText(/security key/i)
      const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i })

      // Initial state: password hidden
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Click to show password
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      // Click to hide password again
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Form Submission', () => {
    it('should have authenticate button that is clickable', () => {
      // Arrange & Act
      render(<FuturisticLoginWall>{mockChildren}</FuturisticLoginWall>)

      // Assert
      const submitButton = screen.getByRole('button', { name: /authenticate/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toBeEnabled()
    })

    it('should require both email and password fields', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<FuturisticLoginWall>{mockChildren}</FuturisticLoginWall>)

      // Act
      const emailInput = screen.getByLabelText(/access id/i)
      const passwordInput = screen.getByLabelText(/security key/i)

      // Assert - Fields should be required
      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
    })
  })

  describe('Visual Elements', () => {
    it('should display security themed labels and icons', () => {
      // Arrange & Act
      render(<FuturisticLoginWall>{mockChildren}</FuturisticLoginWall>)

      // Assert
      expect(screen.getByText(/access id/i)).toBeInTheDocument()
      expect(screen.getByText(/security key/i)).toBeInTheDocument()
      expect(screen.getByText(/secure access/i)).toBeInTheDocument()
      expect(screen.getByText(/system online/i)).toBeInTheDocument()
      expect(screen.getByText(/encrypted/i)).toBeInTheDocument()
    })

    it('should have Request Access link', () => {
      // Arrange & Act
      render(<FuturisticLoginWall>{mockChildren}</FuturisticLoginWall>)

      // Assert
      const requestAccessButton = screen.getByRole('button', { name: /request access/i })
      expect(requestAccessButton).toBeInTheDocument()
    })
  })

  describe('Ambient Light Effects Fix', () => {
    it('should not block input interactions (regression test)', async () => {
      // Arrange - This test specifically verifies the pointer-events fix
      const user = userEvent.setup()
      render(<FuturisticLoginWall>{mockChildren}</FuturisticLoginWall>)

      // Act - Click and type in both fields rapidly
      const emailInput = screen.getByLabelText(/access id/i)
      const passwordInput = screen.getByLabelText(/security key/i)

      await user.click(emailInput)
      await user.type(emailInput, 'test@example.com')
      await user.click(passwordInput)
      await user.type(passwordInput, 'password123')

      // Assert - Both fields should have values (proves ambient lights don't block)
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
    })
  })
})