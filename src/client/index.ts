/**
 * Browser apply for the cursor plugin: registers the Input-caret configuration
 * into the Plugins page's bundle-configuration slot and manages the cursor
 * controller lifecycle. The effect engine (canvas comet) is browser-only,
 * driven by the controller, which reads the stored preference from
 * localStorage.
 *
 * There is deliberately no Settings → General row: the Plugins page is the one
 * surface that owns these preferences, so the two can never disagree or show
 * up twice.
 */
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: merges the Plugins page's bundle-configuration slot into SlotMap.
import type {} from './plugin-manager-contract.ts'
import { bindSnapshotSelector } from './make-cursor-hook.ts'
import type { CursorControlsInjected } from './CursorControls.tsx'
import { CursorPanel } from './CursorPanel.tsx'
import { CursorController } from './cursor-controller.ts'
import { en, zh } from './locales.ts'

/** Locale namespace owned by this feature's configuration panel. */
export const NS = 'cursor-effect'

/** This bundle's npm package name: the Plugins page keys its config slot by it. */
export const PACKAGE_NAME = 'dsh-smooth-cursor-patched'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The caret configuration panel's copy. */
    'cursor-effect': import('./locales.ts').CursorKey
  }
}

/** Required services: the slot registry and the locale registry. */
export const inject = ['slots', 'locale']

/** Apply the cursor plugin: register locale dictionaries and the config panel. */
export function apply(ctx: import('@deepseek-ai/cordis').Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'smooth-cursor: dictionaries')

  const controller = new CursorController()
  ctx.effect(() => () => { controller.dispose() }, 'smooth-cursor: effect teardown')

  // Plugins → (this bundle) → configuration section. Address-by-name: a build
  // that never declares this slot simply leaves the contribution waiting, and
  // `ctx.slots.inject` disposes it if the declaration is withdrawn.
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config',
    key: PACKAGE_NAME,
    locale: NS,
    inject: (): CursorControlsInjected => ({
      useCursor: bindSnapshotSelector(controller.state),
      setEnabled: (value) => { controller.setEnabled(value) },
      setTrail: (value) => { controller.setTrail(value) },
      setBlink: (value) => { controller.setBlink(value) },
      setColor: (value) => { controller.setColor(value) },
      setSize: (value) => { controller.setSize(value) },
    }),
  }, CursorPanel))
}
