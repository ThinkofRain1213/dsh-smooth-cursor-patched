window.__ModuleLoader__.load({
	id: "dsh-smooth-cursor-patched",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/make-cursor-hook.ts
		/**
		* App-local snapshot-to-React binding for the settings row, built directly on
		* React 18's stable `useSyncExternalStore`. This deliberately replaces the
		* official `bindSnapshotSelector` (from `@deepseek-ai/dsh-client-ui-renderer`)
		* so the plugin depends only on the stable ObservableSnapshot contract shipped
		* by `@deepseek-ai/dsh-client-runtime/client` plus React core — not on the
		* rename-prone internal renderer package. Keeps the plugin cross-version.
		*/
		/**
		* Create a component-safe selector hook over an observable snapshot store.
		* Each store notification re-reads the state and recomputes the selector.
		*
		* @param store - the observable snapshot store (e.g. a CursorController.state).
		* @returns a hook of the same shape as the official bindSnapshotSelector.
		*/
		function bindSnapshotSelector(store) {
			return function useSnapshotSelector(selector) {
				return (0, react.useSyncExternalStore)(store.subscribe.bind(store), () => selector(store.getSnapshot()));
			};
		}
		//#endregion
		//#region src/client/cursor-settings.ts
		/**
		* Chat-input caret settings, persisted per-browser in localStorage.
		*
		* Deliberately client-local: the effect is pure chrome over the composer
		* textarea — the Host settings document and its schema stay untouched, so
		* mounting it never needs a Host restart and never rides an HTTP round-trip.
		* A Host-backed namespace can adopt this later without changing the shape.
		*/
		/** Caret thicknesses accepted at the settings row and engine boundaries. */
		const CURSOR_SIZES = [
			"small",
			"medium",
			"large"
		];
		/** Default accent — the DeepSeek brand blue (--dsw-static-deepseek-500). */
		const DEFAULT_CURSOR_COLOR = "#4176E6";
		/** Preset swatches offered by the settings row, each legible on light and dark. */
		const CURSOR_COLOR_SWATCHES = Object.freeze([
			"#4176E6",
			"#22D3EE",
			"#A78BFA",
			"#F472B6",
			"#FBBF24",
			"#34D399",
			"#F87171",
			"#F8FAFC"
		]);
		/** The effect defaults: on, trail on, blink on, brand-blue, medium. */
		const DEFAULT_CURSOR_SETTINGS = Object.freeze({
			enabled: true,
			trail: true,
			blink: true,
			color: DEFAULT_CURSOR_COLOR,
			size: "medium"
		});
		const STORAGE_KEY = "dsh:ui-theme:caret-settings";
		/** Narrow one persisted value to a known caret size. */
		function isCursorSize(value) {
			return CURSOR_SIZES.some((size) => size === value);
		}
		/** Reject malformed persisted color values without throwing. */
		function isColor(value) {
			return typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value);
		}
		/** Merge a partially-typed persisted section onto the defaults. */
		function normalize(input) {
			const source = input ?? {};
			return {
				enabled: typeof source.enabled === "boolean" ? source.enabled : DEFAULT_CURSOR_SETTINGS.enabled,
				trail: typeof source.trail === "boolean" ? source.trail : DEFAULT_CURSOR_SETTINGS.trail,
				blink: typeof source.blink === "boolean" ? source.blink : DEFAULT_CURSOR_SETTINGS.blink,
				color: isColor(source.color) ? source.color : DEFAULT_CURSOR_SETTINGS.color,
				size: isCursorSize(source.size) ? source.size : DEFAULT_CURSOR_SETTINGS.size
			};
		}
		/**
		* Browser-local persistence for the caret preference. Reads and writes a
		* single JSON value under {@link STORAGE_KEY}; every failure mode (private
		* mode, quota, corrupted payload) degrades to the defaults and is swallowed,
		* because this feature must never surface an error.
		*/
		var CursorPersistence = class {
			/** Load the stored preference, falling back to the defaults. */
			load() {
				if (typeof window === "undefined") return { ...DEFAULT_CURSOR_SETTINGS };
				try {
					const raw = window.localStorage.getItem(STORAGE_KEY);
					if (raw === null) return { ...DEFAULT_CURSOR_SETTINGS };
					return normalize(JSON.parse(raw));
				} catch {
					return { ...DEFAULT_CURSOR_SETTINGS };
				}
			}
			/** Persist one accepted preference. */
			save(settings) {
				if (typeof window === "undefined") return;
				try {
					window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
				} catch {}
			}
		};
		//#endregion
		//#region \0dsh-css:C:\Users\Think\Desktop\项目\smooth-cursor\src\client\CursorRow.module.css.mjs
		const css = ".Z1B3jG_group{border-bottom:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:12px;padding:16px 0;display:flex}.Z1B3jG_titleRow{align-items:center;gap:8px;display:flex}.Z1B3jG_title{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.Z1B3jG_titleText{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}.Z1B3jG_titleDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}.Z1B3jG_item{align-items:center;gap:12px;display:flex}.Z1B3jG_itemText{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.Z1B3jG_itemTitle{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:400;line-height:20px}.Z1B3jG_itemDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}.Z1B3jG_itemControl{flex:none;align-items:center;gap:6px;display:flex}.Z1B3jG_switch{cursor:pointer;display:inline-flex}.Z1B3jG_switchInput{clip:rect(0 0 0 0);border:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}.Z1B3jG_switchTrack{box-sizing:border-box;background:var(--dsw-alias-bg-module-platform);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;align-items:center;width:36px;height:20px;padding:2px;transition:background .16s,border-color .16s;display:inline-flex}.Z1B3jG_switchThumb{background:var(--dsw-alias-label-secondary);border-radius:50%;width:14px;height:14px;transition:transform .16s,background .16s;display:block;transform:translate(0)}.Z1B3jG_switchInput:checked+.Z1B3jG_switchTrack{background:var(--dsw-alias-brand-primary);border-color:#0000}.Z1B3jG_switchInput:checked+.Z1B3jG_switchTrack .Z1B3jG_switchThumb{background:var(--dsw-static-neutral-bluish-50);transform:translate(16px)}.Z1B3jG_switchInput:focus-visible+.Z1B3jG_switchTrack{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.Z1B3jG_swatches{flex-wrap:wrap;justify-content:flex-end}.Z1B3jG_swatch{border:1px solid var(--dsw-alias-border-l2);box-sizing:border-box;cursor:pointer;border-radius:50%;width:24px;height:24px;padding:0;position:relative}.Z1B3jG_swatchActive{border-color:var(--dsw-alias-label-primary);outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);outline-offset:1px}.Z1B3jG_customSwatch{cursor:pointer;justify-content:center;align-items:center;display:inline-flex;overflow:hidden}.Z1B3jG_colorInput{opacity:0;cursor:pointer;width:100%;height:100%;position:absolute;inset:0}.Z1B3jG_customOverlay{color:var(--dsw-alias-label-secondary);pointer-events:none;font-size:12px;line-height:1}.Z1B3jG_sizeOption{border:1px solid var(--dsw-alias-border-l2);height:28px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border-radius:14px;padding:0 12px;font-size:12px;line-height:20px}.Z1B3jG_sizeOption:hover:not(.Z1B3jG_sizeActive){background:var(--dsw-alias-interactive-bg-hover)}.Z1B3jG_sizeActive{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400)}";
		const tagId = "dsh-smooth-cursor-patched/CursorRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-smooth-cursor-patched";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var CursorRow_module_css_default = {
			"group": "Z1B3jG_group",
			"titleText": "Z1B3jG_titleText",
			"customOverlay": "Z1B3jG_customOverlay",
			"sizeOption": "Z1B3jG_sizeOption",
			"swatch": "Z1B3jG_swatch",
			"colorInput": "Z1B3jG_colorInput",
			"sizeActive": "Z1B3jG_sizeActive",
			"titleDesc": "Z1B3jG_titleDesc",
			"swatches": "Z1B3jG_swatches",
			"itemDesc": "Z1B3jG_itemDesc",
			"itemTitle": "Z1B3jG_itemTitle",
			"switchInput": "Z1B3jG_switchInput",
			"itemControl": "Z1B3jG_itemControl",
			"switch": "Z1B3jG_switch",
			"title": "Z1B3jG_title",
			"itemText": "Z1B3jG_itemText",
			"switchTrack": "Z1B3jG_switchTrack",
			"swatchActive": "Z1B3jG_swatchActive",
			"customSwatch": "Z1B3jG_customSwatch",
			"switchThumb": "Z1B3jG_switchThumb",
			"item": "Z1B3jG_item",
			"titleRow": "Z1B3jG_titleRow"
		};
		//#endregion
		//#region src/client/CursorRow.tsx
		function Switch({ checked, onChange, label }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: CursorRow_module_css_default.switch,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					className: CursorRow_module_css_default.switchInput,
					checked,
					onChange: (event) => {
						onChange(event.target.checked);
					},
					"aria-label": label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: CursorRow_module_css_default.switchTrack,
					"aria-hidden": "true",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: CursorRow_module_css_default.switchThumb })
				})]
			});
		}
		/** Render the Input caret preference row. */
		function CursorRow({ t, useCursor, setEnabled, setTrail, setBlink, setColor, setSize }) {
			const settings = useCursor((state) => state.settings);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: CursorRow_module_css_default.group,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CursorRow_module_css_default.titleRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CursorRow_module_css_default.title,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: CursorRow_module_css_default.titleText,
								children: t("cursor.title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: CursorRow_module_css_default.titleDesc,
								children: t("cursor.titleDescription")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
							checked: settings.enabled,
							onChange: setEnabled,
							label: t("cursor.enabled")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CursorRow_module_css_default.item,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: CursorRow_module_css_default.itemText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: CursorRow_module_css_default.itemTitle,
								children: t("cursor.trail")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: CursorRow_module_css_default.itemDesc,
								children: t("cursor.trailDescription")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: CursorRow_module_css_default.itemControl,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
								checked: settings.trail,
								onChange: setTrail,
								label: t("cursor.trail")
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CursorRow_module_css_default.item,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: CursorRow_module_css_default.itemText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: CursorRow_module_css_default.itemTitle,
								children: t("cursor.blink")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: CursorRow_module_css_default.itemDesc,
								children: t("cursor.blinkDescription")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: CursorRow_module_css_default.itemControl,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
								checked: settings.blink,
								onChange: setBlink,
								label: t("cursor.blink")
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CursorRow_module_css_default.item,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: CursorRow_module_css_default.itemText,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: CursorRow_module_css_default.itemTitle,
								children: t("cursor.color")
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${CursorRow_module_css_default.itemControl} ${CursorRow_module_css_default.swatches}`,
							role: "radiogroup",
							"aria-label": t("cursor.color"),
							children: [CURSOR_COLOR_SWATCHES.map((color) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${CursorRow_module_css_default.swatch} ${settings.color === color ? CursorRow_module_css_default.swatchActive : ""}`,
								style: { background: color },
								"aria-label": color,
								role: "radio",
								"aria-checked": settings.color === color,
								onClick: () => {
									setColor(color);
								}
							}, color)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: `${CursorRow_module_css_default.swatch} ${CursorRow_module_css_default.customSwatch}`,
								title: t("cursor.customColor"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "color",
									className: CursorRow_module_css_default.colorInput,
									value: settings.color,
									onChange: (event) => {
										setColor(event.target.value);
									},
									"aria-label": t("cursor.customColor")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: CursorRow_module_css_default.customOverlay,
									"aria-hidden": "true",
									children: "…"
								})]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CursorRow_module_css_default.item,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: CursorRow_module_css_default.itemText,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: CursorRow_module_css_default.itemTitle,
								children: t("cursor.thickness")
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: CursorRow_module_css_default.itemControl,
							role: "radiogroup",
							"aria-label": t("cursor.thickness"),
							children: CURSOR_SIZES.map((size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${CursorRow_module_css_default.sizeOption} ${settings.size === size ? CursorRow_module_css_default.sizeActive : ""}`,
								role: "radio",
								"aria-checked": settings.size === size,
								onClick: () => {
									setSize(size);
								},
								children: t(`cursor.size.${size}`)
							}, size))
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/snapshot-store.ts
		/**
		* Create a snapshot store.
		* @param init - initial state.
		* @returns the store (getSnapshot/subscribe/set).
		*/
		function createSnapshotStore(init) {
			let state = init;
			const listeners = /* @__PURE__ */ new Set();
			return {
				getSnapshot: () => state,
				subscribe(fn) {
					listeners.add(fn);
					return () => {
						listeners.delete(fn);
					};
				},
				set(next) {
					state = next;
					for (const listener of [...listeners]) listener();
				}
			};
		}
		//#endregion
		//#region src/client/cursor-engine.ts
		const OVERLAY_ID = "dsh-client-cursor-overlay";
		const STYLE_ID = "dsh-client-cursor-style";
		/** Union matcher used by the capture-phase IME listeners and composer focus check. */
		const COMPOSER_ANY = `textarea[data-phase], [data-composer-input], [data-question-key] textarea, [data-question-scroll] textarea`;
		/** Comet-mode caret width per size. */
		const COMET_WIDTH = {
			small: 1.5,
			medium: 2,
			large: 2.5
		};
		/** Comet trail length per size (the plugin's default is 5). */
		const COMET_TRAIL = {
			small: 5,
			medium: 7,
			large: 10
		};
		/** Smoothness of the glide (the plugin's comet 0.2). */
		const COMET_SMOOTHNESS = .2;
		/** Distance below which the eased caret snaps onto the target. */
		const SNAP_EPSILON = .1;
		/** Comet mode: travel below this counts as "resting" (no new trail). */
		const COMET_MOVE_THRESHOLD = .2;
		const CARET_CSS = `
#${OVERLAY_ID} {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
}
#${OVERLAY_ID}[data-active='false'] { display: none; }
/* Hide the native caret on every surface the effect owns. */
html.dsh-cursor-active textarea[data-phase],
html.dsh-cursor-active [data-composer-input],
html.dsh-cursor-active [data-question-key] textarea,
html.dsh-cursor-active [data-question-scroll] textarea { caret-color: transparent; }
`;
		/** requestAnimationFrame with a setTimeout fallback (jsdom/tests). */
		const raf = (callback) => typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame(callback) : window.setTimeout(() => {
			callback(performance.now());
		}, 16);
		/** cancelAnimationFrame matching {@link raf}'s two implementations. */
		const caf = (id) => {
			if (typeof window.cancelAnimationFrame === "function") window.cancelAnimationFrame(id);
			else window.clearTimeout(id);
		};
		/**
		* Measure the caret position inside a composer, returning VIEWPORT coordinates.
		* Two input kinds are supported:
		*   - legacy `<textarea data-phase>`: mirror the text up to `selectionStart`
		*     (wrap, line height, padding, scroll) and report where the marker lands;
		*   - modern `[data-composer-input]` (Lexical contenteditable, DSH 0.1.5+):
		*     measure from live selection with cascading fallbacks for empty inputs.
		*/
		function measureCaret(input) {
			if (input instanceof HTMLTextAreaElement) return measureTextareaCaret(input);
			return measureRichCaret(input);
		}
		/** Mirror-measure a native textarea caret; converts to viewport coords. */
		function measureTextareaCaret(textarea) {
			const value = textarea.value;
			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			if (start < 0 || end < start || end > value.length) return null;
			const caret = start !== end && textarea.selectionDirection === "forward" ? end : start;
			const style = window.getComputedStyle(textarea);
			const mirror = document.createElement("div");
			mirror.setAttribute("aria-hidden", "true");
			const mirrorStyle = mirror.style;
			for (const prop of MIRROR_STYLE_PROPS) {
				const value = style[prop];
				if (typeof value === "string") mirrorStyle[prop] = value;
			}
			mirror.style.width = `${textarea.clientWidth}px`;
			mirror.style.whiteSpace = "pre-wrap";
			mirror.style.position = "absolute";
			mirror.style.top = "0";
			mirror.style.visibility = "hidden";
			const prefix = value.slice(0, caret);
			mirror.textContent = prefix.endsWith("\n") ? `${prefix.replace(/\n$/, "")} \n` : prefix;
			const marker = document.createElement("span");
			marker.style.position = "absolute";
			marker.textContent = "​";
			mirror.appendChild(marker);
			document.body.appendChild(mirror);
			mirror.scrollTop = textarea.scrollTop;
			mirror.scrollLeft = textarea.scrollLeft;
			const borderTop = parseFloat(style.borderTopWidth) || 0;
			const borderLeft = parseFloat(style.borderLeftWidth) || 0;
			const left = marker.offsetLeft + borderLeft - textarea.scrollLeft || 0;
			const lineTop = marker.offsetTop + borderTop - textarea.scrollTop || 0;
			const lineHeight = parseFloat(style.lineHeight) || 20;
			const fontSize = parseFloat(style.fontSize) || 14;
			const height = Math.min(lineHeight, Math.round(fontSize * 1.35) || 19);
			const halfLeading = Math.max(0, Math.floor((lineHeight - height) / 2));
			mirror.remove();
			const rect = textarea.getBoundingClientRect();
			return {
				left: left + rect.left,
				top: lineTop + rect.top + halfLeading,
				height
			};
		}
		/** Determine whether a selection is oriented forward (anchor before focus in document order). */
		function isSelectionForward(selection) {
			if (selection.isCollapsed) return true;
			const anchor = selection.anchorNode;
			const focus = selection.focusNode;
			if (anchor === null || focus === null) return true;
			if (anchor === focus) return selection.anchorOffset <= selection.focusOffset;
			return (anchor.compareDocumentPosition(focus) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
		}
		/**
		* Measure a modern contenteditable composer caret from the live selection range
		* with robust multi-tiered fallbacks. Keeps initial caret height identical to typed text.
		*/
		function measureRichCaret(host) {
			const selection = window.getSelection();
			if (selection === null || selection.rangeCount === 0) return null;
			const range = selection.getRangeAt(0);
			if (range === null || !host.contains(range.startContainer)) return null;
			const hostStyle = window.getComputedStyle(host);
			const defaultLineHeight = parseFloat(hostStyle.lineHeight) || 24;
			const fontSize = parseFloat(hostStyle.fontSize) || 14;
			const expectedCaretHeight = Math.min(defaultLineHeight, Math.round(fontSize * 1.35) || 19);
			const halfLeading = Math.max(0, Math.floor((defaultLineHeight - expectedCaretHeight) / 2));
			const hostRect = host.getBoundingClientRect();
			const borderTop = parseFloat(hostStyle.borderTopWidth) || 0;
			const borderLeft = parseFloat(hostStyle.borderLeftWidth) || 0;
			const paddingTop = parseFloat(hostStyle.paddingTop) || 0;
			const paddingLeft = parseFloat(hostStyle.paddingLeft) || 0;
			const lineStartLeft = hostRect.left + borderLeft + paddingLeft - host.scrollLeft;
			const rects = range.getClientRects();
			if (rects.length > 0) {
				const isForward = isSelectionForward(selection);
				const r = isForward ? rects[rects.length - 1] : rects[0];
				if (r !== void 0 && (r.width > 0 || r.height > 0 || r.top > 0 || r.left > 0)) return {
					left: isForward && !selection.isCollapsed ? r.right : r.left,
					top: r.top,
					height: r.height || expectedCaretHeight
				};
			}
			if (selection.isCollapsed) {
				const focusNode = selection.focusNode;
				const offset = selection.focusOffset;
				if (focusNode instanceof Element && host.contains(focusNode)) {
					const prevChild = offset > 0 ? focusNode.childNodes[offset - 1] : null;
					if (prevChild instanceof Element && prevChild.tagName === "BR") {
						const brRect = prevChild.getBoundingClientRect();
						return {
							left: lineStartLeft,
							top: (brRect.top > 0 ? brRect.top : hostRect.top + paddingTop + halfLeading) + defaultLineHeight,
							height: expectedCaretHeight
						};
					}
					if (focusNode !== host && (focusNode.textContent ?? "").trim() === "") {
						const pRect = focusNode.getBoundingClientRect();
						if (pRect.top > 0 && pRect.height > 0) return {
							left: lineStartLeft,
							top: pRect.top + halfLeading,
							height: expectedCaretHeight
						};
					}
				}
			}
			const rangeRect = range.getBoundingClientRect();
			if (rangeRect.top > 0 || rangeRect.left > 0) return {
				left: isSelectionForward(selection) && !selection.isCollapsed ? rangeRect.right : rangeRect.left,
				top: rangeRect.top,
				height: rangeRect.height || expectedCaretHeight
			};
			const startEl = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
			const br = (startEl instanceof HTMLElement && host.contains(startEl) && startEl !== host ? startEl : host).querySelector("br");
			if (br !== null) {
				const brRect = br.getBoundingClientRect();
				if (brRect.top > 0 && brRect.bottom >= brRect.top) return {
					left: brRect.left,
					top: brRect.top,
					height: brRect.height > 0 ? brRect.height : expectedCaretHeight
				};
			}
			if (startEl instanceof HTMLElement && startEl !== host && host.contains(startEl)) {
				const pRect = startEl.getBoundingClientRect();
				if (pRect.top > 0 && pRect.height > 0) {
					const pStyle = window.getComputedStyle(startEl);
					const pPadLeft = parseFloat(pStyle.paddingLeft) || 0;
					return {
						left: pRect.left + pPadLeft,
						top: pRect.top + halfLeading,
						height: expectedCaretHeight
					};
				}
			}
			return {
				left: lineStartLeft,
				top: hostRect.top + borderTop + paddingTop + halfLeading - host.scrollTop,
				height: expectedCaretHeight
			};
		}
		/** Get the visible scrollport bounding rect for clipping the caret overlay. */
		function getComposerClipRect(composer) {
			return (composer.closest("[data-input-scroll]") ?? composer).getBoundingClientRect();
		}
		/** Textarea presentation props the mirror must reproduce for a faithful reflow. */
		const MIRROR_STYLE_PROPS = [
			"boxSizing",
			"overflowWrap",
			"wordBreak",
			"whiteSpace",
			"lineHeight",
			"wordSpacing",
			"letterSpacing",
			"fontFamily",
			"fontSize",
			"fontWeight",
			"fontStyle",
			"textTransform",
			"textIndent",
			"textAlign",
			"paddingTop",
			"paddingRight",
			"paddingBottom",
			"paddingLeft",
			"borderTopWidth",
			"borderRightWidth",
			"borderBottomWidth",
			"borderLeftWidth"
		];
		/**
		* Canvas caret engine. Constructor mounts the overlay canvas + style + the
		* document-capture IME listeners when a browser document exists (node runs
		* see none and become no-ops); {@link apply} drives visibility, color,
		* thickness, and the trail switch; {@link dispose} tears everything.
		*/
		var CursorEngine = class {
			settings;
			overlay;
			ctx;
			style;
			raf = 0;
			/** Whether the draw loop is scheduled (started on the first enabling apply). */
			running = false;
			dpr = 1;
			currentX = 0;
			currentY = 0;
			targetX = 0;
			targetY = 0;
			currentHeight = 20;
			initialized = false;
			trailPts = [];
			lastActivityTime = performance.now();
			BLINK_HALF_CYCLE = 500;
			composing = false;
			lastSignature = "";
			caret = null;
			/** The input surface the caret is currently seated on (chat composer vs question card). */
			activeComposer = null;
			onCompositionStart = (event) => {
				const target = event.target;
				if (!(target instanceof HTMLElement) || !target.matches(COMPOSER_ANY)) return;
				this.composing = true;
				this.lastSignature = "";
				this.lastActivityTime = performance.now();
			};
			onCompositionEnd = (event) => {
				const target = event.target;
				if (!(target instanceof HTMLElement) || !target.matches(COMPOSER_ANY)) return;
				this.composing = false;
				this.lastSignature = "";
				this.lastActivityTime = performance.now();
			};
			/** @param settings - initial effect preference (first apply re-applies). */
			constructor(settings) {
				this.settings = settings;
				if (typeof document === "undefined" || typeof window === "undefined") return;
				this.style = document.createElement("style");
				this.style.id = STYLE_ID;
				this.style.textContent = CARET_CSS;
				document.head.appendChild(this.style);
				this.overlay = document.createElement("canvas");
				this.overlay.id = OVERLAY_ID;
				this.overlay.dataset.active = "false";
				this.ctx = this.overlay.getContext("2d") ?? void 0;
				document.body.appendChild(this.overlay);
				document.addEventListener("compositionstart", this.onCompositionStart, { capture: true });
				document.addEventListener("compositionend", this.onCompositionEnd, { capture: true });
			}
			/**
			* Apply one effect preference: color, thickness, trail switch, and the
			* native-caret lock. While enabled, a synchronous pass renders
			* immediately against the current focus.
			*/
			apply(settings) {
				this.settings = settings;
				if (this.overlay === void 0) return;
				this.overlay.dataset.color = settings.color;
				this.overlay.dataset.size = settings.size;
				document.documentElement.classList.toggle("dsh-cursor-active", settings.enabled);
				if (!settings.enabled) {
					caf(this.raf);
					this.running = false;
					this.overlay.dataset.active = "false";
					this.clear();
					return;
				}
				this.overlay.dataset.active = "true";
				if (!this.running) {
					this.running = true;
					this.initialized = false;
					this.lastSignature = "";
					this.raf = raf(this.loop);
				}
				this.renderOnce();
			}
			/** Remove the overlay, style, listeners, and native-caret lock. */
			dispose() {
				if (this.overlay === void 0) return;
				this.running = false;
				caf(this.raf);
				document.removeEventListener("compositionstart", this.onCompositionStart, { capture: true });
				document.removeEventListener("compositionend", this.onCompositionEnd, { capture: true });
				this.overlay.remove();
				this.style?.remove();
				document.documentElement.classList.remove("dsh-cursor-active");
			}
			/** One animation frame: size, measure, ease, draw. */
			loop = () => {
				this.renderOnce();
				this.raf = raf(this.loop);
			};
			/** Synchronous render pass (also the per-frame body). */
			renderOnce() {
				const ctx = this.ctx;
				if (this.overlay === void 0 || ctx === void 0) return;
				if (!this.settings.enabled) return;
				this.resize();
				const width = window.innerWidth;
				const height = window.innerHeight;
				ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
				ctx.clearRect(0, 0, width, height);
				const composer = this.focusedComposer();
				if (composer === null) {
					this.clear();
					this.trailPts = [];
					this.initialized = false;
					this.lastSignature = "";
					this.activeComposer = null;
					return;
				}
				if (this.activeComposer !== composer) {
					this.activeComposer = composer;
					this.initialized = false;
					this.lastSignature = "";
					this.trailPts = [];
					this.lastActivityTime = performance.now();
				}
				const sig = this.signature(composer);
				if (this.composing || sig === null || sig !== this.lastSignature) {
					this.lastSignature = sig === null ? "" : sig;
					this.caret = measureCaret(composer);
				}
				if (this.caret === null) {
					this.clear();
					return;
				}
				this.targetX = this.caret.left;
				this.targetY = this.caret.top;
				this.currentHeight = this.caret.height;
				if (!this.initialized) {
					this.currentX = this.targetX;
					this.currentY = this.targetY;
					this.initialized = true;
					this.lastActivityTime = performance.now();
				}
				const clipRect = getComposerClipRect(composer);
				this.renderComet(ctx, clipRect);
			}
			/** Resize the backing canvas to the viewport × devicePixelRatio. */
			resize() {
				if (this.overlay === void 0) return;
				const dpr = window.devicePixelRatio || 1;
				const cssWidth = window.innerWidth;
				const cssHeight = window.innerHeight;
				const width = Math.max(1, Math.round(cssWidth * dpr));
				const height = Math.max(1, Math.round(cssHeight * dpr));
				if (this.overlay.width !== width || this.overlay.height !== height) {
					this.overlay.width = width;
					this.overlay.height = height;
					this.dpr = dpr;
				}
				if (this.overlay.style.width !== `${cssWidth}px`) this.overlay.style.width = `${cssWidth}px`;
				if (this.overlay.style.height !== `${cssHeight}px`) this.overlay.style.height = `${cssHeight}px`;
			}
			/** Comet mode with scrollport clipping and out-of-bounds culling. */
			renderComet(ctx, clipRect) {
				const target = this.targetX;
				if (Math.abs(this.targetX - this.currentX) < SNAP_EPSILON) this.currentX = this.targetX;
				else this.currentX += (target - this.currentX) * COMET_SMOOTHNESS;
				if (Math.abs(this.targetY - this.currentY) < SNAP_EPSILON) this.currentY = this.targetY;
				else this.currentY += (this.targetY - this.currentY) * COMET_SMOOTHNESS;
				const moving = Math.hypot(this.targetX - this.currentX, this.targetY - this.currentY) > COMET_MOVE_THRESHOLD;
				if (moving) {
					this.lastActivityTime = performance.now();
					if (this.settings.trail) {
						this.trailPts.push({
							x: this.currentX,
							y: this.currentY
						});
						if (this.trailPts.length > COMET_TRAIL[this.settings.size]) this.trailPts.shift();
					} else this.trailPts = [];
				} else this.trailPts = [];
				if (this.currentY + (this.currentHeight || 20) <= clipRect.top || this.currentY >= clipRect.bottom) {
					this.trailPts = [];
					return;
				}
				ctx.save();
				ctx.beginPath();
				ctx.rect(0, clipRect.top, window.innerWidth, clipRect.height);
				ctx.clip();
				if (this.settings.trail && this.trailPts.length > 0) this.drawCometTrail(ctx);
				this.drawCometHead(ctx, moving);
				ctx.restore();
			}
			drawCometTrail(ctx) {
				if (this.trailPts.length < 2) return;
				const color = this.settings.color;
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				ctx.shadowBlur = 8;
				ctx.shadowColor = color;
				const width = COMET_WIDTH[this.settings.size];
				for (let s = 0; s < this.trailPts.length - 1; s += 1) {
					const from = this.trailPts[s];
					const to = this.trailPts[s + 1];
					if (from === void 0 || to === void 0) continue;
					const a = s / this.trailPts.length;
					ctx.beginPath();
					ctx.moveTo(from.x, from.y);
					ctx.lineTo(to.x, to.y);
					ctx.lineWidth = width + a * 2;
					ctx.strokeStyle = this.hexToRgba(color, a);
					ctx.stroke();
				}
			}
			drawCometHead(ctx, moving) {
				if (this.settings.blink && !moving) {
					if ((performance.now() - this.lastActivityTime) % (this.BLINK_HALF_CYCLE * 2) >= this.BLINK_HALF_CYCLE) return;
				}
				const color = this.settings.color;
				const width = COMET_WIDTH[this.settings.size];
				const n = Math.max(8, this.currentHeight || 24);
				ctx.fillStyle = color;
				ctx.shadowBlur = moving ? 10 : 0;
				ctx.shadowColor = color;
				ctx.fillRect(this.currentX - width / 2, this.currentY, width, n);
			}
			hexToRgba(hex, alpha) {
				return `rgba(${Number.parseInt(hex.slice(1, 3), 16)}, ${Number.parseInt(hex.slice(3, 5), 16)}, ${Number.parseInt(hex.slice(5, 7), 16)}, ${alpha})`;
			}
			clear() {
				if (this.ctx === void 0 || this.overlay === void 0) return;
				this.ctx.setTransform(1, 0, 0, 1, 0, 0);
				this.ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
			}
			/** The composer input when it has focus (textarea or contenteditable), else null. */
			focusedComposer() {
				const active = document.activeElement;
				if (!(active instanceof HTMLElement)) return null;
				if (!active.matches(COMPOSER_ANY)) return null;
				return active;
			}
			/**
			* Track the pieces that change where the caret line lands. The modern
			* contenteditable composer has no selectionStart/value/scroll mirrors, so
			* it reports null (re-measure every frame).
			*/
			signature(input) {
				if (!(input instanceof HTMLTextAreaElement)) return null;
				return `${input.selectionStart}|${input.selectionEnd}|${input.selectionDirection}|${input.value.length}|${input.scrollTop}|${input.scrollLeft}|${input.clientWidth}`;
			}
		};
		//#endregion
		//#region src/client/cursor-controller.ts
		/**
		* Caret-effect controller: owns the durable preference snapshot store the
		* settings row reads, the render engine it drives, and the localStorage
		* persistence both share. One instance per plugin apply, disposed with the
		* fiber so an HMR reload rebuilds from the stored preference.
		*/
		/** Shallow-compare two caret preferences for the write guard. */
		function sameSettings(left, right) {
			return left.enabled === right.enabled && left.trail === right.trail && left.blink === right.blink && left.color === right.color && left.size === right.size;
		}
		/**
		* Controller over the chat-input caret effect. Reads the stored preference
		* once, applies it to the engine, publishes a reactive snapshot for the
		* settings row, and routes row edits back through persistence and the engine.
		*/
		var CursorController = class {
			/** Reactive preference source for the settings row (useCursor seat). */
			state;
			persist;
			engine;
			settings;
			revision = 0;
			/** @param persist - storage seam (defaults to browser localStorage). */
			constructor(persist = new CursorPersistence()) {
				this.persist = persist;
				this.settings = persist.load();
				this.engine = new CursorEngine(this.settings);
				this.engine.apply(this.settings);
				this.state = createSnapshotStore({
					settings: this.settings,
					revision: this.revision
				});
			}
			/** Toggle the whole effect. */
			setEnabled(enabled) {
				this.update({
					...this.settings,
					enabled
				});
			}
			/** Toggle the typing trail. */
			setTrail(trail) {
				this.update({
					...this.settings,
					trail
				});
			}
			/** Toggle caret blinking while idle. */
			setBlink(blink) {
				this.update({
					...this.settings,
					blink
				});
			}
			/** Set the accent color (validated hex). */
			setColor(color) {
				this.update({
					...this.settings,
					color
				});
			}
			/** Set the caret thickness. */
			setSize(size) {
				this.update({
					...this.settings,
					size
				});
			}
			/** Publish and persist one preference, skipping a no-op write. */
			update(next) {
				if (sameSettings(this.settings, next)) return;
				this.settings = next;
				this.persist.save(next);
				this.engine.apply(next);
				this.revision += 1;
				this.state.set({
					settings: next,
					revision: this.revision
				});
			}
			/** Tear the engine down (called from the apply fiber's disposer). */
			dispose() {
				this.engine.dispose();
			}
		};
		//#endregion
		//#region src/client/locales.ts
		/** `settings.cursor-effect` namespace dictionaries (the Input caret row's copy). */
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"cursor.title": "输入光标",
			"cursor.titleDescription": "聊天输入框的文字光标",
			"cursor.enabled": "呼吸光标",
			"cursor.trail": "彗星拖尾",
			"cursor.trailDescription": "移动时在光标后带出一串渐隐尾迹",
			"cursor.blink": "光标闪烁",
			"cursor.blinkDescription": "静止时如原生光标般规律闪烁，移动时保持常亮",
			"cursor.color": "颜色",
			"cursor.customColor": "自定义颜色",
			"cursor.thickness": "粗细",
			"cursor.size.small": "细",
			"cursor.size.medium": "中",
			"cursor.size.large": "粗"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"cursor.title": "Input caret",
			"cursor.titleDescription": "Animated caret for the chat input",
			"cursor.enabled": "Breathing caret",
			"cursor.trail": "Comet trail",
			"cursor.trailDescription": "Trails a fading tail behind the caret as it moves",
			"cursor.blink": "Caret blinking",
			"cursor.blinkDescription": "Blinks the caret when idle, stays solid while moving",
			"cursor.color": "Color",
			"cursor.customColor": "Custom color",
			"cursor.thickness": "Thickness",
			"cursor.size.small": "Thin",
			"cursor.size.medium": "Medium",
			"cursor.size.large": "Thick"
		};
		//#endregion
		//#region src/client/index.ts
		/** Locale namespace owned by this feature's settings row. */
		const SETTINGS_NS = "settings.cursor-effect";
		/** Required services: the settings-item slot surface and the locale registry. */
		const inject = ["slots", "locale"];
		/** Apply the cursor plugin: register locale dictionaries and the settings row. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(SETTINGS_NS, {
				zh,
				en
			}), "smooth-cursor: settings row dictionaries");
			const controller = new CursorController();
			ctx.effect(() => () => {
				controller.dispose();
			}, "smooth-cursor: effect teardown");
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "cursor-effect",
				order: 30,
				locale: SETTINGS_NS,
				inject: () => ({
					useCursor: bindSnapshotSelector(controller.state),
					setEnabled: (value) => {
						controller.setEnabled(value);
					},
					setTrail: (value) => {
						controller.setTrail(value);
					},
					setBlink: (value) => {
						controller.setBlink(value);
					},
					setColor: (value) => {
						controller.setColor(value);
					},
					setSize: (value) => {
						controller.setSize(value);
					}
				})
			}, CursorRow));
		}
		//#endregion
		exports.SETTINGS_NS = SETTINGS_NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map