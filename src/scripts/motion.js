// Motion layer: smooth scroll, scroll-driven reveals, the hero sequence, the pinned
// "four worlds" pan and the phone fan. Everything runs again after each page
// transition and is torn down before the next one. Reduced motion skips it all.
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { createRail } from './rail.js'

gsap.registerPlugin(ScrollTrigger)

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
let lenis = null
let ctx = null
let mm = null
let extras = []

function startLenis() {
  if (lenis || reduce()) return
  lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis && lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

// ---------- Header: solid after the hero, hides on the way down ----------
function header() {
  const el = document.querySelector('.site-header')
  if (!el) return
  ScrollTrigger.create({
    start: 'top -80',
    end: 'max',
    onUpdate: (self) => {
      el.classList.toggle('is-solid', self.scroll() > 80)
      if (!el.classList.contains('menu-open')) el.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 400)
    },
  })
}

function menu() {
  const el = document.querySelector('.site-header')
  const btn = el?.querySelector('.menu-btn')
  const panel = el?.querySelector('.menu-panel')
  if (!btn || btn.dataset.bound) return
  btn.dataset.bound = '1'
  const links = panel.querySelectorAll('li a, .menu-foot a')
  const set = (open) => {
    el.classList.toggle('menu-open', open)
    btn.setAttribute('aria-expanded', String(open))
    btn.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu'
    if (open) {
      panel.hidden = false
      lenis?.stop()
      if (!reduce()) gsap.fromTo(links, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'expo.out' })
    } else {
      lenis?.start()
      panel.hidden = true
    }
  }
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'))
  document.addEventListener('keydown', (e) => e.key === 'Escape' && el.classList.contains('menu-open') && set(false))
  document.addEventListener('astro:before-preparation', () => el.classList.contains('menu-open') && set(false))
}

function markCurrent() {
  // Works with clean URLs (/shop) and with file names (shop.html, home.html).
  const norm = (path) => {
    const p = path.replace(/\.html$/, '').replace(/\/(index|home)$/, '/').replace(/\/$/, '')
    const at = p.lastIndexOf('/products/')
    if (at >= 0) return p.slice(at)
    return '/' + (p.split('/').pop() || '')
  }
  const here = norm(location.pathname)
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const target = norm(new URL(a.href, location.href).pathname)
    const on = target === '/' ? here === '/' : here === target || (target === '/shop' && here.startsWith('/products'))
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')
  })
}

// ---------- Split headings into masked words ----------
function split(el) {
  if (el.dataset.splitDone) return el.querySelectorAll('.w-in')
  const words = el.textContent.trim().split(/\s+/)
  el.setAttribute('aria-label', el.textContent.trim())
  el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true"><span class="w-in">${w}</span></span>`).join(' ')
  el.dataset.splitDone = '1'
  return el.querySelectorAll('.w-in')
}

function reveals() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    if (el.closest('.hero')) return
    const words = split(el)
    gsap.from(words, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.04, scrollTrigger: { trigger: el, start: 'top 88%' } })
  })

  gsap.set('[data-reveal]', { opacity: 0, y: 40 })
  gsap.set('.card[data-reveal]', { rotationX: 22, transformPerspective: 900, transformOrigin: '50% 100%' })
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 92%',
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, rotationX: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  })

  document.querySelectorAll('[data-draw]').forEach((svg) => {
    const paths = svg.querySelectorAll('path, circle')
    paths.forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 200
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len })
    })
    gsap.to(paths, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.08, scrollTrigger: { trigger: svg, start: 'top 92%' } })
  })

  // Images ease in from a slight zoom as they arrive.
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    gsap.fromTo(el, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } })
  })
}

// ---------- Home: the garden hero ----------
// The lady and the lantern settle in from the sides, the lettering rises, the
// lantern flickers and the butterflies wander for as long as the page is open.
function hero() {
  const hero = document.querySelector('.hero-garden')
  if (!hero) return
  const girl = hero.querySelector('.hero-girl'), lantern = hero.querySelector('.hero-lantern')
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  tl.from(hero.querySelector('.hero-mono'), { scale: 0.6, opacity: 0, rotation: -12, duration: 1.6 }, 0.1)
    .from(hero.querySelectorAll('.hero-title span'), { yPercent: 60, opacity: 0, duration: 1.3, stagger: 0.12 }, 0.35)
    .from(hero.querySelector('.hero-made'), { y: 20, opacity: 0, duration: 1.1 }, 0.7)
    .from(hero.querySelectorAll('[data-intro]'), { y: 24, opacity: 0, duration: 1, stagger: 0.12 }, 0.9)
    .from(girl, { xPercent: -30, opacity: 0, duration: 2 }, 0.3)
    .from(lantern, { xPercent: 30, opacity: 0, duration: 2 }, 0.45)

  // The lady drifts as if mid-step; the lantern sways.
  gsap.to(girl, { y: -7, rotation: 0.6, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 100%' })
  gsap.to(lantern, { rotation: 1.6, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 0%' })

  // Butterflies pick a new spot, fly there, rest a moment, and go again.
  const flies = gsap.utils.toArray('.butterfly', hero)
  let alive = true
  const wander = (el, first) => {
    if (!alive) return
    const w = hero.offsetWidth, h = hero.offsetHeight
    const x = gsap.utils.random(0.04, 0.9) * w, y = gsap.utils.random(0.12, 0.85) * h
    const from = { x: gsap.getProperty(el, 'x'), y: gsap.getProperty(el, 'y') }
    const angle = Math.atan2(y - from.y, x - from.x) * (180 / Math.PI) + 90
    gsap.to(el, { rotation: gsap.utils.clamp(-50, 50, angle > 180 ? angle - 360 : angle), duration: 0.6, ease: 'sine.out' })
    gsap.to(el, { x, y, duration: gsap.utils.random(4, 7.5), ease: 'sine.inOut', delay: first ? gsap.utils.random(0, 1.5) : gsap.utils.random(0.2, 1.4), onComplete: () => wander(el) })
  }
  flies.forEach((el, i) => {
    gsap.set(el, { x: (i % 2 ? 0.8 : 0.1) * hero.offsetWidth, y: gsap.utils.random(0.2, 0.7) * hero.offsetHeight, scale: gsap.utils.random(0.7, 1.15) })
    gsap.from(el, { opacity: 0, duration: 1.5, delay: 0.8 + i * 0.2 })
    wander(el, true)
  })
  extras.push({ destroy: () => { alive = false; gsap.killTweensOf(flies) } })

  // Depth on scroll: the scene falls away at different speeds.
  const depth = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
  gsap.to(hero.querySelector('.hero-center'), { yPercent: -12, ease: 'none', scrollTrigger: depth })
  gsap.to(hero.querySelectorAll('.hero-girl, .hero-lantern img'), { yPercent: 10, scale: 1.08, ease: 'none', scrollTrigger: depth })
}

// ---------- Home: statement that fills in word by word ----------
function statement() {
  document.querySelectorAll('[data-fill]').forEach((el) => {
    const words = split(el)
    gsap.fromTo(words, { opacity: 0.16 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } })
  })
}

// ---------- Home: four worlds, pinned horizontal pan on wide screens ----------
function worlds() {
  const wrap = document.querySelector('.worlds')
  const track = wrap?.querySelector('.worlds-track')
  if (!track) return
  mm.add('(min-width: 960px)', () => {
    const distance = () => track.scrollWidth - window.innerWidth
    const pan = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
    })
    track.querySelectorAll('.world-art').forEach((art) => {
      gsap.fromTo(art, { scale: 0.86, rotate: -2 }, { scale: 1, rotate: 0, ease: 'none', scrollTrigger: { trigger: art, containerAnimation: pan, start: 'left right', end: 'center center', scrub: true } })
    })
    const bar = wrap.querySelector('.worlds-progress span')
    if (bar) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top top', end: () => `+=${distance()}`, scrub: true } })
  })
}

// ---------- Home: invitation-website phones fan out ----------
function phones() {
  const row = document.querySelector('.phones')
  if (!row) return
  const items = row.querySelectorAll('.phone-item')
  mm.add('(min-width: 960px)', () => {
    const mid = (items.length - 1) / 2
    gsap.from(items, {
      x: (i, el) => (mid - i) * (el.offsetWidth * 0.9),
      y: (i) => Math.abs(mid - i) * 30,
      rotate: (i) => (i - mid) * 7,
      ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 30%', scrub: 1 },
    })
  })
  mm.add('(max-width: 959px)', () => {
    gsap.from(items, { y: 60, opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: row, start: 'top 85%' } })
  })
}

// ---------- Cards follow the pointer slightly ----------
function tilt() {
  if (!window.matchMedia('(hover: hover)').matches) return
  document.querySelectorAll('.card:not(.rail-card) .card-media, .show-card').forEach((el) => {
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' })
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' })
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      ry(((e.clientX - r.left) / r.width - 0.5) * 8)
      rx(-((e.clientY - r.top) / r.height - 0.5) * 8)
    })
    el.addEventListener('pointerleave', () => { rx(0); ry(0) })
  })
}

function init() {
  markCurrent()
  menu()
  if (reduce()) {
    document.documentElement.classList.add('no-motion')
    return
  }
  startLenis()
  lenis?.scrollTo(0, { immediate: true })
  mm = gsap.matchMedia()
  ctx = gsap.context(() => {
    header()
    hero()
    statement()
    worlds()
    phones()
    document.querySelectorAll('.rail').forEach((el) => { const r = createRail(el); if (r) extras.push(r) })
    reveals()
    tilt()
  })
  // Fonts change line lengths, so measure again once they arrive.
  document.fonts?.ready.then(() => ScrollTrigger.refresh())
}

function teardown() {
  extras.forEach((e) => e.destroy())
  extras = []
  ctx?.revert()
  mm?.revert()
  ScrollTrigger.getAll().forEach((t) => t.kill())
  ctx = null
  mm = null
}

// Buy buttons hand the product to Payhip's script, which takes the buyer straight to
// Payhip's payment page (skipping the product page). If the script
// has not loaded, the link opens the Payhip product page as usual.
function checkout() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('a[data-payhip]')
    const open = window.Payhip?.Checkout?.open
    if (!link || !open) return
    try {
      window.Payhip.Checkout.open({ product: link.dataset.payhip })
      e.preventDefault()
    } catch {
      /* fall through to the normal link */
    }
  })
}

export function boot() {
  checkout()
  document.addEventListener('astro:page-load', init)
  document.addEventListener('astro:before-swap', teardown)
}
