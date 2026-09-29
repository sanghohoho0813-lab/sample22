/*
 * 미래AI랩 데모 공용 — 뒤로 · 앞으로 버튼
 * (miraeailab.com 의 src/components/HistoryNav.tsx 와 같은 규칙을 프레임워크 없이 옮긴 것)
 *
 * - 카카오톡·네이버 앱 안 브라우저처럼 주소창 버튼이 없는 곳에서도, 실수로 뒤로 간 걸 '앞으로'로 되돌린다.
 * - 이 탭 안에서의 위치를 history.state 에 적어 두고, 앞으로 갈 곳이 있을 때만 앞으로 버튼을 켠다.
 * - 첫 화면(위치 0)에서는 뒤로를 꺼서 버튼으로 데모 밖으로 나가지 않게 하고, 갈 곳이 없으면 숨긴다.
 * - 화면에 고정된 사이드바·하단 탭바·떠 있는 버튼과 겹치지 않는 자리(왼쪽 → 가운데 → 오른쪽 아래)를 고른다.
 * - 미리보기 틀(iframe) 안에서는 띄우지 않는다.
 */
(function () {
  if (typeof window === 'undefined' || window.__miraeHistoryNav) return
  window.__miraeHistoryNav = true

  var POS = '__miraePos'
  var MAX_KEY = 'miraeNavMax'
  var LAST_KEY = 'miraeNavLast'
  var h = window.history

  function isObj(s) {
    return !!s && typeof s === 'object' && !Array.isArray(s)
  }
  function posOf(s) {
    return isObj(s) && typeof s[POS] === 'number' ? s[POS] : null
  }
  function isMarker(s) {
    if (!isObj(s)) return false
    for (var k in s) if (k.indexOf('mirae') === 0 && k !== POS && s[k]) return true
    return false
  }
  function load(k) {
    try {
      return Number(sessionStorage.getItem(k)) || 0
    } catch (e) {
      return 0
    }
  }
  function save(k, v) {
    try {
      sessionStorage.setItem(k, String(v))
    } catch (e) {
      /* 저장이 막혀도 이 문서 안에서는 동작한다 */
    }
  }
  function withPos(state, pos) {
    if (state != null && !isObj(state)) return state
    var out = {}
    if (isObj(state)) for (var k in state) out[k] = state[k]
    out[POS] = pos
    return out
  }

  var push = h.pushState
  var replace = h.replaceState
  var max = load(MAX_KEY)
  var lastPos = load(LAST_KEY)
  var prevState = null

  // 이 문서의 첫 칸 — 새로고침·뒤로/앞으로면 위치가 이미 적혀 있다
  if (posOf(h.state) === null) {
    var fromSite = false
    try {
      fromSite = !!document.referrer && new URL(document.referrer).origin === location.origin
    } catch (e) {
      fromSite = false
    }
    var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null
    var first = fromSite && nav && nav.type === 'navigate' && h.length > 1 ? Math.min(lastPos + 1, h.length - 1) : 0
    replace.call(h, withPos(h.state, first), '', location.href)
    max = first
  }

  function sync() {
    lastPos = posOf(h.state) || 0
    prevState = h.state
    save(MAX_KEY, max)
    save(LAST_KEY, lastPos)
    schedule()
  }

  h.pushState = function (state, unused, url) {
    var pos = (posOf(h.state) || 0) + 1
    var r = push.call(h, withPos(state, pos), unused, url)
    max = pos
    sync()
    return r
  }
  h.replaceState = function (state, unused, url) {
    var pos = posOf(h.state) || 0
    var r = replace.call(h, withPos(state, pos), unused, url)
    sync()
    return r
  }
  function onPop() {
    var pos = posOf(h.state)
    if (pos === null) {
      // 해시(#) 이동처럼 브라우저가 직접 만든 칸 — 이어지는 위치를 붙인다
      var next = lastPos + 1
      replace.call(h, withPos(h.state, next), '', location.href)
      max = next
    } else if (isMarker(prevState) && !isMarker(h.state) && pos === (posOf(prevState) === null ? -2 : posOf(prevState)) - 1) {
      max = pos
    }
    sync()
  }
  window.addEventListener('popstate', onPop)
  window.addEventListener('hashchange', onPop)
  prevState = h.state
  save(MAX_KEY, max)
  save(LAST_KEY, posOf(h.state) || 0)

  // ── 화면 ─────────────────────────────────────────────
  if (window.self !== window.top) return

  var host = null
  var backBtn = null
  var fwdBtn = null
  var pill = null
  var placed = ''
  var timer = 0

  var CSS =
    ':host{all:initial}' +
    '.pill{position:fixed;z-index:2147483000;display:flex;align-items:center;gap:0;padding:2px;border-radius:999px;' +
    'background:rgba(11,14,18,.78);color:#fff;box-shadow:0 10px 28px -10px rgba(0,0,0,.55);' +
    'outline:1px solid rgba(255,255,255,.16);outline-offset:-1px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);' +
    'font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;transition:opacity .2s ease,transform .2s ease}' +
    '.pill[hidden]{display:none}' +
    'button{all:unset;box-sizing:border-box;display:grid;place-items:center;width:40px;height:40px;border-radius:999px;cursor:pointer;color:#fff;-webkit-tap-highlight-color:transparent}' +
    'button:hover{background:rgba(255,255,255,.12)}' +
    'button:focus-visible{outline:2px solid #E6C396;outline-offset:1px}' +
    'button:disabled{opacity:.3;cursor:default;background:transparent}' +
    '.sep{width:1px;height:16px;background:rgba(255,255,255,.16)}' +
    '@media (min-width:640px){button{width:36px;height:36px}}' +
    '@media print{.pill{display:none}}'

  var ICON_BACK =
    '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg>'
  var ICON_FWD =
    '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5"/></svg>'

  function build() {
    host = document.createElement('div')
    host.setAttribute('data-mirae-history-nav', '')
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host
    var style = document.createElement('style')
    style.textContent = CSS
    pill = document.createElement('nav')
    pill.className = 'pill'
    pill.setAttribute('aria-label', '페이지 이동')
    backBtn = document.createElement('button')
    backBtn.type = 'button'
    backBtn.setAttribute('aria-label', '뒤로 가기')
    backBtn.title = '뒤로 가기'
    backBtn.innerHTML = ICON_BACK
    backBtn.addEventListener('click', function () {
      h.back()
    })
    var sep = document.createElement('span')
    sep.className = 'sep'
    fwdBtn = document.createElement('button')
    fwdBtn.type = 'button'
    fwdBtn.setAttribute('aria-label', '앞으로 가기')
    fwdBtn.title = '앞으로 가기'
    fwdBtn.innerHTML = ICON_FWD
    fwdBtn.addEventListener('click', function () {
      h.forward()
    })
    pill.appendChild(backBtn)
    pill.appendChild(sep)
    pill.appendChild(fwdBtn)
    root.appendChild(style)
    root.appendChild(pill)
    document.body.appendChild(host)
  }

  // 자리 후보 — 폰은 하단 탭바 위(88px), PC 는 아래 24px. 왼쪽 → 가운데 → 오른쪽, 모두 막혀 있으면 한 줄 더 위에서 다시
  function candidates() {
    var w = window.innerWidth
    var hgt = window.innerHeight
    var mobile = w < 640
    var bw = mobile ? 86 : 78
    var bh = mobile ? 44 : 40
    var side = mobile ? 12 : 24
    var rows = mobile ? [88, 152] : [24, 88]
    var out = []
    for (var i = 0; i < rows.length; i++) {
      var top = hgt - rows[i] - bh
      out.push({ key: 'left' + i, left: side, top: top, w: bw, h: bh, bottom: rows[i] })
      out.push({ key: 'center' + i, left: Math.round((w - bw) / 2), top: top, w: bw, h: bh, bottom: rows[i] })
      out.push({ key: 'right' + i, left: w - side - bw, top: top, w: bw, h: bh, bottom: rows[i] })
    }
    return out
  }

  function blocked(c) {
    var pad = 6
    var l = c.left - pad
    var t = c.top - pad
    var r = c.left + c.w + pad
    var b = c.top + c.h + pad
    // 1) 화면에 고정된 요소(사이드바·탭바·떠 있는 버튼)와 겹치는가
    var all = document.body.getElementsByTagName('*')
    for (var i = 0; i < all.length; i++) {
      var el = all[i]
      if (el === host) continue
      var cs = window.getComputedStyle(el)
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue
      var rc = el.getBoundingClientRect()
      if (rc.width < 2 || rc.height < 2) continue
      // 화면 전체를 덮는 투명 층(모달 배경 등)은 건너뛴다
      if (rc.width >= window.innerWidth - 1 && rc.height >= window.innerHeight - 1) continue
      if (rc.right > l && rc.left < r && rc.bottom > t && rc.top < b) return true
    }
    // 2) 그 자리 바로 아래에 눌러야 하는 것(버튼·링크·입력)이 있는가
    var pts = [
      [c.left + 4, c.top + 4],
      [c.left + c.w - 4, c.top + 4],
      [c.left + 4, c.top + c.h - 4],
      [c.left + c.w - 4, c.top + c.h - 4],
      [c.left + c.w / 2, c.top + c.h / 2],
    ]
    if (host) host.style.display = 'none'
    try {
      for (var p = 0; p < pts.length; p++) {
        var at = document.elementFromPoint(pts[p][0], pts[p][1])
        if (at && at.closest && at.closest('a,button,input,select,textarea,[role="button"],[role="tab"],[role="link"]')) return true
      }
    } finally {
      if (host) host.style.display = ''
    }
    return false
  }

  function place() {
    var cs = candidates()
    var pick = cs[0]
    for (var i = 0; i < cs.length; i++) {
      if (!blocked(cs[i])) {
        pick = cs[i]
        break
      }
    }
    if (pick.key === placed) return
    placed = pick.key
    pill.style.left = pick.left + 'px'
    pill.style.top = 'auto'
    pill.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + ' + pick.bottom + 'px)'
  }

  function render() {
    timer = 0
    if (!document.body) return
    if (!host) build()
    var pos = posOf(h.state) || 0
    var canBack = pos > 0
    var canFwd = pos < max
    backBtn.disabled = !canBack
    fwdBtn.disabled = !canFwd
    if (!canBack && !canFwd) {
      pill.hidden = true
      return
    }
    pill.hidden = false
    placed = ''
    place()
  }

  // 화면이 바뀐 직후엔 새 화면이 아직 그려지는 중이라, 조금 기다렸다가 자리를 고른다
  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(render, 450)
  }

  window.addEventListener('resize', schedule)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule)
  else schedule()
  window.addEventListener('load', schedule)
})()
