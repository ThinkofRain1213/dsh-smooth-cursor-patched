# 空行光标错位 — 根因（已实施并验证）

**状态**：根因已在真实 DSH DOM 上定位；修复（Case C）**已实施、构建并发布**（commit `bf2b9db`，tag `v0.1.9-patched.6`）
**缺陷位置**：`src/client/cursor-engine.ts` → `measureRichCaret()` 的 Tier 1.5
**影响范围**：主聊天输入框（`div[data-composer-input]`，Lexical contenteditable）
**触发条件**：光标折叠且**落在文本节点锚点上、自身无任何 client rect** —— 典型是 `Shift+Enter` 换出的空行

> **本文档为 v4 重写版。** 早期版本（v1–v3）把根因归到"段内连续 `<br>` + 元素锚点"，该前提**已被实测推翻**：真实 DSH 的选区焦点始终是 `#text` 节点，而 DOM 里承载多行的是**字面 `\n`**（`white-space: pre-wrap` 渲染），不是 `<br>` 串。旧版的"272/272 通过"也从未对应任何现存构建。第 5 节保留了更正记录。

---

## 1. 真实 DSH 的 DOM 形态（推翻旧前提的关键）

### 1.1 光标锚点：永远是文本节点

在真实 DSH 输入框里连续采样选区，`getSelection().focusNode` **始终是 `#text`**，其 `parentNode` 是 `SPAN`（`<span data-lexical-text>`）——**从不**是 `<p>` 或宿主 `div`。

旧版根因（v1–v3）整篇建立在"Lexical 用 element 锚点定位光标（`focusNode = <p>`）"之上。这个前提不成立，因此那份根因分析对它描述的场景**不适用**。

### 1.2 多行的载体：字面 `\n`，不是 `<br>` 串

粘贴一段多行文本后，实际 DOM 是：

```
<p dir="auto">
  <span data-lexical-text="true">行一\n行二\n行三…</span>
</p>
```

即**一个 `<span>` 里含字面 `\n`**，由 `white-space: pre-wrap` 渲染成多行。**不是**旧文档所画的 `<span>行一</span><br><span>行二</span><br>…`。

相应地，`Shift+Enter` 之后的结构是：

```
<p>
  <span data-lexical-text="true">第一段</span>
  <br>
  <span data-lexical-text="true">空行之后的内容…</span>
</p>
```

**`<br>` 是那两个 `<span>` 的兄弟节点**，不是某个 `<span>` 的子节点。这一点是本次根因的核心（见 §2.2）。

### 1.3 空行边界上，浏览器不给几何

光标停在空行时（折叠、位于文本节点偏移 0）：

| 测量方式 | 结果 |
|---|---|
| `range.getClientRects()` | **长度 0** |
| `range.getBoundingClientRect()` | **全零**（top/left/width/height 皆 0） |

录制导出里，这类时刻被记为 `nativeNoGeometry`：`rects:0`、`viewTop/viewLeft:0`、`height:0`、`hasGeom:false`。这不是异常，是浏览器对"空行上的折叠选区"的正常表现。

---

## 2. 根因

### 2.1 `measureRichCaret()` 的分层结构

```
Tier 1    range.getClientRects()          ← 有矩形就在这里返回
Tier 1.5  isCollapsed 时的空行专门处理
          ├─ Case A：focusNode 是 Element 且 childNodes[offset-1] 是 <br>
          └─ Case B：focusNode 是 Element 且其内容为空
Tier 2    range.getBoundingClientRect()
Tier 3    在 block 内 querySelector('br')
Tier 4    宿主 padding/border 兜底
```

### 2.2 p5 为什么算错（精确机制）

关键在 **Tier 1.5 的两个分支都以 `focusNode instanceof Element` 为入口**：

```ts
if (focusNode instanceof Element && host.contains(focusNode)) {
  // Case A / Case B 都在这里面
}
```

而真实 DSH 的 `focusNode` **是 `#text`**（§1.1），于是这个 guard **从不成立**，Case A / Case B **永远不会执行**。执行路径变成：

1. **Tier 1** —— `getClientRects()` 为空（§1.3），跳过；
2. **Tier 1.5** —— 整个块被 `instanceof Element` guard 挡掉，跳过；
3. **Tier 2** —— `range.getBoundingClientRect()` 全零，跳过；
4. **Tier 3** —— 落到这里：

```ts
const startEl = range.startContainer instanceof Element
  ? range.startContainer
  : range.startContainer.parentElement      // ← 文本节点 → 它的父 <span>
const searchRoot = (startEl instanceof HTMLElement && host.contains(startEl) && startEl !== host)
  ? startEl
  : caretBlock(selection.focusNode)
const br = searchRoot.querySelector('br')   // ← 在这个 <span> 里找 <br>
if (br !== null) { ... }
```

在 `Shift+Enter` 的形态里，`startEl` 是**第二个 `<span>`**（空行之后那段内容），而那个 `<br>` 是它的**兄弟节点**、不在它内部——所以 `querySelector('br')` 返回 `null`，Tier 3 的这个分支也不成立；
5. **Tier 3 末尾** —— 对 `startEl` 自身取包围盒：

```ts
if (startEl instanceof HTMLElement && startEl !== host && host.contains(startEl)) {
  const pRect = startEl.getBoundingClientRect()
  if (pRect.top > 0 && pRect.height > 0) {
    return { left: pRect.left + pPadLeft, top: pRect.top + halfLeading, ... }
  }
}
```

**这就是缺陷所在**：`startEl` 是一个**多行 `<span>`**，它的 `getBoundingClientRect().top` 是**整个 span 的第一行**。当光标在 span 内部的第 2、3… 行时，测出来的永远是第一行 → 彗星被画到**偏高**（不是偏低）的位置。

### 2.3 实测偏差幅度

真实 DOM 实测（`probe56`，共 28 点）：

| 点位 | p5 输出 | 真值 | 偏差 |
|---|---|---|---|
| `T1@0`（空行、文本节点偏移 0） | 182 | 156 | **+26px** |

**+26px = 一个 24px 行高 + 2px 半行距**（`halfLeading = floor((24-19)/2) = 2`）。

数学闭合：宿主 top 632（由 758−126 推得），p5 给出 `632 + 176 = 808`，与录制中观测到的 `comet.cy = 808` **完全一致**；正确值应为 `br.top(126) + 24 = 782`。

**为什么"时对时错"**：缺陷是否显形，取决于光标是否**恰好自带一个 client rect**。有矩形 → Tier 1 直接命中，正确；没有矩形（空行边界）→ 一路掉到 Tier 3，取到 span 首行。这正好解释了用户"有时候对、有时错"的观感，也解释了为什么现象难以稳定复现。

---

## 3. 修复规则（已实施 = Case C）

**核心：给文本节点锚点补一个专属分支，用兄弟 `<br>` 定位，而不是让流程掉到 Tier 3 去取整个 span 的包围盒。**

新增判定（`cursor-engine.ts`，Tier 1.5 内、Case B 之后）：

```ts
if (focusNode !== null && focusNode.nodeType === Node.TEXT_NODE && host.contains(focusNode)) {
  // 仅当光标自身没有任何几何时介入；有几何说明 Tier 1 已经返回
  const collapsedRect = range.getClientRects()[0] ?? range.getBoundingClientRect()
  const hasOwnGeometry = collapsedRect !== undefined
    && (collapsedRect.width > 0 || collapsedRect.height > 0
        || collapsedRect.top > 0 || collapsedRect.left > 0)

  if (!hasOwnGeometry) {
    const precedingBr = precedingLineBreak(focusNode, host)
    // 光标必须**紧接**在那个 <br> 之后：中间夹 \n 说明光标已在更下方，
    // 此时再加一行会反向下偏。
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

配套 helper（向前找兄弟 `<br>`）：

```ts
/** The nearest preceding `<br>` sibling of a text node's line, or null when there is none. */
function precedingLineBreak(node: Node, host: HTMLElement): Element | null {
  let el: Node | null = node
  while (el !== null && el !== host) {
    for (let sib = el.previousSibling; sib !== null; sib = sib.previousSibling) {
      if (sib instanceof Element && sib.tagName === 'BR') return sib
      // 之前若有任何「已绘制内容」，说明光标并不紧接在换行之后
      if (sib.nodeType === Node.TEXT_NODE && (sib.textContent ?? '').length > 0) return null
      if (sib instanceof Element && sib.tagName !== 'BR') return null
    }
    el = el.parentNode
  }
  return null
}
```

**三条设计约束**：

1. **只在无自几何时介入** —— 有矩形说明 Tier 1 已经正确返回，不碰。
2. **公式与 Case A 一致** —— `br.top + lineHeight`。Case A 处理元素锚点用的是同一公式，两种锚点形态因此得出一致结果。
3. **`\n` guard** —— 防止光标已在更下方时反向偏低。

---

## 4. 验证

### 4.1 真实 Lexical DOM 定点验证

**方法**：真值 = 用 Lexical 模型 API 置入选区（`$getSelection().insertText('Z')`），再测那个 `Z` 字形的矩形——等价于"用户在此处打字，字会落在哪"。

> ⚠️ 真值**必须**用编辑器模型 API。`document.execCommand('insertText')` 与 `caretRangeFromPoint` 都不可信：前者对 `<br>` 之后的锚点会插错位置，后者只改 DOM 选区、不同步进 Lexical 模型，导致后续以模型为准的操作落在别处。另外，合成 `dispatchEvent(keydown)` **不会移动原生光标**，用它构造的测试全部无效。

**`probe56`（目标形状，28 点）**：

| 实现 | 错点数 |
|---|---|
| p5（现状） | **1**（`T1@0`，+26px） |
| 修复后 | **0** |

**`probe57`（8 种 DOM 形状 × 97 点，边界回归）**：

| 实现 | 错点数 |
|---|---|
| p5 | 17 |
| 修复后 | 15 |
| **回归（p5 对、修复后错）** | **0** |

即修复**没有引入任何回归**；两处被修正的正是受影响的锚点（`T1@0` 形态）。

### 4.2 现场录制核对

用户提供的一份完整会话录制（`caret-record-2026-10-13T02-54-46-334Z.json`）：

| 指标 | 值 |
|---|---|
| 时长 / 帧数 / 事件数 | 345.99 s / 38035 帧 / 1775 |
| `errors` | `[]` |
| 异常总数 | 17（16 × `nativeNoGeometry` + 1 × `cometOffset`） |
| 静止态（折叠且双向稳定 200ms）中 `\|dY\| ≥ 3` 的帧 | **0**（最大值 0.38px） |
| 零几何连续段（时长 ≥ 200ms） | 35 段 |
| 其中命中**修复后公式** `br+24` | **31 段** |
| 其中命中 **p5 旧公式** `span+2` | **0 段** |

唯一的 `cometOffset`（t=82866.7，`dY = −312` = 13 行）上下文是**鼠标拖选 + 滚动**（82356 mousedown → 36 矩形选区 → 82596/82600 两次 scroll），**不是**键盘空行路径。

> ⚠️ 这次录制跑的是**已含 Case C 修复**的构建（`lib/client.js` = `EC6806C7…`），所以它**不能**用来证明旧缺陷存在——它是"修复后未再出现该缺陷"的旁证。

### 4.3 复现命令

```powershell
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
& $edge --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files `
  --virtual-time-budget=60000 --user-data-dir="$env:TEMP\ud56" --dump-dom `
  'file:///C:/Users/Think/.agent/temp/lexprobe/probe56.html' |
  Select-String -Pattern 'JSON_BEGIN'
```

依赖：`vendor/lexical/dist/Lexical.dev.mjs`（真实 `lexical@0.49.0`）、`p5-test.js`（p5 产物）、`patched-test.js`（由 `lib/client.js` 生成，仅追加一行测试导出，函数体逐字节未改）。

---

## 5. 更正记录（旧版被推翻的前提）

本文档 v1–v3 曾给出另一套根因与修复方案。那套内容的问题如下，**已整体作废**：

| 旧版断言 | 实际 | 结论 |
|---|---|---|
| "DSH 的 `Enter` 产生段内连续 `<br>`" | 粘贴产生**字面 `\n`**；`Shift+Enter` 产生 `<span>` + `<br>` + `<span>` | 作废 |
| "Lexical 用 element 锚点定位光标（`focusNode = <p>`）" | `focusNode` **永远是 `#text`** | 作废 |
| "p5 落到 Tier 3 的 `querySelector('br')` 取段内第一个 `<br>` → 跳回第一行" | 该 `<br>` 是被测 span 的**兄弟**，`querySelector` 返回 `null`；真正的错因是取到整个多行 span 的包围盒 | 作废 |
| "修复方案 = 新增 9 个 helper、整块替换 Tier 1.5" | **从未实施**；实际实施的是 Case C（+52 行） | 作废 |
| "真实构建产物 272/272 通过"，产物 `lib/client.js` = `CFF399B2…` | 该哈希**不对应任何现存或历史构建**（`git log -S` 无记录） | 作废 |

**旧方案未被采纳的原因**：它的靶子是"元素锚点"，而 DSH 里根本不存在这种锚点；整块替换 Tier 1.5 会改动大量当前正确工作的代码路径，风险与收益不成比例。Case C 是**纯增量**（+52 行、−0 行），只补一个原来缺失的分支。

**那批验证数据为何误导**：早期探针用**手搓 DOM（`<br>` 串）**模拟输入框，而非真实 Lexical 生成的 DOM。在错误的 DOM 形状上，"272/272 通过"是自洽的，但它证明的是一个**不存在于 DSH 的场景**。

---

## 6. 可信度边界

1. **已在真实 Lexical 0.49.0 DOM 上验证**，且**已发布到 DSH 实际加载**的构建（`lib/client.js` = `EC6806C7…`，与 p6 包内字节一致）。
2. **未在真实 DSH 中复现过旧缺陷**——用户当前无法复现，录制中也未出现。因此"修复有效"的依据是 §4.1 的定点测量，而非"用户现场前后对比"。
3. **唯一未解释的现场**：用户曾报告"未分组行首按 `↑` 上不去"。录制里未见对应异常，**尚无定论**。
4. **存在两类已知但未修的缺陷**（不属本次范围）：
   - 元素锚点落在 `<p>` 上（录制里的 `P@N` 形态）；
   - **单一 span 内多个字面 `\n` 且无 `<br>`**（即"刚粘贴、尚未按 `Shift+Enter`"的形态，`probe57` 的 `multiNl T0@4/T0@9`）。这两处在 `probe57` 中修复前后**同样错**（各 4 处），修复未触及。
5. 只在 **Chromium** 验证；DSH 是 Electron，内核同源。
6. **旧版 textarea 路径**（`measureTextareaCaret`）未涉及。

---

## 7. 复现环境

真实 DSH 版本：`@deepseek-ai/dsh-desktop/0.2.0-rc.2`，`Chrome/152.0.7977.54`，`Electron/44.0.0`。
输入框度量：`line-height: 24px`、`font-size: 14px`、光标矩形高 19、`halfLeading = 2`。
