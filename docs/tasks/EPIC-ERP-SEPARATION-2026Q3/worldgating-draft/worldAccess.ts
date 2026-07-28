import type { WorldKey } from '../types'

const LEGACY_TO_CANONICAL: Record<string, string> = {
  crm: 'spaceos.crm', kontrolling: 'spaceos.controlling', hr: 'spaceos.hr',
  maintenance: 'spaceos.maintenance', qa: 'spaceos.qa', ehs: 'spaceos.ehs', dms: 'spaceos.dms',
  cutting: 'joinerytech.cutting', joinery: 'joinerytech.joinery',
  inventory: 'joinerytech.inventory', procurement: 'joinerytech.procurement',
}

/** World composition is UI-only; API authorization remains server-side. */
export const WORLD_MODULES: Partial<Record<WorldKey, readonly string[]>> = {
  crm: ['spaceos.crm'], kontrolling: ['spaceos.controlling'], hr: ['spaceos.hr'],
  maintenance: ['spaceos.maintenance'], quality: ['spaceos.qa'], ehs: ['spaceos.ehs'],
  docs: ['spaceos.dms'],
  production: ['joinerytech.cutting', 'joinerytech.joinery'],
  warehouse: ['joinerytech.inventory', 'joinerytech.procurement'],
}

const BASE_WORLDS: readonly WorldKey[] = ['settings']

export function normalizeModuleIds(modules: readonly string[]): Set<string> {
  return new Set(modules.map(value => LEGACY_TO_CANONICAL[value] ?? value).filter(value => value.includes('.')))
}

export function isWorldEnabled(world: string, enabledModules: readonly string[]): boolean {
  if (BASE_WORLDS.includes(world as WorldKey)) return true
  const required = WORLD_MODULES[world as WorldKey]
  if (!required) return false
  const enabled = normalizeModuleIds(enabledModules)
  return required.every(moduleId => enabled.has(moduleId))
}

export function visibleWorlds(worlds: readonly WorldKey[], enabledModules: readonly string[]): WorldKey[] {
  return worlds.filter(world => isWorldEnabled(world, enabledModules))
}
