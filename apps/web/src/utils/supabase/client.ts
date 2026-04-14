/**
 * Supabase Browser Client
 *
 * Use this in Client Components ('use client').
 * The client automatically handles auth token refresh via cookies.
 */

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseKey)
