/**
 * Browser apply for the cursor plugin: registers the Input caret preference
 * row into the General settings section, and manages the cursor controller
 * lifecycle. The effect engine (canvas comet) is browser-only, driven by
 * the controller, which reads the stored preference from localStorage.
 */
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { bindSnapshotSelector } from './make-cursor-hook.ts'
import type { CursorRowInjected } from './CursorRow.tsx'
import { CursorRow } from './CursorRow.tsx'
import { CursorController } from './cursor-controller.ts'
import { en, zh } from './locales.ts'

/** Locale namespace owned by this feature's settings row. */
export const SETTINGS_NS = 'settings.cursor-effect'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Input caret settings row's copy. */
    'settings.cursor-effect': import('./locales.ts').CursorKey
  }
}

/** Required services: the settings-item slot surface and the locale registry. */
export const inject = ['slots', 'locale']

/** Apply the cursor plugin: register locale dictionaries and the settings row. */
export function apply(ctx: import('@deepseek-ai/cordis').Context): void {
  ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), 'smooth-cursor: settings row dictionaries')

  const controller = new CursorController()
  ctx.effect(() => () => { controller.dispose() }, 'smooth-cursor: effect teardown')

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'cursor-effect',
    order: 30,
    locale: SETTINGS_NS,
    inject: (): CursorRowInjected => ({
      useCursor: bindSnapshotSelector(controller.state),
      setEnabled: (value) => { controller.setEnabled(value) },
      setTrail: (value) => { controller.setTrail(value) },
      setBlink: (value) => { controller.setBlink(value) },
      setColor: (value) => { controller.setColor(value) },
      setSize: (value) => { controller.setSize(value) },
    }),
  }, CursorRow))
}
