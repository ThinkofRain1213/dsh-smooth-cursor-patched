/**
 * Custom caret engine for the chat composer textarea, ported from the Obsidian
 * "animated cursor" plugin (likemuuxi/animated-cursor) that runs in the user's
 * vault. Its CodeMirror hooks have no textarea equivalent, so the RENDER is
 * reproduced 1:1 on an overlay <canvas> while the caret target coordinates
 * come from the textarea/contenteditable layout via mirror/DOM measurement.
 *
 * Comet mode, exactly as the plugin: the caret is a small rectangle that eases
 * toward the target with a soft lerp; while it travels it leaves a tapered,
 * fading stroke trail. (The plugin's Blink mode is removed at the user's
 * request — this feature is comet-only.)
 *
 * IME is handled by re-measuring every frame while a composition is active
 * (the browser can lay the preview out differently than the mirror).
 *
 * All state is re-read each animation frame — `document.activeElement`, the
 * input's selection/scroll, and its bounding rect — so nothing needs
 * per-element attach/dispose and the composer can remount freely. Every owned
 * node and listener is removed on dispose, keeping plugin reloads (HMR) clean.
 */
import type { CursorSettings, CursorSize } from './cursor-settings.ts'

const OVERLAY_ID = 'dsh-client-cursor-overlay'
const STYLE_ID = 'dsh-client-cursor-style'
/**
 * Owner tag this package stamps on the `<style>` tag it injects, and the value
 * the client module system must find there.
 *
 * The module system tags every UNCLAIMED `<style>` in the document with the id
 * of whichever plugin materializes next (`claimStyles`), then deletes those
 * tags when that unrelated plugin is disabled (`removeOwnedStyles`). An
 * untagged stylesheet is therefore torn down by another plugin's teardown,
 * which is exactly how the overlay lost its `position: fixed` and stretched the
 * page. Must equal the package name, i.e. the loader id the bundle patch
 * declares.
 */
const PLUGIN_ID = 'dsh-smooth-cursor-patched'

/** The legacy chat composer textarea, identified by its phase attribute. */
const TEXTAREA_SELECTOR = 'textarea[data-phase]'
/** The modern composer host (Lexical contenteditable), introduced in DSH 0.1.5. */
export const COMPOSER_SELECTOR = '[data-composer-input]'
/**
 * The ask-question answer field: a native textarea inside the question card
 * (`dsh-client-ui-user-questions`). Anchored on the host's non-hashed data
 * attributes so a CSS-module rename cannot silently drop the effect.
 */
export const ANSWER_SELECTOR = '[data-question-key] textarea, [data-question-scroll] textarea'
/** Union matcher used by the capture-phase IME listeners and composer focus check. */
const COMPOSER_ANY = `${TEXTAREA_SELECTOR}, ${COMPOSER_SELECTOR}, ${ANSWER_SELECTOR}`

/** Comet-mode caret width per size. */
const COMET_WIDTH: Record<CursorSize, number> = { small: 1.5, medium: 2, large: 2.5 }
/** Comet trail length per size (the plugin's default is 5). */
const COMET_TRAIL: Record<CursorSize, number> = { small: 5, medium: 7, large: 10 }

/** Smoothness of the glide (the plugin's comet 0.2). */
const COMET_SMOOTHNESS = 0.2
/** Distance below which the eased caret snaps onto the target. */
const SNAP_EPSILON = 0.1
/** Comet mode: travel below this counts as "resting" (no new trail). */
const COMET_MOVE_THRESHOLD = 0.2

const CARET_CSS = `
/* The overlay's geometry is ALSO set inline (see the constructor): this rule is
 * belt-and-braces, kept so the effect still lays out correctly if the stylesheet
 * is replaced by a newer build while an old canvas is still mounted. */
#${OVERLAY_ID} {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
}
#${OVERLAY_ID}[data-active='false'] { display: none; }
/* Hide the native caret on every surface the effect owns. This is the one rule
 * that cannot move inline: it targets the composer, not the canvas. */
html.dsh-cursor-active textarea[data-phase],
html.dsh-cursor-active [data-composer-input],
html.dsh-cursor-active [data-question-key] textarea,
html.dsh-cursor-active [data-question-scroll] textarea { caret-color: transparent; }
`

/** requestAnimationFrame with a setTimeout fallback (jsdom/tests). */
const raf = (callback: FrameRequestCallback): number =>
  typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame(callback)
    : window.setTimeout(() => { callback(performance.now()) }, 16)

/** cancelAnimationFrame matching {@link raf}'s two implementations. */
const caf = (id: number): void => {
  if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(id)
  else window.clearTimeout(id)
}

/** A caret position in VIEWPORT coordinate space. */
interface CursorPoint {
  /** Horizontal offset (px) from viewport origin. */
  left: number
  /** Vertical offset (px) from viewport origin. */
  top: number
  /** Line height in px (the caret's height). */
  height: number
}

/**
 * Measure the caret position inside a composer, returning VIEWPORT coordinates.
 * Two input kinds are supported:
 *   - legacy `<textarea data-phase>`: mirror the text up to `selectionStart`
 *     (wrap, line height, padding, scroll) and report where the marker lands;
 *   - modern `[data-composer-input]` (Lexical contenteditable, DSH 0.1.5+):
 *     measure from live selection with cascading fallbacks for empty inputs.
 */
function measureCaret(input: HTMLElement): CursorPoint | null {
  if (input instanceof HTMLTextAreaElement) return measureTextareaCaret(input)
  return measureRichCaret(input)
}

/** Mirror-measure a native textarea caret; converts to viewport coords. */
function measureTextareaCaret(textarea: HTMLTextAreaElement): CursorPoint | null {
  const value = textarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  if (start < 0 || end < start || end > value.length) return null

  // A native textarea exposes only an ORDERED [start, end] pair — the same
  // direction-less shape as a DOM Range. The active end of a mouse drag is
  // `selectionDirection`: measuring `selectionStart` unconditionally pins the caret to
  // the selection's left edge, so a forward drag never follows the mouse while a
  // backward drag only appears to work because its focus end happens to be `start`.
  const caret = start !== end && textarea.selectionDirection === 'forward' ? end : start

  const style = window.getComputedStyle(textarea)
  const mirror = document.createElement('div')
  mirror.setAttribute('aria-hidden', 'true')
  const mirrorStyle = mirror.style as unknown as Record<string, string>
  for (const prop of MIRROR_STYLE_PROPS) {
    const value = style[prop]
    if (typeof value === 'string') mirrorStyle[prop] = value
  }
  mirror.style.width = `${textarea.clientWidth}px`
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.position = 'absolute'
  mirror.style.top = '0'
  mirror.style.visibility = 'hidden'

  const prefix = value.slice(0, caret)
  mirror.textContent = prefix.endsWith('\n') ? `${prefix.replace(/\n$/, '')} \n` : prefix

  const marker = document.createElement('span')
  marker.style.position = 'absolute'
  marker.textContent = '\u200b'
  mirror.appendChild(marker)

  document.body.appendChild(mirror)
  mirror.scrollTop = textarea.scrollTop
  mirror.scrollLeft = textarea.scrollLeft

  const borderTop = parseFloat(style.borderTopWidth) || 0
  const borderLeft = parseFloat(style.borderLeftWidth) || 0
  const left = (marker.offsetLeft + borderLeft - textarea.scrollLeft) || 0
  const lineTop = (marker.offsetTop + borderTop - textarea.scrollTop) || 0

  // Glyph-height convention, shared with the contenteditable path: the caret is the
  // text's glyph box (≈1.35 × font-size), vertically centred in the line box by the
  // half-leading. Reporting the raw line-height here would draw a visibly taller caret
  // than the chat composer's for the very same 14px/24px typography.
  const lineHeight = parseFloat(style.lineHeight) || 20
  const fontSize = parseFloat(style.fontSize) || 14
  const height = Math.min(lineHeight, Math.round(fontSize * 1.35) || 19)
  const halfLeading = Math.max(0, Math.floor((lineHeight - height) / 2))

  mirror.remove()

  const rect = textarea.getBoundingClientRect()
  return { left: left + rect.left, top: lineTop + rect.top + halfLeading, height }
}

/** Determine whether a selection is oriented forward (anchor before focus in document order). */
function isSelectionForward(selection: Selection): boolean {
  if (selection.isCollapsed) return true
  const anchor = selection.anchorNode
  const focus = selection.focusNode
  if (anchor === null || focus === null) return true
  if (anchor === focus) {
    return selection.anchorOffset <= selection.focusOffset
  }
  const pos = anchor.compareDocumentPosition(focus)
  return (pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

/**
 * Measure a modern contenteditable composer caret from the live selection range
 * with robust multi-tiered fallbacks. Keeps initial caret height identical to typed text.
 */
function measureRichCaret(host: HTMLElement): CursorPoint | null {
  const selection = window.getSelection()
  if (selection === null || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (range === null || !host.contains(range.startContainer)) return null

  const hostStyle = window.getComputedStyle(host)
  const defaultLineHeight = parseFloat(hostStyle.lineHeight) || 24
  const fontSize = parseFloat(hostStyle.fontSize) || 14
  const expectedCaretHeight = Math.min(defaultLineHeight, Math.round(fontSize * 1.35) || 19)
  const halfLeading = Math.max(0, Math.floor((defaultLineHeight - expectedCaretHeight) / 2))

  const hostRect = host.getBoundingClientRect()
  const borderTop = parseFloat(hostStyle.borderTopWidth) || 0
  const borderLeft = parseFloat(hostStyle.borderLeftWidth) || 0
  const paddingTop = parseFloat(hostStyle.paddingTop) || 0
  const paddingLeft = parseFloat(hostStyle.paddingLeft) || 0
  const lineStartLeft = hostRect.left + borderLeft + paddingLeft - host.scrollLeft

  /**
   * The caret's nearest block container (a `<p>` in Lexical's DOM), so the empty-line
   * probe below cannot pick up a `<br>` from an unrelated block.
   *
   * A composer-wide `host.querySelector('br')` returns the FIRST `<br>` in document
   * order, which is not necessarily the caret's: an inline `<code>`/`<kbd>` line carries
   * its own monospace metrics, so a caret on a plain empty line below such a block would
   * measure the code font's height instead of its own (measured: 17 vs the correct 19).
   */
  const caretBlock = (node: Node | null): HTMLElement => {
    // A text node's parentElement is its containing element; a null node (no selection
    // focus yet) simply falls through to the host.
    let el: Element | null = node === null ? null : (node instanceof Element ? node : node.parentElement)
    while (el !== null && el !== host) {
      const display = window.getComputedStyle(el).display
      if (display === 'block' || display === 'list-item' || display === 'flex') {
        return el instanceof HTMLElement ? el : host
      }
      el = el.parentElement
    }
    return host
  }

  /**
   * Glyph height read off a real `<br>` that the engine laid out with this line's own font
   * metrics. Verified identical to a typed caret's rect across 7 fonts x 7 font sizes, and
   * under CSS zoom/transform — where canvas font metrics cannot follow, because
   * `getComputedStyle` keeps reporting the UNSCALED font-size. Returns null when the block
   * has no `<br>`, leaving the caller to fall back to the font-size heuristic.
   */
  const brHeightIn = (root: HTMLElement): number | null => {
    const br = root.querySelector('br')
    if (br === null) return null
    const measured = br.getBoundingClientRect().height
    return measured > 0 ? measured : null
  }

  // Tier 1: Direction-aware selection measurement (tracks active mouse head)
  const rects = range.getClientRects()
  if (rects.length > 0) {
    const isForward = isSelectionForward(selection)
    const r = isForward ? rects[rects.length - 1] : rects[0]
    if (r !== undefined && (r.width > 0 || r.height > 0 || r.top > 0 || r.left > 0)) {
      return {
        left: (isForward && !selection.isCollapsed) ? r.right : r.left,
        top: r.top,
        height: r.height || expectedCaretHeight,
      }
    }
  }

  // Only reached when Tier 1 missed — i.e. the caret sits on an empty line, where the
  // browser reports no rect at all. Measure the glyph height from that line's own `<br>`
  // instead of the font-size heuristic, so the caret keeps the same height it will have
  // once the user types, and keeps tracking the font if the host restyles.
  const emptyLineHeight = brHeightIn(caretBlock(selection.focusNode)) ?? expectedCaretHeight

  // Tier 1.5: Preempt empty lines (soft line breaks or empty paragraph blocks) before Tier 2.
  // Prevents Chromium from erroneously snapping collapsed empty-line ranges back to previous text.
  if (selection.isCollapsed) {
    const focusNode = selection.focusNode
    const offset = selection.focusOffset

    if (focusNode instanceof Element && host.contains(focusNode)) {
      // Case A: Soft line-break inside a paragraph (e.g. <span>text</span><br>|)
      const prevChild = offset > 0 ? focusNode.childNodes[offset - 1] : null
      if (prevChild instanceof Element && prevChild.tagName === 'BR') {
        const brRect = prevChild.getBoundingClientRect()
        const prevTop = brRect.top > 0 ? brRect.top : (hostRect.top + paddingTop + halfLeading)
        return {
          left: lineStartLeft,
          top: prevTop + defaultLineHeight,
          // This <br> IS the caret's own line, so measure it directly — no probe needed.
          height: brRect.height > 0 ? brRect.height : expectedCaretHeight,
        }
      }

      // Case B: Entirely empty paragraph block (e.g. <p dir="ltr"><br></p> between paragraphs)
      if (focusNode !== host && (focusNode.textContent ?? '').trim() === '') {
        const pRect = focusNode.getBoundingClientRect()
        if (pRect.top > 0 && pRect.height > 0) {
          return {
            left: lineStartLeft,
            top: pRect.top + halfLeading,
            height: emptyLineHeight,
          }
        }
      }
    }
  }

  // Tier 2: Try range.getBoundingClientRect() if it returned positive coordinates
  const rangeRect = range.getBoundingClientRect()
  if (rangeRect.top > 0 || rangeRect.left > 0) {
    const isForward = isSelectionForward(selection)
    return {
      left: (isForward && !selection.isCollapsed) ? rangeRect.right : rangeRect.left,
      top: rangeRect.top,
      height: rangeRect.height || expectedCaretHeight,
    }
  }

  // Tier 3: Probe DOM container elements inside host (Lexical <p> or <br>)
  const startEl = range.startContainer instanceof Element
    ? range.startContainer
    : range.startContainer.parentElement

  // Scope the probe to the caret's own block rather than the whole host, for the same
  // reason as `caretBlock` above: a composer-wide lookup can land on an inline
  // `<code>` line's `<br>` and report that font's height instead of the caret's.
  const searchRoot = (startEl instanceof HTMLElement && host.contains(startEl) && startEl !== host)
    ? startEl
    : caretBlock(selection.focusNode)
  const br = searchRoot.querySelector('br')
  if (br !== null) {
    const brRect = br.getBoundingClientRect()
    if (brRect.top > 0 && brRect.bottom >= brRect.top) {
      return {
        left: brRect.left,
        top: brRect.top,
        height: (brRect.height > 0 ? brRect.height : expectedCaretHeight),
      }
    }
  }

  if (startEl instanceof HTMLElement && startEl !== host && host.contains(startEl)) {
    const pRect = startEl.getBoundingClientRect()
    if (pRect.top > 0 && pRect.height > 0) {
      const pStyle = window.getComputedStyle(startEl)
      const pPadLeft = parseFloat(pStyle.paddingLeft) || 0
      return {
        left: pRect.left + pPadLeft,
        top: pRect.top + halfLeading,
        height: emptyLineHeight,
      }
    }
  }

  // Tier 4: Fallback for completely empty composer input based on host padding/border
  return {
    left: lineStartLeft,
    top: hostRect.top + borderTop + paddingTop + halfLeading - host.scrollTop,
    height: emptyLineHeight,
  }
}

/** Get the visible scrollport bounding rect for clipping the caret overlay. */
function getComposerClipRect(composer: HTMLElement): DOMRect {
  const scrollContainer = composer.closest('[data-input-scroll]') as HTMLElement | null
  const clipHost = scrollContainer ?? composer
  return clipHost.getBoundingClientRect()
}

/** Textarea presentation props the mirror must reproduce for a faithful reflow. */
const MIRROR_STYLE_PROPS: readonly (keyof CSSStyleDeclaration & string)[] = [
  'boxSizing', 'overflowWrap', 'wordBreak', 'whiteSpace', 'lineHeight',
  'wordSpacing', 'letterSpacing', 'fontFamily', 'fontSize', 'fontWeight',
  'fontStyle', 'textTransform', 'textIndent', 'textAlign',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
]

/**
 * Canvas caret engine. Constructor mounts the overlay canvas + style + the
 * document-capture IME listeners when a browser document exists (node runs
 * see none and become no-ops); {@link apply} drives visibility, color,
 * thickness, and the trail switch; {@link dispose} tears everything.
 */
export class CursorEngine {
  private settings: CursorSettings
  private readonly overlay: HTMLCanvasElement | undefined
  private readonly ctx: CanvasRenderingContext2D | undefined
  private readonly style: HTMLStyleElement | undefined

  /**
   * Per-instance identity for the shared `dsh-cursor-active` flag on
   * `<html>`. The flag is global but each engine owns one instance, so the
   * token decides which instance is allowed to clear it (see dispose).
   */
  private readonly ownerToken = Math.random().toString(36).slice(2)

  private raf = 0
  /** Whether the draw loop is scheduled (started on the first enabling apply). */
  private running = false
  private dpr = 1

  // Eased caret + target (viewport px).
  private currentX = 0
  private currentY = 0
  private targetX = 0
  private targetY = 0
  private currentHeight = 20
  private initialized = false

  // Comet trail (plugin state).
  private trailPts: { x: number; y: number }[] = []

  // Blink timing: standard 500ms half-cycle (VS Code / Web standard cadence).
  private lastActivityTime = performance.now()
  private readonly BLINK_HALF_CYCLE = 500

  private composing = false
  private lastSignature = ''
  private caret: CursorPoint | null = null
  /** The input surface the caret is currently seated on (chat composer vs question card). */
  private activeComposer: HTMLElement | null = null

  private readonly onCompositionStart = (event: Event): void => {
    const target = event.target
    if (!(target instanceof HTMLElement) || !target.matches(COMPOSER_ANY)) return
    this.composing = true
    this.lastSignature = ''
    this.lastActivityTime = performance.now()
  }

  private readonly onCompositionEnd = (event: Event): void => {
    const target = event.target
    if (!(target instanceof HTMLElement) || !target.matches(COMPOSER_ANY)) return
    this.composing = false
    this.lastSignature = ''
    this.lastActivityTime = performance.now()
  }

  /** @param settings - initial effect preference (first apply re-applies). */
  constructor(settings: CursorSettings) {
    this.settings = settings
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    this.style = document.createElement('style')
    this.style.id = STYLE_ID
    // Claim the tag as this package's own BEFORE it enters the document, so
    // claimStyles() skips it and removeOwnedStyles() only ever retires it for
    // this plugin. See PLUGIN_ID.
    this.style.dataset.plugin = PLUGIN_ID
    this.style.textContent = CARET_CSS
    document.head.appendChild(this.style)

    this.overlay = document.createElement('canvas')
    this.overlay.id = OVERLAY_ID
    this.overlay.dataset.active = 'false'
    // Pin the overlay out of flow with inline styles rather than relying on
    // CARET_CSS alone. The canvas buffer is sized to the viewport (x dpr), so if
    // the companion stylesheet is ever removed the element becomes flow content
    // and stretches the document: the app scrolls, content is pushed up, and
    // blank space opens below the composer. Inline geometry keeps the failure
    // mode at worst "caret colours the composer" instead of a broken page.
    this.overlay.style.position = 'fixed'
    this.overlay.style.inset = '0'
    this.overlay.style.zIndex = '2147483000'
    this.overlay.style.pointerEvents = 'none'
    // Hidden until an enabling apply(); mirrors [data-active='false'] in CSS.
    this.overlay.style.display = 'none'
    this.ctx = this.overlay.getContext('2d') ?? undefined
    document.body.appendChild(this.overlay)

    document.addEventListener('compositionstart', this.onCompositionStart, { capture: true })
    document.addEventListener('compositionend', this.onCompositionEnd, { capture: true })
  }

  /**
   * Apply one effect preference: color, thickness, trail switch, and the
   * native-caret lock. While enabled, a synchronous pass renders
   * immediately against the current focus.
   */
  apply(settings: CursorSettings): void {
    this.settings = settings
    if (this.overlay === undefined) return
    this.overlay.dataset.color = settings.color
    this.overlay.dataset.size = settings.size

    const root = document.documentElement
    root.classList.toggle('dsh-cursor-active', settings.enabled)
    if (!settings.enabled) {
      caf(this.raf)
      this.running = false
      this.overlay.dataset.active = 'false'
      this.overlay.style.display = 'none'
      // Release the flag only if this instance still holds it, so disabling the
      // effect does not clear a newer instance's claim under HMR.
      if (root.dataset.cursorOwner === this.ownerToken) delete root.dataset.cursorOwner
      this.clear()
      return
    }
    root.dataset.cursorOwner = this.ownerToken
    this.overlay.dataset.active = 'true'
    this.overlay.style.display = 'block'
    if (!this.running) {
      this.running = true
      this.initialized = false
      this.lastSignature = ''
      this.raf = raf(this.loop)
    }
    this.renderOnce()
  }

  /** Remove the overlay, style, listeners, and native-caret lock. */
  dispose(): void {
    if (this.overlay === undefined) return
    this.running = false
    caf(this.raf)
    document.removeEventListener('compositionstart', this.onCompositionStart, { capture: true })
    document.removeEventListener('compositionend', this.onCompositionEnd, { capture: true })
    this.overlay.remove()
    this.style?.remove()
    const root = document.documentElement
    // Only the instance that currently holds the flag may clear it. Under an
    // HMR reload a fresh engine can have enabled the effect before this disposer
    // runs; an unconditional removal would switch the native caret back on while
    // the new instance keeps drawing the comet.
    if (root.dataset.cursorOwner === this.ownerToken) {
      root.classList.remove('dsh-cursor-active')
      delete root.dataset.cursorOwner
    }
  }

  /** One animation frame: size, measure, ease, draw. */
  private readonly loop = (): void => {
    this.renderOnce()
    this.raf = raf(this.loop)
  }

  /** Synchronous render pass (also the per-frame body). */
  private renderOnce(): void {
    const ctx = this.ctx
    if (this.overlay === undefined || ctx === undefined) return
    if (!this.settings.enabled) return

    // Self-heal the companion stylesheet. `caret-color: transparent` can only be
    // expressed as a rule over the composer element, so losing the tag would
    // bring the native caret back beside the comet. `isConnected` is a property
    // read rather than a DOM query, so re-checking it every frame is free.
    if (this.style !== undefined && !this.style.isConnected) {
      document.head.appendChild(this.style)
      const root = document.documentElement
      root.classList.add('dsh-cursor-active')
      // Re-assert ownership too: whatever removed the tag may have cleared the
      // flag, and dispose() only releases a flag this instance still holds.
      root.dataset.cursorOwner = this.ownerToken
    }

    this.resize()
    const width = window.innerWidth
    const height = window.innerHeight
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const composer = this.focusedComposer()
    if (composer === null) {
      // The composer lost focus (e.g. Settings opened): draw nothing and drop
      // the stale caret/trail, so the effect never floats over other chrome.
      this.clear()
      this.trailPts = []
      this.initialized = false
      this.lastSignature = ''
      this.activeComposer = null
      return
    }

    // Re-seat instantly when the focused input surface changes (chat composer ↔
    // question card): a cross-screen glide would drag a comet trail over chrome.
    if (this.activeComposer !== composer) {
      this.activeComposer = composer
      this.initialized = false
      this.lastSignature = ''
      this.trailPts = []
      this.lastActivityTime = performance.now()
    }

    // Re-measure every frame while composing (and for the contenteditable
    // composer, whose selection has no cheap signature); otherwise on
    // signature change.
    const sig = this.signature(composer)
    if (this.composing || sig === null || sig !== this.lastSignature) {
      this.lastSignature = sig === null ? '' : sig
      this.caret = measureCaret(composer)
    }
    if (this.caret === null) {
      this.clear()
      return
    }
    // measureCaret returns viewport coordinates; the overlay is a fixed
    // full-viewport canvas, so no further offset math is needed.
    this.targetX = this.caret.left
    this.targetY = this.caret.top
    this.currentHeight = this.caret.height

    if (!this.initialized) {
      this.currentX = this.targetX
      this.currentY = this.targetY
      this.initialized = true
      this.lastActivityTime = performance.now()
    }

    const clipRect = getComposerClipRect(composer)
    this.renderComet(ctx, clipRect)
  }

  /** Resize the backing canvas to the viewport × devicePixelRatio. */
  private resize(): void {
    if (this.overlay === undefined) return
    const dpr = window.devicePixelRatio || 1
    // A <canvas> element renders at its buffer size in CSS pixels unless its
    // style is pinned, so set BOTH: buffer = viewport × dpr, CSS = viewport.
    const cssWidth = window.innerWidth
    const cssHeight = window.innerHeight
    const width = Math.max(1, Math.round(cssWidth * dpr))
    const height = Math.max(1, Math.round(cssHeight * dpr))
    if (this.overlay.width !== width || this.overlay.height !== height) {
      this.overlay.width = width
      this.overlay.height = height
      this.dpr = dpr
    }
    if (this.overlay.style.width !== `${cssWidth}px`) this.overlay.style.width = `${cssWidth}px`
    if (this.overlay.style.height !== `${cssHeight}px`) this.overlay.style.height = `${cssHeight}px`
  }

  /** Comet mode with scrollport clipping and out-of-bounds culling. */
  private renderComet(ctx: CanvasRenderingContext2D, clipRect: DOMRect): void {
    const target = this.targetX
    if (Math.abs(this.targetX - this.currentX) < SNAP_EPSILON) this.currentX = this.targetX
    else this.currentX += (target - this.currentX) * COMET_SMOOTHNESS
    if (Math.abs(this.targetY - this.currentY) < SNAP_EPSILON) this.currentY = this.targetY
    else this.currentY += (this.targetY - this.currentY) * COMET_SMOOTHNESS

    const moving = Math.hypot(this.targetX - this.currentX, this.targetY - this.currentY) > COMET_MOVE_THRESHOLD
    if (moving) {
      this.lastActivityTime = performance.now()
      if (this.settings.trail) {
        this.trailPts.push({ x: this.currentX, y: this.currentY })
        if (this.trailPts.length > COMET_TRAIL[this.settings.size]) this.trailPts.shift()
      } else {
        this.trailPts = []
      }
    } else {
      this.trailPts = []
    }

    // Out-of-bounds culling: if caret is completely outside the scroll viewport, drop trail and skip draw
    const caretBottom = this.currentY + (this.currentHeight || 20)
    if (caretBottom <= clipRect.top || this.currentY >= clipRect.bottom) {
      this.trailPts = []
      return
    }

    // Viewport-clamped draw. Clip VERTICALLY only: the scrollport's real job is hiding
    // caret lines that scrolled out of view, and the composer always wraps so nothing
    // ever overflows horizontally. A full-box rect shaves the caret's own half-width in
    // half whenever it sits on the content origin (a padding-0 field puts it exactly on
    // the box's left edge), which makes a 2px comet read as a 1px native caret.
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, clipRect.top, window.innerWidth, clipRect.height)
    ctx.clip()

    if (this.settings.trail && this.trailPts.length > 0) {
      this.drawCometTrail(ctx)
    }
    this.drawCometHead(ctx, moving)

    ctx.restore()
  }

  private drawCometTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trailPts.length < 2) return
    const color = this.settings.color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowBlur = 8
    ctx.shadowColor = color
    const width = COMET_WIDTH[this.settings.size]
    for (let s = 0; s < this.trailPts.length - 1; s += 1) {
      const from = this.trailPts[s]
      const to = this.trailPts[s + 1]
      if (from === undefined || to === undefined) continue
      const a = s / this.trailPts.length
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.lineWidth = width + a * 2
      ctx.strokeStyle = this.hexToRgba(color, a)
      ctx.stroke()
    }
  }

  private drawCometHead(ctx: CanvasRenderingContext2D, moving: boolean): void {
    // Caret blinking: stays solid while moving or typing, blinks on a crisp 500ms cadence when idle
    if (this.settings.blink && !moving) {
      const elapsed = performance.now() - this.lastActivityTime
      const phase = elapsed % (this.BLINK_HALF_CYCLE * 2)
      if (phase >= this.BLINK_HALF_CYCLE) {
        return // Dark phase (500ms ~ 1000ms): skip drawing head
      }
    }

    const color = this.settings.color
    const width = COMET_WIDTH[this.settings.size]
    const n = Math.max(8, this.currentHeight || 24)
    ctx.fillStyle = color
    ctx.shadowBlur = moving ? 10 : 0
    ctx.shadowColor = color
    ctx.fillRect(this.currentX - width / 2, this.currentY, width, n)
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = Number.parseInt(hex.slice(1, 3), 16)
    const g = Number.parseInt(hex.slice(3, 5), 16)
    const b = Number.parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  private clear(): void {
    if (this.ctx === undefined || this.overlay === undefined) return
    // Reset the transform first, then blank the whole backing store.
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.clearRect(0, 0, this.overlay.width, this.overlay.height)
  }

  /** The composer input when it has focus (textarea or contenteditable), else null. */
  private focusedComposer(): HTMLElement | null {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return null
    if (!active.matches(COMPOSER_ANY)) return null
    return active
  }

  /**
   * Track the pieces that change where the caret line lands. The modern
   * contenteditable composer has no selectionStart/value/scroll mirrors, so
   * it reports null (re-measure every frame).
   */
  private signature(input: HTMLElement): string | null {
    if (!(input instanceof HTMLTextAreaElement)) return null
    // `selectionEnd` / `selectionDirection` must ride the signature: during a FORWARD
    // drag `selectionStart` stays pinned to the anchor, so keying on it alone never
    // invalidates the signature and the caret is never re-measured.
    return `${input.selectionStart}|${input.selectionEnd}|${input.selectionDirection}|${input.value.length}|${input.scrollTop}|${input.scrollLeft}|${input.clientWidth}`
  }
}