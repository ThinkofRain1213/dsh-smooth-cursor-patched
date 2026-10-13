/**
 * Chat-input caret settings, persisted per-browser in localStorage.
 *
 * Deliberately client-local: the effect is pure chrome over the composer
 * textarea — the Host settings document and its schema stay untouched, so
 * mounting it never needs a Host restart and never rides an HTTP round-trip.
 * A Host-backed namespace can adopt this later without changing the shape.
 */

/** Caret thicknesses accepted at the configuration panel and engine boundaries. */
export const CURSOR_SIZES = ['small', 'medium', 'large'] as const

/** One selectable caret thickness. */
export type CursorSize = (typeof CURSOR_SIZES)[number]

/** Durable caret-effect preference set owned by the configuration panel. */
export interface CursorSettings {
  /** Blinking caret: on = blinks when idle, steady while typing; off = always solid. */
  blink: boolean
  /** Accent color (hex) of the caret. */
  color: string
  /** Caret thickness. */
  size: CursorSize
}

/** Default accent — the DeepSeek brand blue (--dsw-static-deepseek-500). */
export const DEFAULT_CURSOR_COLOR = '#4176E6'

/** Preset swatches offered by the configuration panel, each legible on light and dark. */
export const CURSOR_COLOR_SWATCHES: readonly string[] = Object.freeze([
  '#4176E6', // DeepSeek blue
  '#22D3EE', // cyan
  '#A78BFA', // violet
  '#F472B6', // pink
  '#FBBF24', // amber
  '#34D399', // green
  '#F87171', // red
  '#F8FAFC', // near-white
])

/** The effect defaults: blink on, brand-blue, medium. */
export const DEFAULT_CURSOR_SETTINGS: CursorSettings = Object.freeze({
  blink: true,
  color: DEFAULT_CURSOR_COLOR,
  size: 'medium',
})

const STORAGE_KEY = 'dsh:ui-theme:caret-settings'

/** Narrow one persisted value to a known caret size. */
function isCursorSize(value: unknown): value is CursorSize {
  return CURSOR_SIZES.some(size => size === value)
}

/** Reject malformed persisted color values without throwing. */
function isColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value)
}

/**
 * Merge a partially-typed persisted section onto the defaults.
 *
 * Two persisted fields are deliberately dropped rather than honoured, because
 * neither has a control left to change it back:
 *
 *  - `enabled`: the plugin's own enable switch is the single master, so a stored
 *    `false` from an older build must not leave the effect permanently off.
 *  - `trail`: the trail was removed and is being redesigned, so a stored `true`
 *    would claim an effect that no longer exists. Picking known fields below is
 *    what discards both; nothing extra is needed.
 */
function normalize(input: Partial<CursorSettings> | null | undefined): CursorSettings {
  const source = input ?? {}
  return {
    blink: typeof source.blink === 'boolean' ? source.blink : DEFAULT_CURSOR_SETTINGS.blink,
    color: isColor(source.color) ? source.color : DEFAULT_CURSOR_SETTINGS.color,
    size: isCursorSize(source.size) ? source.size : DEFAULT_CURSOR_SETTINGS.size,
  }
}

/**
 * Browser-local persistence for the caret preference. Reads and writes a
 * single JSON value under {@link STORAGE_KEY}; every failure mode (private
 * mode, quota, corrupted payload) degrades to the defaults and is swallowed,
 * because this feature must never surface an error.
 */
export class CursorPersistence {
  /** Load the stored preference, falling back to the defaults. */
  load(): CursorSettings {
    if (typeof window === 'undefined') return { ...DEFAULT_CURSOR_SETTINGS }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw === null) return { ...DEFAULT_CURSOR_SETTINGS }
      return normalize(JSON.parse(raw) as Partial<CursorSettings> | null)
    } catch {
      return { ...DEFAULT_CURSOR_SETTINGS }
    }
  }

  /** Persist one accepted preference. */
  save(settings: CursorSettings): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* private mode / quota: this rebuild is not durable, keep going */
    }
  }
}
