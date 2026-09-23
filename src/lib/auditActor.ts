export type AuditActor = {
  actorCcgid?: string | null
  actorName?: string | null
  subjectCcgid?: string | null
  subjectName?: string | null
  subjectPositionId?: string | null
  delegated?: boolean
}

function trimmed(value?: string | null) {
  return value?.trim() || ''
}

function isSameIdentity(name?: string | null, ccgid?: string | null) {
  const label = trimmed(name)
  const id = trimmed(ccgid)
  return Boolean(label && id && label.toLowerCase() === id.toLowerCase())
}

/** Prefer a live display name; skip values that are just the CCGID. */
export function personLabel(name?: string | null, ccgid?: string | null) {
  const label = trimmed(name)
  if (label && !isSameIdentity(label, ccgid)) return label
  return ''
}

export function actorLabel(actor?: AuditActor | null) {
  return personLabel(actor?.actorName, actor?.actorCcgid)
    || trimmed(actor?.actorName)
    || trimmed(actor?.actorCcgid)
}

/** Owner/subject first, matching TMS Created by (name + via). */
export function ownerLabel(actor?: AuditActor | null) {
  return personLabel(actor?.subjectName, actor?.subjectCcgid)
    || personLabel(actor?.actorName, actor?.actorCcgid)
    || trimmed(actor?.subjectName)
    || trimmed(actor?.actorName)
    || trimmed(actor?.subjectCcgid)
    || trimmed(actor?.actorCcgid)
}

export function onBehalfLabel(actor?: AuditActor | null) {
  if (!actor) return ''
  const name = actor.subjectName?.trim() || actor.subjectCcgid?.trim() || ''
  const position = actor.subjectPositionId?.trim()
  if (name && position) return `${name} · Position ${position}`
  if (name) return name
  return position ? `Position ${position}` : ''
}

export function viaLabel(actor?: AuditActor | null) {
  const name = actorLabel(actor)
  return name ? `via ${name}` : ''
}

/** One-line Created-by form: {@code Name} or {@code Name via Actor}. */
export function ownerViaLabel(actor?: AuditActor | null) {
  const owner = ownerLabel(actor)
  if (!owner) return ''
  if (!hasDistinctActor(actor)) return owner
  const via = viaLabel(actor)
  return via ? `${owner} ${via}` : owner
}

export function isDelegated(actor?: AuditActor | null) {
  return Boolean(actor?.delegated)
}

export function hasDistinctActor(actor?: AuditActor | null) {
  if (!actor) return false
  const actorId = actor.actorCcgid?.trim().toLowerCase() ?? ''
  const subjectId = actor.subjectCcgid?.trim().toLowerCase() ?? ''
  return Boolean(actorId && subjectId && actorId !== subjectId)
}

export function sameAuditActor(left?: AuditActor | null, right?: AuditActor | null) {
  if (!left || !right) return left == right
  return (
    (left.actorCcgid ?? '').toLowerCase() === (right.actorCcgid ?? '').toLowerCase()
    && (left.subjectCcgid ?? '').toLowerCase() === (right.subjectCcgid ?? '').toLowerCase()
    && Boolean(left.delegated) === Boolean(right.delegated)
  )
}
