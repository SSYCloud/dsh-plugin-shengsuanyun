import type { Context } from '@deepseek-ai/cordis'
import { LLM_SETTINGS, PROVIDER, defaultProviderProfile, modelSeed } from './constants.js'
import { providerNeedsDeclare, withRememberedModel } from './flow.js'
import { readNamespace, settingsNamespace, updateNamespace } from './settings.js'

const LLM_NS = settingsNamespace(LLM_SETTINGS)

interface StoredSection {
  readonly providers?: Readonly<Record<string, { readonly models?: readonly { readonly id: string }[] }>>
}

function modelsOf(section: unknown): readonly { readonly id: string }[] | undefined {
  if (typeof section !== 'object' || section === null) return undefined
  const models = (section as StoredSection).providers?.[PROVIDER]?.models
  if (!Array.isArray(models)) return undefined
  return models.filter((item): item is { readonly id: string } =>
    typeof item === 'object' && item !== null && typeof (item as { id?: unknown }).id === 'string')
}

/** Add the desktop route once. A route that is already there is not rewritten. */
export async function ensureProvider(ctx: Context): Promise<void> {
  const section = readNamespace(ctx, LLM_NS)
  if (section === undefined) {
    ctx.logger.warn('shengsuanyun: llm-pi-ai settings are not registered, so the provider route was not added')
    return
  }
  if (!providerNeedsDeclare(section.value)) return
  const written = await updateNamespace(
    ctx,
    LLM_NS,
    { providers: { [PROVIDER]: defaultProviderProfile() } },
    section.revision,
  )
  if (!written) {
    ctx.logger.warn('shengsuanyun: this host does not accept settings form writes, so the provider route was not added')
    return
  }
  ctx.logger.info('shengsuanyun: declared provider route shengsuanyun')
}

/** Put a chosen chat model on the route without dropping models already listed. */
export async function rememberModel(ctx: Context, modelId: string): Promise<void> {
  const section = readNamespace(ctx, LLM_NS)
  const next = withRememberedModel(modelsOf(section?.value), modelId, modelSeed(modelId))
  if (next === undefined) return
  await updateNamespace(
    ctx,
    LLM_NS,
    { providers: { [PROVIDER]: { models: next } } },
    section?.revision,
  )
}

export async function selectDefaultModel(ctx: Context, modelId: string): Promise<void> {
  await rememberModel(ctx, modelId)
  await ctx.agentDefaultModel.saveSelection({ provider: PROVIDER, model: modelId })
}

export function currentProviderModel(ctx: Context): string | undefined {
  const selection = ctx.agentDefaultModel.currentSelection()
  return selection.provider === PROVIDER ? selection.model : undefined
}
