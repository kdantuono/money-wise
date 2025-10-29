/**
 * Global type declarations for Vitest and Testing Library
 *
 * This file ensures TypeScript recognizes jest-dom matchers during type checking.
 * The actual matchers are imported in vitest.setup.ts at runtime.
 */

/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />
