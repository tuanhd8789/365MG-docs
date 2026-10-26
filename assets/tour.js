// Animated tours: each step shows a screenshot of the real app, glides a cursor to the control the step is about,
// rings it, "clicks" it and shows the step's caption. Geometry comes from tools/capture.mjs (window.TOURS[id]:
// [{ shot, box: [x, y, w, h] as fractions of the screenshot, action: 'click' | 'type' | 'look' }]); captions from
// the page's own language. Tours start by themselves the first time they scroll into view.
(function () {
  var STEP_MS = 3400
  var text = window.TOUR_TEXT || { play: 'Play', pause: 'Pause', replay: 'Replay', empty: '' }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches

  function setup(fig) {
    var id = fig.getAttribute('data-tour')
    var steps = (window.TOURS || {})[id]
    var captions = JSON.parse(fig.querySelector('.tour-steps').textContent)
    var stage = fig.querySelector('.tour-stage')
    if (!steps || !steps.length) {
      stage.innerHTML = '<p class="tour-empty">' + (text.empty || '') + '</p>'
      fig.querySelector('.tour-bar').hidden = true
      return
    }
    var img = fig.querySelector('.tour-img')
    var box = fig.querySelector('.tour-box')
    var cursor = fig.querySelector('.tour-cursor')
    var ripple = fig.querySelector('.tour-ripple')
    var cap = fig.querySelector('.tour-cap')
    var count = fig.querySelector('.tour-count')
    var main = fig.querySelector('[data-act="play"]')
    var base = window.TOUR_BASE || ''
    var i = -1, timer = null, playing = false, clickTimer = null

    if (steps[0].w && steps[0].h) stage.style.aspectRatio = steps[0].w + ' / ' + steps[0].h
    // Load every screenshot up front so steps switch without a flash.
    steps.forEach(function (s) { var p = new Image(); p.src = base + s.shot })

    function pct(v) { return (v * 100).toFixed(3) + '%' }
    function show(n) {
      i = (n + steps.length) % steps.length
      var s = steps[i]
      if (img.getAttribute('src') !== base + s.shot) img.src = base + s.shot
      var b = s.box
      box.style.left = pct(b[0]); box.style.top = pct(b[1]); box.style.width = pct(b[2]); box.style.height = pct(b[3])
      box.style.opacity = s.action === 'look' && b[2] > 0.6 ? '0' : '1'
      // The cursor lands a little inside the control, as a hand would.
      var x = b[0] + Math.min(b[2] * 0.5, 0.04), y = b[1] + b[3] * 0.55
      cursor.style.left = pct(x); cursor.style.top = pct(y)
      cap.textContent = captions[i] || ''
      count.textContent = (i + 1) + ' / ' + steps.length
      clearTimeout(clickTimer)
      if (s.action === 'click' || s.action === 'type') {
        clickTimer = setTimeout(function () {
          cursor.classList.add('press')
          ripple.style.left = pct(x); ripple.style.top = pct(y)
          ripple.classList.remove('go'); void ripple.offsetWidth; ripple.classList.add('go')
          setTimeout(function () { cursor.classList.remove('press') }, 160)
        }, reduce ? 0 : 950)
      }
    }
    function tick() {
      if (i >= steps.length - 1) { stop(true); return }
      show(i + 1)
      timer = setTimeout(tick, STEP_MS)
    }
    function play() {
      playing = true
      main.textContent = text.pause
      // From the end, start over; otherwise give the step on screen its full time first.
      if (i >= steps.length - 1) { i = -1; tick() } else timer = setTimeout(tick, STEP_MS)
    }
    function stop(ended) {
      playing = false
      clearTimeout(timer)
      main.textContent = ended ? text.replay : text.play
    }
    fig.addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]')
      if (!act) return
      var a = act.getAttribute('data-act')
      if (a === 'play') return playing ? stop(false) : play()
      stop(false)
      show(a === 'next' ? i + 1 : i - 1)
    })
    show(0)
    var seen = false
    if ('IntersectionObserver' in window && !reduce) {
      new IntersectionObserver(function (es, ob) {
        if (!seen && es[0].isIntersecting) { seen = true; ob.disconnect(); timer = setTimeout(play, 600) }
      }, { threshold: 0.5 }).observe(fig)
    }
  }

  document.querySelectorAll('figure.tour').forEach(setup)
})()
