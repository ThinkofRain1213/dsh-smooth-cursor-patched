# 官方 mirror + Range 测量管线实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用零自建 DOM 的官方 mirror + Range 测量替换询问卡旧镜像热路径，并保留旧算法回退。

**Architecture:** 新增独立辅助函数，在官方 mirror 的完整文本上建立 Range；`measureTextareaCaret` 优先调用它，失败才走现有镜像。普通 contenteditable 和 DSH 官方代码不变。

**Tech Stack:** TypeScript、浏览器 Range/DOM、Node 24 `node:test`、tsdown。

**Spec:** `docs/superpowers/specs/2026-11-17-official-mirror-range-design.md`

## Global Constraints

- 不修改 DSH 官方源码，不修改普通聊天框测量路径。
- 不采用 iframe、canvas 自算折行或 backward 正常路径。
- 不提交、不推送、不主动重启 DSH。
- 成功路径不得创建、插入或删除测量节点；旧算法只作回退。
- 不保存输入正文到测试、日志或探针导出。

## Review Focus

- 官方 mirror 陈旧：必须返回 `null` 并回退旧算法（任务 1、2）。
- 文本末尾与空行：forward 必须覆盖 `caret → caret + 1`（任务 1）。
- 软换行边界：必须在真实页面肉眼确认（任务 3）。
- 滚动坐标：必须正确使用 mirror/textarea rect 与 `scrollTop/scrollLeft`（任务 1）。
- 成功路径不得调用 `document.createElement`，普通聊天框不得改路径（任务 1、2）。

---

### Task 1: Range 测量辅助函数与失败测试

**Files:**
- Create: `tests/official-mirror-range.test.mjs`
- Modify: `src/client/cursor-engine.ts`

**Interfaces:**
- Produces: `export function measureOfficialMirrorCaret(textarea: HTMLTextAreaElement, caret: number): CursorPoint | null`
- Contract: 成功返回视口坐标；mirror 缺失、结构不符、内容陈旧或几何时返回 `null`。

- [ ] **Step 1: 写失败测试**

在 `tests/official-mirror-range.test.mjs` 用 `node:test` 和最小 fake DOM/Range 覆盖：
1. `Range` 收到 `caret → caret + 1`，使用左边缘；
2. `left = range.left + (textarea.left - mirror.left) - scrollLeft`；
3. `top = range.top + (textarea.top - mirror.top) - scrollTop`，不添加 half-leading；
4. mirror 文本不等于 `value + '\n'` 时返回 `null` 且不创建 Range；
5. forward 无几何时尝试 collapsed；
6. 成功路径 `document.createElement` 调用次数为 0。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/official-mirror-range.test.mjs`
Expected: FAIL，原因是 `measureOfficialMirrorCaret` 尚未导出或尚未实现。

- [ ] **Step 3: 实现辅助函数**

在 `src/client/cursor-engine.ts` 新增并导出 `measureOfficialMirrorCaret`。仅查询前一个 `div[aria-hidden="true"]` 兄弟节点及其文本，不创建任何节点；forward 优先，collapsed 兜底，按接口映射坐标。

- [ ] **Step 4: 运行测试并确认通过**

Run: `node --test tests/official-mirror-range.test.mjs`
Expected: 全部 PASS。

### Task 2: 接入 textarea 热路径并保留旧算法

**Files:**
- Modify: `src/client/cursor-engine.ts`
- Test: `tests/official-mirror-range.test.mjs`

**Interfaces:**
- Consumes: `measureOfficialMirrorCaret(textarea, caret)`。
- Produces: 现有 `measureCaret(input)` 签名与 `CursorPoint | null` 行为不变。

- [ ] **Step 1: 增加回退契约测试**

固定 mirror 缺失、非单文本节点、内容陈旧和几何时均返回 `null`；断言这些情况不会意外返回 `(0,0)` 坐标。

- [ ] **Step 2: 运行测试并确认回退契约通过**

Run: `node --test tests/official-mirror-range.test.mjs`
Expected: 全部 PASS；若出现失败，先修正辅助函数，不进入热路径接入。

- [ ] **Step 3: 保留旧函数并接入优先级**

将当前旧实现命名为 `measureTextareaCaretLegacy`；新的 `measureTextareaCaret` 先调用 `measureOfficialMirrorCaret`，结果为 `null` 才调用旧算法。不得改变 contenteditable 分派。

- [ ] **Step 4: 运行测试和静态检查**

Run: `node --test tests/official-mirror-range.test.mjs`
Run: `pnpm run typecheck`
Expected: 测试全部 PASS，typecheck 退出 0。

### Task 3: 构建与真实页面验收

**Files:**
- Modify: `lib/client.js`、`lib/client.js.map`（仅构建生成）
- Use: `C:\Users\Think\.agent\temp\lexprobe\probe-question-ime-longpress-qp1.js`
- Use: `C:\Users\Think\.agent\temp\lexprobe\probe-official-mirror-range-b1.js`

**Interfaces:**
- Consumes: 任务 2 的新测量路径。
- Produces: 可回退的本地构建与验收证据，不提交。

- [ ] **Step 1: 构建与注册校验**

Run: `pnpm run build`
Run: `pnpm run check:register-id`
Expected: 均退出 0；产物包含官方 mirror Range 路径并保留旧算法回退。

- [ ] **Step 2: 静态复核差异**

确认产品改动只在 `src/client/cursor-engine.ts`、测试和生成物；普通聊天框、设置页、DSH 官方文件无改动。

- [ ] **Step 3: 由用户进行真实页面 A/B**

用户重启 DSH 后，按相同动作测试中英文长按、划词、连续删除、空行、滚动和 composition；特别肉眼检查软换行边界。使用 QP1 对比慢帧/绘制跳变，使用 B1 检查 Range 坐标和 mirror stale。

- [ ] **Step 4: 记录结果并决定保留或回退**

成功：旧镜像增删显著下降、慢帧减少、坐标无不可接受回归。
失败：出现中文/软换行错位或无明显性能改善，恢复备份并停止，不继续叠加补丁。
不提交、不推送；等待用户明确决定。
