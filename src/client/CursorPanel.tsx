/**
 * The caret configuration panel registered into the Plugins page's
 * bundle-configuration slot (`plugins.bundle.config`), keyed by this bundle's
 * package name.
 *
 * This surface contributes no chrome of its own: the page already draws the
 * bundle's icon, title, version tag, description, and crumb above the section,
 * so the panel is only the shared controls stacked in the section's flow.
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { CursorControls, type CursorControlsInjected } from './CursorControls.tsx'
import css from './CursorControls.module.css'

/** Full component props: the slot's owner share plus the controls' injected face. */
export type CursorPanelProps =
  PropsRuntime<'plugins.bundle.config'>
  & PropsLocale<'cursor-effect'>
  & InjectFace<CursorControlsInjected>

/** Render the caret configuration body on the bundle's Plugins page. */
export function CursorPanel({ view, ...controls }: CursorPanelProps) {
  // A bundle's configuration renders only the page form. Guard the summary
  // read anyway: were a future page version to ask for one, a card one-liner is
  // no place for a control panel.
  if (view !== 'page') return null
  return (
    <div className={css.panel}>
      <CursorControls {...controls} />
    </div>
  )
}
