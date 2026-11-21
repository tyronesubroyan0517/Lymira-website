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

// ---------- Home: a cluster of real mockups floating in depth ----------
// On load the cards arrive from far away. At rest they drift and, on a computer,
// the whole cluster turns toward the pointer. On scroll the cards fly outward past
// the viewer and the page continues behind them.
function hero() {
  const hero = document.querySelector('.hero')
  const scene = hero?.querySelector('.hero-scene')
  if (!scene) return
  const cluster = scene.querySelector('.hero-cluster')
  const cards = gsap.utils.toArray('.float-card', scene)
  const copy = hero.querySelector('.hero-copy')
  scene.classList.add('js-3d')
  cards.forEach((c) => gsap.set(c, { z: +c.dataset.z, rotation: +c.dataset.r, rotationY: +c.dataset.ry }))

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  tl.from(scene.querySelectorAll('.fc-intro'), { z: -1400, y: 160, opacity: 0, rotationX: -35, duration: 1.9, stagger: { each: 0.12, from: 'end' } }, 0.1)
  hero.querySelectorAll('[data-split]').forEach((el) => tl.from(split(el), { yPercent: 110, duration: 1.2, stagger: 0.05 }, 0.3))
  tl.from(hero.querySelectorAll('.hero-copy [data-intro]'), { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 0.7)

  scene.querySelectorAll('.fc-float').forEach((el, i) => {
    gsap.to(el, { y: i % 2 ? 14 : -14, rotation: i % 2 ? 1.2 : -1.2, duration: 3.2 + i * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1 })
  })

  if (window.matchMedia('(hover: hover)').matches) {
    const ry = gsap.quickTo(cluster, 'rotationY', { duration: 0.9, ease: 'power3' })
    const rx = gsap.quickTo(cluster, 'rotationX', { duration: 0.9, ease: 'power3' })
    const onMove = (e) => {
      ry((e.clientX / window.innerWidth - 0.5) * 16)
      rx(-(e.clientY / window.innerHeight - 0.5) * 10)
    }
    window.addEventListener('pointermove', onMove)
    extras.push({ destroy: () => window.removeEventListener('pointermove', onMove) })
  }

  const build = (pin, start) => {
    const fly = gsap.timeline({
      scrollTrigger: { trigger: pin, pin, start, end: '+=130%', scrub: 0.7, anticipatePin: 1, onToggle: (self) => scene.classList.toggle('is-flying', self.isActive) },
    })
    fly.to(copy, { opacity: 0, y: -50, duration: 0.25, ease: 'power1.in' }, 0)
    fly.to(cluster, { rotationY: 0, rotationX: 0, duration: 0.2, overwrite: 'auto' }, 0)
    cards.forEach((c, i) => {
      const dx = +c.dataset.cx - 50, dy = +c.dataset.cy - 50
      const len = Math.hypot(dx, dy) || 1
      const at = (cards.length - 1 - i) * 0.07
      fly.to(c, { x: () => (dx / len) * window.innerWidth * 0.9 + dx * 4, y: () => (dy / len) * window.innerHeight * 0.7 + dy * 4, z: 900, rotationY: 0, rotation: (dx > 0 ? 1 : -1) * 10, duration: 0.7, ease: 'power2.in' }, at)
      fly.to(c, { opacity: 0, duration: 0.2, ease: 'none' }, at + 0.5)
    })
  }
  mm.add('(min-width: 960px)', () => build(hero, 'top top'))
  mm.add('(max-width: 959px)', () => build(scene, 'center center'))
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
