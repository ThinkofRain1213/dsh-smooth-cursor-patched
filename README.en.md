# dsh-smooth-cursor-patched

**[中文](README.md) | English**

A smooth, comet-mode animated caret for the [DSH](https://github.com/deepseek-ai/deepseek-harness) chat composer textarea — a standalone installable DSH plugin. Replaces the native text caret with a glowing comet that glides across the input as you type, with a configurable trail, accent color, and thickness.

[![npm version](https://img.shields.io/npm/v/dsh-smooth-cursor-patched?label=npm&color=5965d8)](https://www.npmjs.com/package/dsh-smooth-cursor-patched)
[![GitHub Release](https://img.shields.io/github/v/release/ThinkofRain1213/dsh-smooth-cursor-patched?label=release&color=5965d8)](https://github.com/ThinkofRain1213/dsh-smooth-cursor-patched/releases)
[![Validate](https://github.com/ThinkofRain1213/dsh-smooth-cursor-patched/actions/workflows/validate.yml/badge.svg)](https://github.com/ThinkofRain1213/dsh-smooth-cursor-patched/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **About this repository**
> This is a personal patched fork of [Lacquervii/smooth-cursor](https://github.com/Lacquervii/smooth-cursor). Upstream has not been updated since 2026-09-09, so a working copy is maintained here.
> - Limited spare time: this repository is not guaranteed to be watched promptly, and may stop receiving updates at any time
> - Issues are welcome, but replies may be slow
> - If upstream resumes maintenance, I will prefer returning to it

<p align="center">
  <img src="docs/social-preview.png" alt="dsh-smooth-cursor-patched preview" width="800">
</p>

## Preview

<video src="docs/preview.mp4" controls width="720" muted></video>

## Changes from upstream

Upstream `dsh-smooth-cursor` has reproducible defects in the situations below; this branch fixes each of them:

- **Empty input and first focus survive** — upstream measures a zero-height rect on an empty composer or a first click, so the caret is not drawn. This branch adds layered measurement and an empty-line fallback for the rich-text composer.
- **Bidirectional drag tracking** — upstream always takes rect 0 of the selection, so a forward drag (left to right) leaves the caret behind the pointer. This branch selects the first or last rect by `selectionDirection`, and includes the selection end and direction in the re-measure signature.
- **Soft-break line positioning** — upstream relies on `range.getBoundingClientRect()`, which returns Chromium's snap-back rect on an empty line and parks the caret at the end of the previous line. This branch measures that line's own `<br>` first for soft breaks and empty paragraphs.
- **Vertical viewport clipping** — upstream does not clip, so with long input the out-of-range caret floats over the chat area or toolbar. This branch culls and clips against the composer's scrollport.
- **Question-card inputs** — upstream only covers `textarea[data-phase]`. This branch also covers the answer fields of `ask_user_question` cards.

Also added: a **caret breath (blink)** aligned to the VS Code / native 500 ms cadence (0.5 s idle before breathing, solid while typing), with its own settings toggle.

## Features

- **Smooth caret** — a smooth eased caret that glides to the text position.
- **Comet trail** — a tapered, fading trail follows the caret while you move it.
- **Breath toggle** — a 500 ms cadence that can be switched off independently.
- **Configurable** — enable/disable, trail on/off, accent color (preset swatches or custom picker), thickness (thin / medium / thick).
- **Local persistence** — settings are stored in `localStorage`; no host restart or round-trip needed.

## Install

### From npm (recommended)

```bash
dsh plugin --profile web add dsh-smooth-cursor-patched
```

### From GitHub

```bash
dsh plugin --profile web add github:ThinkofRain1213/dsh-smooth-cursor-patched
```

Then restart `dsh web` and find the **Input caret** row under **Settings → General**.

### Manual (local development)

Clone this repo and add it as a plugin bundle:

```bash
git clone https://github.com/ThinkofRain1213/dsh-smooth-cursor-patched.git
cd dsh-smooth-cursor-patched
pnpm install --ignore-scripts
pnpm build
```

Then register it in your profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: smooth-cursor-patched
      name: dsh-smooth-cursor-patched
```

> Note: the `id` / `name` must match the package name. Reusing upstream's `smooth-cursor` / `dsh-smooth-cursor` collides with the official entry and makes DSH fail with a duplicate loader id (`Failed to load plugins`).

## Usage

The effect activates whenever the composer textarea has focus. Open **Settings → General → Input caret** to:

- Toggle the whole effect or just the comet trail.
- Pick an accent color from the swatches, or use the custom color picker.
- Choose the caret thickness.

## Development

```bash
pnpm install --ignore-scripts
pnpm run typecheck          # tsc type check
pnpm run build              # tsdown bundles (node half + client half)
pnpm run check:register-id  # asserts the bundle's registration id matches the patch name
pnpm run watch              # incremental rebuild
```

`lib/` is committed so the plugin works straight from a git install even when a package manager blocks the `prepare` build step. Before committing, make sure `pnpm run build` leaves `lib/` clean — CI verifies that the committed artifact is still in sync with `src/`.

## Tests

This repository currently has **no automated tests**. CI covers only the type check, the build, the registration-id contract, and artifact freshness; it cannot prove how the caret behaves in a given browser — that part is verified by hand.

## Acknowledgements

The **smooth caret effect** of this plugin is inspired by the [VSCode smooth cursor](https://github.com/microsoft/vscode) concept and references the Obsidian community [animated-cursor](https://github.com/kotaindah55/animated-cursor) plugin (Copyright (c) 2025 Kotaindah55 (Sheva Ihza), released under the [MIT License](https://github.com/kotaindah55/animated-cursor/blob/master/LICENSE)). The rendering and integration in this project are independently rewritten for DSH Web, but the effect is inspired by the projects above — many thanks to their authors.

## License

MIT
