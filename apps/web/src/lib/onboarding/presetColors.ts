/**
 * Palette colori preset goals — shared Step 3 ↔ Step 4.
 *
 * Atomic note #060: il barcode goal card (left border) deve riflettere
 * la categoria del preset Step 3, NON la priorità. Priorità è indicata
 * come text chip separato.
 *
 * Mapping preset → color (Tailwind classi):
 *  - emergency: red-500 (fondo emergenza, safety-first)
 *  - house: yellow-500 (comprare casa)
 *  - invest: indigo-500 (iniziare investire, far crescere patrimonio)
 *  - debt: orange-500 (eliminare debiti)
 *  - savings: blue-500 (risparmiare di più — generic savings)
 *  - lifestyle: teal-500 (viaggi, vacanze)
 *  - custom: slate-500 (fallback no-preset)
 */

export interface PresetColorSpec {
  border: string; // tailwind border-l-4 color
  bg: string; // tailwind bg subtle accent
  hex: string; // hex for inline style / charts
  label: string; // italian display label
}

/**
 * Preset ID → palette. Keys coerenti con PRESET_GOALS in StepGoals.tsx.
 */
export const PRESET_COLORS: Record<string, PresetColorSpec> = {
  'fondo-emergenza': {
    border: 'border-l-red-500',
    bg: 'bg-red-50/50 dark:bg-red-950/20',
    hex: '#ef4444',
    label: 'Fondo Emergenza',
  },
  'comprare-casa': {
    border: 'border-l-yellow-500',
    bg: 'bg-yellow-50/50 dark:bg-yellow-950/20',
    hex: '#eab308',
    label: 'Casa',
  },
  'iniziare-a-investire': {
    border: 'border-l-indigo-500',
    bg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    hex: '#6366f1',
    label: 'Investimenti',
  },
  'eliminare-debiti': {
    border: 'border-l-orange-500',
    bg: 'bg-orange-50/50 dark:bg-orange-950/20',
    hex: '#f97316',
    label: 'Debiti',
  },
  'risparmiare-di-piu': {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50/50 dark:bg-blue-950/20',
    hex: '#3b82f6',
    label: 'Risparmio',
  },
  'viaggi-vacanza': {
    border: 'border-l-teal-500',
    bg: 'bg-teal-50/50 dark:bg-teal-950/20',
    hex: '#14b8a6',
    label: 'Viaggi',
  },
  'far-crescere-patrimonio': {
    border: 'border-l-purple-500',
    bg: 'bg-purple-50/50 dark:bg-purple-950/20',
    hex: '#a855f7',
    label: 'Patrimonio',
  },
};

/**
 * Fallback per goal custom (no presetId).
 */
export const CUSTOM_PRESET_COLOR: PresetColorSpec = {
  border: 'border-l-slate-400',
  bg: 'bg-slate-50/50 dark:bg-slate-900/20',
  hex: '#64748b',
  label: 'Personalizzato',
};

/**
 * Resolve preset color dato presetId. Own-property check evita prototype
 * pollution (es. presetId='__proto__').
 */
export function getPresetColor(presetId: string | null | undefined): PresetColorSpec {
  if (!presetId) return CUSTOM_PRESET_COLOR;
  return Object.prototype.hasOwnProperty.call(PRESET_COLORS, presetId)
    ? PRESET_COLORS[presetId]!
    : CUSTOM_PRESET_COLOR;
}
