// Motion layer: smooth scroll, scroll-driven reveals, the hero sequence, the pinned
// "four worlds" pan and the phone fan. Everything runs again after each page
// transition and is torn down before the next one. Reduced motion skips it all.
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
let lenis = null
let ctx = null
let mm = null

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
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 92%',
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
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

// ---------- Home: hero sequence and seeds blowing away ----------
function hero() {
  const hero = document.querySelector('.hero')
  if (!hero) return
  const frame = hero.querySelector('.hero-frame')
  const words = hero.querySelectorAll('[data-split]')
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  tl.fromTo(frame, { clipPath: 'inset(12% 8% 12% 8% round 220px)', scale: 1.08 }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', scale: 1, duration: 1.6, ease: 'expo.inOut' })
    .from(hero.querySelectorAll('.hero-art .stem, .hero-art .leaf'), { opacity: 0, duration: 1 }, '-=0.6')
    .from(hero.querySelectorAll('.hero-art .seed'), { scale: 0, transformOrigin: '100px 78px', opacity: 0, duration: 1.2, stagger: { each: 0.025, from: 'random' } }, '-=0.9')
    .from(hero.querySelector('.hero-wordmark'), { yPercent: 40, opacity: 0, duration: 1.4 }, '-=1.1')
  words.forEach((el) => tl.from(split(el), { yPercent: 110, duration: 1.2, stagger: 0.05 }, '-=1.1'))
  tl.from(hero.querySelectorAll('.hero-copy [data-intro]'), { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, '-=0.9')

  // Scroll: the seeds lift off the dandelion and drift out of the frame.
  const seeds = hero.querySelectorAll('.hero-art .seed')
  const drift = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 20%', scrub: 1 } })
  seeds.forEach((s, i) => {
    drift.to(s, { x: 120 + Math.random() * 260, y: -60 - Math.random() * 220, rotation: 40 + Math.random() * 140, opacity: 0, ease: 'power1.in', duration: 1 }, (i % 9) * 0.06)
  })
  drift.to(frame, { yPercent: 8, scale: 0.97, ease: 'none', duration: 1.4 }, 0)
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
  document.querySelectorAll('.card .card-media, .phone').forEach((el) => {
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
    reveals()
    tilt()
  })
  // Fonts change line lengths, so measure again once they arrive.
  document.fonts?.ready.then(() => ScrollTrigger.refresh())
}

function teardown() {
  ctx?.revert()
  mm?.revert()
  ScrollTrigger.getAll().forEach((t) => t.kill())
  ctx = null
  mm = null
}

export function boot() {
  document.addEventListener('astro:page-load', init)
  document.addEventListener('astro:before-swap', teardown)
}
