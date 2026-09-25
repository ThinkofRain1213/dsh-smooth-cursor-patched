# dsh-smooth-cursor-patched

**中文 | [English](README.en.md)**

[![npm 版本](https://img.shields.io/npm/v/dsh-smooth-cursor-patched?label=npm&color=5965d8)](https://www.npmjs.com/package/dsh-smooth-cursor-patched)
[![GitHub Release](https://img.shields.io/github/v/release/ThinkofRain1213/dsh-smooth-cursor-patched?label=release&color=5965d8)](https://github.com/ThinkofRain1213/dsh-smooth-cursor-patched/releases)
[![构建检查](https://github.com/ThinkofRain1213/dsh-smooth-cursor-patched/actions/workflows/validate.yml/badge.svg)](https://github.com/ThinkofRain1213/dsh-smooth-cursor-patched/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个为 [DSH](https://github.com/deepseek-ai/deepseek-harness)（DeepSeek Harness）打造的**平滑彗星光标（社区修补版）**——把原生输入光标替换成一枚会随输入平滑滑动的发光彗星，支持自定义拖尾、强调色、粗细及 500ms 呼吸节拍。

> **关于本仓库**
> 这是 [Lacquervii/smooth-cursor](https://github.com/Lacquervii/smooth-cursor) 的个人修补分支。上游自 2026-09-09 起未再更新，故在此维护一份可用版本。
> - 精力有限，不保证及时关注这个仓库，且随时可能断更
> - 欢迎提 issue，但回复可能很慢
> - 上游若恢复维护，我会优先回归上游

---

## 相对上游的改动

上游 `dsh-smooth-cursor` 在以下场景存在可复现的缺陷，本分支逐项修复：

- **空内容与初次聚焦保活** — 上游在空输入框或初次点击时，光标测量拿到零高度矩形，导致光标不显示。本分支为富文本输入框增加了分层测量与空行兜底。
- **双向划词跟手** — 上游固定取选区第 0 个矩形，正向拖选（从左往右）时光标不跟鼠标。本分支按选区方向（`selectionDirection`）选择首/末矩形，并把选区终点与方向纳入重测签名。
- **换行空行精准拦截** — 上游依赖 `range.getBoundingClientRect()`，在空行上会拿到 Chromium 回溯吸附的矩形，光标停留在上一行末尾。本分支在软换行与空段落处优先实测该行自身的 `<br>` 高度。
- **视口物理纵向裁剪** — 上游没有裁剪，长文本滚动时超界光标会漂浮到聊天区或工具栏上方。本分支按输入框滚动视口剔除并裁切。
- **覆盖询问界面** — 上游只覆盖 `textarea[data-phase]`。本分支同时覆盖 `ask_user_question` 交互卡片的作答输入框。

此外新增：**光标呼吸（闪烁）**，对齐 VS Code / 原生 500ms 节拍（无操作 0.5 秒后呼吸，打字时常亮），可在设置中独立开关。

---

## 核心特性

- **平滑彗星光标** — 平滑缓动，移动时光标优雅滑向目标字符位置。
- **彗星拖尾** — 移动光标时带有渐细渐隐的粒子拖尾。
- **光标呼吸开关** — 500ms 节拍，可独立开关。
- **浏览器本地持久化** — 设置保存于 `localStorage`，即开即用。

---

## 安装与使用

### 从 npm 安装（推荐）

```bash
dsh plugin --profile web add dsh-smooth-cursor-patched
```

### 从 GitHub 安装

```bash
dsh plugin --profile web add github:ThinkofRain1213/dsh-smooth-cursor-patched
```

安装后刷新或重启 `dsh web`，在 **插件 → 本插件** 的 bundle 详情页里配置：配置区位于描述与「包含的组件」之间。

> **版本要求：DSH 0.1.6-alpha.2 及以后。**
> 插件自有设置页由 `@deepseek-ai/dsh-client-ui-plugin-manager` 提供，该包首次发布于 `0.1.6-alpha.2`，并从中提供 `plugins.bundle.config` 槽位。0.1.5 及更早的版本没有插件管理界面，因此没有这个槽位——插件会安静地不渲染配置区（光标特效本身不受影响，走 `localStorage` 的既有偏好继续生效）。
>
> 从本版本起，本插件**只提供插件页这一处配置入口**：先前注册在「设置 → 通用」的输入光标行已移除，避免同一组开关出现两次。

### 手动安装（本地开发）

克隆本仓库并作为插件 bundle 添加：

```bash
git clone https://github.com/ThinkofRain1213/dsh-smooth-cursor-patched.git
cd dsh-smooth-cursor-patched
pnpm install --ignore-scripts
pnpm build
```

然后在你的 profile 的 `cordis.patch.yml` 中注册：

```yaml
- insert:
    - id: smooth-cursor-patched
      name: dsh-smooth-cursor-patched
```

> 注意：`id` / `name` 必须与包名一致。改写为上游的 `smooth-cursor` / `dsh-smooth-cursor` 会与官方插件条目冲突，DSH 会因 loader id 重复而报 `Failed to load plugins`。

## 使用

当输入框获得焦点时特效即生效。打开 **插件 → 本插件** 的配置区可以：

- 开关整个特效、彗星拖尾或光标闪烁。
- 从色板选择强调色，或使用自定义取色器。
- 选择光标的粗细。

偏好保存在浏览器 `localStorage` 里，改动即时生效，无需重启或刷新。

## 开发

```bash
pnpm install --ignore-scripts
pnpm run typecheck          # tsc 类型检查
pnpm run build              # tsdown 打包（node 端 + 客户端）
pnpm run check:register-id  # 校验 bundle 注册 id 与 patch name 一致
pnpm run watch              # 增量重建
```

`lib/` 已提交到仓库，即使包管理器阻止了 `prepare` 构建步骤，也能从 git 安装后直接运行。提交前请确保 `pnpm run build` 之后 `lib/` 无未提交改动——CI 会校验已提交的产物与 `src/` 同步。

## 测试

本仓库目前**没有自动化测试**。CI 只覆盖类型检查、构建、注册 id 一致性与产物新鲜度；它不能证明光标在各浏览器中的实际行为，那部分依赖手动验证。

## 致谢

本插件的**光标平滑效果**受 [VSCode 的 smooth cursor](https://github.com/microsoft/vscode) 概念启发，并参考了 Obsidian 社区的 [animated-cursor](https://github.com/kotaindah55/animated-cursor) 插件（原作者 Copyright (c) 2025 Kotaindah55 (Sheva Ihza)，基于 [MIT License](https://github.com/kotaindah55/animated-cursor/blob/master/LICENSE)）。本项目的渲染与集成是为 DSH Web 独立重写的实现，但效果灵感来源于上述项目，特此致谢。

## 许可证

MIT
