# dsh-smooth-cursor-patched

**中文 | [English](README.en.md)**

一个为 [DSH](https://github.com/deepseek-ai/deepseek-harness)（DeepSeek Harness）打造的**平滑彗星光标（社区深度修复与增强版）**——把原生输入光标替换成一枚会随输入平滑滑动的发光彗星，支持自定义拖尾、强调色、粗细及 500ms 黄金呼吸节拍。

> 本项目为 `dsh-smooth-cursor` 的本地增强修复版（Patched Edition），彻底根治了原版在空内容、软换行、划词方向、超长滚动及询问界面中的多项体验缺陷。

![category](https://img.shields.io/badge/category-UI_Enhancement-orange)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 核心特性与修复

- **平滑彗星光标** — 平滑缓动，移动时光标优雅滑向目标字符位置。
- **彗星拖尾** — 移动光标时带有渐细渐隐的粒子拖尾。
- **光标闪烁呼吸（新增）** — 恢复并对齐 VS Code / 原生 500ms 黄金呼吸节拍，无操作 0.5 秒准时呼吸，打字时 100% 常亮，支持独立开关。
- **空内容与初次聚焦保活（修复）** — 彻底解决原版空输入框或初次点击时光标彻底消失的 Bug。
- **双向划词跟手（修复）** — 具备方向感知能力，无论正向拖选（从左往右）还是逆向拖选（从右往左），光标始终紧随鼠标指针。
- **换行空行精准拦截（修复）** — 根治 `Shift + Enter` 换行到空行时光标停留在上一行末尾、打字才瞬移的 Chromium 回溯吸附缺陷。
- **视口物理纵向裁剪（修复）** — 长文本输入滚动时，超界光标自动剔除与平滑裁切，绝不越界漂浮到聊天区或工具栏。
- **覆盖询问界面（新增）** — 全面支持 `ask_user_question` 交互卡片的作答输入框。
- **浏览器本地持久化** — 设置保存于 `localStorage`，即开即用。

---

## 安装与使用

### 作为 DSH 插件安装（推荐）

通过 GitHub 一键安装：

```bash
dsh plugin --profile web add github:ThinkofRain1213/smooth-cursor
```

安装后刷新或重启 `dsh web`，在 **设置 → 通用 → 输入光标** 中即可开启或微调各项参数。

### 手动安装（本地开发）

克隆本仓库并作为插件 bundle 添加：

```bash
git clone https://github.com/Lacquervii/smooth-cursor.git
cd smooth-cursor
pnpm install --ignore-scripts
pnpm build
```

然后在你的 profile 的 `cordis.patch.yml` 中注册：

```yaml
- insert:
    - id: smooth-cursor
      name: dsh-smooth-cursor
```

## 使用

当输入框获得焦点时特效即生效。打开 **设置 → 通用 → 输入光标** 可以：

- 开关整个特效，或仅开关彗星拖尾。
- 从色板选择强调色，或使用自定义取色器。
- 选择光标的粗细。

## 开发

```bash
pnpm install --ignore-scripts
pnpm build     # tsc 类型 + tsdown 打包（node 端 + 客户端）
pnpm watch     # 增量重建
```

`lib/` 已提交到仓库，即使包管理器阻止了 `prepare` 构建步骤，也能从 git 安装后直接运行。

## 致谢

本插件的**光标平滑效果**受 [VSCode 的 smooth cursor](https://github.com/microsoft/vscode) 概念启发，并参考了 Obsidian 社区的 [animated-cursor](https://github.com/kotaindah55/animated-cursor) 插件（原作者 Copyright (c) 2025 Kotaindah55 (Sheva Ihza)，基于 [MIT License](https://github.com/kotaindah55/animated-cursor/blob/master/LICENSE)）。本项目的渲染与集成是为 DSH Web 独立重写的实现，但效果灵感来源于上述项目，特此致谢。

## 许可证

MIT
