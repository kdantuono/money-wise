# Strategia di Utilizzo Ottimale di Claude Code per Zecca

> **Contesto**: MVP MoneyWise 100% completo (1941+ test, 32 E2E, CI green). Prossimo step: migrazione completa a Supabase (Phase 0, 4-5 settimane) seguita da 18 settimane di roadmap con feature strategiche. Sviluppatore singolo.

---

## 1. Web Sessions vs CLI Locale: Quando Usare Cosa

### CLI Locale (terminale) — Il tuo strumento principale

Usa per **tutto il lavoro di implementazione attiva**:

- **Migrazione Phase 0**: Hai bisogno del Supabase MCP (`execute_sql`, `apply_migration`, `deploy_edge_function`, `list_tables`) che è disponibile **solo in locale**
- **Stripe integration (Phase 1)**: Anche il Stripe MCP (`create_product`, `create_price`, `search_stripe_documentation`) è **solo locale**
- **Comandi infrastrutturali**: `pnpm dev:web`, `validate-ci.sh`, gestione worktree git
- **Testing e debugging**: feedback loop stretti con output terminale diretto
- **Session recovery**: `/resume-work` legge i todo dal filesystem locale

### Web Sessions — Per pianificazione e review

Usa per **lavoro che richiede contesto ampio senza tool di sistema**:

- **Traduzioni schema larghe**: Alimenta lo schema Prisma completo (1,615 righe) e chiedi la traduzione in SQL Supabase. Il contesto web gestisce bene file grandi in una sola conversazione
- **Security review**: Dopo che una sessione locale produce RLS policies, apri una web session col diff e chiedi una revisione di sicurezza
- **Pianificazione fasi future**: Mentre Phase 0 procede in locale, usa una web session per decomporre Phase 1/2 con `/epic:init` concettuale
- **Generazione documentazione**: Aggiornamenti CLAUDE.md, guide di migrazione, API docs
- **Plan mode architetturale**: Quando vuoi che Claude analizzi e proponga senza eseguire

### Regola critica

> **Mai usare web sessions per lavoro che richiede Supabase MCP, Stripe MCP, o Figma MCP.** Sono disponibili solo nell'ambiente locale.

---

## 2. Strategia di Parallelizzazione

### Phase 0 (Settimane 1-5): Sequenziale con overlap di preparazione

La migrazione è **intrinsecamente sequenziale** (schema → auth → data layer → edge functions → cleanup). Ma puoi sovrapporre la preparazione:

```
Settimana 1 (locale): Schema + RLS + Auth setup
    ↕ contemporaneamente
    Web session: Drafta le seed SQL e DB functions per Settimana 2

Settimana 3 (locale): Migra i service files (1 per sessione)
    ↕ contemporaneamente
    Secondo terminale/worktree: Stubba le Edge Functions per Settimana 4
```

### Phase 1 (Settimane 6-9): DUE worktree paralleli — il vero payoff

I due track sono **genuinamente indipendenti**:

```bash
# Setup una volta, poi lavora in parallelo
git worktree add ../stripe-billing -b feature/stripe-billing main
git worktree add ../mobile-v1 -b feature/mobile-v1 main
```

| | Track A: Stripe Billing | Track B: Mobile v1 |
|---|---|---|
| **Tocca** | `supabase/functions/stripe-*`, `apps/web/src/app/billing/`, tabelle DB | `apps/mobile/` (quasi vuoto ora) |
| **Agente** | backend-specialist + Stripe MCP | frontend-specialist |
| **Conflitti** | Solo `packages/types/` (minimo) | Solo `packages/types/` (minimo) |
| **Sessione** | CLI locale #1 | CLI locale #2 |

**Pattern giornaliero**: Mattina = 2 sessioni Track A. Pomeriggio = 2 sessioni Track B. Revisioni incrociate nel tempo di attesa CI.

### Phase 2 (Settimane 10-13): Stesso pattern a due worktree

- **Track A**: AI agent backend (Edge Functions per insights, categorizzazione ML)
- **Track B**: Mobile core screens (schermate CRUD che leggono da Supabase)

### Quante sessioni in parallelo sono realistiche?

> **Due. Non tre, non quattro.**

Motivi:
- Ogni sessione produce PR che richiedono la tua review
- Ogni sessione può bloccarsi e richiederti input (permessi, decisioni di design, setup API keys)
- Il costo di context-switching tra 3 workstream supera il beneficio di parallelismo
- Puoi revieware l'output della Sessione B mentre la Sessione A esegue `validate-ci.sh`

---

## 3. Gestione delle Sessioni

### Scope ottimale: un file/funzione per sessione, NON un epic intero

| Tipo di lavoro | Scope per sessione | Perché |
|---|---|---|
| Migrazione service files (Phase 0, Week 3) | 1 service file (240-550 LOC) | Autocontenuto, testabile, committabile |
| Edge Functions (Phase 0, Week 4) | 1 funzione (100-400 LOC) | Deployabile indipendentemente |
| Componenti mobile (Phase 1-2) | 1-2 schermate | Scope visivo chiaro |
| RLS policies (Phase 0, Week 1) | Tutte le policy di 1 tabella | Devono essere testate insieme |

### Handoff tra sessioni — il pattern

1. **Fine sessione**: Assicurati che il todo list rifletta lo stato reale (persistenza automatica su disco)
2. **Commit descrittivo**: `feat(migration): migrate accounts.client.ts to Supabase SDK` — la prossima sessione con `/resume-work` legge `git log --oneline -5`
3. **Checklist nel doc**: Aggiorna `zecca-phase0-supabase-migration.md` marcando i task completati. Questo file è la tua progress bar persistente
4. **Inizio sessione successiva**: `/resume-work` → carica todo + contesto git automaticamente

### Quando ricominciare da zero vs continuare

**Ricomincia** quando:
- Il contesto mostra segni di auto-compressione (risposte meno specifiche, dimentica decisioni precedenti)
- Hai finito un file/funzione e passi al prossimo
- Sono passate più di 4 ore nella stessa sessione
- Dopo un merge — il file tree è cambiato e il contesto stale causa path allucinati

**Continua** quando:
- Sei a metà file e i test non passano ancora
- Stai debuggando un problema specifico nel contesto corrente

---

## 4. Approccio per Fase

### Phase 0: Migrazione Supabase (Settimane 1-5)

**Strategia branch**: UN singolo branch long-lived `migration/supabase-phase0` da `main`. Le modifiche sono cumulative — non usare feature branch per ogni settimana. Commit atomici nel branch, PR unica alla fine di Week 5 o PR settimanali su un branch `develop`.

#### Week 1: Schema + RLS + Auth

| Sessione | Tipo | Cosa | Agente suggerito |
|---|---|---|---|
| 1 | Web (plan mode) | Traduci schema.prisma (1,615 righe) → SQL Supabase. Review prima di applicare | database-specialist |
| 2 | Locale | Applica migrazione con `apply_migration`, verifica con `list_tables`, scrivi RLS policies | database-specialist |
| 3 | Locale | Auth Supabase setup, profiles trigger, test manuale | database-specialist |

#### Week 2: Seed + Web Auth

| Sessione | Tipo | Cosa | Agente suggerito |
|---|---|---|---|
| 1 | Locale | Porta seed files a SQL, testa con `execute_sql` | database-specialist |
| 2 | Locale | Migra `auth.store.ts` e `lib/api/proxy.ts` — la sessione più delicata | frontend-specialist |
| 3 | Locale | Migra `middleware.ts` a Supabase session checks | frontend-specialist |

#### Week 3: Data Layer (il grosso del lavoro)

**9 sessioni, una per service file**, in quest'ordine:

1. `accounts.client.ts` (436 LOC) — **questo stabilisce il pattern**
2. `transactions.client.ts` (448 LOC)
3. `budgets.client.ts` (445 LOC)
4. `categories.client.ts` (542 LOC)
5. `analytics.client.ts` (240 LOC)
6. `liabilities.client.ts` (428 LOC)
7. `scheduled.client.ts` (451 LOC)
8. `notifications.client.ts` (272 LOC)
9. `banking.client.ts` (550 LOC) — punta a Edge Functions, non Supabase diretto

**Pattern per ogni sessione**: Leggi file esistente → scrivi equivalente Supabase → aggiorna Zustand store → esegui test web → commit.

> **Dopo il primo file (`accounts`), usa plan mode direct execution per i restanti 8.** Il pattern è meccanico e ripetitivo.

#### Week 4: Edge Functions + Eliminazione NestJS

- Sessioni 1-5: Una banking Edge Function per sessione, deploy con `deploy_edge_function`
- Sessione 6: Business logic Edge Functions (categorize, transfers, BNPL)
- Sessione 7: **La sessione di eliminazione** — rimuovi `apps/backend/`, aggiorna workspace, turbo.json, CI

#### Week 5: Testing + Buffer

- Sessione 1: Test RLS con pgTAP o asserzioni SQL dirette
- Sessione 2: Aggiorna E2E Playwright per il nuovo auth flow
- Sessione 3: **Aggiorna CLAUDE.md** — critico, ogni sessione futura dipende da questo

### Phase 1+: Usa il sistema epic

A partire da Phase 1, il sistema epic aggiunge valore reale:

```
/epic:init stripe-billing    # Decompone in stories + task con dipendenze
/epic:init mobile-auth-nav   # Assegna agenti, identifica parallelismo
```

**Non usare `/epic:init` per Phase 0** — hai già un piano dettagliato giorno per giorno in `zecca-phase0-supabase-migration.md`. Il sistema epic aggiungerebbe overhead senza valore per una migrazione lineare.

---

## 5. Qualità e Review

### Come revieware codice AI-generated da solo dev

1. **Diff-first**: `git diff --stat` poi `git diff` dopo ogni sessione. Più efficiente che leggere file interi
2. **RLS è il confine di sicurezza**: Ogni policy DEVE avere un test esplicito: "User A può vedere dati di User B?" → scrivi come asserzioni SQL via `execute_sql`. Non fidarti senza test
3. **Esegui l'app**: Dopo ogni service file migrato → `pnpm dev:web` → click-through manuale della feature. I test unitari verificano correttezza del codice, non correttezza della feature
4. **Sfrutta la CI**: `validate-ci.sh` livelli 1-8 (senza Docker) dopo ogni 2-3 sessioni

### Plan mode vs esecuzione diretta

| Usa Plan Mode | Usa Esecuzione Diretta |
|---|---|
| Traduzione Prisma → Supabase SQL (Week 1) | Migrazione service files (Week 3, dopo il pattern stabilito) |
| Design RLS policies (sicurezza = review umana) | Scrittura test (basso rischio, alto valore) |
| Architettura Edge Functions | Aggiornamenti documentazione |
| Sessioni dove sei incerto sull'approccio | Lavoro meccanico/ripetitivo |

### Testing per fase

| Fase | Strategia test |
|---|---|
| Phase 0 | RLS policy test (SQL), E2E auth (Playwright), smoke test manuali. Target: RLS coverage su tutte le 10 tabelle core + 5 user flow critici |
| Phase 1 | Stripe webhook integration test (Stripe CLI `stripe trigger`), component test mobile (Jest + RNTL) |
| Phase 2 | AI output quality test (fixture-based), mobile snapshot test |
| Phase 3-4 | Integration test full stack, E2E per App Store readiness |

---

## 6. Efficienza e Costi

### Minimizzare contesto sprecato

1. **Non caricare tutto il codebase in ogni sessione.** CLAUDE.md (166 righe) basta per la maggior parte. Per le migrazioni service, fai leggere SOLO il file specifico + i docs Supabase SDK
2. **Usa gli agenti come device di contesto.** "Usa il database-specialist agent" carica solo `database-specialist.md`, non tutti i 13 agenti
3. **Scope la sessione immediatamente.** Inizia con: *"Migra `apps/web/src/services/budgets.client.ts` da NestJS API calls a Supabase client SDK. Il progetto Supabase è già setup con la tabella budgets e le RLS policies."* Non incollare l'intera roadmap in ogni sessione

### Quando usare subagent vs lavoro diretto

Per uno sviluppatore singolo, i subagent aggiungono latenza. Usali solo quando:
- Serve `security-specialist` per review di Edge Function con API keys SaltEdge
- Serve `test-specialist` per generare test dopo che `backend-specialist` ha scritto una Edge Function
- Stai eseguendo `/epic:execute` in Phase 1+ con task genuinamente paralleli

> **Per il grosso di Phase 0, lavoro diretto in una singola sessione è più efficiente dell'orchestrazione di subagent.**

### Mapping agenti per fase

| Fase | Agenti Primari | Motivo |
|---|---|---|
| Phase 0, Week 1 | database-specialist | Schema, RLS policies |
| Phase 0, Week 2-3 | frontend-specialist | Web auth + service migration |
| Phase 0, Week 4 | backend-specialist | Edge Functions (logica server) |
| Phase 0, Week 5 | test-specialist, security-specialist | Testing + review |
| Phase 1, Track A | backend-specialist + Stripe MCP | Billing module |
| Phase 1, Track B | frontend-specialist | Mobile screens |
| Phase 2, Track A | architect + backend-specialist | AI agent design + impl |
| Phase 2, Track B | frontend-specialist | Mobile core screens |
| Phase 3 | database-specialist + frontend-specialist | Gamification schema + UI |

---

## 7. Workflow Giornaliero Concreto

### Durante Phase 0 (sequenziale)

```
🌅 Mattina
├── Apri terminale → /resume-work
├── Controlla checklist in zecca-phase0-supabase-migration.md
├── Sessione 1 (45-90 min): Un task dal piano giornaliero
├── Commit → prossimo task
├── Sessione 2 (45-90 min): Prossimo task
└── validate-ci.sh 8 dopo l'ultima sessione

🌆 Pomeriggio
├── Web session (opzionale): Pianifica il lavoro di domani o review diff complessi
├── Push branch → verifica CI
└── Aggiorna todo list per session recovery domani
```

### Durante Phase 1+ (parallelo)

```
🌅 Mattina — Track A (es. Stripe)
├── Terminale 1, worktree stripe-billing
├── 2 sessioni focalizzate (45-90 min ciascuna)
└── Lancia CI su Track A

🌆 Pomeriggio — Track B (es. Mobile)
├── Terminale 2, worktree mobile-v1
├── 2 sessioni focalizzate (45-90 min ciascuna)
└── Lancia CI su Track B

🌙 Fine giornata
├── Review CI di entrambi i track
├── Se entrambi passano → push entrambi i branch
└── Aggiorna todo list
```

---

## 8. Mitigazioni Rischi Specifiche

| Rischio | Mitigazione |
|---|---|
| **SaltEdge in Deno** (Phase 0, Week 4) | Spike di 1 giorno: implementa solo `banking-initiate-link` con la chiamata API più basica. Se Deno regge → procedi. Se no → pivot a Node.js su Fly.io. Max 1 giorno su questo spike |
| **Bug RLS** | Scrivi test RLS PRIMA di migrare qualsiasi service file. Se una policy è sbagliata, ottieni data leakage silenziosa o risultati vuoti silenziosi |
| **Context window esaurito** | Schema Prisma (1,615 righe) + un service file (≤550 righe) = ok in una sessione. Mai provare a migrare tutti i 9 service file in una sessione |
| **Merge conflicts tra track** | I track sono progettati per non sovrapporsi. L'unico punto di contatto è `packages/types/` — aggiornalo da un solo track alla volta |

---

## 9. Riepilogo Decisionale

```
                        FASE 0                    FASE 1-2                  FASE 3-4
                     (Migration)               (Features)                (Polish+Launch)

Ambiente:           CLI locale solo          CLI locale ×2              CLI locale ×2
                                             (worktree)                 (worktree)

Sessioni/giorno:    3-4 (sequenziali)        4 (2+2 parallele)         3-4

Scope sessione:     1 file / 1 funzione      1 screen / 1 endpoint     1 feature chunk

Branch strategy:    1 branch long-lived       2 feature branch          2 feature branch
                    migration/supabase-phase0 in worktree separati      in worktree separati

Epic system:        NO (piano già dettagliato) SÌ (/epic:init)          SÌ

Plan mode:          Week 1 (schema, RLS)      Architettura AI           Launch checklist
                    + review sicurezza         (Phase 2, Track A)

Web sessions:       Schema translation,        Decomposizione            Marketing copy,
                    review, doc generation     epiche future             docs finali
```

---

## File Critici da Conoscere

- `docs/planning/zecca-phase0-supabase-migration.md` — La checklist giorno-per-giorno che guida ogni sessione di Phase 0
- `docs/planning/zecca-unified-roadmap.md` — Source of truth per il roadmap a 18 settimane
- `apps/backend/prisma/schema.prisma` — La guida per la traduzione SQL Supabase (1,615 LOC)
- `apps/web/src/services/accounts.client.ts` — Il template per le 9 migrazioni di service file
- `CLAUDE.md` — **DEVE essere aggiornato alla fine di Phase 0** — ogni sessione futura dipende da questo
- `.claude/settings.json` — Contiene il flag agent teams; andrà aggiornato post-migrazione

## Verifica

Per validare che la strategia funziona, dopo la prima settimana di Phase 0:
1. Lo schema SQL Supabase esiste e `list_tables` mostra tutte le 21 tabelle
2. Le RLS policies sono in piedi con test SQL che dimostrano isolamento family
3. L'auth Supabase funziona (register → verify → login → logout) testato manualmente
4. Il workflow sessione (resume-work → lavoro → commit → CI) è fluido
5. Il ritmo è di 3-4 sessioni/giorno con commit dopo ogni sessione
