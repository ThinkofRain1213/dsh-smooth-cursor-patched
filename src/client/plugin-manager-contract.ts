/**
 * Local type-only declaration of the Plugins page's bundle-configuration slot.
 *
 * `@deepseek-ai/dsh-client-ui-plugin-manager` declares `plugins.bundle.config`
 * as a keyed root slot whose owner props carry the requested view and, when the
 * Host serves a Config namespace for the bundle, that namespace's form. The
 * slot has been present since the package's first release (`0.1.6-alpha.2`,
 * 2026-09-17), so that release is this plugin's minimum supported DSH. We
 * restate the contract here instead of importing the package so the plugin
 * keeps its cross-version stance: the published package is a browser-side
 * optional surface, and depending on its type package would pin the plugin to
 * one DSH release line and add a lockfile entry for a declaration that is three
 * fields wide.
 *
 * The registration itself is address-by-name (`ctx.slots.inject`), so a DSH
 * build without this slot simply never declares it and the contribution waits
 * for a declaration that never arrives — no runtime import, no crash.
 *
 * If you ever add the official package as a devDependency, delete this file and
 * import its `slot-contract.ts` types instead; the two augmentations describe
 * the same slot and must not drift.
 */

/** The view the Plugins page asks a configuration entry for. */
export interface PluginConfigViewProps {
  /**
   * `summary` renders a one-liner (official cards, a row's missing
   * description); `page` renders the form with its own save control. Bundle
   * configuration renders only `page`.
   */
  readonly view: 'summary' | 'page'
  /**
   * Host-owned configuration values and write actions, present only when the
   * Host serves a Config namespace for this entry. This plugin persists in
   * localStorage and registers no Host namespace, so it is always absent here.
   */
  readonly form?: unknown
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * A bundle's own configuration, keyed by the bundle's package name and
     * rendered on the bundle's page between its description and its rows.
     */
    'plugins.bundle.config': {
      kind: 'keyed'
      scope: 'root'
      owner: PluginConfigViewProps
    }
  }
}
