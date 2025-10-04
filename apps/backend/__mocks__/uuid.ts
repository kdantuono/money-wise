/**
 * Mock for uuid package (ES module)
 * Provides CommonJS-compatible mock for testing
 */

let counter = 0;

export const v4 = (): string => {
  counter++;
  return `00000000-0000-4000-8000-${counter.toString().padStart(12, '0')}`;
};

export const v1 = (): string => {
  counter++;
  return `00000000-0000-1000-8000-${counter.toString().padStart(12, '0')}`;
};

export const validate = (uuid: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
};

export const version = (uuid: string): number => {
  if (!validate(uuid)) {
    throw new TypeError('Invalid UUID');
  }
  return parseInt(uuid.charAt(14), 16);
};

// Default export for backward compatibility
export default {
  v4,
  v1,
  validate,
  version,
};
