/**
 * Caret-effect controller: owns the durable preference snapshot store the
 * configuration panel reads, the render engine it drives, and the localStorage
 * persistence both share. One instance per plugin apply, disposed with the
 * fiber so an HMR reload rebuilds from the stored preference.
 */
import { createSnapshotStore, type SnapshotStore } from './snapshot-store.ts'
import { CursorPersistence, type CursorSettings, type CursorSize } from './cursor-settings.ts'
import { CursorEngine } from './cursor-engine.ts'

/** Panel-facing mirror: one preference snapshot plus a monotonic revision. */
export interface CursorPanelState {
  /** The full persisted caret preference. */
  settings: CursorSettings
  /** Change counter; -1 before first sync. */
  revision: number
}

/** Shallow-compare two caret preferences for the write guard. */
function sameSettings(left: CursorSettings, right: CursorSettings): boolean {
  return left.enabled === right.enabled
    && left.trail === right.trail
    && left.blink === right.blink
    && left.color === right.color
    && left.size === right.size
}

/**
 * Controller over the chat-input caret effect. Reads the stored preference
 * once, applies it to the engine, publishes a reactive snapshot for the
 * configuration panel, and routes panel edits back through persistence and
 * the engine.
 */
export class CursorController {
  /** Reactive preference source for the configuration panel (useCursor seat). */
  readonly state: SnapshotStore<CursorPanelState>
  private readonly persist: CursorPersistence
  private readonly engine: CursorEngine
  private settings: CursorSettings
  private revision = 0

  /** @param persist - storage seam (defaults to browser localStorage). */
  constructor(persist = new CursorPersistence()) {
    this.persist = persist
    this.settings = persist.load()
    this.engine = new CursorEngine(this.settings)
    this.engine.apply(this.settings)
    this.state = createSnapshotStore<CursorPanelState>({ settings: this.settings, revision: this.revision })
  }

  /** Toggle the whole effect. */
  setEnabled(enabled: boolean): void {
    this.update({ ...this.settings, enabled })
  }

  /** Toggle the typing trail. */
  setTrail(trail: boolean): void {
    this.update({ ...this.settings, trail })
  }

  /** Toggle caret blinking while idle. */
  setBlink(blink: boolean): void {
    this.update({ ...this.settings, blink })
  }

  /** Set the accent color (validated hex). */
  setColor(color: string): void {
    this.update({ ...this.settings, color })
  }

  /** Set the caret thickness. */
  setSize(size: CursorSize): void {
    this.update({ ...this.settings, size })
  }

  /** Publish and persist one preference, skipping a no-op write. */
  private update(next: CursorSettings): void {
    if (sameSettings(this.settings, next)) return
    this.settings = next
    this.persist.save(next)
    this.engine.apply(next)
    this.revision += 1
    this.state.set({ settings: next, revision: this.revision })
  }

  /** Tear the engine down (called from the apply fiber's disposer). */
  dispose(): void {
    this.engine.dispose()
  }
}
