/**
 * Chat-input caret settings, persisted per-browser in localStorage.
 *
 * Deliberately client-local: the effect is pure chrome over the composer
 * textarea — the Host settings document and its schema stay untouched, so
 * mounting it never needs a Host restart and never rides an HTTP round-trip.
 * A Host-backed namespace can adopt this later without changing the shape.
 */

/** Caret thicknesses accepted at the settings row and engine boundaries. */
export const CURSOR_SIZES = ['small', 'medium', 'large'] as const

/** One selectable caret thickness. */
export type CursorSize = (typeof CURSOR_SIZES)[number]

/** Durable caret-effect preference set owned by the Appearance surface. */
export interface CursorSettings {
  /** Master switch: render the custom caret in the chat input. */
  enabled: boolean
  /** Comet trail: on = a fading tail; off = bare caret. */
  trail: boolean
  /** Blinking caret: on = blinks when idle, steady while typing; off = always solid. */
  blink: boolean
  /** Accent color (hex) of the caret and its trail. */
  color: string
  /** Caret thickness. */
  size: CursorSize
}

/** Default accent — the DeepSeek brand blue (--dsw-static-deepseek-500). */
export const DEFAULT_CURSOR_COLOR = '#4176E6'

/** Preset swatches offered by the settings row, each legible on light and dark. */
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

/** The effect defaults: on, trail on, blink on, brand-blue, medium. */
export const DEFAULT_CURSOR_SETTINGS: CursorSettings = Object.freeze({
  enabled: true,
  trail: true,
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

/** Merge a partially-typed persisted section onto the defaults. */
function normalize(input: Partial<CursorSettings> | null | undefined): CursorSettings {
  const source = input ?? {}
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULT_CURSOR_SETTINGS.enabled,
    trail: typeof source.trail === 'boolean' ? source.trail : DEFAULT_CURSOR_SETTINGS.trail,
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
