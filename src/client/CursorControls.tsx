/**
 * The caret preference controls: blink switch, accent swatches with a custom
 * picker, and the thickness picker.
 *
 * These render into the Plugins page's bundle-configuration section, whose page
 * already draws the bundle's icon, title, version, description, and crumb above
 * the section — so the body carries no title chrome of its own.
 *
 * Live values come from the controller's snapshot store; writes route back
 * through the injected faces and persist in localStorage.
 *
 * The blink row uses the official `Switch` rather than a local one: the shared
 * settings-page spec (`DSH-插件设置页UI规范.md` §3.1) requires the primitives
 * control, which already carries its own track/thumb tokens, focus ring,
 * disabled styling, and reduced-motion handling. Re-implementing it meant
 * keeping ~88 lines of CSS in step with the official tokens by hand.
 */
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { CURSOR_COLOR_SWATCHES, CURSOR_SIZES, type CursorSize } from './cursor-settings.ts'
import type { CursorPanelState } from './cursor-controller.ts'
import css from './CursorControls.module.css'

/** Registration-side business face for the controls. */
export interface CursorControlsInjected {
  /** Bound snapshot selector hook, created by the apply side via bindSnapshotSelector. */
  useCursor: <T>(selector: (state: CursorPanelState) => T) => T
  /** Toggle caret blinking while idle. */
  setBlink: (blink: boolean) => void
  /** Set the accent color. */
  setColor: (color: string) => void
  /** Set the caret thickness. */
  setSize: (size: CursorSize) => void
}

/** Props of the caret controls: the locale seat plus the injected business face. */
export type CursorControlsProps =
  PropsLocale<'cursor-effect'>
  & InjectFace<CursorControlsInjected>

/** Render the caret preference rows, without any surrounding section chrome. */
export function CursorControls({ t, useCursor, setBlink, setColor, setSize }: CursorControlsProps) {
  const settings = useCursor(state => state.settings)
  return (
    <>
      <div className={css.item}>
        <span className={css.itemText}>
          <span className={css.itemTitle}>{t('cursor.blink')}</span>
          <span className={css.itemDesc}>{t('cursor.blinkDescription')}</span>
        </span>
        <span className={css.itemControl}>
          <Switch checked={settings.blink} onChange={setBlink} label={t('cursor.blink')} />
        </span>
      </div>

      <div className={css.item}>
        <span className={css.itemText}>
          <span className={css.itemTitle}>{t('cursor.color')}</span>
        </span>
        <div className={`${css.itemControl} ${css.swatches}`} role="radiogroup" aria-label={t('cursor.color')}>
          {CURSOR_COLOR_SWATCHES.map(color => (
            <button
              key={color}
              type="button"
              className={`${css.swatch} ${settings.color === color ? css.swatchActive : ''}`}
              style={{ background: color }}
              aria-label={color}
              role="radio"
              aria-checked={settings.color === color}
              onClick={() => { setColor(color) }}
            />
          ))}
          <label className={`${css.swatch} ${css.customSwatch}`} title={t('cursor.customColor')}>
            <input
              type="color"
              className={css.colorInput}
              value={settings.color}
              onChange={(event) => { setColor(event.target.value) }}
              aria-label={t('cursor.customColor')}
            />
            <span className={css.customOverlay} aria-hidden="true">…</span>
          </label>
        </div>
      </div>

      <div className={css.item}>
        <span className={css.itemText}>
          <span className={css.itemTitle}>{t('cursor.thickness')}</span>
        </span>
        <div className={css.itemControl} role="radiogroup" aria-label={t('cursor.thickness')}>
          {CURSOR_SIZES.map(size => (
            <button
              key={size}
              type="button"
              className={`${css.sizeOption} ${settings.size === size ? css.sizeActive : ''}`}
              role="radio"
              aria-checked={settings.size === size}
              onClick={() => { setSize(size) }}
            >
              {t(`cursor.size.${size}`)}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
