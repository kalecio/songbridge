export type ButterchurnPreset = Record<string, unknown>;
export type ButterchurnPresetCatalog = Record<string, ButterchurnPreset>;

/** Turns Butterchurn's author-prefixed filenames into compact names for the selector. */
export const getPresetDisplayName = (presetName: string) => {
  const cleaned = presetName.replace(/^_+/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const title = cleaned.split(/\s+-\s+/).slice(1).join(' — ') || cleaned;
  return title.charAt(0).toLocaleUpperCase() + title.slice(1);
};

export const loadButterchurnPresets = async (): Promise<ButterchurnPresetCatalog> => {
  const module = await import('butterchurn-presets');
  const root = module.default as unknown;
  const catalog = (root && typeof root === 'object' && 'default' in root ? (root as { default: unknown }).default : root) as ButterchurnPresetCatalog;
  if (!catalog || typeof catalog !== 'object') throw new Error('Butterchurn preset catalog is unavailable');
  return catalog;
};
