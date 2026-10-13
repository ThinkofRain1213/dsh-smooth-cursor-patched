# 空行光标错位 — 已实施的修复（Case C）

**状态**：✅ 已实施、构建、发布（commit `bf2b9db`，tag `v0.1.9-patched.6`，npm 已上架）
**改动位置**：`src/client/cursor-engine.ts` → `measureRichCaret()` 的 Tier 1.5
**改动规模**：**+52 行 / −0 行**（纯增量，未删改任何既有代码）
**影响范围**：主聊天输入框（`div[data-composer-input]`，Lexical contenteditable）

> 根因与证据链见 [root-cause-blank-line-caret.md](./root-cause-blank-line-caret.md)。
> 本文件只讲**改了什么**、**每处为什么这么改**、**怎么验**、**怎么回滚**。

---

## 0. 一句话根因

Tier 1.5 的两个空行分支（Case A / Case B）都以 `focusNode instanceof Element` 为入口，而真实 DSH 的选区焦点**永远是 `#text`**。于是这两个分支从不执行，光标一路掉到 Tier 3，在那里取到**整个多行 `<span>` 的包围盒**——那是 span 的**第一行**，导致彗星画在高一行（实测 +26px）。

---

## 1. 改动总览

| # | 位置 | 改动 | 作用 |
|---|---|---|---|
| 1 | `isSelectionForward()` 之后、`measureRichCaret()` 之前 | **新增 1 个 helper** `precedingLineBreak()` | 向前找同行的兄弟 `<br>` |
| 2 | Tier 1.5 内、Case B 之后 | **新增 Case C**（37 行） | 文本节点锚点 + 无自几何 → 用兄弟 `<br>` 定位 |
| 3 | Tier 1 / Case A / Case B / Tier 2 / 3 / 4 | **未改动** | 保持既有行为，零回归 |

**没有删除任何一行。** 这是与早期"v4 方案"（改 9 个 helper、整块替换 Tier 1.5、+264/−29 行）的关键区别——那套方案从未实施，原因是它的靶子是"元素锚点"，而 DSH 里不存在这种锚点。

---

## 2. 逐项改动与附加说明

### 2.1 新增 helper：`precedingLineBreak()`

插入位置：`src/client/cursor-engine.ts`，`isSelectionForward()` 之后。

```ts
/** The nearest preceding `<br>` sibling of a text node's line, or null when there is none. */
function precedingLineBreak(node: Node, host: HTMLElement): Element | null {
  let el: Node | null = node
  while (el !== null && el !== host) {
    for (let sib = el.previousSibling; sib !== null; sib = sib.previousSibling) {
      if (sib instanceof Element && sib.tagName === 'BR') return sib
      // Any painted content before this point means the caret is not right after a break.
      if (sib.nodeType === Node.TEXT_NODE && (sib.textContent ?? '').length > 0) return null
      if (sib instanceof Element && sib.tagName !== 'BR') return null
    }
    el = el.parentNode
  }
  return null
}
```

**为什么需要"向上走"**：光标所在文本节点的 `<br>` 是它的**兄弟**，不在任何祖先的内部。若光标节点本身没有前导 `<br>`，就上溯到父级继续找前一个兄弟——这样嵌套结构（`<p><span><span>文字</span></span></p>`）也能正确定位。

**两处提前返回是刻意的**：
- 遇到**非空文本**兄弟 → 说明这一行已有内容，光标不在"换行后的行首"，返回 `null`；
- 遇到**非 `<br>` 的元素**兄弟 → 同理，返回 `null`。

这两条把判定收窄到"光标**紧接**在换行之后"这一种情形，避免在别的位置误用 `+行高` 公式。

**附加说明**：`el !== host` 作为上溯边界，防止越出输入框；`sib.textContent ?? ''` 的 `??` 是必需的（TS 里 `Node.textContent` 类型含 `null`）。

---

### 2.2 新增 Case C（Tier 1.5 内）

```ts
// Case C: The caret sits in a TEXT node — the shape DSH's composer actually produces.
//
// Lexical keeps each run in a `<span data-lexical-text>`, so the selection focus is a
// `#text` node rather than an element. The element guard above therefore never matched
// in DSH, and the caret fell through to Tier 3, which reports the bounding box of the
// WHOLE multi-line `<span>` — that is the span's FIRST line, one line above the caret
// whenever the caret is further down. With a `<br>` (Shift+Enter) involved, the caret
// landed exactly one line low: measured +26px (one 24px line + 2px half-leading).
if (focusNode !== null && focusNode.nodeType === Node.TEXT_NODE && host.contains(focusNode)) {
  // Only when the caret has no geometry of its own; otherwise Tier 1 already returned.
  const collapsedRect = range.getClientRects()[0] ?? range.getBoundingClientRect()
  const hasOwnGeometry = collapsedRect !== undefined
    && (collapsedRect.width > 0 || collapsedRect.height > 0
        || collapsedRect.top > 0 || collapsedRect.left > 0)

  if (!hasOwnGeometry) {
    const precedingBr = precedingLineBreak(focusNode, host)
    const before = (focusNode.textContent ?? '').slice(0, offset)
    if (precedingBr !== null && !before.includes('\n')) {
      const brRect = precedingBr.getBoundingClientRect()
      if (brRect.top > 0) {
        return {
          left: lineStartLeft,
          top: brRect.top + defaultLineHeight,
          height: brRect.height > 0 ? brRect.height : expectedCaretHeight,
        }
      }
    }
  }
}
```

**三条设计约束，逐条说明：**

#### ① 只在光标"自身无几何"时介入

`hasOwnGeometry` 检查 `width/height/top/left` 是否有任一为正。**若光标自带矩形，Tier 1 早已返回**，根本不会走到这里；保留这道检查是为了防御性地保证：即使未来 Tier 1 的判定放宽，Case C 也不会去覆盖一个已经正确的测量结果。

> 注意：这里用 `top > 0 || left > 0` 而非仅看尺寸，是因为"零尺寸但有坐标"的矩形在某些布局下调色板仍可用——与 Tier 1 的可用性判定口径保持一致。

#### ② 公式与 Case A 完全一致：`br.top + lineHeight`

Case A（元素锚点）用的就是这条公式。两种锚点形态走同一公式，保证结果一致——这正是"修复"而非"另立一套规则"。

配套的 `height` 取该 `<br>` 的实测高度（`brRect.height`），拿不到时退回 `expectedCaretHeight`。这与 Case A 的处理相同：`<br>` 就是光标所在那一行，它的高度可作字形高度用。

#### ③ `\n` guard：`!before.includes('\n')`

光标所在文本节点、偏移 `offset` 之前的部分若含 `\n`，说明光标已经在**一整行或更多**之后了。此时 `br.top + lineHeight` 只会落在紧邻 `<br>` 的那一行，**反向下偏**。故直接跳过，让流程按原样继续（Tier 2/3/4 兜底）。

**这是本修复里最容易写漏的一处**：去掉它，`multiNl` 一类形态会引入新错误。

---

## 3. 验证

### 3.1 定性与定量

| 探针 | 内容 | p5 错 | 修复后错 | 回归 |
|---|---|---|---|---|
| `probe56` | 目标形状（`Shift+Enter` 空行），28 点 | 1（`T1@0`，+26px） | **0** | — |
| `probe57` | 8 种 DOM 形状 × 97 点（边界回归） | 17 | 15 | **0** |

**回归 = 0** 是本节最重要的数字：没有任何"p5 原本正确、修复后却错"的点。

修复前后差异集中在两类点：
- **被修好**：`user T1@0`、`nested T1@0`（各 +26px → 0）；
- **修复前后同样错**（不属本次范围，见 §5）：`multiNl T0@4/T0@9` 等。

### 3.2 真值方法（关键）

真值 = 用 **Lexical 模型 API** 置入选区后 `insertText('Z')`，再测那个字形矩形。

**不可用的方法**（已排除）：
- `document.execCommand('insertText')` —— 对 `<br>` 之后的锚点插错位置；
- `caretRangeFromPoint` —— 只改 DOM 选区，不同步 Lexical 模型；
- `dispatchEvent(new KeyboardEvent('keydown', ...))` —— **不会移动原生光标**，据此构造的测试全部无效。

### 3.3 构建与产物

| 项 | 值 |
|---|---|
| `pnpm run typecheck` | 退出 0 |
| `pnpm run build` | 退出 0，`lib/client.js` 46,448 B |
| `pnpm run check:register-id` | OK |
| `lib/client.js` SHA-256 | `EC6806C7F914B44BD9E995AEC9964919F65108C577311B394AA70C5F76F16FC6` |
| p6 npm 包内同一文件 | **哈希一致**（已下载 tarball 逐字节核对） |

**构建可复现**：重新构建产物哈希不变。

### 3.4 复现命令

```powershell
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
# 目标形状（28 点）
& $edge --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files `
  --virtual-time-budget=60000 --user-data-dir="$env:TEMP\ud56" --dump-dom `
  'file:///C:/Users/Think/.agent/temp/lexprobe/probe56.html' | Select-String 'JSON_BEGIN'

# 边界回归（8 形状 × 97 点）
& $edge --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files `
  --virtual-time-budget=60000 --user-data-dir="$env:TEMP\ud57" --dump-dom `
  'file:///C:/Users/Think/.agent/temp/lexprobe/probe57.html' | Select-String 'JSON_BEGIN'
```

依赖：`vendor/lexical/dist/Lexical.dev.mjs`（真实 `lexical@0.49.0`）、`p5-test.js`（p5 产物）、`patched-test.js`（由 `lib/client.js` 生成）。

---

## 4. 人工验收（在真实 DSH 里做）

1. **`Shift+Enter` 换出空行** → 彗星应停在空行上，不再低一行；
2. 在空行上按 `↑` → 应回到**上一行行尾**，不跳行；
3. 从空行继续打字 → 光标与文字位置一致；
4. 普通打字、粘贴、长段落折行 → 行为与修复前**完全一致**（都走 Tier 1）；
5. 拖选文字 → 彗星跟随选区活动端。

> ⚠️ 改完 `src` 后必须 `pnpm run build` 重新生成 `lib/`，否则 DSH 加载的仍是旧实现。若 profile 是 `link:` 指向本仓库，**刷新页面**即可。

---

## 5. 风险、边界与回滚

| 风险 | 评估 | 应对 |
|---|---|---|
| 影响有文字的普通输入 | **极低**。Tier 1 未改，新增逻辑全在其后 | `probe57` 回归 = 0 |
| 影响旧 textarea 路径 | **无**。未触及 `measureTextareaCaret` | — |
| 非 Lexical 宿主 | **未验证**。逻辑基于"文本节点 + 兄弟 `<br>`"这一通用结构 | 三重条件收窄，不成立时自然落回原有兜底 |
| 浏览器差异 | **未验证**。只在 Chromium 测过 | DSH 是 Electron，同源 |
| 回滚 | 单文件纯增量 | `git revert bf2b9db` 或 `git checkout 1de1386 -- src/client/cursor-engine.ts lib/` 后重新 build |

**本次明确未修的两类缺陷**（不属本修复范围，见根因文档 §6）：

1. 元素锚点落在 `<p>` 上（录制里的 `P@N` 形态）；
2. **单一 span 内多个字面 `\n`、且无 `<br>`**——即"刚粘贴、尚未按 `Shift+Enter`"的形态（`probe57` 的 `multiNl T0@4/T0@9`）。这两处在修复前后**同样错**，需要单独的规则去定位"字面 `\n` 的第 N 行"。

---

## 6. 未闭合的事

1. **旧缺陷未在真实 DSH 中复现过**——用户当前无法复现。因此"修复有效"的依据是 §3 的定点测量，而非现场前后对比。
2. **现场录制是修复后的构建**（`lib/client.js` = `EC6806C7…`），它只能作为"修复后未再出现该缺陷"的旁证，不能证明旧缺陷存在。
3. **一处未解释的现场**：用户曾报告"未分组行首按 `↑` 上不去"，录制中未见对应异常，尚无定论。
