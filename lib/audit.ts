import { supabaseAdmin } from './supabaseAdmin'
import { verifySession, getTokenFromRequest } from './auth'

interface AuditEntry {
  action: string
  entity?: string
  entityId?: string
  detail?: string
  school?: string | null
  // For events with no session yet (e.g. a login), pass the actor directly.
  actor?: { type: string; id?: string; name?: string }
}

// Records one audit event. Fails OPEN — a logging problem never breaks the
// underlying operation.
export async function logAudit(request: Request, e: AuditEntry): Promise<void> {
  try {
    let actorType = 'system'
    let actorId: string | undefined
    let actorName: string | undefined

    if (e.actor) {
      actorType = e.actor.type; actorId = e.actor.id; actorName = e.actor.name
    } else {
      const s = await verifySession(getTokenFromRequest(request))
      if (s) {
        actorType = s.user_type
        actorId = s.user_id
        if (s.user_type === 'admin') {
          const { data } = await supabaseAdmin.from('admins').select('username').eq('id', s.user_id).maybeSingle()
          actorName = data?.username
        } else {
          const { data } = await supabaseAdmin.from('teachers').select('name').eq('id', s.user_id).maybeSingle()
          actorName = data?.name
        }
      }
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || null

    await supabaseAdmin.from('audit_log').insert({
      actor_type: actorType,
      actor_id: actorId ?? null,
      actor_name: actorName ?? null,
      action: e.action,
      entity: e.entity ?? null,
      entity_id: e.entityId ?? null,
      detail: e.detail ?? null,
      school: e.school ?? null,
      ip,
    })
  } catch {
    /* never let auditing break the request */
  }
}
