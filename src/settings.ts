import type { Context } from '@deepseek-ai/cordis'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'

/**
 * The namespace pattern the removed `settingsNamespace` helper enforced.
 *
 * dsh 0.1.2-alpha.1 deleted `settingsNamespace` and `installSettingsSection`
 * from `@deepseek-ai/dsh-settings`; a missing NAMED EXPORT is not a missing
 * service, but an ESM named import that resolves to nothing is a SyntaxError at
 * module evaluation, which cordis reports as a failed entry. So the stamping
 * lives here, as a local literal check, and only the TYPE is imported.
 */
const NAMESPACE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/** Stamp a profile entry id as a settings namespace. */
export function settingsNamespace(key: string): SettingsNamespace {
  if (!NAMESPACE_PATTERN.test(key)) {
    throw new TypeError(`settings namespace "${key}" must match ${String(NAMESPACE_PATTERN)}`)
  }
  return key as SettingsNamespace
}

/**
 * One entry as dsh 0.1.7's settings service projects it.
 *
 * Namespaces stopped being something a plugin registers and became something the
 * host derives from each entry's Config schema, keyed by profile entry id.
 */
interface NamespaceDescriptor {
  readonly ns: string
  readonly value: unknown
  readonly revision: number
}

interface SettingsFormsLike {
  describe?: (options?: { redactSecrets?: boolean }) => readonly NamespaceDescriptor[]
  update?: (ns: string, patch: object, expectedRevision?: number) => Promise<void> | void
}

function forms(ctx: Context): SettingsFormsLike | undefined {
  const service = (ctx as { settings?: unknown }).settings
  return typeof service === 'object' && service !== null ? service as SettingsFormsLike : undefined
}

/**
 * Resolved config of one profile entry.
 *
 * @returns the entry's live value plus the revision a write must echo back, or
 * `undefined` when this host cannot project that entry (no Config schema, entry
 * not composed yet, or a settings service without `describe`).
 */
export function readNamespace(
  ctx: Context,
  ns: SettingsNamespace,
): { readonly value: unknown; readonly revision: number } | undefined {
  const service = forms(ctx)
  if (typeof service?.describe !== 'function') return undefined
  const row = service.describe().find(item => item.ns === ns)
  return row === undefined ? undefined : { value: row.value, revision: row.revision }
}

/**
 * Merge fields into one entry's user layer.
 *
 * @param expectedRevision - revision from {@link readNamespace}; a stale one is
 * refused by the host instead of overwriting a concurrent edit.
 * @returns whether this host accepted form writes at all.
 */
export async function updateNamespace(
  ctx: Context,
  ns: SettingsNamespace,
  patch: object,
  expectedRevision?: number,
): Promise<boolean> {
  const service = forms(ctx)
  if (typeof service?.update !== 'function') return false
  await service.update(ns, patch, expectedRevision)
  return true
}
