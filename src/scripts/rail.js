// Spatial browsing: featured creations on a 3D rail. Drag, swipe, use the arrows
// or the keyboard. The centre card comes forward; the others turn away into depth.
// Without this script the cards are a plain horizontal scroller.
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function createRail(root) {
  const stage = root.querySelector('.rail-stage')
  const cards = [...root.querySelectorAll('.rail-card')]
  if (!stage || cards.length < 3) return null
  root.classList.add('is-3d')

  const n = cards.length
  const state = { pos: Math.min(root.dataset.start ? +root.dataset.start : 2, n - 1) }
  const clampPos = (v) => Math.max(0, Math.min(n - 1, v))

  const render = () => {
    const w = cards[0].offsetWidth
    cards.forEach((card, i) => {
      const d = i - state.pos, ad = Math.abs(d), sign = Math.sign(d)
      const x = sign * (Math.min(ad, 1) * w * 0.74 + Math.max(ad - 1, 0) * w * 0.34)
      gsap.set(card, {
        x,
        z: -Math.min(ad, 3) * 190,
        rotationY: Math.max(-1, Math.min(1, d)) * -40,
        zIndex: 100 - Math.round(ad * 10),
        autoAlpha: ad > 3.4 ? 0 : 1,
      })
      gsap.set(card.querySelector('.rail-caption'), { opacity: 1 - Math.min(ad * 1.8, 1) })
      card.toggleAttribute('data-active', ad < 0.5)
      card.tabIndex = ad < 0.5 ? 0 : -1
    })
  }

  const go = (to, duration = 0.8) => gsap.to(state, { pos: clampPos(Math.round(to)), duration, ease: 'power3.out', onUpdate: render, overwrite: true })

  // Drag and swipe. Vertical page scrolling passes straight through.
  let startX = 0, startPos = 0, dragging = false, moved = 0
  const down = (e) => {
    dragging = true
    moved = 0
    startX = e.clientX
    startPos = state.pos
    gsap.killTweensOf(state)
  }
  const move = (e) => {
    if (!dragging) return
    const dx = e.clientX - startX
    moved = Math.max(moved, Math.abs(dx))
    state.pos = clampPos(startPos - dx / (cards[0].offsetWidth * 0.74))
    render()
  }
  const up = () => {
    if (!dragging) return
    dragging = false
    go(state.pos, 0.6)
  }
  const click = (e) => {
    const card = e.target.closest('.rail-card')
    if (!card) return
    const i = cards.indexOf(card)
    if (moved > 6) return e.preventDefault()
    if (Math.abs(i - state.pos) > 0.5) {
      e.preventDefault()
      go(i)
    }
  }
  const key = (e) => {
    if (e.key === 'ArrowRight') go(state.pos + 1)
    if (e.key === 'ArrowLeft') go(state.pos - 1)
  }
  const btn = (e) => {
    const b = e.target.closest('[data-rail]')
    if (b) go(state.pos + Number(b.dataset.rail))
  }
  stage.addEventListener('pointerdown', down)
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
  stage.addEventListener('click', click)
  root.addEventListener('keydown', key)
  root.addEventListener('click', btn)
  window.addEventListener('resize', render)

  // Arrive by gliding in from the start of the rail.
  const target = state.pos
  state.pos = -1.5
  render()
  const st = ScrollTrigger.create({ trigger: root, start: 'top 75%', once: true, onEnter: () => go(target, 1.6) })

  return {
    destroy() {
      st.kill()
      gsap.killTweensOf(state)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('resize', render)
      stage.removeEventListener('pointerdown', down)
      stage.removeEventListener('click', click)
      root.removeEventListener('keydown', key)
      root.removeEventListener('click', btn)
      root.classList.remove('is-3d')
    },
  }
}
