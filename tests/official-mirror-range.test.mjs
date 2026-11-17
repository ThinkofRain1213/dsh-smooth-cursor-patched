import test from 'node:test'
import assert from 'node:assert/strict'

const engine = await import('../src/client/cursor-engine.ts')
const { measureOfficialMirrorCaret, measureTextareaCaret } = engine

class FakeDiv {
  constructor(text) {
    this.textContent = text
    this.childNodes = [{ nodeType: 3, data: text }]
    this.firstChild = this.childNodes[0]
  }
  getAttribute(name) { return name === 'aria-hidden' ? 'true' : null }
  getBoundingClientRect() { return { left: 10, top: 20 } }
}

globalThis.HTMLDivElement = FakeDiv
globalThis.Node = { TEXT_NODE: 3 }
globalThis.window = {
  getComputedStyle: () => ({ lineHeight: '24px', fontSize: '14px' }),
}

function textareaWith(text, mirrorText = `${text}\n`) {
  return {
    value: text,
    selectionStart: text.length,
    selectionEnd: text.length,
    selectionDirection: 'none',
    previousElementSibling: mirrorText === null ? null : new FakeDiv(mirrorText),
    scrollTop: 21,
    scrollLeft: 3,
    getBoundingClientRect() { return { left: 100.5, top: 200.5 } },
  }
}

function installDocument(rectForRange) {
  const ranges = []
  let createElementCalls = 0
  globalThis.document = {
    createRange() {
      const range = {
        start: null,
        end: null,
        setStart(node, offset) { this.start = { node, offset } },
        setEnd(node, offset) { this.end = { node, offset } },
        getClientRects() { return [] },
        getBoundingClientRect() { return rectForRange(this) },
      }
      ranges.push(range)
      return range
    },
    createElement() { createElementCalls += 1; throw new Error('成功路径不应创建元素') },
  }
  return { ranges, createElementCalls: () => createElementCalls }
}

const zeroRect = { left: 0, top: 0, right: 0, width: 0, height: 0 }

function installLegacyDom() {
  const dom = installDocument(() => zeroRect)
  let appends = 0
  let removes = 0
  let mirror = null
  globalThis.document.createElement = tag => {
    if (tag === 'div') {
      mirror = {
        style: {}, textContent: '', scrollTop: 0, scrollLeft: 0,
        setAttribute() {}, appendChild() {}, remove() { removes += 1 },
      }
      return mirror
    }
    if (tag === 'span') {
      return {
        style: {}, textContent: '',
        get offsetLeft() { return 10 + (mirror?.textContent.length ?? 0) * 8 },
        offsetTop: 50,
      }
    }
    throw new Error(`unexpected element: ${tag}`)
  }
  globalThis.document.body = {
    appendChild() { appends += 1 },
  }
  return { ...dom, appends: () => appends, removes: () => removes }
}

function expectedLegacyPoint(caret) {
  return { left: 107.5 + caret * 8, top: 231.5, height: 19 }
}

test('exports the official-mirror measurement helper', () => {
  assert.equal(typeof measureOfficialMirrorCaret, 'function')
})

test('uses forward range at the text end and maps scroll offsets without half-leading', () => {
  const dom = installDocument(() => ({ left: 40.25, top: 50.25, right: 48.25, width: 8, height: 19 }))
  const point = measureOfficialMirrorCaret(textareaWith('abc'), 3)
  assert.deepEqual(point, { left: 127.75, top: 209.75, height: 19 })
  assert.equal(dom.ranges[0].start.offset, 3)
  assert.equal(dom.ranges[0].end.offset, 4)
  assert.equal(dom.createElementCalls(), 0)
})

test('returns null without creating a range when the official mirror is stale', () => {
  const dom = installDocument(() => { throw new Error('陈旧 mirror 不应创建 Range') })
  const point = measureOfficialMirrorCaret(textareaWith('abc', 'different'), 2)
  assert.equal(point, null)
  assert.equal(dom.ranges.length, 0)
})

test('falls back to a collapsed range when forward has no geometry', () => {
  const dom = installDocument(range => range.start.offset === range.end.offset
    ? { left: 44, top: 55, right: 44, width: 0, height: 19 }
    : zeroRect)
  const point = measureOfficialMirrorCaret(textareaWith('abc'), 2)
  assert.deepEqual(point, { left: 131.5, top: 214.5, height: 19 })
  assert.equal(dom.ranges.length, 2)
  assert.equal(dom.ranges[0].start.offset, 2)
  assert.equal(dom.ranges[0].end.offset, 3)
  assert.equal(dom.ranges[1].start.offset, 2)
  assert.equal(dom.ranges[1].end.offset, 2)
})

test('returns null rather than a fabricated origin when no range has geometry', () => {
  installDocument(() => zeroRect)
  assert.equal(measureOfficialMirrorCaret(textareaWith('abc'), 2), null)
})

test('returns null when the official mirror structure is absent', () => {
  installDocument(() => { throw new Error('缺失 mirror 不应创建 Range') })
  assert.equal(measureOfficialMirrorCaret(textareaWith('abc', null), 2), null)
})

test('returns null when the official mirror is not a single text node', () => {
  installDocument(() => { throw new Error('非单文本 mirror 不应创建 Range') })
  const textarea = textareaWith('abc')
  textarea.previousElementSibling.childNodes.push({ nodeType: 3, data: 'extra' })
  assert.equal(measureOfficialMirrorCaret(textarea, 2), null)
})

test('textarea hot path uses the official mirror without creating elements', () => {
  assert.equal(typeof measureTextareaCaret, 'function')
  const dom = installDocument(() => ({ left: 40.25, top: 50.25, right: 48.25, width: 8, height: 19 }))
  const point = measureTextareaCaret(textareaWith('abc'))
  assert.deepEqual(point, { left: 127.75, top: 209.75, height: 19 })
  assert.equal(dom.createElementCalls(), 0)
})

for (const [name, makeTextarea] of [
  ['stale mirror', () => textareaWith('abc', 'different')],
  ['missing mirror', () => textareaWith('abc', null)],
  ['non-single-text mirror', () => {
    const textarea = textareaWith('abc')
    textarea.previousElementSibling.childNodes.push({ nodeType: 3, data: 'extra' })
    return textarea
  }],
  ['no range geometry', () => textareaWith('abc')],
  ['non-div mirror', () => {
    const textarea = textareaWith('abc')
    textarea.previousElementSibling = {}
    return textarea
  }],
]) {
  test(`textarea hot path falls back to legacy exactly once: ${name}`, () => {
    const dom = installLegacyDom()
    const point = measureTextareaCaret(makeTextarea())
    assert.deepEqual(point, expectedLegacyPoint(3))
    assert.equal(dom.appends(), 1)
    assert.equal(dom.removes(), 1)
  })
}

test('forward selection measures selectionEnd through the legacy fallback', () => {
  installLegacyDom()
  const textarea = textareaWith('abcdef', null)
  textarea.selectionStart = 1
  textarea.selectionEnd = 4
  textarea.selectionDirection = 'forward'
  assert.deepEqual(measureTextareaCaret(textarea), expectedLegacyPoint(4))
})

test('backward selection measures selectionStart through the legacy fallback', () => {
  installLegacyDom()
  const textarea = textareaWith('abcdef', null)
  textarea.selectionStart = 1
  textarea.selectionEnd = 4
  textarea.selectionDirection = 'backward'
  assert.deepEqual(measureTextareaCaret(textarea), expectedLegacyPoint(1))
})
