/**
 * Deno tests for account-delete edge function.
 *
 * Run: `deno test supabase/functions/account-delete/`
 *
 * These tests cover the pure, side-effect-free parts (input validation,
 * table allow-lists). End-to-end tests against a real Supabase instance
 * should live in the integration suite — they require the edge function
 * to be served (`supabase functions serve account-delete`) and a seeded
 * test user, and are outside the scope of Sprint 1.8.
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

import {
  parseInput,
  USER_SCOPED_TABLES,
  FAMILY_SCOPED_TABLES,
} from './index.ts'

// ---------------------------------------------------------------------------
// parseInput
// ---------------------------------------------------------------------------

Deno.test('parseInput: rejects null / undefined / non-object', () => {
  // deno-lint-ignore no-explicit-any
  assertEquals((parseInput(null) as any).error, 'Invalid request body')
  // deno-lint-ignore no-explicit-any
  assertEquals((parseInput(undefined) as any).error, 'Invalid request body')
  // deno-lint-ignore no-explicit-any
  assertEquals((parseInput('string') as any).error, 'Invalid request body')
  // deno-lint-ignore no-explicit-any
  assertEquals((parseInput(42) as any).error, 'Invalid request body')
})

Deno.test('parseInput: rejects missing password', () => {
  // deno-lint-ignore no-explicit-any
  assertEquals((parseInput({}) as any).error, 'password is required')
  // deno-lint-ignore no-explicit-any
  assertEquals((parseInput({ password: '' }) as any).error, 'password is required')
  // deno-lint-ignore no-explicit-any
  assertEquals((parseInput({ password: 42 }) as any).error, 'password is required')
})

Deno.test('parseInput: rejects non-boolean exportDataFirst', () => {
  const parsed = parseInput({ password: 'hunter2', exportDataFirst: 'yes' })
  // deno-lint-ignore no-explicit-any
  assertEquals((parsed as any).error, 'exportDataFirst must be boolean')
})

Deno.test('parseInput: accepts valid input with default export=false', () => {
  const parsed = parseInput({ password: 'hunter2' })
  assertEquals(parsed, { password: 'hunter2', exportDataFirst: false })
})

Deno.test('parseInput: accepts valid input with exportDataFirst=true', () => {
  const parsed = parseInput({ password: 'hunter2', exportDataFirst: true })
  assertEquals(parsed, { password: 'hunter2', exportDataFirst: true })
})

Deno.test('parseInput: accepts valid input with exportDataFirst=false explicit', () => {
  const parsed = parseInput({ password: 'hunter2', exportDataFirst: false })
  assertEquals(parsed, { password: 'hunter2', exportDataFirst: false })
})

// ---------------------------------------------------------------------------
// Table allow-lists
// ---------------------------------------------------------------------------

Deno.test('USER_SCOPED_TABLES: covers every user-owned table from initial schema', () => {
  const expected = [
    'audit_logs',
    'banking_customers',
    'banking_connections',
    'banking_sync_logs',
    'user_preferences',
    'notifications',
    'push_subscriptions',
    'user_achievements',
  ]
  assertEquals([...USER_SCOPED_TABLES].sort(), expected.sort())
})

Deno.test('FAMILY_SCOPED_TABLES: covers every family-owned table from initial schema', () => {
  const expected = [
    'accounts',
    'budgets',
    'categories',
    'liabilities',
    'scheduled_transactions',
    'transactions',
  ]
  assertEquals([...FAMILY_SCOPED_TABLES].sort(), expected.sort())
})

Deno.test('table lists are disjoint', () => {
  const user = new Set<string>(USER_SCOPED_TABLES)
  for (const t of FAMILY_SCOPED_TABLES) {
    assertEquals(
      user.has(t),
      false,
      `${t} appears in both user-scoped and family-scoped — scope must be unambiguous`
    )
  }
})
