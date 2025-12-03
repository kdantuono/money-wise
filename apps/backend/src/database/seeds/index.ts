/**
 * MoneyWise Database Seed - Entry Point
 * ================================================================================
 *
 * Default behavior: Minimal auth seed (family + users only)
 *
 * Available seeds:
 *   pnpm db:seed         - Minimal auth (DEFAULT)
 *   pnpm db:seed:auth    - Explicit minimal auth
 *   pnpm db:seed:demo    - Full demo data (accounts, transactions, etc.)
 *
 * For development, use auth seed + real SaltEdge connections.
 * Use demo seed only for screenshots, demos, or offline development.
 */

// Re-export from auth-seed and run it
import './auth-seed';
