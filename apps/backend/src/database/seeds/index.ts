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

import { main } from './auth-seed';

void main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Database seeding failed:', error);
  process.exit(1);
});
