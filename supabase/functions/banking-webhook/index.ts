/**
 * banking-webhook — Saltedge webhook handler v2 (Phase 04 refactor 2026-04-26).
 *
 * Cambi rispetto a legacy:
 *  - **Webhook signature verification mandatory** (chiusura gap B19 ADR-0008):
 *    prima azione del handler, reject 401 + audit log se invalid.
 *  - Schema v2: provider_connections (non più banking_connections),
 *    financial_positions + cash_accounts/credit_lines/loans/bnpl_plans/etc
 *    (non più accounts), set audit_source='webhook' prima delle mutazioni.
 *  - Mapping nature canonical 11+ via mapSaltedgeNatureToKind() (ratifica 2).
 *  - Idempotency su (saltedge_connection_id) sostituita da provider_connection_id v2.
 *
 * SaltEdge webhook stages (URL-encoded in path):
 *  - .../banking-webhook/notify  → start (connection creation initiated)
 *  - .../banking-webhook/success → finish (connection authorized + accounts fetched)
 *  - .../banking-webhook/fail    → fail (connection rejected/expired)
 *
 * Always returns 200 to prevent SaltEdge retries (anti-amplification),
 * salvo per signature/auth fail dove ritorna 401 con body opaco (ADR-0008).
 */

import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, setAuditSource } from '../_shared/supabase.ts'
import {
  SaltEdgeClient,
  type SaltEdgeAccount,
  mapSaltedgeNatureToKind,
  mapSaltedgeStatus,
  verifySignature,
} from '../_shared/saltedge.ts'

interface WebhookPayload {
  data: {
    customer_id: string
    connection_id?: string
    error_class?: string
    error_message?: string
    provider_code?: string
    provider_name?: string
    country_code?: string
    custom_fields?: Record<string, unknown>
  }
  meta: {
    version: string
    time: string
  }
}

function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function reject401(): Response {
  // Body opaco intenzionalmente per non leakare detail su perché reject (ADR-0008)
  return new Response('', { status: 401, headers: corsHeaders })
}

async function logInvalidSignature(
  reason: string,
  customerHint?: string,
): Promise<void> {
  try {
    const supabase = createServiceClient()
    await setAuditSource(supabase, 'webhook_invalid_signature')
    await supabase.from('data_audit_logs').insert({
      table_name: 'banking_webhook_endpoint',
      record_id: '00000000-0000-0000-0000-000000000000',  // sentinel: no real record
      operation: 'INSERT',
      source: 'webhook_invalid_signature',
      new_values: { reason, customer_hint: customerHint ?? null, occurred_at: new Date().toISOString() },
    })
  } catch (err) {
    // Audit log fail non deve far passare il reject — log a console per debug
    console.error('[banking-webhook] logInvalidSignature failed:', err)
  }
}

async function fetchAndStoreAccounts(
  supabase: ReturnType<typeof createServiceClient>,
  saltEdge: SaltEdgeClient,
  householdId: string,
  saltEdgeConnectionId: string,
  providerConnectionId: string,  // Q9 ratifica Phase 04: propagation per multi-connection scope
): Promise<void> {
  let accounts: SaltEdgeAccount[]
  try {
    accounts = await saltEdge.getAccounts(saltEdgeConnectionId)
  } catch (err) {
    console.warn('[banking-webhook] Failed to fetch accounts:', err)
    return
  }

  let connectionData
  try {
    connectionData = await saltEdge.getConnection(saltEdgeConnectionId)
  } catch (err) {
    console.warn('[banking-webhook] Failed to get connection details:', err)
    return
  }

  await setAuditSource(supabase, 'webhook')

  for (const seAccount of accounts) {
    try {
      const saltEdgeAcctId = String(seAccount.id)
      const map = mapSaltedgeNatureToKind(seAccount.nature)

      // Idempotency v2: lookup via provider_connection_id + provider_account_id
      // (Phase 04 ALTER Q9: multi-connection scope discriminator)
      const { data: existing } = await supabase
        .from('financial_positions')
        .select('id')
        .eq('provider_connection_id', providerConnectionId)
        .eq('provider_account_id', saltEdgeAcctId)
        .eq('household_id', householdId)
        .maybeSingle()

      // Pattern di population balance: ratifica 5 — Saltedge canonical.
      // current_balance_cents = round(saltedge_balance * 10^currencies.decimals)
      const { data: currencyMeta } = await supabase
        .from('currencies')
        .select('decimals')
        .eq('code', seAccount.currency_code.toUpperCase())
        .maybeSingle()
      const decimals = currencyMeta?.decimals ?? 2
      const balanceCents = Math.round(seAccount.balance * Math.pow(10, decimals))

      let positionId: string

      if (existing) {
        await supabase
          .from('financial_positions')
          .update({ current_balance_cents: balanceCents, balance_as_of: new Date().toISOString() })
          .eq('id', existing.id)
        positionId = existing.id

        // Audit warning per nature drift detection (ratifica 4)
        if (map.requiresWarning) {
          await supabase.from('data_audit_logs').insert({
            user_id: null,
            table_name: 'financial_positions',
            record_id: positionId,
            operation: 'UPDATE',
            source: 'sync',
            new_values: {
              unmapped_saltedge_nature: seAccount.nature,
              position_id: positionId,
              defaulted_to: 'OTHER',
            },
          })
        }
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('financial_positions')
          .insert({
            household_id: householdId,
            name: seAccount.name,
            currency: seAccount.currency_code.toUpperCase(),
            provider: 'saltedge',
            provider_account_id: saltEdgeAcctId,
            provider_connection_id: providerConnectionId,  // Phase 04 ALTER Q9
            nature: map.nature,
            kind: map.kind,
            current_balance_cents: balanceCents,
            balance_as_of: new Date().toISOString(),
            status: 'ACTIVE',
            provider_country_code: connectionData.country_code?.toUpperCase() ?? null,
          })
          .select('id')
          .single()

        if (insertError || !inserted) {
          console.warn(`[banking-webhook] Failed to insert position for ${saltEdgeAcctId}:`, insertError)
          continue
        }
        positionId = inserted.id

        // CTI child table insert basato su kind
        if (map.kind === 'CASH') {
          await supabase.from('cash_accounts').insert({
            position_id: positionId,
            iban: seAccount.extra?.iban ?? null,
            account_holder_name: seAccount.extra?.holder_name ?? null,
          })
        } else if (map.kind === 'CREDIT_LINE') {
          // Sentinel removed Phase 04 pass correttivo: NULL + is_complete=false invece di valori 0/1 fasulli.
          // UI futura completerà i dati via flag.
          await supabase.from('credit_lines').insert({
            position_id: positionId,
            credit_limit_cents: null,
            is_complete: false,
          })
        } else if (map.kind === 'LOAN') {
          // Sentinel removed Phase 04 pass correttivo: NULL + is_complete=false invece di valori 0/1 fasulli.
          // UI futura completerà i dati via flag.
          await supabase.from('loans').insert({
            position_id: positionId,
            original_principal_cents: null,
            outstanding_principal_cents: Math.abs(balanceCents),
            interest_rate_apr: null,
            term_months: null,
            start_date: new Date().toISOString().split('T')[0],
            amortization_type: seAccount.nature?.toLowerCase() === 'mortgage' ? 'FRENCH' : 'OTHER',
            is_complete: false,
          })
        } else if (map.kind === 'INVESTMENT') {
          await supabase.from('investment_accounts').insert({
            position_id: positionId,
            account_holder_name: seAccount.extra?.holder_name ?? null,
          })
        }
        // kind === 'OTHER' → no child table (Phase 01 trigger 2)
        // kind === 'BNPL'/'CRYPTO' non da Saltedge in questo flusso

        // Audit warning per nature drift (ratifica 4)
        if (map.requiresWarning) {
          await supabase.from('data_audit_logs').insert({
            user_id: null,
            table_name: 'financial_positions',
            record_id: positionId,
            operation: 'INSERT',
            source: 'sync',
            new_values: {
              unmapped_saltedge_nature: seAccount.nature,
              position_id: positionId,
              defaulted_to: 'OTHER',
            },
          })
        }
      }
    } catch (err) {
      console.warn(`[banking-webhook] Failed to store account ${seAccount.id}:`, err)
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonOk({ status: 'error', message: 'Method not allowed' })
  }

  // ─── STEP 1 — Webhook signature verification (B19, ADR-0008) ──────────
  // Mandatory pre-payload-parse. Reject 401 + audit log se invalid.
  // Nessun bypass per dev/staging — mock con signature mock + key mock se serve.
  const publicKeyPem = Deno.env.get('SALTEDGE_WEBHOOK_PUBLIC_KEY') ?? ''
  if (!publicKeyPem) {
    console.error('[banking-webhook] SALTEDGE_WEBHOOK_PUBLIC_KEY not configured')
    await logInvalidSignature('missing_public_key_env')
    return reject401()
  }

  const signatureHeader = req.headers.get('Signature') ?? ''
  const rawBody = await req.text()

  // Parse early per estrarre meta.time per replay protection (verifySignature lo legge)
  let parsedForVerify: WebhookPayload | null = null
  try {
    parsedForVerify = JSON.parse(rawBody) as WebhookPayload
  } catch {
    // Payload non-JSON: signature verify comunque, ma timestamp undefined skipa replay check
    parsedForVerify = null
  }

  const verifyResult = await verifySignature(
    rawBody,
    signatureHeader,
    publicKeyPem,
    parsedForVerify?.meta?.time,
  )

  if (!verifyResult.valid) {
    await logInvalidSignature(verifyResult.reason ?? 'unknown', parsedForVerify?.data?.customer_id)
    return reject401()
  }

  // ─── STEP 2 — Process payload (signature valid) ────────────────────────
  try {
    const saltEdge = new SaltEdgeClient()
    const supabase = createServiceClient()

    const payload = parsedForVerify
    if (!payload?.data?.customer_id) {
      console.warn('[banking-webhook] Missing customer_id in payload (post-verify)')
      return jsonOk({ status: 'error', message: 'Missing customer_id' })
    }

    const { data } = payload

    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1]

    let stage: 'start' | 'finish' | 'fail'
    if (lastSegment === 'notify') stage = 'start'
    else if (lastSegment === 'fail') stage = 'fail'
    else if (lastSegment === 'success') stage = 'finish'
    else stage = data.error_class ? 'fail' : 'finish'

    console.log(JSON.stringify({
      event: 'banking_webhook_received',
      customer_id: data.customer_id,
      connection_id: data.connection_id,
      stage,
    }))

    // Step 3: Find provider_connection by provider_customer_id (Phase 03 ALTER)
    await setAuditSource(supabase, 'webhook')
    const { data: pc } = await supabase
      .from('provider_connections')
      .select('id, household_id')
      .eq('provider_customer_id', data.customer_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!pc) {
      console.warn(`[banking-webhook] No provider_connection for customer: ${data.customer_id}`)
      return jsonOk({ status: 'ok' })
    }

    // Step 4: Update provider_connection based on stage
    const householdId = pc.household_id

    switch (stage) {
      case 'start':
        await supabase
          .from('provider_connections')
          .update({
            status: 'REAUTH_REQUIRED',  // ancora pending OAuth
            provider_connection_id: data.connection_id ?? null,
          })
          .eq('id', pc.id)
        break

      case 'finish': {
        const saltEdgeConnId = data.connection_id!
        let providerCode: string | null = data.provider_code ?? null
        let providerName: string | null = data.provider_name ?? null
        let countryCode: string | null = data.country_code ?? null
        let lastSuccessAt: string | null = null
        let authStatus: string | undefined
        let errorClass: string | undefined

        try {
          const connDetails = await saltEdge.getConnection(saltEdgeConnId)
          providerCode = connDetails.provider_code
          providerName = connDetails.provider_name
          countryCode = connDetails.country_code
          lastSuccessAt = connDetails.last_success_at ?? null
          authStatus = connDetails.authentication_status
          errorClass = connDetails.error_class
        } catch (err) {
          console.warn('[banking-webhook] Failed to fetch connection details:', err)
        }

        const newStatus = authStatus
          ? mapSaltedgeStatus(authStatus, errorClass)
          : 'ACTIVE'

        await supabase
          .from('provider_connections')
          .update({
            status: newStatus,
            provider_connection_id: saltEdgeConnId,
            last_successful_sync_at: lastSuccessAt
              ? new Date(lastSuccessAt).toISOString()
              : new Date().toISOString(),
            last_error_code: null,
            last_error_at: null,
          })
          .eq('id', pc.id)

        // Auto-fetch accounts → financial_positions + child CTI
        if (newStatus === 'ACTIVE') {
          await fetchAndStoreAccounts(supabase, saltEdge, householdId, saltEdgeConnId, pc.id)
        }
        break
      }

      case 'fail':
        await supabase
          .from('provider_connections')
          .update({
            status: data.error_class ? mapSaltedgeStatus('error', data.error_class) : 'ERROR_GENERIC',
            provider_connection_id: data.connection_id ?? null,
            last_error_code: data.error_class ?? 'unknown',
            last_error_at: new Date().toISOString(),
          })
          .eq('id', pc.id)
        break
    }

    return jsonOk({ status: 'ok' })
  } catch (error) {
    console.error('[banking-webhook] Unhandled error:', error)
    return jsonOk({ status: 'ok' })
  }
})
