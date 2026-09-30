/*
 * 미래AI랩 데모 공용 — 뒤로 · 앞으로 버튼
 * (miraeailab.com 의 src/components/HistoryNav.tsx 와 같은 규칙을 프레임워크 없이 옮긴 것)
 *
 * - 카카오톡·네이버 앱 안 브라우저처럼 주소창 버튼이 없는 곳에서도, 실수로 뒤로 간 걸 '앞으로'로 되돌린다.
 * - 이 탭 안에서의 위치를 history.state 에 적어 두고, 앞으로 갈 곳이 있을 때만 앞으로 버튼을 켠다.
 * - 데모는 미래AI랩 사이트에서 새 탭으로 열려 첫 화면엔 돌아갈 기록이 없다. 그래서 첫 화면부터 늘 보이고,
 *   첫 화면의 '뒤로'는 이전 페이지가 있으면 그리로, 없으면 미래AI랩 샘플 22개 목록으로 보낸다.
 * - 오른쪽 아래가 기본 자리. 화면에 고정된 하단 탭바·떠 있는 버튼과 겹치면 조금 위로, 그래도 막히면 가운데 → 왼쪽.
 * - 미리보기 틀(iframe) 안에서는 띄우지 않는다.
 */
(function () {
  if (typeof window === 'undefined' || window.__miraeHistoryNav) return
  window.__miraeHistoryNav = true

  var POS = '__miraePos'
  // 첫 화면에서 돌아갈 기록이 없을 때 '뒤로' 가 여는 곳 — 미래AI랩 샘플 22개 목록
  var HUB = 'https://miraeailab.com/business-services/ax-start#samples'
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
    var firstState = withPos(h.state, first)
    // 데모에 처음 들어온 칸 — 그 앞에 페이지(미래AI랩 등)가 있었는지 적어 둔다.
    // (나중에 앞으로 갈 칸이 생기면 history.length 만으로는 앞뒤를 구분할 수 없다)
    if (first === 0 && isObj(firstState)) firstState.__miraeHasPrev = h.length > 1
    replace.call(h, firstState, '', location.href)
    max = first
  }
  function hasPrevPage() {
    return isObj(h.state) && h.state.__miraeHasPrev === true
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
    'button{all:unset;box-sizing:border-box;display:grid;place-items:center;width:34px;height:34px;border-radius:999px;cursor:pointer;color:#fff;-webkit-tap-highlight-color:transparent}' +
    'button:hover{background:rgba(255,255,255,.12)}' +
    'button:focus-visible{outline:2px solid #E6C396;outline-offset:1px}' +
    'button:disabled{opacity:.3;cursor:default;background:transparent}' +
    '.sep{width:1px;height:14px;background:rgba(255,255,255,.16)}' +
    '@media (min-width:640px){button{width:32px;height:32px}}' +
    '@media print{.pill{display:none}}'

  var ICON_BACK =
    '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg>'
  var ICON_FWD =
    '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5"/></svg>'

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
      if ((posOf(h.state) || 0) > 0 || hasPrevPage()) h.back()
      else location.href = HUB
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

  // 자리 후보 — 오른쪽 아래가 먼저. 막혀 있으면 같은 오른쪽에서 한 칸씩 위로, 그래도 막히면 가운데 → 왼쪽
  function candidates() {
    var w = window.innerWidth
    var hgt = window.innerHeight
    var mobile = w < 640
    var bw = mobile ? 76 : 72
    var bh = mobile ? 38 : 36
    var side = mobile ? 12 : 24
    var rows = mobile ? [16, 76, 140] : [24, 88]
    var cols = [
      ['right', w - side - bw],
      ['center', Math.round((w - bw) / 2)],
      ['left', side],
    ]
    var out = []
    for (var c = 0; c < cols.length; c++) {
      for (var i = 0; i < rows.length; i++) {
        out.push({ key: cols[c][0] + i, left: cols[c][1], top: hgt - rows[i] - bh, w: bw, h: bh, bottom: rows[i] })
      }
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
    var canFwd = pos < max
    var toHub = pos === 0 && !hasPrevPage()
    backBtn.disabled = false
    backBtn.title = toHub ? '미래AI랩 샘플 목록으로' : '뒤로 가기'
    backBtn.setAttribute('aria-label', toHub ? '미래AI랩 샘플 목록으로 돌아가기' : '뒤로 가기')
    fwdBtn.disabled = !canFwd
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
