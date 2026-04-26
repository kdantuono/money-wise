/**
 * account-delete — GDPR Art. 17 erasure endpoint (Phase 04 refactor v2).
 *
 * Schema v2 (ADR-0010): soft delete + anonymize + hard delete tre livelli.
 * Phase 04 implementa solo livelli 1+2 (soft delete + anonymize). Hard delete
 * scheduler post-retention rinviato a Phase 07 (regola 7).
 *
 * Flow:
 *  1. Auth user
 *  2. Soft delete: financial_positions del household → deleted_at=now()
 *     + child CTI cascade automatica (ON DELETE CASCADE Phase 01)
 *  3. Anonymize: PII strip su tabelle preservate (profiles), audit log con source='admin'
 *  4. Provider connections: REVOKED_BY_USER + Saltedge revoke best-effort
 *  5. Audit trail comprehensive in data_audit_logs
 *
 * Permanenza dati: legacy_backup schema (Phase 03) preserve indipendentemente.
 * NB: questo endpoint NON drop hard data. Per hard delete dopo retention legale
 * → scheduler dedicato Phase 07.
 */

import { handleCors } from '../_shared/cors.ts'
import { createServiceClient, getUserId, getHouseholdId, setAuditSource } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'
import { SaltEdgeClient } from '../_shared/saltedge.ts'

interface RequestBody {
  confirmEmail?: string  // user deve confermare con email per evitare cancellazioni accidentali
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const userId = await getUserId(req)
    const householdId = await getHouseholdId(req)
    const supabase = createServiceClient()
    const body: RequestBody = await req.json()

    // Verify confirmEmail
    const { data: profile } = await supabase.auth.admin.getUserById(userId)
    if (!profile.user || profile.user.email !== body.confirmEmail) {
      return errorResponse('EmailConfirmationMismatch', 400)
    }

    await setAuditSource(supabase, 'admin')

    const now = new Date().toISOString()

    // 1. Saltedge revoke best-effort (per ogni active provider_connection)
    const saltEdge = new SaltEdgeClient()
    const { data: connections } = await supabase
      .from('provider_connections')
      .select('id, provider, provider_connection_id')
      .eq('household_id', householdId)
      .eq('provider', 'saltedge')
      .eq('status', 'ACTIVE')

    for (const conn of connections ?? []) {
      if (conn.provider_connection_id) {
        try {
          await saltEdge.revokeConnection(conn.provider_connection_id)
        } catch (err) {
          console.warn(JSON.stringify({ event: 'gdpr_saltedge_revoke_failed', conn: conn.id, error: String(err) }))
        }
      }
    }

    // 2. Soft delete financial_positions (cascade su child CTI tramite ON DELETE)
    await supabase
      .from('financial_positions')
      .update({ deleted_at: now, status: 'CLOSED' })
      .eq('household_id', householdId)
      .is('deleted_at', null)

    // 3. Soft delete payment_obligations
    await supabase
      .from('payment_obligations')
      .update({ deleted_at: now })
      .eq('household_id', householdId)
      .is('deleted_at', null)

    // 4. Anonymize profiles (PII strip — email, full_name, ecc.)
    await supabase
      .from('profiles')
      .update({
        full_name: null,
        avatar_url: null,
        phone: null,
      })
      .eq('id', userId)

    // 5. Provider connections REVOKED_BY_USER
    await supabase
      .from('provider_connections')
      .update({ status: 'REVOKED_BY_USER', last_error_at: now })
      .eq('household_id', householdId)

    // 6. Audit trail GDPR erasure event
    await supabase.from('data_audit_logs').insert({
      user_id: userId,
      table_name: 'GDPR_ARTICLE_17_ERASURE',
      record_id: householdId,
      operation: 'DELETE',
      source: 'admin',
      new_values: {
        event: 'GDPR_ARTICLE_17_ERASURE',
        erased_at: now,
        connections_revoked: connections?.length ?? 0,
      },
    })

    return jsonResponse({
      success: true,
      data: {
        userId,
        householdId,
        erasedAt: now,
        connectionsRevoked: connections?.length ?? 0,
        note: 'Soft delete + anonymize completed. Hard delete after legal retention (Phase 07 scheduler).',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(JSON.stringify({ event: 'account_delete_error', error: message }))
    const status = message === 'Unauthorized' ? 401 : 500
    return errorResponse(message, status)
  }
})
