// The living hero: the brand artwork drawn through a small WebGL shader so it
// ripples like water under a finger or pointer, the lantern glows, and dandelion
// seeds drift across it. If WebGL is unavailable the plain image stays visible.
import { gsap } from 'gsap'

const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`
const FRAG = `precision mediump float;
uniform sampler2D uTex; uniform float uTime; uniform float uZoom; uniform vec3 uR[8]; varying vec2 vUv;
void main(){
  vec2 focal = vec2(0.34, 0.36);
  vec2 uv = focal + (vUv - focal) / uZoom;
  uv += 0.0012 * vec2(sin(uv.y * 9.0 + uTime * 0.6), cos(uv.x * 8.0 + uTime * 0.5));
  float shine = 0.0;
  for (int i = 0; i < 8; i++) {
    vec3 r = uR[i];
    float age = uTime - r.z;
    if (r.z > 0.0 && age > 0.0 && age < 3.2) {
      vec2 d = vUv - r.xy;
      float dist = length(d) + 0.0001;
      float k = dist - age * 0.32;
      float w = sin(k * 48.0) * exp(-k * k * 90.0) * (1.0 - age / 3.2);
      uv += (d / dist) * w * 0.014;
      shine += w;
    }
  }
  vec3 col = texture2D(uTex, clamp(uv, 0.0, 1.0)).rgb;
  col += shine * 0.10;
  vec2 l = uv - vec2(0.86, 0.34);
  float g = exp(-dot(l, l) * 55.0);
  col += vec3(1.0, 0.78, 0.45) * g * (0.10 + 0.05 * sin(uTime * 6.0) + 0.03 * sin(uTime * 13.7));
  gl_FragColor = vec4(col, 1.0);
}`

function program(gl) {
  const make = (type, src) => {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
  }
  const v = make(gl.VERTEX_SHADER, VERT), f = make(gl.FRAGMENT_SHADER, FRAG)
  if (!v || !f) return null
  const prog = gl.createProgram()
  gl.attachShader(prog, v)
  gl.attachShader(prog, f)
  gl.linkProgram(prog)
  return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null
}

export function createSurface(frame) {
  const img = frame.querySelector('img')
  const canvas = frame.querySelector('.hero-gl')
  const seedCanvas = frame.querySelector('.hero-seeds')
  if (!img || !canvas) return null
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false })
  const prog = gl && program(gl)
  if (!prog) return null

  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const U = { time: gl.getUniformLocation(prog, 'uTime'), zoom: gl.getUniformLocation(prog, 'uZoom'), r: gl.getUniformLocation(prog, 'uR') }

  let ready = false, visible = true, zoom = 1, lastTouch = 0
  const t0 = performance.now() / 1000 - 1
  const now = () => performance.now() / 1000 - t0
  const ripples = new Float32Array(24)
  let slot = 0
  const ripple = (x, y) => {
    ripples.set([x, y, now()], slot * 3)
    slot = (slot + 1) % 8
  }

  const tex = gl.createTexture()
  const source = new Image()
  source.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    ready = true
    canvas.classList.add('is-ready')
    seedCanvas?.classList.add('is-ready')
  }
  source.src = img.currentSrc || img.src

  // Seeds: a handful of dandelion seeds that leave the flower heads and drift right.
  const sctx = seedCanvas?.getContext('2d')
  const heads = [[0.1, 0.17], [0.06, 0.42]]
  const spawn = (s, anywhere) => {
    const h = heads[Math.floor(Math.random() * heads.length)]
    s.x = anywhere ? Math.random() : h[0] + Math.random() * 0.05
    s.y = anywhere ? Math.random() * 0.7 : h[1] + (Math.random() - 0.5) * 0.06
    s.vx = 0.025 + Math.random() * 0.04
    s.vy = -0.004 - Math.random() * 0.02
    s.ph = Math.random() * 6.28
    s.size = 0.012 + Math.random() * 0.012
    return s
  }
  const seeds = Array.from({ length: 14 }, () => spawn({}, true))

  const resize = () => {
    const px = Math.min(Math.round(frame.clientWidth * Math.min(window.devicePixelRatio || 1, 2)), 1400)
    if (!px || canvas.width === px) return
    canvas.width = canvas.height = px
    if (seedCanvas) seedCanvas.width = seedCanvas.height = px
    gl.viewport(0, 0, px, px)
  }
  resize()
  window.addEventListener('resize', resize)

  let last = now()
  const tick = () => {
    if (!ready || !visible) return
    const t = now(), dt = Math.min(t - last, 0.05)
    last = t
    // A soft ripple of its own every few seconds when nobody is touching it.
    if (t - lastTouch > 3.6) {
      ripple(0.15 + Math.random() * 0.7, 0.2 + Math.random() * 0.6)
      lastTouch = t
    }
    gl.uniform1f(U.time, t)
    gl.uniform1f(U.zoom, zoom)
    gl.uniform3fv(U.r, ripples)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    if (!sctx) return
    const W = seedCanvas.width
    sctx.clearRect(0, 0, W, W)
    const alpha = Math.max(0, 1 - (zoom - 1) * 2.5)
    if (alpha <= 0) return
    sctx.strokeStyle = `rgba(255, 250, 240, ${0.9 * alpha})`
    sctx.fillStyle = `rgba(190, 160, 110, ${0.9 * alpha})`
    sctx.lineWidth = Math.max(1, W / 700)
    sctx.lineCap = 'round'
    for (const s of seeds) {
      s.x += s.vx * dt
      s.y += (s.vy + Math.sin(t * 0.9 + s.ph) * 0.012) * dt
      if (s.x > 1.05 || s.y < -0.05) spawn(s, false)
      const L = s.size * W
      sctx.save()
      sctx.translate(s.x * W, s.y * W)
      sctx.rotate(0.5 + Math.sin(t * 0.7 + s.ph) * 0.35)
      sctx.beginPath()
      sctx.moveTo(0, L)
      sctx.lineTo(0, 0)
      for (let a = -2; a <= 2; a++) {
        sctx.moveTo(0, 0)
        sctx.lineTo(Math.sin(a * 0.5) * L * 0.6, -Math.cos(a * 0.5) * L * 0.6)
      }
      sctx.stroke()
      sctx.beginPath()
      sctx.arc(0, L, sctx.lineWidth * 0.9, 0, 6.28)
      sctx.fill()
      sctx.restore()
    }
  }
  gsap.ticker.add(tick)

  let lastMove = 0
  const at = (cx, cy) => {
    const r = frame.getBoundingClientRect()
    const x = (cx - r.left) / r.width, y = 1 - (cy - r.top) / r.height
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    lastTouch = now()
    if (lastTouch - lastMove < 0.09) return
    lastMove = lastTouch
    ripple(x, y)
  }
  const onPointer = (e) => at(e.clientX, e.clientY)
  const onTouch = (e) => e.touches[0] && at(e.touches[0].clientX, e.touches[0].clientY)
  frame.addEventListener('pointermove', onPointer)
  frame.addEventListener('pointerdown', onPointer)
  frame.addEventListener('touchmove', onTouch, { passive: true })

  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
  io.observe(frame)

  return {
    setZoom: (z) => (zoom = z),
    destroy() {
      gsap.ticker.remove(tick)
      io.disconnect()
      window.removeEventListener('resize', resize)
      frame.removeEventListener('pointermove', onPointer)
      frame.removeEventListener('pointerdown', onPointer)
      frame.removeEventListener('touchmove', onTouch)
    },
  }
}
