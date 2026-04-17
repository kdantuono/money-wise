/**
 * Tests for onboarding type helpers.
 */

import { describe, it, expect } from 'vitest';
import { parseOnboardingPayload } from '../../src/types/onboarding';

describe('parseOnboardingPayload', () => {
  it('returns null for null / undefined / primitive input', () => {
    expect(parseOnboardingPayload(null)).toBeNull();
    expect(parseOnboardingPayload(undefined)).toBeNull();
    expect(parseOnboardingPayload('payload')).toBeNull();
    expect(parseOnboardingPayload(42)).toBeNull();
    expect(parseOnboardingPayload(false)).toBeNull();
  });

  it('returns null when completedAt is missing', () => {
    expect(
      parseOnboardingPayload({
        incomeRange: '1500-3000',
        savingsGoal: 'house',
        goals: ['home', 'retire'],
        aiPreferences: ['auto-categorize'],
      })
    ).toBeNull();
  });

  it('parses a well-formed payload', () => {
    const raw = {
      incomeRange: '3000-5000',
      savingsGoal: 'emergency-fund',
      goals: ['safety-net', 'travel'],
      aiPreferences: ['auto-categorize', 'monthly-insights'],
      completedAt: '2026-04-17T06:00:00.000Z',
    };
    expect(parseOnboardingPayload(raw)).toEqual(raw);
  });

  it('coerces missing string fields to empty string', () => {
    const parsed = parseOnboardingPayload({
      completedAt: '2026-04-17T06:00:00.000Z',
    });
    expect(parsed).toEqual({
      incomeRange: '',
      savingsGoal: '',
      goals: [],
      aiPreferences: [],
      completedAt: '2026-04-17T06:00:00.000Z',
    });
  });

  it('filters out non-string array entries', () => {
    const parsed = parseOnboardingPayload({
      incomeRange: 'under-1500',
      savingsGoal: 'house',
      goals: ['home', 42, null, 'retire', { nested: true }],
      aiPreferences: [true, 'auto-categorize', 0],
      completedAt: '2026-04-17T06:00:00.000Z',
    });
    expect(parsed?.goals).toEqual(['home', 'retire']);
    expect(parsed?.aiPreferences).toEqual(['auto-categorize']);
  });

  it('ignores unknown keys without throwing', () => {
    const parsed = parseOnboardingPayload({
      incomeRange: 'over-5000',
      savingsGoal: 'retire',
      goals: ['retire'],
      aiPreferences: [],
      completedAt: '2026-04-17T06:00:00.000Z',
      wizardVersion: 2,
      extraSurvey: { foo: 'bar' },
    });
    expect(parsed).toEqual({
      incomeRange: 'over-5000',
      savingsGoal: 'retire',
      goals: ['retire'],
      aiPreferences: [],
      completedAt: '2026-04-17T06:00:00.000Z',
    });
  });
});
