// Housewright suite site — no dependencies, no network calls except the sign-up POST.
(() => {
  const root = document.documentElement
  root.classList.add('js')
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)]
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches

  // Flip CALC_STORE_URL to the App Store link the day Calc is live; every "calc-cta" updates itself.
  const CALC_STORE_URL = ''
  const WAITLIST = 'https://api.constructpro.app/api/waitlist'
  const MAILBOX = 'housewrightapp@gmail.com'
  // which page the sign-up came from, so interest can be read per product: home / calc / desktop / companion
  const SOURCE = (location.pathname.match(/(calc|desktop|companion)\/(?:[^/]*)$/) || [, 'home'])[1]

  // ── feet-inch-sixteenths, formatted the way Calc formats them (≈ when it cannot land on the grid)
  const ftin = (inches, den = 16) => {
    const n = Math.round(inches * den), exact = Math.abs(inches * den - n) < 1e-6
    let num = n % den, d = den
    while (num && num % 2 === 0) { num /= 2; d /= 2 }
    const whole = Math.floor(n / den), ft = Math.floor(whole / 12), inch = whole % 12
    const frac = num ? `${ft || inch ? inch + '-' : ''}${num}/${d}` : `${inch}`
    return `${exact ? '' : '≈ '}${ft ? ft + "' " : ''}${frac}"`
  }
  const PX_PER_INCH = 96 // a CSS inch

  // ── Field mode: the products' own sunlight palette, site-wide
  const setTheme = sun => {
    root.dataset.theme = sun ? 'sun' : 'dark'
    $$('img[data-sun]').forEach(img => {
      img.dataset.dark ??= img.getAttribute('src')
      img.onerror = () => { img.onerror = null; img.src = img.dataset.dark } // no sunlight twin yet → keep the dark capture
      img.src = sun ? img.dataset.sun : img.dataset.dark
    })
    $$('.field-toggle').forEach(b => { b.setAttribute('aria-pressed', sun); $('span', b).textContent = sun ? 'Field mode on' : 'Field mode' })
    try { localStorage.setItem('hw-field', sun ? '1' : '') } catch {}
  }
  let sun = false
  try { sun = localStorage.getItem('hw-field') === '1' } catch {}
  setTheme(sun)
  $$('.field-toggle').forEach(b => b.addEventListener('click', () => setTheme(root.dataset.theme !== 'sun')))

  // ── dimension strings measure their target, live
  const measure = el => {
    const target = $(el.dataset.measure)
    if (!target) return
    const range = document.createRange(); range.selectNodeContents(target)
    // the text's own extent, not its box: left edge of the first glyph to the right edge of the longest line
    const rects = [...range.getClientRects()].filter(r => r.width)
    const w = el.dataset.axis === 'box' || !rects.length ? target.getBoundingClientRect().width
      : Math.max(...rects.map(r => r.right)) - Math.min(...rects.map(r => r.left))
    el.style.width = w + 'px'
    $('i', el).textContent = ftin(w / PX_PER_INCH)
  }
  const dims = $$('.dim[data-measure]')
  const remeasure = () => dims.forEach(measure)
  addEventListener('resize', remeasure)
  document.fonts?.ready.then(remeasure)
  remeasure()

  // ── the title block: which sheet you are on, and how far you have scrolled
  const tbScroll = $('#tb-scroll'), tbSheet = $('#tb-sheet'), sheets = $$('[data-sheet]')
  let ticking = false
  const onScroll = () => {
    ticking = false
    if (tbScroll) tbScroll.textContent = ftin(scrollY / PX_PER_INCH)
    if (tbSheet) {
      const mid = innerHeight * .4
      const cur = sheets.filter(s => s.getBoundingClientRect().top <= mid).pop()
      if (cur) tbSheet.textContent = cur.dataset.sheet
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll) } }, { passive: true })
  onScroll()

  // ── one-time reveals: plotted captures, dimension strings, the self-drawing sheets, optimizer bars
  // (a .plot is clipped to nothing until revealed, so it can never intersect — watch its parent instead)
  const waiting = new Map()
  const seen = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return
    waiting.get(e.target).forEach(el => el.classList.add('on')); seen.unobserve(e.target)
  }), { threshold: .12, rootMargin: '0px 0px -8% 0px' })
  $$('.plot, .rise, .dim, .drafting, .boards').forEach(el => {
    const watch = el.classList.contains('plot') ? el.parentElement : el
    waiting.set(watch, [...(waiting.get(watch) || []), el]); seen.observe(watch)
  })

  // ── the desktop walk: the pinned window shows whichever step is nearest the middle of the screen
  $$('.walk').forEach(walk => {
    const steps = $$('.steps > div', walk), frames = $$('.pin .frames img', walk)
    const pick = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return
      const i = steps.indexOf(e.target)
      steps.forEach((s, j) => s.classList.toggle('on', j === i))
      frames.forEach((f, j) => f.classList.toggle('on', j === i))
      const label = $('.chrome span', walk); if (label) label.textContent = e.target.dataset.title || 'Housewright'
    }), { rootMargin: '-45% 0px -45% 0px' })
    steps.forEach(s => pick.observe(s))
  })

  // ── Calc's keypad, replaying three calculations from the app's own demo script
  const PROGRAMS = [
    { keys: ['(', '4', 'ft', '3', '–', '3', '/', '4', '+', '6', 'in', ')', '×', '2', '#', '='], result: `9' 7-1/2"`, dec: `115.5"` },
    { keys: ['4', 'ft', '3', '–', '3', '/', '4', '+', '5', 'ft', '6', '–', '3', '/', '1', '6', '='], result: `9' 9-15/16"`, dec: `117.9375"` },
    { keys: ['1', '2', 'ft', '6', 'in', '÷', '4', '#', '='], result: `3' 1-1/2"`, dec: `37.5"` },
  ]
  const ROWS = [['AC', '(', ')', '⌫', 'MC'], ['7', '8', '9', '÷', 'M+'], ['4', '5', '6', '×', 'M−'], ['1', '2', '3', '−', 'MR']]
  const SIX = [['0', '.', '–', '/', '+', '√'], ['ft', 'in', '#', 'x²', '%', '=']]
  const keyClass = k => k === '=' ? 'eq' : ['AC', '⌫'].includes(k) ? 'ac' : ['ft', 'in', '#', '–', '/'].includes(k) ? 'u' : ''
  $$('.calcdemo').forEach(box => {
    const keyHTML = k => `<div class="key ${keyClass(k)}" data-k="${k}">${k}</div>`
    box.innerHTML = `<div class="tape" aria-hidden="true"></div>
      <div class="display" role="img" aria-label="Housewright Calc replaying a feet-and-inches calculation"><div class="expr"></div><div class="result"><span>0</span><small></small></div></div>
      <div class="keys">${ROWS.flat().map(keyHTML).join('')}</div>${SIX.map(r => `<div class="keys six">${r.map(keyHTML).join('')}</div>`).join('')}
      <div class="replay"><span></span><button type="button">Next calculation</button></div>`
    const tape = $('.tape', box), expr = $('.expr', box), big = $('.result span', box), dec = $('.result small', box), label = $('.replay span', box)
    let p = 0, timer = null, running = false
    const close = op => /[-/]|' \d/.test(op) && !/["']$/.test(op) ? op + '"' : op
    const show = (prog, upto) => {
      const out = []; let op = ''
      const flush = () => { if (op) { out.push(close(op)); op = '' } }
      prog.keys.slice(0, upto).forEach(k => {
        if (/^\d$/.test(k)) op += k
        else if (k === 'ft') op += "' "
        else if (k === 'in') op += '"'
        else if (k === '–') op += '-'
        else if (k === '/') op += '/'
        else if (k === '#') { /* marks the operand as a count */ }
        else if (k === '=') { flush(); out.push('=', prog.result) }
        else { flush(); out.push(k) }
      })
      const done = upto === prog.keys.length
      expr.textContent = [...out, op.trim()].filter(Boolean).join(' ')
      big.textContent = done ? prog.result : (op.trim() || [...out].reverse().find(t => /\d/.test(t)) || '0')
      dec.textContent = done ? '= ' + prog.dec : ''
      if (done) tape.textContent = expr.textContent
    }
    const play = () => {
      const prog = PROGRAMS[p]; let i = 0
      label.textContent = `${p + 1} of ${PROGRAMS.length}`
      clearTimeout(timer); tape.textContent = ''
      const step = () => {
        if (!running) return
        if (i >= prog.keys.length) { timer = setTimeout(() => { p = (p + 1) % PROGRAMS.length; play() }, 3200); return }
        const el = $(`[data-k="${CSS.escape(prog.keys[i])}"]`, box)
        el?.classList.add('hit'); setTimeout(() => el?.classList.remove('hit'), 150)
        show(prog, ++i)
        timer = setTimeout(step, prog.keys[i - 1] === '=' ? 0 : 210)
      }
      step()
    }
    $('button', box).addEventListener('click', () => { p = (p + 1) % PROGRAMS.length; running = true; play() })
    if (still) { show(PROGRAMS[0], PROGRAMS[0].keys.length); label.textContent = `1 of ${PROGRAMS.length}`; return }
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; play() }
      if (!e.isIntersecting) { running = false; clearTimeout(timer) }
    }, { threshold: .4 }).observe(box)
  })

  // ── Calc's store button: "coming" until the link exists
  $$('.calc-cta').forEach(a => {
    if (CALC_STORE_URL) { a.href = CALC_STORE_URL; a.textContent = 'Download on the App Store' }
  })

  // ── sign-up → our own waitlist endpoint; if the browser cannot reach it, say how to get on the list anyway
  $$('form[data-signup]').forEach(form => {
    const msg = $('.msg', form.parentElement), btn = $('button', form), input = $('input', form)
    // text only — nothing the server or the visitor typed is ever parsed as HTML
    const say = (cls, text, mailto) => {
      msg.className = 'msg ' + cls; msg.textContent = text
      if (!mailto) return
      const a = Object.assign(document.createElement('a'), { href: mailto, textContent: MAILBOX })
      msg.append(' Email ', a, ' and we will add you by hand.')
    }
    form.addEventListener('submit', async e => {
      e.preventDefault()
      const email = input.value.trim()
      if (!/^\S+@\S+\.\S+$/.test(email)) return say('err', 'That does not look like an email address.')
      btn.disabled = true; const was = btn.textContent; btn.textContent = 'Adding you…'
      try {
        const res = await fetch(WAITLIST, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, source: SOURCE }) })
        const data = await res.json().catch(() => ({}))
        if (res.status === 201) { say('ok', `You are on the list, number ${Number(data.spot) || 1}. We will write when something ships.`); form.reset() }
        else if (res.status === 409) say('ok', 'That address is already on the list.')
        else if (res.status === 400) say('err', 'That does not look like an email address.')
        else throw new Error(res.status)
      } catch {
        say('err', 'We could not reach the list from here.', `mailto:${MAILBOX}?subject=Housewright%20updates&body=Add%20me%3A%20${encodeURIComponent(email)}`)
      }
      btn.disabled = false; btn.textContent = was
    })
  })
})()
