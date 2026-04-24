/**
 * Unit tests for preset color palette (#060).
 * Focus: preset lookup + fallback + prototype pollution protection.
 */

import { describe, it, expect } from 'vitest';
import {
  PRESET_COLORS,
  CUSTOM_PRESET_COLOR,
  getPresetColor,
} from '@/lib/onboarding/presetColors';

describe('PRESET_COLORS', () => {
  it('contains all 7 preset ids matching StepGoals PRESET_GOALS', () => {
    const expected = [
      'fondo-emergenza',
      'comprare-casa',
      'iniziare-a-investire',
      'eliminare-debiti',
      'risparmiare-di-piu',
      'viaggi-vacanza',
      'far-crescere-patrimonio',
    ];
    for (const id of expected) {
      expect(PRESET_COLORS[id]).toBeDefined();
      expect(PRESET_COLORS[id]!.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(PRESET_COLORS[id]!.border).toContain('border-l-');
      expect(PRESET_COLORS[id]!.bg).toContain('bg-');
      expect(PRESET_COLORS[id]!.label).toBeTruthy();
    }
  });

  it('emergency uses red-500 (#ef4444)', () => {
    expect(PRESET_COLORS['fondo-emergenza']!.hex).toBe('#ef4444');
  });

  it('invest uses indigo-500 (#6366f1)', () => {
    expect(PRESET_COLORS['iniziare-a-investire']!.hex).toBe('#6366f1');
  });
});

describe('getPresetColor', () => {
  it('returns color spec for known preset id', () => {
    const spec = getPresetColor('fondo-emergenza');
    expect(spec).toBe(PRESET_COLORS['fondo-emergenza']);
  });

  it('returns CUSTOM fallback for null presetId', () => {
    expect(getPresetColor(null)).toBe(CUSTOM_PRESET_COLOR);
  });

  it('returns CUSTOM fallback for undefined presetId', () => {
    expect(getPresetColor(undefined)).toBe(CUSTOM_PRESET_COLOR);
  });

  it('returns CUSTOM fallback for empty string', () => {
    expect(getPresetColor('')).toBe(CUSTOM_PRESET_COLOR);
  });

  it('returns CUSTOM fallback for unknown preset id', () => {
    expect(getPresetColor('unknown-preset-xyz')).toBe(CUSTOM_PRESET_COLOR);
  });

  it('protects from prototype pollution via __proto__', () => {
    // If we used `PRESET_COLORS[presetId]` direct access, `__proto__` would
    // return Object.prototype. Using own-property check, should fallback.
    expect(getPresetColor('__proto__')).toBe(CUSTOM_PRESET_COLOR);
    expect(getPresetColor('constructor')).toBe(CUSTOM_PRESET_COLOR);
    expect(getPresetColor('hasOwnProperty')).toBe(CUSTOM_PRESET_COLOR);
  });
});
