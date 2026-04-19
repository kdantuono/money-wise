# Security Policy

## Reporting a Vulnerability

MoneyWise (brand Zecca) è un PFM personale in fase beta privata (2026). La privacy e la sicurezza dei dati finanziari degli utenti sono priorità assolute.

### Come segnalare

**Non aprire issue pubblici per vulnerabilità di sicurezza.** Segnalare via uno di questi canali:

1. **GitHub Security Advisory** (preferito): [Open a private advisory](https://github.com/kdantuono/money-wise/security/advisories/new)
2. **Email diretta**: `cosmo.dantuono+security@gmail.com` (GPG-encrypted preferita)

### Cosa includere

- Descrizione dettagliata della vulnerabilità
- Passi per riprodurla
- Impatto stimato (data exposure, RCE, XSS, CSRF, SSRF, IDOR, auth bypass, etc.)
- Fix proposto (se disponibile)
- Il tuo nome/handle per credit (opzionale)

### Timeline di risposta

- **Acknowledge**: entro 72h dalla segnalazione
- **Triage + severity**: entro 7 giorni
- **Patch**: finestra basata su severity
  - 🔴 Critical (RCE, auth bypass, data exposure cross-tenant): entro 72h-7gg
  - 🟠 High (IDOR, XSS, CSRF): entro 14gg
  - 🟡 Medium: prossima release beta (2-4 settimane)
  - 🟢 Low: backlog documentato
- **Disclosure**: coordinata con reporter, preferibilmente dopo patch live

### Scope

**In-scope**:
- `apps/web/` — Next.js 15 application
- `apps/mobile/` — Expo React Native (dormiente pre-beta, framework decision ADR-005 pendente)
- `supabase/functions/` — Deno Edge Functions
- `supabase/migrations/` — PostgreSQL schema + RLS policies
- CI/CD workflows in `.github/workflows/`

**Out-of-scope**:
- Fork/clone del repository che non siano esposti in produzione
- Attacchi DoS su infrastruttura Supabase (reportare a Supabase security)
- Social engineering degli sviluppatori

## Architettura di sicurezza

### Authorization boundary

- **Supabase Auth** (JWT via `@supabase/ssr` cookie-based sessions) è l'authentication gate
- **Row-Level Security (RLS)** su tutte le tabelle `public.*` è l'authorization boundary canonica — enforce server-side, non lato client
- Tutte le RLS policies usano il pattern `(SELECT auth.uid())` caching per evitare re-evaluation per-row su large result sets

### Secrets management

- Public env vars (`NEXT_PUBLIC_*`) sono designed-for-exposure (Supabase anon key, URL pubblico progetto) — **non sono segreti**
- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, webhook signing keys, Sentry auth token) sono stored in:
  - GitHub Actions secrets (CI/CD)
  - Supabase Edge Functions env vars (runtime)
  - Vercel project env vars (deploy)
- **Mai committare** file `.env.local`, `.env.production`, file `*.key`, o qualsiasi valore di segreto al repository

### Ongoing monitoring

- **GitHub Secret Scanning** + Push Protection: abilitato
- **Dependabot**: security updates abilitati
- **CodeQL**: abilitato per scansioni periodiche
- **Supabase Advisors**: security + performance lint eseguito dopo ogni DDL change

### Known limitations (beta)

- **Password leaked protection Supabase Auth**: attualmente DISABILITATA. Tracked per abilitazione pre-launch beta.
- **Strong password dev bypass**: environment `development` permette password deboli per test fixtures. Rimosso pre-deploy.
- **Password history NOOP**: non applica history constraint su change password. Deferred post-beta.

## Hall of Fame

Ringraziamenti ai security researcher che hanno contribuito responsabilmente:

_(Vuoto — sarai il primo se segnali un issue.)_
