/**
 * Chat-input caret preference row registered into the General settings
 * section: master + comet-trail switches, accent color swatches with a custom
 * picker, and a thickness picker. Live values come from the controller's
 * snapshot store; writes route back through the injected faces and persist in
 * localStorage.
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { CURSOR_COLOR_SWATCHES, CURSOR_SIZES, type CursorSize } from './cursor-settings.ts'
import type { CursorRowState } from './cursor-controller.ts'
import css from './CursorRow.module.css'

/** Registration-side business face for the row. */
export interface CursorRowInjected {
  /** Bound snapshot selector hook, created by the apply side via bindSnapshotSelector. */
  useCursor: <T>(selector: (state: CursorRowState) => T) => T
  /** Toggle the whole effect. */
  setEnabled: (enabled: boolean) => void
  /** Toggle the comet trail. */
  setTrail: (trail: boolean) => void
  /** Toggle caret blinking while idle. */
  setBlink: (blink: boolean) => void
  /** Set the accent color. */
  setColor: (color: string) => void
  /** Set the caret thickness. */
  setSize: (size: CursorSize) => void
}

/** Full component props. */
export type CursorRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'settings.cursor-effect'>
  & InjectFace<CursorRowInjected>

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <label className={css.switch}>
      <input
        type="checkbox"
        className={css.switchInput}
        checked={checked}
        onChange={(event) => { onChange(event.target.checked) }}
        aria-label={label}
      />
      <span className={css.switchTrack} aria-hidden="true">
        <span className={css.switchThumb} />
      </span>
    </label>
  )
}

/** Render the Input caret preference row. */
export function CursorRow({ t, useCursor, setEnabled, setTrail, setBlink, setColor, setSize }: CursorRowProps) {
  const settings = useCursor(state => state.settings)
  return (
    <div className={css.group}>
      <div className={css.titleRow}>
        <div className={css.title}>
          <span className={css.titleText}>{t('cursor.title')}</span>
          <span className={css.titleDesc}>{t('cursor.titleDescription')}</span>
        </div>
        <Switch checked={settings.enabled} onChange={setEnabled} label={t('cursor.enabled')} />
      </div>

      <div className={css.item}>
        <span className={css.itemText}>
          <span className={css.itemTitle}>{t('cursor.trail')}</span>
          <span className={css.itemDesc}>{t('cursor.trailDescription')}</span>
        </span>
        <span className={css.itemControl}>
          <Switch checked={settings.trail} onChange={setTrail} label={t('cursor.trail')} />
        </span>
      </div>

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
    </div>
  )
}
