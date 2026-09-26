#!/usr/bin/env node
/**
 * 防回归校验：确保插件的「客户端注册 id」与「cordis.patch.yml 的 name」一致。
 *
 * DSH 对客户端插件有硬性契约：
 *   - 服务端用 cordis.patch.yml 中 insert 条目的 `name` 字段生成 manifest entry id；
 *   - 客户端 bundle 必须用 window.__ModuleLoader__.load({ id }) 注册 factory，
 *     且该 id 必须等于 manifest entry id（即 patch 的 name）。
 *
 * 两者不一致时（历史上 v0.1.1 曾写成 smooth-cursor / dsh-smooth-cursor），
 * DSH 会抛 "Failed to load plugins"。本脚本在发版前自动拦截这类回归。
 *
 * 用法：node scripts/check-register-id.mjs
 * 失败时以非零码退出，阻断发布。成功时打印 "OK"。
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const patchPath = join(root, 'cordis.patch.yml')
const clientPath = join(root, 'lib', 'client.js')

/** 前置：所需文件必须存在（先 `pnpm build` 再跑）。 */
for (const [label, path] of [['cordis.patch.yml', patchPath], ['lib/client.js', clientPath]]) {
  if (!existsSync(path)) {
    console.error(`[check-register-id] 缺少文件 ${label}: ${path}`)
    console.error('请先运行构建（pnpm build）再执行本校验。')
    process.exit(1)
  }
}

const patchText = readFileSync(patchPath, 'utf8')
const clientText = readFileSync(clientPath, 'utf8')

/** 从 cordis.patch.yml 的顶层 insert 块提取所有 `name` 字段。 */
function patchNames(text) {
  const names = []
  const insertMatch = text.match(/^-\s*insert:\s*$/m)
  if (!insertMatch) return names
  const rest = text.slice(insertMatch.index)
  for (const { 1: name } of rest.matchAll(/name:\s*['"]?([^'"\n]+)['"]?/g)) {
    names.push(name.trim())
  }
  return names
}

/** 从 bundle 产物提取 __ModuleLoader__.load 的注册 id。 */
function bundleIds(text) {
  return [...text.matchAll(/__ModuleLoader__\.load\(\s*\{\s*id:\s*["']([^"']+)["']/g)].map((m) => m[1])
}

const names = patchNames(patchText)
const ids = bundleIds(clientText)
/** The bundle's own id: the patch name and the loader id must agree on it. */
const expected = names[0]

if (names.length === 0) {
  console.error('[check-register-id] 未在 cordis.patch.yml 中找到 insert 的 name。请检查 patch 格式。')
  process.exit(1)
}

const missing = names.filter((n) => !ids.includes(n))
if (missing.length > 0) {
  console.error('[check-register-id] ✗ 注册 id 与 patch name 不一致：')
  console.error(`  patch name: ${names.join(', ')}`)
  console.error(`  实际注册 id: ${ids.length ? ids.join(', ') : '（未发现 __ModuleLoader__.load 注册）'}`)
  console.error(`  以下 name 未被 bundle 注册: ${missing.join(', ')}`)
  console.error('  这会导致 DSH 报 "Failed to load plugins"。请修正后再发布。')
  process.exit(1)
}

/**
 * 防回归校验之二：光标引擎给自建 <style> 打的归属标记必须等于包名。
 *
 * DSH 的客户端模块系统会把所有「无主的」<style>（即没有 data-plugin 的）
 * 打上「下一个 materialize 的插件」的名字，并在那个**别的**插件被禁用时
 * 一并删除。归属标记一旦写错或缺失，样式会在无关插件的拆除中被删掉，
 * 遮罩退化为文档流元素、页面被撑高。这里把它钉死在包名上。
 *
 * 注意产物里有两处 dataset.plugin：tsdown 注入的 CSS Modules 标签（字面量）
 * 和引擎自建标签（`this.style.dataset.plugin = PLUGIN_ID`）。真正承重的是
 * 后者，所以这里解析标识符而不能只匹配字面量。
 */
const engineStamp = clientText.match(/this\.style\.dataset\.plugin\s*=\s*([A-Za-z_$][\w$]*|["'][^"']+["'])\s*;?/)
if (engineStamp === null) {
  console.error('[check-register-id] ✗ bundle 中未找到光标引擎的 <style> 归属标记。')
  console.error('  引擎会给自建 <style> 打 data-plugin 以防被其他插件连带删除；标记缺失时该防线失效，')
  console.error('  禁用无关插件会删掉遮罩样式，导致页面被撑高。')
  process.exit(1)
}

/** Resolve the assignment's right-hand side to its literal string. */
function resolveStamp(raw) {
  const quoted = raw.match(/^["']([^"']+)["']$/)
  if (quoted !== null) return quoted[1]
  const binding = clientText.match(new RegExp(`(?:const|var|let)\\s+${raw}\\s*=\\s*["']([^"']+)["']`))
  return binding !== null ? binding[1] : null
}

const stampValue = resolveStamp(engineStamp[1])

if (stampValue === null) {
  console.error(`[check-register-id] ✗ 无法解析 <style> 归属标记 ${engineStamp[1]} 的字面值。`)
  console.error('  该标识符应绑定到一个字符串常量；解析不到时无法证明它等于包名，故按失败处理。')
  process.exit(1)
}

if (stampValue !== expected) {
  console.error('[check-register-id] ✗ <style> 归属标记与包名不一致：')
  console.error(`  期望（patch name）: ${expected}`)
  console.error(`  实际（引擎标记）  : ${stampValue}`)
  console.error('  标记错误会让样式在无关插件被禁用时被删除，导致页面被遮罩撑高。')
  process.exit(1)
}

console.log('[check-register-id] OK —— bundle 注册 id 与 patch name 一致，<style> 归属标记一致。')