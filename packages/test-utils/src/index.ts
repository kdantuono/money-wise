/**
 * MoneyWise Test Utilities
 * Shared testing utilities and fixtures for all packages
 */

// Fixtures
export * from './fixtures';

// Mocks
export * from './mocks';

// Helpers
export * from './helpers';

// Common test utilities
export { render, screen, fireEvent, waitFor } from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';